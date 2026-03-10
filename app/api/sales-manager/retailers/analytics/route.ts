// app/api/sales-manager/retailers/analytics/route.ts
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiHandler } from "@/lib/api-handler";
import { forbidden, internal, unauthorized } from "@/lib/errors";

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

function str(v: any) {
  return String(v ?? "").trim();
}

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
  const u = await getSessionUser();
  if (!u) {
    return { ok: false as const, status: 401 as const, error: "UNAUTHORIZED" };
  }

  const role = String(u.role || "").toUpperCase();
  const allowed = new Set(["SALES_MANAGER", "ADMIN", "SUPER_ADMIN"]);

  if (!allowed.has(role)) {
    return { ok: false as const, status: 403 as const, error: "FORBIDDEN" };
  }

  const smId = String(u.salesManagerId || u.id);
  return { ok: true as const, userId: smId };
}

const GOOD_STATUSES = ["SUBMITTED", "CONFIRMED", "DISPATCHED", "DELIVERED"] as const;

/* -------------------- safe SQL identifier helpers -------------------- */
const TABLE_WHITELIST = {
  order: new Set(["Order", "RetailerOrder"]),
  item: new Set(["OrderItem", "RetailerOrderItem"]),
} as const;

const ALIAS_WHITELIST = new Set(["o", "r", "d"]);

const ORDER_COL_WHITELIST = new Set([
  "id",
  "createdAt",
  "created_at",
  "date",
  "orderDate",
  "status",
  "orderStatus",
  "totalAmount",
  "grandTotal",
  "netAmount",
  "amount",
  "total",
  "retailerId",
  "retailer_id",
]);

const ITEM_COL_WHITELIST = new Set([
  "orderId",
  "retailerOrderId",
  "order_id",
  "productName",
  "name",
  "product",
  "product_name",
  "qty",
  "qtyPcs",
  "orderedQtyPcs",
  "quantity",
  "orderQty",
  "orderedQty",
  "amount",
  "lineAmount",
  "totalAmount",
  "netAmount",
  "value",
]);

function assertAlias(alias: string) {
  if (!ALIAS_WHITELIST.has(alias)) {
    throw new Error(`Unsafe SQL alias: ${alias}`);
  }
  return alias;
}

function assertTableName(kind: "order" | "item", table: string) {
  const allowed = TABLE_WHITELIST[kind];
  if (!allowed.has(table as any)) {
    throw new Error(`Unsafe SQL table: ${table}`);
  }
  return table;
}

function assertColumnName(kind: "order" | "item", col: string) {
  const allowed = kind === "order" ? ORDER_COL_WHITELIST : ITEM_COL_WHITELIST;
  if (!allowed.has(col)) {
    throw new Error(`Unsafe SQL column: ${col}`);
  }
  return col;
}

function rawQualified(alias: string, col: string, kind: "order" | "item") {
  const safeAlias = assertAlias(alias);
  const safeCol = assertColumnName(kind, col);
  return Prisma.raw(`"${safeAlias}"."${safeCol}"`);
}

function rawTableWithAlias(table: string, alias: string, kind: "order" | "item") {
  const safeTable = assertTableName(kind, table);
  const safeAlias = assertAlias(alias);
  return Prisma.raw(`"${safeTable}" "${safeAlias}"`);
}

function pickCol(
  cols: Set<string>,
  candidates: string[],
  fallback: string | null,
  kind: "order" | "item"
) {
  const allowed = kind === "order" ? ORDER_COL_WHITELIST : ITEM_COL_WHITELIST;

  for (const c of candidates) {
    if (cols.has(c) && allowed.has(c)) return c;
  }

  if (fallback && cols.has(fallback) && allowed.has(fallback)) {
    return fallback;
  }

  return null;
}

/* -------------------- SQL helpers (flex tables/cols) -------------------- */
async function tableExists(name: string) {
  const safe = String(name).replace(/"/g, '""');
  const full = `public."${safe}"`;

  const rows = await prisma.$queryRaw<{ reg: string | null }[]>`
    SELECT to_regclass(${full})::text AS reg
  `;

  return !!rows?.[0]?.reg;
}

async function getColumns(tableName: string) {
  const rows = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${tableName}
  `;
  return new Set((rows || []).map((r) => String(r.column_name)));
}

type ResolvedTables =
  | {
      ok: true;
      orderTable: string;
      itemTable: string;
      cols: {
        order: {
          idCol: string;
          createdAtCol: string;
          statusCol: string;
          totalAmountCol: string;
          retailerIdCol: string;
        };
        item: {
          itemOrderIdCol: string;
          itemProductNameCol: string;
          itemQtyCol: string | null;
          itemAmountCol: string | null;
        };
      };
    }
  | {
      ok: false;
      error: string;
    };

let RESOLVED_CACHE: { value: ResolvedTables; expiresAt: number } | null = null;
const RESOLVED_CACHE_TTL_MS = 5 * 60 * 1000;

async function resolveOrderTables(): Promise<ResolvedTables> {
  const now = Date.now();
  if (RESOLVED_CACHE && RESOLVED_CACHE.expiresAt > now) {
    return RESOLVED_CACHE.value;
  }

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

  let resolved: ResolvedTables;

  if (!orderTable) {
    resolved = {
      ok: false,
      error: "Order table not found (Order/RetailerOrder missing)",
    };
    RESOLVED_CACHE = { value: resolved, expiresAt: now + 15_000 };
    return resolved;
  }

  if (!itemTable) {
    resolved = {
      ok: false,
      error: "Item table not found (OrderItem/RetailerOrderItem missing)",
    };
    RESOLVED_CACHE = { value: resolved, expiresAt: now + 15_000 };
    return resolved;
  }

  const orderCols = await getColumns(orderTable);
  const itemCols = await getColumns(itemTable);

  const idCol = pickCol(orderCols, ["id"], "id", "order") || "id";
  const createdAtCol =
    pickCol(orderCols, ["createdAt", "created_at", "date", "orderDate"], "createdAt", "order") ||
    "createdAt";
  const statusCol = pickCol(orderCols, ["status", "orderStatus"], "status", "order") || "status";
  const totalAmountCol =
    pickCol(
      orderCols,
      ["totalAmount", "grandTotal", "netAmount", "amount", "total"],
      "totalAmount",
      "order"
    ) || "totalAmount";
  const retailerIdCol =
    pickCol(orderCols, ["retailerId", "retailer_id"], "retailerId", "order") || "retailerId";

  const itemOrderIdCol =
    pickCol(itemCols, ["orderId", "retailerOrderId", "order_id"], "orderId", "item") || "orderId";
  const itemProductNameCol =
    pickCol(itemCols, ["productName", "name", "product", "product_name"], "productName", "item") ||
    "productName";
  const itemQtyCol = pickCol(
    itemCols,
    ["qty", "qtyPcs", "orderedQtyPcs", "quantity", "orderQty", "orderedQty"],
    null,
    "item"
  );
  const itemAmountCol = pickCol(
    itemCols,
    ["amount", "lineAmount", "totalAmount", "netAmount", "value"],
    null,
    "item"
  );

  resolved = {
    ok: true,
    orderTable,
    itemTable,
    cols: {
      order: { idCol, createdAtCol, statusCol, totalAmountCol, retailerIdCol },
      item: { itemOrderIdCol, itemProductNameCol, itemQtyCol, itemAmountCol },
    },
  };

  RESOLVED_CACHE = { value: resolved, expiresAt: now + RESOLVED_CACHE_TTL_MS };
  return resolved;
}

/* -------------------- handler -------------------- */
export const GET = apiHandler(async function GET(req: Request) {
  const auth = await requireSalesManager();
  if (!auth.ok) {
    if (auth.status === 403) throw forbidden(auth.error);
    throw unauthorized(auth.error);
  }

  const resolved = await resolveOrderTables();
  if (!resolved.ok) {
    throw internal("TABLE_RESOLVE_FAILED", "TABLE_RESOLVE_FAILED", {
      message: resolved.error,
    });
  }

  const { orderTable, itemTable, cols } = resolved;

  const url = new URL(req.url);
  const mode = String(url.searchParams.get("mode") || "MONTH").toUpperCase();
  const fromQ = safeDate(url.searchParams.get("from"));
  const toQ = safeDate(url.searchParams.get("to"));
  const months = clamp(asInt(url.searchParams.get("months"), 4), 1, 24);
  const sort = String(url.searchParams.get("sort") || "SALES").toUpperCase();

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

  const periodDays = Math.max(
    1,
    Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24))
  );
  const prevTo = new Date(from);
  const prevFrom = addDays(prevTo, -periodDays);
  const today = startOfDay(now);

  const retailerWhere: any = {
    distributor: { salesManagerId: smId, ...(distId ? { id: distId } : {}) },
    ...(city ? { city: { equals: city, mode: "insensitive" } } : {}),
  };

  const [newDistributors, newRetailers, totalDistributors, totalRetailers] = await Promise.all([
    prisma.distributor.count({
      where: {
        salesManagerId: smId,
        ...(distId ? { id: distId } : {}),
        createdAt: { gte: from, lt: to },
      } as any,
    }),
    prisma.retailer.count({ where: { ...retailerWhere, createdAt: { gte: from, lt: to } } as any }),
    prisma.distributor.count({
      where: { salesManagerId: smId, ...(distId ? { id: distId } : {}) } as any,
    }),
    prisma.retailer.count({ where: retailerWhere as any }),
  ]);

  // SQL aliases
  const o = "o";
  const r = "r";
  const d = "d";

  const orderTableSql = rawTableWithAlias(orderTable, o, "order");
  const oCreatedAt = rawQualified(o, cols.order.createdAtCol, "order");
  const oStatus = rawQualified(o, cols.order.statusCol, "order");
  const oTotalAmount = rawQualified(o, cols.order.totalAmountCol, "order");
  const oRetailerId = rawQualified(o, cols.order.retailerIdCol, "order");
  const oIdCol = rawQualified(o, cols.order.idCol, "order");

  const distFilter = distId ? Prisma.sql`AND d."id"::text = ${distId}` : Prisma.empty;
  const cityFilter = city
    ? Prisma.sql`AND LOWER(COALESCE(r."city", '')) = LOWER(${city})`
    : Prisma.empty;

  const orderBySql =
    sort === "ORDERS"
      ? Prisma.sql`COALESCE(cur."orders",0) DESC, COALESCE(cur."sales",0) DESC`
      : sort === "GROWTH"
        ? Prisma.sql`"growthPct" DESC, COALESCE(cur."sales",0) DESC`
        : Prisma.sql`COALESCE(cur."sales",0) DESC, COALESCE(cur."orders",0) DESC`;

  const last30From = addDays(to, -30);
  const prev30From = addDays(to, -60);
  const activeCutoff = addDays(today, -30);
  const inactiveCutoff = addDays(today, -60);
  const dormantCutoff = addDays(today, -90);

  /* -----------------------------
   * lifecycle summary in DB
   * ----------------------------- */
  const lifecycleRows = await prisma.$queryRaw<any[]>(Prisma.sql`
    WITH lasto AS (
      SELECT
        r."id" AS "retailerId",
        MAX(${oCreatedAt}) AS "lastOrderAt"
      FROM "Retailer" r
      JOIN "Distributor" d ON d."id" = r."distributorId"
      LEFT JOIN ${orderTableSql}
        ON ${oRetailerId} = r."id"
       AND ${oStatus}::text IN (${Prisma.join(GOOD_STATUSES)})
      WHERE d."salesManagerId" = ${smId}
        ${distFilter}
        ${cityFilter}
      GROUP BY r."id"
    )
    SELECT
      COUNT(*) FILTER (
        WHERE "lastOrderAt" IS NOT NULL
          AND "lastOrderAt" >= ${activeCutoff}
      )::int AS "active30",
      COUNT(*) FILTER (
        WHERE "lastOrderAt" < ${activeCutoff}
          AND "lastOrderAt" >= ${inactiveCutoff}
      )::int AS "inactive31_60",
      COUNT(*) FILTER (
        WHERE "lastOrderAt" < ${inactiveCutoff}
          AND "lastOrderAt" >= ${dormantCutoff}
      )::int AS "dormant61_90",
      COUNT(*) FILTER (
        WHERE "lastOrderAt" IS NULL
           OR "lastOrderAt" < ${dormantCutoff}
      )::int AS "dead90"
    FROM lasto
  `);

  const active30 = toInt(lifecycleRows?.[0]?.active30);
  const inactive31_60 = toInt(lifecycleRows?.[0]?.inactive31_60);
  const dormant61_90 = toInt(lifecycleRows?.[0]?.dormant61_90);
  const dead90 = toInt(lifecycleRows?.[0]?.dead90);

  /* -----------------------------
   * last order map for monthPivot
   * ----------------------------- */
  const lastOrderRows = await prisma.$queryRaw<
    Array<{ retailerId: string; lastOrderAt: Date | null }>
  >(Prisma.sql`
    SELECT
      r."id" AS "retailerId",
      MAX(${oCreatedAt}) AS "lastOrderAt"
    FROM "Retailer" r
    JOIN "Distributor" d ON d."id" = r."distributorId"
    LEFT JOIN ${orderTableSql}
      ON ${oRetailerId} = r."id"
     AND ${oStatus}::text IN (${Prisma.join(GOOD_STATUSES)})
    WHERE d."salesManagerId" = ${smId}
      ${distFilter}
      ${cityFilter}
    GROUP BY r."id"
  `);

  /* -----------------------------
   * TOP 10
   * ----------------------------- */
  const top10 = await prisma.$queryRaw<any[]>(Prisma.sql`
    WITH cur AS (
      SELECT
        ${oRetailerId} AS "retailerId",
        COUNT(*)::int AS "orders",
        COALESCE(SUM(${oTotalAmount}),0)::numeric AS "sales"
      FROM ${orderTableSql}
      WHERE ${oCreatedAt} >= ${from}
        AND ${oCreatedAt} < ${to}
        AND ${oStatus}::text IN (${Prisma.join(GOOD_STATUSES)})
      GROUP BY ${oRetailerId}
    ),
    prev AS (
      SELECT
        ${oRetailerId} AS "retailerId",
        COUNT(*)::int AS "orders",
        COALESCE(SUM(${oTotalAmount}),0)::numeric AS "sales"
      FROM ${orderTableSql}
      WHERE ${oCreatedAt} >= ${prevFrom}
        AND ${oCreatedAt} < ${prevTo}
        AND ${oStatus}::text IN (${Prisma.join(GOOD_STATUSES)})
      GROUP BY ${oRetailerId}
    ),
    lasto AS (
      SELECT
        ${oRetailerId} AS "retailerId",
        MAX(${oCreatedAt}) AS "lastOrderAt"
      FROM ${orderTableSql}
      WHERE ${oStatus}::text IN (${Prisma.join(GOOD_STATUSES)})
      GROUP BY ${oRetailerId}
    )
    SELECT
      r."id" AS "retailerId",
      r."name" AS "retailerName",
      r."city" AS "city",
      d."id" AS "distributorId",
      d."name" AS "distributorName",
      COALESCE(cur."orders",0)::int AS "orders",
      COALESCE(cur."sales",0)::numeric AS "sales",
      CASE
        WHEN COALESCE(cur."orders",0) = 0 THEN 0
        ELSE ROUND((COALESCE(cur."sales",0) / NULLIF(cur."orders",0)), 2)
      END AS "aov",
      lasto."lastOrderAt" AS "lastOrderAt",
      CASE
        WHEN COALESCE(prev."sales",0) = 0 AND COALESCE(cur."sales",0) > 0 THEN 100
        WHEN COALESCE(prev."sales",0) = 0 THEN 0
        ELSE ROUND(
          ((COALESCE(cur."sales",0) - COALESCE(prev."sales",0)) / NULLIF(prev."sales",0)) * 100,
          2
        )
      END AS "growthPct"
    FROM "Retailer" r
    JOIN "Distributor" d ON d."id" = r."distributorId"
    LEFT JOIN cur ON cur."retailerId" = r."id"
    LEFT JOIN prev ON prev."retailerId" = r."id"
    LEFT JOIN lasto ON lasto."retailerId" = r."id"
    WHERE d."salesManagerId" = ${smId}
      ${distFilter}
      ${cityFilter}
    ORDER BY ${orderBySql}
    LIMIT 10
  `);

  /* -----------------------------
   * NON-PERFORMING TOP 10
   * ----------------------------- */
  const nonPerf10 = await prisma.$queryRaw<any[]>(Prisma.sql`
    WITH cur AS (
      SELECT
        ${oRetailerId} AS "retailerId",
        COUNT(*)::int AS "orders30",
        COALESCE(SUM(${oTotalAmount}),0)::numeric AS "sales30"
      FROM ${orderTableSql}
      WHERE ${oCreatedAt} >= ${last30From}
        AND ${oCreatedAt} < ${to}
        AND ${oStatus}::text IN (${Prisma.join(GOOD_STATUSES)})
      GROUP BY ${oRetailerId}
    ),
    prev AS (
      SELECT
        ${oRetailerId} AS "retailerId",
        COALESCE(SUM(${oTotalAmount}),0)::numeric AS "salesPrev30"
      FROM ${orderTableSql}
      WHERE ${oCreatedAt} >= ${prev30From}
        AND ${oCreatedAt} < ${last30From}
        AND ${oStatus}::text IN (${Prisma.join(GOOD_STATUSES)})
      GROUP BY ${oRetailerId}
    ),
    lasto AS (
      SELECT
        ${oRetailerId} AS "retailerId",
        MAX(${oCreatedAt}) AS "lastOrderAt"
      FROM ${orderTableSql}
      WHERE ${oStatus}::text IN (${Prisma.join(GOOD_STATUSES)})
      GROUP BY ${oRetailerId}
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
        ELSE ROUND(
          ((COALESCE(cur."sales30",0) - COALESCE(prev."salesPrev30",0)) / NULLIF(prev."salesPrev30",0)) * 100,
          2
        )
      END AS "dropPct"
    FROM "Retailer" r
    JOIN "Distributor" d ON d."id" = r."distributorId"
    LEFT JOIN cur ON cur."retailerId" = r."id"
    LEFT JOIN prev ON prev."retailerId" = r."id"
    LEFT JOIN lasto ON lasto."retailerId" = r."id"
    WHERE d."salesManagerId" = ${smId}
      ${distFilter}
      ${cityFilter}
    ORDER BY
      (COALESCE(cur."orders30",0) = 0) DESC,
      (lasto."lastOrderAt" IS NULL) DESC,
      lasto."lastOrderAt" ASC NULLS FIRST,
      "dropPct" ASC
    LIMIT 10
  `);

  /* -----------------------------
   * VISIT PRIORITY TOP 20 in DB
   * ----------------------------- */
  const visitTop20Raw = await prisma.$queryRaw<any[]>(Prisma.sql`
    WITH cur AS (
      SELECT
        ${oRetailerId} AS "retailerId",
        COUNT(*)::int AS "orders30",
        COALESCE(SUM(${oTotalAmount}),0)::numeric AS "sales30"
      FROM ${orderTableSql}
      WHERE ${oCreatedAt} >= ${last30From}
        AND ${oCreatedAt} < ${to}
        AND ${oStatus}::text IN (${Prisma.join(GOOD_STATUSES)})
      GROUP BY ${oRetailerId}
    ),
    prev AS (
      SELECT
        ${oRetailerId} AS "retailerId",
        COALESCE(SUM(${oTotalAmount}),0)::numeric AS "salesPrev30"
      FROM ${orderTableSql}
      WHERE ${oCreatedAt} >= ${prev30From}
        AND ${oCreatedAt} < ${last30From}
        AND ${oStatus}::text IN (${Prisma.join(GOOD_STATUSES)})
      GROUP BY ${oRetailerId}
    ),
    lasto AS (
      SELECT
        ${oRetailerId} AS "retailerId",
        MAX(${oCreatedAt}) AS "lastOrderAt"
      FROM ${orderTableSql}
      WHERE ${oStatus}::text IN (${Prisma.join(GOOD_STATUSES)})
      GROUP BY ${oRetailerId}
    ),
    scored AS (
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
          WHEN COALESCE(prev."salesPrev30",0) > 0
          THEN ROUND(
            ((COALESCE(cur."sales30",0) - COALESCE(prev."salesPrev30",0))
            / NULLIF(prev."salesPrev30",0)) * 100,
            2
          )
          ELSE 0
        END AS "dropPct",
        COALESCE(
          GREATEST(
            0,
            LEAST(
              120,
              FLOOR(EXTRACT(EPOCH FROM (${today}::timestamp - lasto."lastOrderAt"::timestamp)) / 86400.0)
            )
          ),
          120
        ) AS "daysSinceLast",
        ROUND((
          COALESCE(
            GREATEST(
              0,
              LEAST(
                120,
                FLOOR(EXTRACT(EPOCH FROM (${today}::timestamp - lasto."lastOrderAt"::timestamp)) / 86400.0)
              )
            ),
            120
          ) * 0.65
          +
          GREATEST(
            0,
            LEAST(
              100,
              CASE
                WHEN COALESCE(prev."salesPrev30",0) > 0
                THEN -(((COALESCE(cur."sales30",0) - COALESCE(prev."salesPrev30",0))
                    / NULLIF(prev."salesPrev30",0)) * 100)
                ELSE 0
              END
            )
          ) * 0.25
          +
          CASE WHEN COALESCE(cur."orders30",0) = 0 THEN 15 ELSE 0 END
        )::numeric, 1) AS "visitScore"
      FROM "Retailer" r
      JOIN "Distributor" d ON d."id" = r."distributorId"
      LEFT JOIN cur ON cur."retailerId" = r."id"
      LEFT JOIN prev ON prev."retailerId" = r."id"
      LEFT JOIN lasto ON lasto."retailerId" = r."id"
      WHERE d."salesManagerId" = ${smId}
        ${distFilter}
        ${cityFilter}
    )
    SELECT *
    FROM scored
    ORDER BY "visitScore" DESC, "daysSinceLast" DESC, "sales30" ASC
    LIMIT 20
  `);

  const visitTop20 = (visitTop20Raw || []).map((row: any) => {
    const reasons: string[] = [];
    const ds = toInt(row.daysSinceLast);
    const dropPct = toNum(row.dropPct);
    const orders30 = toInt(row.orders30);

    if (orders30 === 0) reasons.push("No order in 30d");
    if (ds >= 30) reasons.push(`Last order ${ds}d ago`);
    if (dropPct <= -50) reasons.push(`Drop ${Math.round(Math.abs(dropPct))}%`);

    return {
      retailerId: row.retailerId,
      retailerName: row.retailerName,
      city: row.city,
      distributorName: row.distributorName,
      lastOrderAt: row.lastOrderAt,
      orders30,
      sales30: toNum(row.sales30),
      dropPct,
      visitScore: toNum(row.visitScore),
      reasons,
    };
  });

  /* -----------------------------
   * MONTH PIVOT
   * ----------------------------- */
  const pivotStart = new Date(startOfMonth(new Date(to)));
  pivotStart.setMonth(pivotStart.getMonth() - (months - 1));
  pivotStart.setHours(0, 0, 0, 0);

  const pivotRows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT
      r."id" AS "retailerId",
      r."name" AS "retailerName",
      r."city" AS "city",
      d."name" AS "distributorName",
      to_char(date_trunc('month', ${oCreatedAt})::date, 'YYYY-MM-01') AS "month",
      COUNT(${oIdCol})::int AS "orders",
      COALESCE(SUM(${oTotalAmount}),0)::numeric AS "sales"
    FROM "Retailer" r
    JOIN "Distributor" d ON d."id" = r."distributorId"
    LEFT JOIN ${orderTableSql}
      ON ${oRetailerId} = r."id"
     AND ${oCreatedAt} >= ${pivotStart}
     AND ${oCreatedAt} < ${to}
     AND ${oStatus}::text IN (${Prisma.join(GOOD_STATUSES)})
    WHERE d."salesManagerId" = ${smId}
      ${distFilter}
      ${cityFilter}
    GROUP BY
      r."id",
      r."name",
      r."city",
      d."name",
      date_trunc('month', ${oCreatedAt})
    ORDER BY r."name" ASC
  `);

  const monthKeys: string[] = [];
  {
    const m = new Date(pivotStart);
    for (let i = 0; i < months; i++) {
      monthKeys.push(m.toISOString().slice(0, 7));
      m.setMonth(m.getMonth() + 1);
    }
  }

  const lastOrderMap = new Map<string, string | null>();
  for (const row of lastOrderRows) {
    lastOrderMap.set(
      row.retailerId,
      row.lastOrderAt ? new Date(row.lastOrderAt).toISOString() : null
    );
  }

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
    rec.byMonth[mk] = {
      orders: toInt(row.orders),
      sales: toNum(row.sales),
    };
  }

  function computeTrend(arr: number[]) {
    const vals = arr.filter((x) => Number.isFinite(x));
    if (!vals.length) return "NONE";
    if (vals.length <= 2) return "STABLE";

    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const variance =
      vals.reduce((a, b) => a + (b - mean) * (b - mean), 0) /
      Math.max(1, vals.length - 1);
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

  const monthPivot = Array.from(pivotMap.values()).map((rec) => {
    const last = rec.lastOrderAt ? new Date(rec.lastOrderAt) : null;
    const ds = last
      ? Math.floor((today.getTime() - last.getTime()) / (1000 * 60 * 60 * 24))
      : 9999;

    const monthOrders = monthKeys.map((k) => toInt(rec.byMonth[k]?.orders || 0));
    const monthSales = monthKeys.map((k) => toNum(rec.byMonth[k]?.sales || 0));

    const freq = monthOrders.reduce((a, b) => a + b, 0) / Math.max(1, monthKeys.length);
    const monetary = monthSales.reduce((a, b) => a + b, 0) / Math.max(1, monthKeys.length);

    const recencyScore = 100 - clamp((ds / 60) * 100, 0, 100);
    const freqScore = clamp((freq / 4) * 100, 0, 100);
    const monetaryScore = clamp((monetary / 50000) * 100, 0, 100);

    const health = Math.round(
      recencyScore * 0.4 + freqScore * 0.35 + monetaryScore * 0.25
    );
    const trend = computeTrend(monthSales);

    return { ...rec, healthScore: health, trend };
  });

  /* -----------------------------
   * DISTRIBUTOR SUMMARY
   * ----------------------------- */
  const distributorSummary = await prisma.$queryRaw<any[]>(Prisma.sql`
    WITH base AS (
      SELECT
        d."id" AS "distributorId",
        d."name" AS "distributorName",
        r."id" AS "retailerId"
      FROM "Distributor" d
      JOIN "Retailer" r ON r."distributorId" = d."id"
      WHERE d."salesManagerId" = ${smId}
        ${distId ? Prisma.sql`AND d."id"::text = ${distId}` : Prisma.empty}
    ),
    cur AS (
      SELECT
        ${oRetailerId} AS "retailerId",
        COUNT(*)::int AS "orders",
        COALESCE(SUM(${oTotalAmount}),0)::numeric AS "sales"
      FROM ${orderTableSql}
      WHERE ${oCreatedAt} >= ${from}
        AND ${oCreatedAt} < ${to}
        AND ${oStatus}::text IN (${Prisma.join(GOOD_STATUSES)})
      GROUP BY ${oRetailerId}
    ),
    lasto AS (
      SELECT
        ${oRetailerId} AS "retailerId",
        MAX(${oCreatedAt}) AS "lastOrderAt"
      FROM ${orderTableSql}
      WHERE ${oStatus}::text IN (${Prisma.join(GOOD_STATUSES)})
      GROUP BY ${oRetailerId}
    )
    SELECT
      b."distributorId",
      b."distributorName",
      COUNT(DISTINCT b."retailerId")::int AS "retailers",
      COALESCE(SUM(cur."sales"),0)::numeric AS "sales",
      COALESCE(SUM(cur."orders"),0)::int AS "orders",
      COUNT(DISTINCT b."retailerId")
        FILTER (WHERE lasto."lastOrderAt" >= ${last30From})::int AS "active30"
    FROM base b
    LEFT JOIN cur ON cur."retailerId" = b."retailerId"
    LEFT JOIN lasto ON lasto."retailerId" = b."retailerId"
    GROUP BY b."distributorId", b."distributorName"
    ORDER BY "sales" DESC
  `);

  /* -----------------------------
   * FILTER LISTS
   * ----------------------------- */
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

  const cityList = Array.from(
    new Set((cities || []).map((x: any) => str(x?.city)).filter(Boolean))
  );

  const top10Fixed = (top10 || []).map((row: any) => ({
    ...row,
    orders: toInt(row.orders),
    sales: toNum(row.sales),
    aov: toNum(row.aov),
    growthPct: toNum(row.growthPct),
  }));

  const nonPerf10Fixed = (nonPerf10 || []).map((row: any) => ({
    ...row,
    orders30: toInt(row.orders30),
    sales30: toNum(row.sales30),
    salesPrev30: toNum(row.salesPrev30),
    dropPct: toNum(row.dropPct),
  }));

  const distributorSummaryFixed = (distributorSummary || []).map((row: any) => ({
    ...row,
    retailers: toInt(row.retailers),
    orders: toInt(row.orders),
    sales: toNum(row.sales),
    active30: toInt(row.active30),
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
});