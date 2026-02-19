// app/api/sales-manager/retailers/analytics/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* -------------------- utils -------------------- */
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d: Date) {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfYear(d: Date) {
  const x = new Date(d);
  x.setMonth(0, 1);
  x.setHours(0, 0, 0, 0);
  return x;
}
function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}
function safeDate(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}
function clamp(n: number, a: number, b: number) {
  return Math.min(Math.max(n, a), b);
}
function asInt(v: any, def = 0) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : def;
}

// ✅ days since `past` till `now` (no abs)
function daysSince(now: Date, past: Date) {
  const ms = now.getTime() - past.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function str(v: any) {
  return String(v ?? "").trim();
}

// ✅ robust number conversion (Decimal / bigint / string)
function toNum(v: any) {
  if (v == null) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  if (typeof v === "object" && typeof (v as any).toNumber === "function") {
    try {
      const n = (v as any).toNumber();
      return Number.isFinite(n) ? n : 0;
    } catch {}
  }
  try {
    const n = Number(String(v));
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
function toInt(v: any) {
  return Math.trunc(toNum(v));
}

/* -------------------- auth -------------------- */
async function requireSalesManager() {
  const u: any = await getSessionUser();
  if (!u) return { ok: false as const, status: 401 as const, error: "UNAUTHORIZED" };
  const role = String(u.role || "").toUpperCase();
  if (role !== "SALES_MANAGER") return { ok: false as const, status: 403 as const, error: "FORBIDDEN" };
  return { ok: true as const, userId: String(u.id) };
}

// ✅ use plain array (better param binding)
const GOOD_STATUSES = ["SUBMITTED", "CONFIRMED", "DISPATCHED", "DELIVERED"] as const;
const GOOD_STATUSES_ARR = Array.from(GOOD_STATUSES) as string[];

/* -------------------- SQL helpers (flex tables/cols) -------------------- */
function qi(name: string) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

// ✅ FIX: cast to text to avoid regclass deserialization issue
async function tableExists(name: string) {
  const safe = String(name).replace(/"/g, '""');
  const full = `public."${safe}"`;
  const rows = (await prisma.$queryRaw`
    SELECT to_regclass(${full})::text AS reg
  `) as any[];
  return !!rows?.[0]?.reg;
}

async function getColumns(tableName: string) {
  const rows =
    (await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ${tableName}
    `) as any[];
  return new Set((rows || []).map((r) => String(r.column_name)));
}

function pickCol(cols: Set<string>, candidates: string[], fallback: string | null) {
  for (const c of candidates) if (cols.has(c)) return c;
  return fallback && cols.has(fallback) ? fallback : null;
}

async function resolveOrderTables() {
  const orderTable = (await tableExists("RetailerOrder"))
    ? "RetailerOrder"
    : (await tableExists("Order"))
      ? "Order"
      : null;

  const itemTable = (await tableExists("RetailerOrderItem"))
    ? "RetailerOrderItem"
    : (await tableExists("OrderItem"))
      ? "OrderItem"
      : null;

  if (!orderTable) return { ok: false as const, error: "Order table not found (Order/RetailerOrder missing)" };
  if (!itemTable) return { ok: false as const, error: "Item table not found (OrderItem/RetailerOrderItem missing)" };

  const orderCols = await getColumns(orderTable);
  const itemCols = await getColumns(itemTable);

  const idCol = pickCol(orderCols, ["id"], "id") || "id";
  const createdAtCol = pickCol(orderCols, ["createdAt", "created_at", "date", "orderDate"], "createdAt") || "createdAt";
  const statusCol = pickCol(orderCols, ["status", "orderStatus"], "status") || "status";
  const totalAmountCol =
    pickCol(orderCols, ["totalAmount", "grandTotal", "netAmount", "amount", "total"], "totalAmount") || "totalAmount";
  const retailerIdCol = pickCol(orderCols, ["retailerId", "retailer_id"], "retailerId") || "retailerId";

  const itemOrderIdCol = pickCol(itemCols, ["orderId", "retailerOrderId", "order_id"], "orderId") || "orderId";
  const itemProductNameCol =
    pickCol(itemCols, ["productName", "name", "product", "product_name"], "productName") || "productName";
  const itemQtyCol = pickCol(itemCols, ["qty", "qtyPcs", "orderedQtyPcs", "quantity", "orderQty", "orderedQty"], null);
  const itemAmountCol = pickCol(itemCols, ["amount", "lineAmount", "totalAmount", "netAmount", "value"], null);

  return {
    ok: true as const,
    orderTable,
    itemTable,
    cols: {
      order: { idCol, createdAtCol, statusCol, totalAmountCol, retailerIdCol },
      item: { itemOrderIdCol, itemProductNameCol, itemQtyCol, itemAmountCol },
    },
  };
}

/* -------------------- handler -------------------- */
export async function GET(req: Request) {
  try {
    const auth = await requireSalesManager();
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

    const resolved = await resolveOrderTables();

    // ✅ Backward compatible response (area snapshot removed)
    if (!resolved.ok) {
      return NextResponse.json({
        ok: true,
        warning: resolved.error,
        summary: {
          totalRetailers: 0,
          totalDistributors: 0,
          newRetailers: 0,
          newDistributors: 0,
          active30: 0,
          inactive31_60: 0,
          dormant61_90: 0,
          dead90: 0,
        },
        top10: [],
        nonPerf10: [],
        visitTop20: [],
        distributorSummary: [],
        monthPivot: [],
      });
    }

    const { orderTable, itemTable, cols } = resolved;

    const url = new URL(req.url);
    const mode = String(url.searchParams.get("mode") || "MONTH").toUpperCase(); // TODAY | MONTH | YEAR | CUSTOM
    const fromQ = safeDate(url.searchParams.get("from"));
    const toQ = safeDate(url.searchParams.get("to"));
    const months = clamp(asInt(url.searchParams.get("months"), 4), 1, 24);
    const sort = String(url.searchParams.get("sort") || "SALES").toUpperCase(); // SALES | ORDERS | GROWTH

    const distId: string | null = (url.searchParams.get("distId") || "").trim() || null;
    const city: string | null = (url.searchParams.get("city") || "").trim() || null;

    const now = new Date();
    let from: Date;
    let to: Date;

    if (mode === "TODAY") {
      from = startOfDay(now);
      to = addDays(from, 1);
    } else if (mode === "YEAR") {
      from = startOfYear(now);
      to = addDays(now, 1);
    } else if (mode === "CUSTOM") {
      from = fromQ ? startOfDay(fromQ) : startOfMonth(now);
      to = toQ ? addDays(startOfDay(toQ), 1) : addDays(now, 1);
      if (to <= from) to = addDays(from, 1);
    } else {
      from = startOfMonth(now);
      to = addDays(now, 1);
    }

    const smId = auth.userId;

    const periodDays = Math.max(1, Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24)));
    const prevTo = new Date(from);
    const prevFrom = addDays(prevTo, -periodDays);

    const retailerWhere: any = {
      distributor: { salesManagerId: smId, ...(distId ? { id: distId } : {}) },
      ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
    };

    const [newDistributors, newRetailers, totalDistributors, totalRetailers] = await Promise.all([
      prisma.distributor.count({
        where: { salesManagerId: smId, ...(distId ? { id: distId } : {}), createdAt: { gte: from, lt: to } } as any,
      }),
      prisma.retailer.count({ where: { ...retailerWhere, createdAt: { gte: from, lt: to } } as any }),
      prisma.distributor.count({ where: { salesManagerId: smId, ...(distId ? { id: distId } : {}) } as any }),
      prisma.retailer.count({ where: retailerWhere as any }),
    ]);

    const today = startOfDay(now);

    // -----------------------------
    // LAST ORDER PER RETAILER (for buckets)
    // -----------------------------
    const lastOrderSql = `
      SELECT
        r."id" as "retailerId",
        MAX(o.${qi(cols.order.createdAtCol)}) as "lastOrderAt"
      FROM "Retailer" r
      JOIN "Distributor" d ON d."id" = r."distributorId"
      LEFT JOIN ${qi(orderTable)} o
        ON o.${qi(cols.order.retailerIdCol)} = r."id"
       AND (o.${qi(cols.order.statusCol)}::text = ANY($1::text[]))
      WHERE d."salesManagerId" = $2
        AND ($3::text IS NULL OR d."id"::text = $3)
        AND ($4::text IS NULL OR LOWER(COALESCE(r."city",'')) = LOWER($4))
      GROUP BY r."id"
    `;
    const lastOrderRows = (await prisma.$queryRawUnsafe(lastOrderSql, GOOD_STATUSES_ARR, smId, distId, city)) as Array<{
      retailerId: string;
      lastOrderAt: Date | null;
    }>;

    let active30 = 0,
      inactive31_60 = 0,
      dormant61_90 = 0,
      dead90 = 0;

    for (const r of lastOrderRows) {
      const last = r.lastOrderAt ? new Date(r.lastOrderAt) : null;
      if (!last) {
        dead90 += 1;
        continue;
      }
      const ds = daysSince(today, last);
      if (ds <= 30) active30 += 1;
      else if (ds <= 60) inactive31_60 += 1;
      else if (ds <= 90) dormant61_90 += 1;
      else dead90 += 1;
    }

    // -----------------------------
    // TOP 10
    // -----------------------------
    const top10Sql = `
      WITH cur AS (
        SELECT o.${qi(cols.order.retailerIdCol)} as "retailerId",
               COUNT(*)::int AS "orders",
               COALESCE(SUM(o.${qi(cols.order.totalAmountCol)}),0)::numeric AS "sales"
        FROM ${qi(orderTable)} o
        WHERE o.${qi(cols.order.createdAtCol)} >= $1 AND o.${qi(cols.order.createdAtCol)} < $2
          AND (o.${qi(cols.order.statusCol)}::text = ANY($3::text[]))
        GROUP BY o.${qi(cols.order.retailerIdCol)}
      ),
      prev AS (
        SELECT o.${qi(cols.order.retailerIdCol)} as "retailerId",
               COUNT(*)::int AS "orders",
               COALESCE(SUM(o.${qi(cols.order.totalAmountCol)}),0)::numeric AS "sales"
        FROM ${qi(orderTable)} o
        WHERE o.${qi(cols.order.createdAtCol)} >= $4 AND o.${qi(cols.order.createdAtCol)} < $5
          AND (o.${qi(cols.order.statusCol)}::text = ANY($3::text[]))
        GROUP BY o.${qi(cols.order.retailerIdCol)}
      ),
      lasto AS (
        SELECT o.${qi(cols.order.retailerIdCol)} as "retailerId",
               MAX(o.${qi(cols.order.createdAtCol)}) AS "lastOrderAt"
        FROM ${qi(orderTable)} o
        WHERE (o.${qi(cols.order.statusCol)}::text = ANY($3::text[]))
        GROUP BY o.${qi(cols.order.retailerIdCol)}
      )
      SELECT
        r."id" AS "retailerId",
        r."name" AS "retailerName",
        r."city" AS "city",
        d."id" AS "distributorId",
        d."name" AS "distributorName",
        COALESCE(cur."orders",0)::int AS "orders",
        COALESCE(cur."sales",0)::numeric AS "sales",
        CASE WHEN COALESCE(cur."orders",0) = 0 THEN 0
             ELSE ROUND((COALESCE(cur."sales",0) / NULLIF(cur."orders",0)), 2) END AS "aov",
        lasto."lastOrderAt" AS "lastOrderAt",
        CASE
          WHEN COALESCE(prev."sales",0) = 0 AND COALESCE(cur."sales",0) > 0 THEN 100
          WHEN COALESCE(prev."sales",0) = 0 THEN 0
          ELSE ROUND(((COALESCE(cur."sales",0) - COALESCE(prev."sales",0)) / NULLIF(prev."sales",0)) * 100, 2)
        END AS "growthPct"
      FROM "Retailer" r
      JOIN "Distributor" d ON d."id" = r."distributorId"
      LEFT JOIN cur ON cur."retailerId" = r."id"
      LEFT JOIN prev ON prev."retailerId" = r."id"
      LEFT JOIN lasto ON lasto."retailerId" = r."id"
      WHERE d."salesManagerId" = $6
        AND ($7::text IS NULL OR d."id"::text = $7)
        AND ($8::text IS NULL OR LOWER(COALESCE(r."city",'')) = LOWER($8))
      ORDER BY
        ${
          sort === "ORDERS"
            ? `COALESCE(cur."orders",0) DESC`
            : sort === "GROWTH"
              ? `"growthPct" DESC`
              : `COALESCE(cur."sales",0) DESC`
        },
        COALESCE(cur."sales",0) DESC
      LIMIT 10
    `;
    const top10 = (await prisma.$queryRawUnsafe(
      top10Sql,
      from,
      to,
      GOOD_STATUSES_ARR,
      prevFrom,
      prevTo,
      smId,
      distId,
      city
    )) as any[];

    // -----------------------------
    // NON-PERFORMING TOP 10
    // -----------------------------
    const nonPerfSql = `
      WITH cur AS (
        SELECT o.${qi(cols.order.retailerIdCol)} as "retailerId",
               COUNT(*)::int AS "orders30",
               COALESCE(SUM(o.${qi(cols.order.totalAmountCol)}),0)::numeric AS "sales30"
        FROM ${qi(orderTable)} o
        WHERE o.${qi(cols.order.createdAtCol)} >= $1 AND o.${qi(cols.order.createdAtCol)} < $2
          AND (o.${qi(cols.order.statusCol)}::text = ANY($3::text[]))
        GROUP BY o.${qi(cols.order.retailerIdCol)}
      ),
      prev AS (
        SELECT o.${qi(cols.order.retailerIdCol)} as "retailerId",
               COALESCE(SUM(o.${qi(cols.order.totalAmountCol)}),0)::numeric AS "salesPrev30"
        FROM ${qi(orderTable)} o
        WHERE o.${qi(cols.order.createdAtCol)} >= $4 AND o.${qi(cols.order.createdAtCol)} < $5
          AND (o.${qi(cols.order.statusCol)}::text = ANY($3::text[]))
        GROUP BY o.${qi(cols.order.retailerIdCol)}
      ),
      lasto AS (
        SELECT o.${qi(cols.order.retailerIdCol)} as "retailerId",
               MAX(o.${qi(cols.order.createdAtCol)}) AS "lastOrderAt"
        FROM ${qi(orderTable)} o
        WHERE (o.${qi(cols.order.statusCol)}::text = ANY($3::text[]))
        GROUP BY o.${qi(cols.order.retailerIdCol)}
      )
      SELECT
        r."id" AS "retailerId",
        r."name" AS "retailerName",
        r."city" AS "city",
        d."name" AS "distributorName",
        lasto."lastOrderAt" AS "lastOrderAt",
        COALESCE(cur."orders30",0)::int AS "orders30",
        COALESCE(cur."sales30",0)::numeric AS "sales30",
        COALESCE(prev."salesPrev30",0)::numeric AS "salesPrev30",
        CASE
          WHEN COALESCE(prev."salesPrev30",0) = 0 THEN 0
          ELSE ROUND(((COALESCE(cur."sales30",0) - COALESCE(prev."salesPrev30",0)) / NULLIF(prev."salesPrev30",0)) * 100, 2)
        END AS "dropPct"
      FROM "Retailer" r
      JOIN "Distributor" d ON d."id" = r."distributorId"
      LEFT JOIN cur ON cur."retailerId" = r."id"
      LEFT JOIN prev ON prev."retailerId" = r."id"
      LEFT JOIN lasto ON lasto."retailerId" = r."id"
      WHERE d."salesManagerId" = $6
        AND ($7::text IS NULL OR d."id"::text = $7)
        AND ($8::text IS NULL OR LOWER(COALESCE(r."city",'')) = LOWER($8))
      ORDER BY
        (COALESCE(cur."orders30",0) = 0) DESC,
        (lasto."lastOrderAt" IS NULL) DESC,
        lasto."lastOrderAt" ASC NULLS FIRST,
        "dropPct" ASC
      LIMIT 10
    `;
    const nonPerf10 = (await prisma.$queryRawUnsafe(
      nonPerfSql,
      addDays(to, -30),
      to,
      GOOD_STATUSES_ARR,
      addDays(to, -60),
      addDays(to, -30),
      smId,
      distId,
      city
    )) as any[];

    // -----------------------------
    // VISIT PRIORITY TOP 20
    // -----------------------------
    const visitRowsSql = `
      WITH cur AS (
        SELECT o.${qi(cols.order.retailerIdCol)} as "retailerId",
               COUNT(*)::int AS "orders30",
               COALESCE(SUM(o.${qi(cols.order.totalAmountCol)}),0)::numeric AS "sales30"
        FROM ${qi(orderTable)} o
        WHERE o.${qi(cols.order.createdAtCol)} >= $1 AND o.${qi(cols.order.createdAtCol)} < $2
          AND (o.${qi(cols.order.statusCol)}::text = ANY($3::text[]))
        GROUP BY o.${qi(cols.order.retailerIdCol)}
      ),
      prev AS (
        SELECT o.${qi(cols.order.retailerIdCol)} as "retailerId",
               COALESCE(SUM(o.${qi(cols.order.totalAmountCol)}),0)::numeric AS "salesPrev30"
        FROM ${qi(orderTable)} o
        WHERE o.${qi(cols.order.createdAtCol)} >= $4 AND o.${qi(cols.order.createdAtCol)} < $5
          AND (o.${qi(cols.order.statusCol)}::text = ANY($3::text[]))
        GROUP BY o.${qi(cols.order.retailerIdCol)}
      ),
      lasto AS (
        SELECT o.${qi(cols.order.retailerIdCol)} as "retailerId",
               MAX(o.${qi(cols.order.createdAtCol)}) AS "lastOrderAt"
        FROM ${qi(orderTable)} o
        WHERE (o.${qi(cols.order.statusCol)}::text = ANY($3::text[]))
        GROUP BY o.${qi(cols.order.retailerIdCol)}
      )
      SELECT
        r."id" AS "retailerId",
        r."name" AS "retailerName",
        r."city" AS "city",
        d."name" AS "distributorName",
        lasto."lastOrderAt" AS "lastOrderAt",
        COALESCE(cur."orders30",0)::int AS "orders30",
        COALESCE(cur."sales30",0)::numeric AS "sales30",
        COALESCE(prev."salesPrev30",0)::numeric AS "salesPrev30"
      FROM "Retailer" r
      JOIN "Distributor" d ON d."id" = r."distributorId"
      LEFT JOIN cur ON cur."retailerId" = r."id"
      LEFT JOIN prev ON prev."retailerId" = r."id"
      LEFT JOIN lasto ON lasto."retailerId" = r."id"
      WHERE d."salesManagerId" = $6
        AND ($7::text IS NULL OR d."id"::text = $7)
        AND ($8::text IS NULL OR LOWER(COALESCE(r."city",'')) = LOWER($8))
    `;
    const visitRows = (await prisma.$queryRawUnsafe(
      visitRowsSql,
      addDays(to, -30),
      to,
      GOOD_STATUSES_ARR,
      addDays(to, -60),
      addDays(to, -30),
      smId,
      distId,
      city
    )) as any[];

    const visitTop20 = (visitRows || [])
      .map((r: any) => {
        const last = r.lastOrderAt ? new Date(r.lastOrderAt) : null;
        const ds = last ? daysSince(today, last) : 9999;

        const sales30 = toNum(r.sales30);
        const prev30 = toNum(r.salesPrev30);
        const dropPct = prev30 > 0 ? ((sales30 - prev30) / prev30) * 100 : 0;

        const score =
          clamp(ds, 0, 120) * 0.65 +
          clamp(-dropPct, 0, 100) * 0.25 +
          (toInt(r.orders30) === 0 ? 15 : 0);

        const reasons: string[] = [];
        if (toInt(r.orders30) === 0) reasons.push("No order in 30d");
        if (ds >= 30) reasons.push(`Last order ${ds}d ago`);
        if (dropPct <= -50) reasons.push(`Drop ${Math.round(Math.abs(dropPct))}%`);

        return {
          retailerId: r.retailerId,
          retailerName: r.retailerName,
          city: r.city,
          distributorName: r.distributorName,
          lastOrderAt: r.lastOrderAt,
          orders30: toInt(r.orders30),
          sales30,
          dropPct: Math.round(dropPct * 100) / 100,
          visitScore: Math.round(score * 10) / 10,
          reasons,
        };
      })
      .sort((a: any, b: any) => b.visitScore - a.visitScore)
      .slice(0, 20);

    // -----------------------------
    // MONTH PIVOT
    // -----------------------------
    const pivotStart = new Date(startOfMonth(new Date(to)));
    pivotStart.setMonth(pivotStart.getMonth() - (months - 1));
    pivotStart.setHours(0, 0, 0, 0);

    const pivotSql = `
      SELECT
        r."id" AS "retailerId",
        r."name" AS "retailerName",
        r."city" AS "city",
        d."name" AS "distributorName",
        to_char(date_trunc('month', o.${qi(cols.order.createdAtCol)})::date, 'YYYY-MM-01') AS "month",
        COUNT(o.${qi(cols.order.idCol)})::int AS "orders",
        COALESCE(SUM(o.${qi(cols.order.totalAmountCol)}),0)::numeric AS "sales"
      FROM "Retailer" r
      JOIN "Distributor" d ON d."id" = r."distributorId"
      LEFT JOIN ${qi(orderTable)} o
        ON o.${qi(cols.order.retailerIdCol)} = r."id"
       AND o.${qi(cols.order.createdAtCol)} >= $1 AND o.${qi(cols.order.createdAtCol)} < $2
       AND (o.${qi(cols.order.statusCol)}::text = ANY($3::text[]))
      WHERE d."salesManagerId" = $4
        AND ($5::text IS NULL OR d."id"::text = $5)
        AND ($6::text IS NULL OR LOWER(COALESCE(r."city",'')) = LOWER($6))
      GROUP BY r."id", r."name", r."city", d."name", date_trunc('month', o.${qi(cols.order.createdAtCol)})
      ORDER BY r."name" ASC
    `;
    const pivotRows = (await prisma.$queryRawUnsafe(pivotSql, pivotStart, to, GOOD_STATUSES_ARR, smId, distId, city)) as any[];

    const monthKeys: string[] = [];
    {
      const m = new Date(pivotStart);
      for (let i = 0; i < months; i++) {
        monthKeys.push(m.toISOString().slice(0, 7));
        m.setMonth(m.getMonth() + 1);
      }
    }

    const lastOrderMap = new Map<string, string | null>();
    for (const r of lastOrderRows) lastOrderMap.set(r.retailerId, r.lastOrderAt ? new Date(r.lastOrderAt).toISOString() : null);

    const pivotMap = new Map<string, any>();
    for (const row of pivotRows) {
      const id = String(row.retailerId);
      if (!pivotMap.has(id)) {
        const byMonth: Record<string, { orders: number; sales: number }> = {};
        for (const mk of monthKeys) byMonth[mk] = { orders: 0, sales: 0 };
        pivotMap.set(id, {
          retailerId: id,
          retailerName: row.retailerName,
          city: row.city,
          distributorName: row.distributorName,
          byMonth,
          lastOrderAt: lastOrderMap.get(id) || null,
          healthScore: 0,
          trend: "NONE",
        });
      }
      const mk = String(row.month || "").slice(0, 7);
      const rec = pivotMap.get(id);
      rec.byMonth[mk] = { orders: toInt(row.orders), sales: toNum(row.sales) };
    }

    function computeTrend(arr: number[]) {
      const vals = arr.filter((x) => Number.isFinite(x));
      if (!vals.length) return "NONE";
      if (vals.length <= 2) return "STABLE";
      const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
      const variance = vals.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, vals.length - 1);
      const sd = Math.sqrt(variance);
      const cv = mean === 0 ? 0 : sd / mean;
      if (cv >= 0.9) return "VOLATILE";
      const last2 = vals.slice(-2);
      const first2 = vals.slice(0, 2);
      const up = last2[1] >= last2[0] && last2[0] >= first2[0];
      const down = last2[1] <= last2[0] && last2[0] <= first2[0];
      if (up) return "UP";
      if (down) return "DOWN";
      return "STABLE";
    }

    const monthPivot = Array.from(pivotMap.values()).map((r) => {
      const last = r.lastOrderAt ? new Date(r.lastOrderAt) : null;
      const ds = last ? daysSince(today, last) : 9999;

      const monthOrders = monthKeys.map((k) => toInt(r.byMonth[k]?.orders || 0));
      const monthSales = monthKeys.map((k) => toNum(r.byMonth[k]?.sales || 0));

      const freq = monthOrders.reduce((a, b) => a + b, 0) / Math.max(1, monthKeys.length);
      const monetary = monthSales.reduce((a, b) => a + b, 0) / Math.max(1, monthKeys.length);

      const recencyScore = 100 - clamp((ds / 60) * 100, 0, 100);
      const freqScore = clamp((freq / 4) * 100, 0, 100);
      const monetaryScore = clamp((monetary / 50000) * 100, 0, 100);

      const health = Math.round(recencyScore * 0.4 + freqScore * 0.35 + monetaryScore * 0.25);
      const trend = computeTrend(monthSales);

      return { ...r, healthScore: health, trend };
    });

    // -----------------------------
    // DISTRIBUTOR SUMMARY
    // -----------------------------
    const distSql = `
      WITH base AS (
        SELECT d."id" AS "distributorId",
               d."name" AS "distributorName",
               r."id" AS "retailerId"
        FROM "Distributor" d
        JOIN "Retailer" r ON r."distributorId" = d."id"
        WHERE d."salesManagerId" = $1
          AND ($2::text IS NULL OR d."id"::text = $2)
      ),
      cur AS (
        SELECT o.${qi(cols.order.retailerIdCol)} as "retailerId",
               COUNT(*)::int AS "orders",
               COALESCE(SUM(o.${qi(cols.order.totalAmountCol)}),0)::numeric AS "sales"
        FROM ${qi(orderTable)} o
        WHERE o.${qi(cols.order.createdAtCol)} >= $3 AND o.${qi(cols.order.createdAtCol)} < $4
          AND (o.${qi(cols.order.statusCol)}::text = ANY($5::text[]))
        GROUP BY o.${qi(cols.order.retailerIdCol)}
      ),
      lasto AS (
        SELECT o.${qi(cols.order.retailerIdCol)} as "retailerId",
               MAX(o.${qi(cols.order.createdAtCol)}) AS "lastOrderAt"
        FROM ${qi(orderTable)} o
        WHERE (o.${qi(cols.order.statusCol)}::text = ANY($5::text[]))
        GROUP BY o.${qi(cols.order.retailerIdCol)}
      )
      SELECT
        b."distributorId",
        b."distributorName",
        COUNT(DISTINCT b."retailerId")::int AS "retailers",
        COALESCE(SUM(cur."sales"),0)::numeric AS "sales",
        COALESCE(SUM(cur."orders"),0)::int AS "orders",
        COUNT(DISTINCT b."retailerId") FILTER (WHERE lasto."lastOrderAt" >= $6)::int AS "active30"
      FROM base b
      LEFT JOIN cur ON cur."retailerId" = b."retailerId"
      LEFT JOIN lasto ON lasto."retailerId" = b."retailerId"
      GROUP BY b."distributorId", b."distributorName"
      ORDER BY "sales" DESC
    `;
    const distributorSummary = (await prisma.$queryRawUnsafe(
      distSql,
      smId,
      distId,
      from,
      to,
      GOOD_STATUSES_ARR,
      addDays(to, -30)
    )) as any[];

    // FILTER LISTS
    const [cities, distributors] = await Promise.all([
      prisma.retailer.findMany({
        where: retailerWhere as any,
        select: { city: true },
        distinct: ["city"] as any,
        orderBy: { city: "asc" } as any,
      }),
      prisma.distributor.findMany({
        where: { salesManagerId: smId } as any,
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const cityList = Array.from(new Set((cities || []).map((x: any) => str(x?.city)).filter(Boolean)));

    // ✅ normalize numeric outputs
    const top10Fixed = (top10 || []).map((r: any) => ({
      ...r,
      orders: toInt(r.orders),
      sales: toNum(r.sales),
      aov: toNum(r.aov),
      growthPct: toNum(r.growthPct),
    }));

    const nonPerf10Fixed = (nonPerf10 || []).map((r: any) => ({
      ...r,
      orders30: toInt(r.orders30),
      sales30: toNum(r.sales30),
      salesPrev30: toNum(r.salesPrev30),
      dropPct: toNum(r.dropPct),
    }));

    const distributorSummaryFixed = (distributorSummary || []).map((r: any) => ({
      ...r,
      retailers: toInt(r.retailers),
      orders: toInt(r.orders),
      sales: toNum(r.sales),
      active30: toInt(r.active30),
    }));

    return NextResponse.json({
      ok: true,
      usingTables: { orderTable, itemTable, cols },

      mode,
      sort,
      range: { from: from.toISOString(), to: to.toISOString() },
      prevRange: { from: prevFrom.toISOString(), to: prevTo.toISOString() },
      pivot: { months, monthKeys, pivotStart: pivotStart.toISOString() },
      filters: { distId, city, distributors, cities: cityList },

      summary: {
        totalRetailers,
        totalDistributors,
        newRetailers,
        newDistributors,
        active30,
        inactive31_60,
        dormant61_90,
        dead90,
      },

      top10: top10Fixed,
      nonPerf10: nonPerf10Fixed,
      visitTop20,
      distributorSummary: distributorSummaryFixed,
      monthPivot,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: String(e?.message || e) }, { status: 500 });
  }
}
