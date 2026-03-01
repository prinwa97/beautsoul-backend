import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400, extra?: any) {
  return NextResponse.json({ ok: false, error: msg, ...extra }, { status });
}

function parseMonthToRange(month: string) {
  const m = String(month || "").trim();
  if (!/^\d{4}-\d{2}$/.test(m)) return null;
  const [yy, mm] = m.split("-").map((x) => Number(x));
  if (!yy || !mm || mm < 1 || mm > 12) return null;

  // Month boundaries local time (ok for postgres DateTime usage here)
  const from = new Date(yy, mm - 1, 1, 0, 0, 0, 0);
  const to = new Date(yy, mm, 1, 0, 0, 0, 0);
  return { from, to };
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function num(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function pickRetailerOrderDelegate(pr: any) {
  const candidates = ["retailerOrder", "retailerOrders", "order", "orders"];
  for (const k of candidates) {
    if (pr?.[k] && typeof pr[k]?.findMany === "function") return { key: k, delegate: pr[k] };
  }
  for (const k of Object.keys(pr || {})) {
    if (!pr?.[k] || typeof pr[k]?.findMany !== "function") continue;
    const lk = k.toLowerCase();
    if (lk.includes("retailer") && lk.includes("order")) return { key: k, delegate: pr[k] };
  }
  return null;
}

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
  const auth = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);
  if (!auth.ok) return jsonError(auth.error || "UNAUTHORIZED", auth.status || 401);

  const { retailerId } = await ctx.params;
  if (!retailerId) return jsonError("retailerId required", 400);

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month") || "";
  const range = parseMonthToRange(month);
  if (!range) return jsonError("Invalid month. Use YYYY-MM", 400);

  const pr: any = prisma as any;

  // -------------------------
  // 1) ORDERS
  // -------------------------
  const ordFound = pickRetailerOrderDelegate(pr);
  if (!ordFound) {
    return jsonError("RETAILER_ORDER_MODEL_NOT_FOUND", 500, {
      availableDelegatesSample: Object.keys(pr || {})
        .filter((k) => typeof pr?.[k]?.findMany === "function")
        .slice(0, 80),
    });
  }
  const Order = ordFound.delegate;

  const orders = await Order.findMany({
    where: { retailerId, createdAt: { gte: range.from, lt: range.to } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      orderNo: true,
      status: true,
      createdAt: true,
      totalAmount: true,
      items: {
        select: {
          id: true,
          productName: true,
          qty: true,
          rate: true,
          amount: true,
        },
      },
      _count: { select: { items: true } },
    },
  }).catch(async () => {
    // fallback minimal
    return await Order.findMany({
      where: { retailerId, createdAt: { gte: range.from, lt: range.to } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        orderNo: true,
        status: true,
        createdAt: true,
        totalAmount: true,
      },
    });
  });

  // -------------------------
  // 2) ORDERED PRODUCTS AGG
  // -------------------------
  const productAgg: Record<string, { productName: string; qty: number; amount: number; orders: number }> = {};
  for (const o of orders as any[]) {
    const items = Array.isArray(o.items) ? o.items : [];
    for (const it of items) {
      const pname = String(it.productName || "Unknown");
      const key = pname.toLowerCase();
      if (!productAgg[key]) productAgg[key] = { productName: pname, qty: 0, amount: 0, orders: 0 };
      productAgg[key].qty += Number(it.qty || 0);
      productAgg[key].amount += Number(it.amount || 0);
    }
    const unique: Set<string> = new Set((items as any[]).map((x) => String(x?.productName || "Unknown").toLowerCase()));
    for (const k of unique) if (productAgg[k]) productAgg[k].orders += 1;
  }
  const orderedProductsBase = Object.values(productAgg).sort((a, b) => b.amount - a.amount);

  // -------------------------
  // 3) SYSTEM PENDING STOCK (StockLot)
  // -------------------------
  const stockFound = pickStockLotDelegate(pr);
  let pendingByProduct: Array<{ productName: string; qtyOnHandPcs: number }> = [];
  let stockModelKey: string | null = null;
  let stockRowsCount = 0;

  if (stockFound) {
    const Stock: any = stockFound.delegate;
    stockModelKey = stockFound.key;

    const rows = await Stock.findMany({
      where: { ownerType: "RETAILER", ownerId: retailerId },
      select: { productName: true, qtyOnHandPcs: true, qty: true, quantity: true },
      take: 5000,
    }).catch(async () => []);

    stockRowsCount = Array.isArray(rows) ? rows.length : 0;

    const map: Record<string, { productName: string; qtyOnHandPcs: number }> = {};
    for (const r of rows as any[]) {
      const pname = String(r.productName || "Unknown");
      const key = pname.toLowerCase();
      const q = Number(r.qtyOnHandPcs ?? r.qty ?? r.quantity ?? 0);
      if (!map[key]) map[key] = { productName: pname, qtyOnHandPcs: 0 };
      map[key].qtyOnHandPcs += q;
    }
    pendingByProduct = Object.values(map).sort((a, b) => b.qtyOnHandPcs - a.qtyOnHandPcs);
  }

  const pendingIndex = new Map<string, number>();
  for (const p of pendingByProduct) pendingIndex.set(p.productName.toLowerCase(), p.qtyOnHandPcs);

  // -------------------------
  // 4) AUDIT PHYSICAL STOCK (RetailerStockAudit + Items)
  // -------------------------
  // Prefer audit within month, else fallback latest overall
  let audit = await prisma.retailerStockAudit.findFirst({
    where: { retailerId, createdAt: { gte: range.from, lt: range.to } },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  if (!audit) {
    audit = await prisma.retailerStockAudit.findFirst({
      where: { retailerId },
      orderBy: { createdAt: "desc" },
      select: { id: true, createdAt: true },
    });
  }

  const auditIndex = new Map<string, number>();
  let auditItemsCount = 0;

  if (audit?.id) {
    const agg = await prisma.retailerStockAuditItem.groupBy({
      by: ["productName"],
      where: { auditId: audit.id },
      _sum: { physicalQty: true },
      _count: { _all: true },
    });

    for (const r of agg) {
      const pn = cleanStr(r.productName) || "Unknown";
      const key = pn.toLowerCase();
      const sum = Number(r._sum.physicalQty || 0);
      auditIndex.set(key, sum);
      auditItemsCount += Number(r._count?._all || 0);
    }
  }

  // -------------------------
  // 5) MERGE INTO ORDERED PRODUCTS
  // -------------------------
  const orderedProducts = orderedProductsBase.map((p) => {
    const key = p.productName.toLowerCase();
    const pendingQtyPcs = pendingIndex.get(key) ?? 0;
    const auditQtyPcs = auditIndex.get(key) ?? null;

    const hasAudit = typeof auditQtyPcs === "number";
    const physicalQtyPcs = hasAudit ? Math.max(0, Number(auditQtyPcs || 0)) : pendingQtyPcs;

    const physicalSource = hasAudit ? "AUDIT" : pendingQtyPcs > 0 ? "PENDING" : "NONE";

    return {
      ...p,
      pendingQtyPcs,
      auditQtyPcs: hasAudit ? Math.max(0, Number(auditQtyPcs || 0)) : null,
      physicalQtyPcs,
      physicalSource,
    };
  });

  // Pending stock list me bhi audit merge (so right panel can show physical)
  const pendingStock = pendingByProduct.map((p) => {
    const key = p.productName.toLowerCase();
    const auditQtyPcs = auditIndex.get(key) ?? null;
    const hasAudit = typeof auditQtyPcs === "number";
    const physicalQtyPcs = hasAudit ? Math.max(0, Number(auditQtyPcs || 0)) : p.qtyOnHandPcs;

    return {
      ...p,
      auditQtyPcs: hasAudit ? Math.max(0, Number(auditQtyPcs || 0)) : null,
      physicalQtyPcs,
      physicalSource: hasAudit ? "AUDIT" : p.qtyOnHandPcs > 0 ? "PENDING" : "NONE",
    };
  });

  // -------------------------
  // SUMMARY
  // -------------------------
  const totalOrders = (orders as any[]).length;
  const totalSales = (orders as any[]).reduce((a, o: any) => a + Number(o?.totalAmount || 0), 0);

  return NextResponse.json({
    ok: true,
    meta: {
      month,
      orderModelKey: ordFound.key,
      stockModelKey,
      stockRowsCount,
      hasPendingStock: pendingByProduct.length > 0,
      range: { from: range.from.toISOString(), to: range.to.toISOString() },

      // ✅ NEW: audit info (debug + UI)
      auditId: audit?.id || null,
      auditAt: audit?.createdAt ? new Date(audit.createdAt).toISOString() : null,
      auditItemsCount,
    },
    summary: {
      totalOrders,
      totalSales,
      aov: totalOrders ? totalSales / totalOrders : 0,
    },
    orders,
    orderedProducts,
    pendingStock,
  });
}