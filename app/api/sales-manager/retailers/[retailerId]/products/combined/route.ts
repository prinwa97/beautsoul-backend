// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/api/sales-manager/retailers/[retailerId]/products/combined/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Mode = "TODAY" | "MONTH" | "YEAR" | "CUSTOM";
type RowStatus = "HEALTHY" | "FAST" | "REORDER" | "NEEDS_AUDIT";

function json(ok: boolean, data: any, status = 200) {
  return NextResponse.json({ ok, ...data }, { status });
}
function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}
function num(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function asMode(v: any): Mode {
  const m = String(v || "").toUpperCase();
  if (m === "TODAY" || m === "MONTH" || m === "YEAR" || m === "CUSTOM") return m;
  return "MONTH";
}

// IST start-of-day
function startOfDayIST(d = new Date()) {
  const x = new Date(d);
  const ist = new Date(x.getTime() + 330 * 60 * 1000);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const day = ist.getUTCDate();
  const utc = new Date(Date.UTC(y, m, day, 0, 0, 0));
  return new Date(utc.getTime() - 330 * 60 * 1000);
}
function startOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
}
function startOfYearUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1, 0, 0, 0));
}
function parseYMD(v: any) {
  const s = String(v || "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0));
}

// ---------- dynamic prisma delegate picking ----------
function pickStockLotDelegate(pr: any) {
  const candidates = ["stockLot", "stocklot", "inventoryBatch", "inventoryLot"];
  for (const k of candidates) {
    if (pr?.[k] && typeof pr[k]?.findMany === "function") return { key: k, delegate: pr[k] };
  }
  for (const k of Object.keys(pr || {})) {
    if (!pr?.[k] || typeof pr[k]?.findMany !== "function") continue;
    const lk = k.toLowerCase();
    if (lk.includes("stock") && (lk.includes("lot") || lk.includes("batch"))) return { key: k, delegate: pr[k] };
  }
  return null;
}

export async function GET(req: Request, ctx: { params: Promise<{ retailerId: string }> }) {
  try {
    const auth = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);
    if (!auth?.ok) return json(false, { error: auth?.error || "UNAUTHORIZED" }, auth?.status || 401);

    const { retailerId } = await ctx.params;
    if (!retailerId) return json(false, { error: "RETAILER_ID_REQUIRED" }, 400);

    const url = new URL(req.url);
    const mode = asMode(url.searchParams.get("mode"));

    let from: Date;
    let to: Date;

    if (mode === "TODAY") {
      from = startOfDayIST(new Date());
      to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
    } else if (mode === "YEAR") {
      from = startOfYearUTC(new Date());
      to = new Date();
    } else if (mode === "CUSTOM") {
      const f = parseYMD(url.searchParams.get("from"));
      const t = parseYMD(url.searchParams.get("to"));
      if (!f || !t) return json(false, { error: "INVALID_RANGE", message: "CUSTOM requires from & to" }, 400);
      from = f;
      to = new Date(t.getTime() + 24 * 60 * 60 * 1000);
    } else {
      from = startOfMonthUTC(new Date());
      to = new Date();
    }

    // 1) Purchased (system orders)
    const orders = await prisma.order.findMany({
      where: { retailerId, createdAt: { gte: from, lt: to } },
      select: { createdAt: true, items: { select: { productName: true, qty: true } } },
      take: 8000,
      orderBy: { createdAt: "desc" },
    });

    const purchasedMap = new Map<string, { productName: string; purchasedQty: number; lastPurchaseAt: Date | null }>();
    for (const o of orders) {
      const ca = o.createdAt ? new Date(o.createdAt) : null;
      for (const it of o.items || []) {
        const pn = cleanStr(it.productName) || "—";
        const key = pn.toLowerCase();
        const rec = purchasedMap.get(key) || { productName: pn, purchasedQty: 0, lastPurchaseAt: null };
        rec.purchasedQty += num(it.qty);
        if (ca && (!rec.lastPurchaseAt || ca.getTime() > rec.lastPurchaseAt.getTime())) rec.lastPurchaseAt = ca;
        rec.productName = pn;
        purchasedMap.set(key, rec);
      }
    }

    // 2) Pending/current stock (system stock)
    const pr: any = prisma as any;
    const stockFound = pickStockLotDelegate(pr);

    const pendingQtyMap = new Map<string, number>();
    const pendingNameMap = new Map<string, string>();
    let stockModelKey: string | null = null;
    let stockRowsCount = 0;

    if (stockFound) {
      stockModelKey = stockFound.key;
      const Stock: any = stockFound.delegate;

      const stockRows = await Stock.findMany({
        where: { ownerType: "RETAILER", ownerId: retailerId },
        select: { productName: true, qtyOnHandPcs: true, qty: true, quantity: true },
        take: 5000,
      }).catch(async () => []);

      stockRowsCount = Array.isArray(stockRows) ? stockRows.length : 0;

      for (const r of stockRows as any[]) {
        const pn = cleanStr(r?.productName) || "—";
        const key = pn.toLowerCase();
        const q = num(r?.qtyOnHandPcs ?? r?.qty ?? r?.quantity ?? 0);
        pendingQtyMap.set(key, (pendingQtyMap.get(key) || 0) + q);
        if (!pendingNameMap.get(key)) pendingNameMap.set(key, pn);
      }
    }

    // ✅ if stock table has no rows for this retailer, we treat system stock as unknown (not 0)
    const hasSystemStockAny = pendingQtyMap.size > 0 || stockRowsCount > 0;

    // 3) Physical stock (AUDIT) — mode-aware audit
    let audit = await prisma.retailerStockAudit.findFirst({
      where: { retailerId, createdAt: { gte: from, lt: to } },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    });

    // fallback: latest overall audit
    if (!audit) {
      audit = await prisma.retailerStockAudit.findFirst({
        where: { retailerId },
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true },
      });
    }

    const physicalQtyMap = new Map<string, number>();
    const physicalNameMap = new Map<string, string>();

    if (audit?.id) {
      const items = await prisma.retailerStockAuditItem.findMany({
        where: { auditId: audit.id },
        select: { productName: true, physicalQty: true },
        take: 10000,
      });

      for (const it of items) {
        const pn = cleanStr(it.productName) || "—";
        const key = pn.toLowerCase();
        physicalQtyMap.set(key, (physicalQtyMap.get(key) || 0) + num(it.physicalQty));
        if (!physicalNameMap.get(key)) physicalNameMap.set(key, pn);
      }
    }

    // merge keys
    const keys = new Set<string>();
    for (const k of purchasedMap.keys()) keys.add(k);
    for (const k of pendingQtyMap.keys()) keys.add(k);
    for (const k of physicalQtyMap.keys()) keys.add(k);

    const rows = Array.from(keys).map((k) => {
      const p = purchasedMap.get(k);

      const pendingSystem = Math.max(0, num(pendingQtyMap.get(k) || 0));
      const physicalAudit = physicalQtyMap.get(k);
      const hasAudit = typeof physicalAudit === "number";

      const purchasedQty = Math.max(0, num(p?.purchasedQty || 0));

      // ✅ If no audit AND no system stock rows: stock is UNKNOWN (not 0)
      const stockUnknown = !hasAudit && !hasSystemStockAny;

      // Current stock (audit > system)
      const currentStock = stockUnknown ? 0 : Math.max(0, num(hasAudit ? physicalAudit : pendingSystem));

      // ✅ Sold only when stock is known; else null
      let soldQty: number | null = null;
      let sellThrough = 0;

      if (!stockUnknown) {
        const rawSold = purchasedQty - currentStock;
        soldQty = purchasedQty > 0 ? Math.max(0, rawSold) : 0;
        sellThrough = purchasedQty > 0 ? (soldQty || 0) / purchasedQty : 0;
      }

      const anomaly = !stockUnknown && purchasedQty > 0 && purchasedQty - currentStock < 0; // current > purchased

      const displayName = p?.productName || physicalNameMap.get(k) || pendingNameMap.get(k) || "—";

      // ✅ Status logic
      let status: RowStatus = "HEALTHY";

      if (stockUnknown) {
        status = "NEEDS_AUDIT";
      } else {
        const reorderThreshold = Math.max(2, Math.ceil(purchasedQty * 0.2)); // 20% or min 2 pcs

        // REORDER only when stock low AND some sale happened
        if (purchasedQty > 0 && (soldQty || 0) > 0 && currentStock <= reorderThreshold) {
          status = "REORDER";
        }
        // FAST only when sell-through high AND some sale happened
        else if (purchasedQty > 0 && (soldQty || 0) > 0 && sellThrough >= 0.6) {
          status = "FAST";
        }
        // sale=0 => HEALTHY
      }

      return {
        productName: displayName,

        purchasedQty,
        soldQty, // ✅ can be null

        // keep existing fields for compatibility
        physicalQty: currentStock,
        physicalSource: hasAudit ? "AUDIT" : stockUnknown ? "UNKNOWN" : "PENDING_FALLBACK",

        // NEW helpful fields (won’t break UI)
        needsAudit: stockUnknown,
        pendingSystemQty: hasSystemStockAny ? pendingSystem : null,
        auditPhysicalQty: hasAudit ? Math.max(0, num(physicalAudit)) : null,
        currentStockQty: stockUnknown ? null : currentStock,
        sellThroughPct: stockUnknown ? null : Number((sellThrough * 100).toFixed(1)),
        status,

        anomalyPendingGtPurchased: anomaly,
        lastPurchaseAt: p?.lastPurchaseAt ? p.lastPurchaseAt.toISOString() : null,
        lastAuditAt: audit?.createdAt ? new Date(audit.createdAt).toISOString() : null,
      };
    });

    rows.sort((a, b) => num(b.soldQty ?? -1) - num(a.soldQty ?? -1) || num(b.purchasedQty) - num(a.purchasedQty));

    return json(true, {
      mode,
      range: { from: from.toISOString(), to: to.toISOString() },
      meta: {
        stockModelKey,
        stockRowsCount,
        hasSystemStockAny,
        auditId: audit?.id || null,
        auditAt: audit?.createdAt ? new Date(audit.createdAt).toISOString() : null,
      },
      rows,
    });
  } catch (e: any) {
    console.error("SM RETAILER PRODUCTS COMBINED ERROR:", e);
    return json(false, { error: "FAILED", detail: String(e?.message || e) }, 500);
  }
}