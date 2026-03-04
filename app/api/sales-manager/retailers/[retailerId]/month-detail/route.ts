import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400, extra?: any) {
  return NextResponse.json({ ok: false, error: msg, ...extra }, { status });
}

// ✅ IMPORTANT: Use UTC range so createdAt (UTC) matches correctly
function parseMonthToRangeUTC(month: string) {
  const m = String(month || "").trim();
  if (!/^\d{4}-\d{2}$/.test(m)) return null;
  const [yy, mm] = m.split("-").map((x) => Number(x));
  if (!yy || !mm || mm < 1 || mm > 12) return null;

  const from = new Date(Date.UTC(yy, mm - 1, 1, 0, 0, 0));
  const to = new Date(Date.UTC(yy, mm, 1, 0, 0, 0));
  return { from, to };
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
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
  const range = parseMonthToRangeUTC(month);
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
    return await Order.findMany({
      where: { retailerId, createdAt: { gte: range.from, lt: range.to } },
      orderBy: { createdAt: "desc" },
      select: { id: true, orderNo: true, status: true, createdAt: true, totalAmount: true },
    });
  });

  // -------------------------
  // 2) ORDERED PRODUCTS AGG (from orders)
  // -------------------------
  const productAgg: Record<string, { productName: string; qty: number; amount: number; orders: number }> = {};
  for (const o of orders as any[]) {
    const items = Array.isArray((o as any).items) ? (o as any).items : [];
    for (const it of items) {
      const pname = String(it.productName || "Unknown").trim();
      const k = pname.toLowerCase();
      if (!productAgg[k]) productAgg[k] = { productName: pname, qty: 0, amount: 0, orders: 0 };
      productAgg[k].qty += Number(it.qty || 0);
      productAgg[k].amount += Number(it.amount || 0);
    }
    const unique: Set<string> = new Set(items.map((x: any) => String(x?.productName || "Unknown").trim().toLowerCase()));
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
      const pname = String(r.productName || "Unknown").trim();
      const k = pname.toLowerCase();
      const q = Number(r.qtyOnHandPcs ?? r.qty ?? r.quantity ?? 0);
      if (!map[k]) map[k] = { productName: pname, qtyOnHandPcs: 0 };
      map[k].qtyOnHandPcs += q;
    }
    pendingByProduct = Object.values(map).sort((a, b) => b.qtyOnHandPcs - a.qtyOnHandPcs);
  }

  const pendingIndex = new Map<string, number>();
  for (const p of pendingByProduct) pendingIndex.set(p.productName.toLowerCase(), p.qtyOnHandPcs);

  // -------------------------
  // 4) AUDIT IN MONTH (NO FALLBACK FOR QTY)
  // -------------------------
  // ✅ Only use month audit for sold/physical numbers
  const auditInMonth = await prisma.retailerStockAudit.findFirst({
    where: { retailerId, createdAt: { gte: range.from, lt: range.to } },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  // ✅ latest overall only for meta display (NOT for qty calculations)
  const latestAudit = await prisma.retailerStockAudit.findFirst({
    where: { retailerId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  const auditPhysicalIndex = new Map<string, number>();
  const auditSoldIndex = new Map<string, number>();
  const auditNameIndex = new Map<string, string>(); // ✅ preserve real casing from audit items
  let auditItemsCount = 0;

  if (auditInMonth?.id) {
    // ✅ get proper names from audit items (small query)
    const auditNameRows = await prisma.retailerStockAuditItem
      .findMany({
        where: { auditId: auditInMonth.id },
        select: { productName: true },
        take: 5000,
      })
      .catch(async () => []);

    for (const row of auditNameRows as any[]) {
      const pn = cleanStr(row?.productName) || "Unknown";
      const k = pn.toLowerCase();
      if (!auditNameIndex.has(k)) auditNameIndex.set(k, pn);
    }

    // ✅ group sums
    const agg = await prisma.retailerStockAuditItem
      .groupBy({
        by: ["productName"],
        where: { auditId: auditInMonth.id },
        _sum: { physicalQty: true, soldQty: true },
        _count: { _all: true },
      })
      .catch(async () => []);

    for (const r of agg as any[]) {
      const pn = cleanStr(r.productName) || "Unknown";
      const k = pn.toLowerCase();

      const physicalSum = Number(r?._sum?.physicalQty ?? 0);
      const soldSum = Number(r?._sum?.soldQty ?? 0);

      auditPhysicalIndex.set(k, physicalSum);
      auditSoldIndex.set(k, soldSum);

      // ensure name exists
      if (!auditNameIndex.has(k)) auditNameIndex.set(k, pn);

      auditItemsCount += Number(r?._count?._all ?? 0);
    }
  }

  // -------------------------
  // 5) MERGE INTO ORDERED PRODUCTS (include AUDIT-only + pending-only)
  // -------------------------
  const keySet = new Set<string>();
  for (const p of orderedProductsBase) keySet.add(p.productName.toLowerCase());
  for (const k of auditPhysicalIndex.keys()) keySet.add(k);
  for (const k of pendingIndex.keys()) keySet.add(k);

  const keys = Array.from(keySet.values());

  const orderedProducts = keys.map((k) => {
    // base from orders (if exists)
    const base = orderedProductsBase.find((x) => x.productName.toLowerCase() === k);

    const productName =
      base?.productName || auditNameIndex.get(k) || (pendingByProduct.find((x) => x.productName.toLowerCase() === k)?.productName ?? k);

    const ordersCount = base?.orders || 0;
    const orderQty = base?.qty || 0;
    const amount = base?.amount || 0;

    const pendingQtyPcs = pendingIndex.get(k) ?? 0;

    const auditQtyPcs = auditPhysicalIndex.get(k);
    const hasAudit = !!auditInMonth?.id && typeof auditQtyPcs === "number";

    // ✅ physical: audit > pending > null
    const physicalQtyPcs = hasAudit
      ? Math.max(0, Number(auditQtyPcs || 0))
      : pendingQtyPcs > 0
      ? pendingQtyPcs
      : null;

    // ✅ sold: ONLY from audit, else null (unknown)
    const soldQtyPcs = hasAudit ? Math.max(0, Number(auditSoldIndex.get(k) ?? 0)) : null;

    const physicalSource = hasAudit ? "AUDIT" : pendingQtyPcs > 0 ? "PENDING" : "NONE";

    return {
      productName,
      orders: ordersCount,
      qty: orderQty,
      amount,

      pendingQtyPcs,
      soldQtyPcs,
      auditQtyPcs: hasAudit ? Math.max(0, Number(auditQtyPcs || 0)) : null,
      physicalQtyPcs,
      physicalSource,
    };
  });

  // ✅ sort: ordered first, then audit-only, then pending-only
  orderedProducts.sort((a: any, b: any) => {
    const aHasOrder = (a.amount || 0) > 0 || (a.qty || 0) > 0 || (a.orders || 0) > 0;
    const bHasOrder = (b.amount || 0) > 0 || (b.qty || 0) > 0 || (b.orders || 0) > 0;
    if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;

    const aHasAudit = a.auditQtyPcs != null;
    const bHasAudit = b.auditQtyPcs != null;
    if (aHasAudit !== bHasAudit) return aHasAudit ? -1 : 1;

    return (b.amount || 0) - (a.amount || 0) || (b.qty || 0) - (a.qty || 0);
  });

  const pendingStock = pendingByProduct.map((p) => {
    const k = p.productName.toLowerCase();
    const pendingQtyPcs = p.qtyOnHandPcs;

    const auditQtyPcs = auditPhysicalIndex.get(k);
    const hasAudit = !!auditInMonth?.id && typeof auditQtyPcs === "number";

    const physicalQtyPcs = hasAudit ? Math.max(0, Number(auditQtyPcs || 0)) : pendingQtyPcs > 0 ? pendingQtyPcs : null;
    const soldQtyPcs = hasAudit ? Math.max(0, Number(auditSoldIndex.get(k) ?? 0)) : null;

    return {
      ...p,
      auditQtyPcs: hasAudit ? Math.max(0, Number(auditQtyPcs || 0)) : null,
      physicalQtyPcs,
      soldQtyPcs,
      physicalSource: hasAudit ? "AUDIT" : pendingQtyPcs > 0 ? "PENDING" : "NONE",
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

      // ✅ month audit
      auditId: auditInMonth?.id || null,
      auditAt: auditInMonth?.createdAt ? new Date(auditInMonth.createdAt).toISOString() : null,
      auditItemsCount,
      auditFoundInMonth: !!auditInMonth?.id,

      // ✅ latest audit (display-only)
      latestAuditId: latestAudit?.id || null,
      latestAuditAt: latestAudit?.createdAt ? new Date(latestAudit.createdAt).toISOString() : null,
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