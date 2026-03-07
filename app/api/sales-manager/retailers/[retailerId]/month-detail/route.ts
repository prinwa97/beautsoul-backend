import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400, extra?: any) {
  return NextResponse.json({ ok: false, error: msg, ...extra }, { status });
}

// current month UTC range
function parseMonthToRangeUTC(month: string) {
  const m = String(month || "").trim();
  if (!/^\d{4}-\d{2}$/.test(m)) return null;

  const [yy, mm] = m.split("-").map((x) => Number(x));
  if (!yy || !mm || mm < 1 || mm > 12) return null;

  const from = new Date(Date.UTC(yy, mm - 1, 1, 0, 0, 0));
  const to = new Date(Date.UTC(yy, mm, 1, 0, 0, 0));
  return { from, to };
}

// previous month UTC range
function getPreviousMonthRangeUTC(month: string) {
  const m = String(month || "").trim();
  if (!/^\d{4}-\d{2}$/.test(m)) return null;

  const [yy, mm] = m.split("-").map(Number);
  if (!yy || !mm || mm < 1 || mm > 12) return null;

  const prevYear = mm === 1 ? yy - 1 : yy;
  const prevMonth = mm === 1 ? 12 : mm - 1;

  const from = new Date(Date.UTC(prevYear, prevMonth - 1, 1, 0, 0, 0));
  const to = new Date(Date.UTC(prevYear, prevMonth, 1, 0, 0, 0));

  return {
    month: `${prevYear}-${String(prevMonth).padStart(2, "0")}`,
    from,
    to,
  };
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clamp0(v: number) {
  return v < 0 ? 0 : v;
}

function pickRetailerOrderDelegate(pr: any) {
  const candidates = ["retailerOrder", "retailerOrders", "order", "orders"];
  for (const k of candidates) {
    if (pr?.[k] && typeof pr[k]?.findMany === "function") {
      return { key: k, delegate: pr[k] };
    }
  }

  for (const k of Object.keys(pr || {})) {
    if (!pr?.[k] || typeof pr[k]?.findMany !== "function") continue;
    const lk = k.toLowerCase();
    if (lk.includes("retailer") && lk.includes("order")) {
      return { key: k, delegate: pr[k] };
    }
  }

  return null;
}

function pickStockLotDelegate(pr: any) {
  const candidates = ["stockLot", "stocklot", "inventoryBatch", "inventoryLot"];
  for (const k of candidates) {
    if (pr?.[k] && typeof pr[k]?.findMany === "function") {
      return { key: k, delegate: pr[k] };
    }
  }

  for (const k of Object.keys(pr || {})) {
    if (!pr?.[k] || typeof pr[k]?.findMany !== "function") continue;
    const lk = k.toLowerCase();
    if (lk.includes("stock") && (lk.includes("lot") || lk.includes("batch"))) {
      return { key: k, delegate: pr[k] };
    }
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

  const prevRange = getPreviousMonthRangeUTC(month);

  const pr: any = prisma as any;

  // --------------------------------------------------
  // 1) ORDERS
  // --------------------------------------------------
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
    where: {
      retailerId,
      createdAt: { gte: range.from, lt: range.to },
    },
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
      where: {
        retailerId,
        createdAt: { gte: range.from, lt: range.to },
      },
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

  // --------------------------------------------------
  // 2) ORDERED PRODUCTS AGG
  // --------------------------------------------------
  const productAgg: Record<
    string,
    { productName: string; qty: number; amount: number; orders: number }
  > = {};

  for (const o of orders as any[]) {
    const items = Array.isArray((o as any).items) ? (o as any).items : [];

    for (const it of items) {
      const pname = cleanStr(it.productName) || "Unknown";
      const k = pname.toLowerCase();

      if (!productAgg[k]) {
        productAgg[k] = {
          productName: pname,
          qty: 0,
          amount: 0,
          orders: 0,
        };
      }

      productAgg[k].qty += num(it.qty);
      productAgg[k].amount += num(it.amount);
    }

    const unique = new Set<string>(
      items.map((x: any) => (cleanStr(x?.productName) || "Unknown").toLowerCase())
    );

    for (const k of unique) {
      if (productAgg[k]) productAgg[k].orders += 1;
    }
  }

  const orderedProductsBase = Object.values(productAgg).sort((a, b) => b.amount - a.amount);

  // --------------------------------------------------
  // 3) SYSTEM PENDING STOCK (current live stock)
  // --------------------------------------------------
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
      const pname = cleanStr(r.productName) || "Unknown";
      const k = pname.toLowerCase();
      const q = num(r.qtyOnHandPcs ?? r.qty ?? r.quantity ?? 0);

      if (!map[k]) map[k] = { productName: pname, qtyOnHandPcs: 0 };
      map[k].qtyOnHandPcs += q;
    }

    pendingByProduct = Object.values(map).sort((a, b) => b.qtyOnHandPcs - a.qtyOnHandPcs);
  }

  const pendingIndex = new Map<string, number>();
  for (const p of pendingByProduct) {
    pendingIndex.set(p.productName.toLowerCase(), p.qtyOnHandPcs);
  }

  // --------------------------------------------------
  // 4) CURRENT MONTH AUDIT
  // --------------------------------------------------
  const auditInMonth = await prisma.retailerStockAudit.findFirst({
    where: {
      retailerId,
      createdAt: { gte: range.from, lt: range.to },
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  const latestAudit = await prisma.retailerStockAudit.findFirst({
    where: { retailerId },
    orderBy: { createdAt: "desc" },
    select: { id: true, createdAt: true },
  });

  const auditPhysicalIndex = new Map<string, number>();
  const auditSoldIndex = new Map<string, number>();
  const auditNameIndex = new Map<string, string>();
  let auditItemsCount = 0;

  if (auditInMonth?.id) {
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

      const physicalSum = num(r?._sum?.physicalQty);
      const soldSum = num(r?._sum?.soldQty);

      auditPhysicalIndex.set(k, clamp0(physicalSum));
      auditSoldIndex.set(k, clamp0(soldSum));

      if (!auditNameIndex.has(k)) auditNameIndex.set(k, pn);

      auditItemsCount += num(r?._count?._all);
    }
  }

  // --------------------------------------------------
  // 5) PREVIOUS MONTH AUDIT => OPENING STOCK
  // --------------------------------------------------
  const prevAudit =
    prevRange
      ? await prisma.retailerStockAudit.findFirst({
          where: {
            retailerId,
            createdAt: { gte: prevRange.from, lt: prevRange.to },
          },
          orderBy: { createdAt: "desc" },
          select: { id: true, createdAt: true },
        })
      : null;

  const prevPhysicalIndex = new Map<string, number>();
  const prevAuditNameIndex = new Map<string, string>();
  let prevAuditItemsCount = 0;

  if (prevAudit?.id) {
    const prevNameRows = await prisma.retailerStockAuditItem
      .findMany({
        where: { auditId: prevAudit.id },
        select: { productName: true },
        take: 5000,
      })
      .catch(async () => []);

    for (const row of prevNameRows as any[]) {
      const pn = cleanStr(row?.productName) || "Unknown";
      const k = pn.toLowerCase();
      if (!prevAuditNameIndex.has(k)) prevAuditNameIndex.set(k, pn);
    }

    const prevAgg = await prisma.retailerStockAuditItem
      .groupBy({
        by: ["productName"],
        where: { auditId: prevAudit.id },
        _sum: { physicalQty: true },
        _count: { _all: true },
      })
      .catch(async () => []);

    for (const r of prevAgg as any[]) {
      const pn = cleanStr(r.productName) || "Unknown";
      const k = pn.toLowerCase();
      const physicalSum = num(r?._sum?.physicalQty);

      prevPhysicalIndex.set(k, clamp0(physicalSum));
      if (!prevAuditNameIndex.has(k)) prevAuditNameIndex.set(k, pn);

      prevAuditItemsCount += num(r?._count?._all);
    }
  }

  // --------------------------------------------------
  // 6) MERGE PRODUCTS
  // --------------------------------------------------
  const baseMap = new Map<string, { productName: string; qty: number; amount: number; orders: number }>();
  for (const p of orderedProductsBase) {
    baseMap.set(p.productName.toLowerCase(), p);
  }

  const pendingMap = new Map<string, { productName: string; qtyOnHandPcs: number }>();
  for (const p of pendingByProduct) {
    pendingMap.set(p.productName.toLowerCase(), p);
  }

  const keySet = new Set<string>();
  for (const p of orderedProductsBase) keySet.add(p.productName.toLowerCase());
  for (const k of auditPhysicalIndex.keys()) keySet.add(k);
  for (const k of pendingIndex.keys()) keySet.add(k);
  for (const k of prevPhysicalIndex.keys()) keySet.add(k);

  const keys = Array.from(keySet.values());

  const orderedProducts = keys.map((k) => {
    const base = baseMap.get(k);
    const pendingRow = pendingMap.get(k);

    const productName =
      base?.productName ||
      auditNameIndex.get(k) ||
      prevAuditNameIndex.get(k) ||
      pendingRow?.productName ||
      k;

    const ordersCount = num(base?.orders);
    const orderQty = num(base?.qty);
    const amount = num(base?.amount);

    const pendingQtyPcs = num(pendingIndex.get(k) ?? 0);

    const previousMonthPhysicalQtyPcsRaw = prevPhysicalIndex.get(k);
    const previousMonthPhysicalQtyPcs =
      typeof previousMonthPhysicalQtyPcsRaw === "number"
        ? clamp0(previousMonthPhysicalQtyPcsRaw)
        : null;

    const openingStockQtyPcs =
      previousMonthPhysicalQtyPcs != null ? previousMonthPhysicalQtyPcs : 0;

    const auditQtyPcsRaw = auditPhysicalIndex.get(k);
    const hasAudit = !!auditInMonth?.id && typeof auditQtyPcsRaw === "number";
    const auditQtyPcs =
      hasAudit && typeof auditQtyPcsRaw === "number" ? clamp0(auditQtyPcsRaw) : null;

    // current month physical
    const physicalQtyPcs =
      auditQtyPcs != null ? auditQtyPcs : pendingQtyPcs > 0 ? pendingQtyPcs : null;

    // sold qty
    const auditSoldRaw = auditSoldIndex.get(k);
    const auditSoldQty =
      hasAudit && typeof auditSoldRaw === "number" ? clamp0(auditSoldRaw) : null;

    const soldQtyPcs =
      auditSoldQty != null
        ? auditSoldQty
        : physicalQtyPcs == null
        ? null
        : clamp0(openingStockQtyPcs + orderQty - physicalQtyPcs);

    const physicalSource: "AUDIT" | "PENDING" | "NONE" =
      auditQtyPcs != null ? "AUDIT" : pendingQtyPcs > 0 ? "PENDING" : "NONE";

    return {
      productName,
      openingStockQtyPcs,
      previousMonthPhysicalQtyPcs,

      orders: ordersCount,
      qty: orderQty,
      amount,

      pendingQtyPcs,
      soldQtyPcs,
      auditQtyPcs,
      physicalQtyPcs,
      physicalSource,
    };
  });

  orderedProducts.sort((a: any, b: any) => {
    const aHasOrder = num(a.amount) > 0 || num(a.qty) > 0 || num(a.orders) > 0;
    const bHasOrder = num(b.amount) > 0 || num(b.qty) > 0 || num(b.orders) > 0;
    if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;

    const aHasOpening = num(a.openingStockQtyPcs) > 0;
    const bHasOpening = num(b.openingStockQtyPcs) > 0;
    if (aHasOpening !== bHasOpening) return aHasOpening ? -1 : 1;

    const aHasAudit = a.auditQtyPcs != null;
    const bHasAudit = b.auditQtyPcs != null;
    if (aHasAudit !== bHasAudit) return aHasAudit ? -1 : 1;

    return num(b.amount) - num(a.amount) || num(b.qty) - num(a.qty);
  });

  // --------------------------------------------------
  // 7) PENDING STOCK LIST
  // --------------------------------------------------
  const pendingStock = pendingByProduct.map((p) => {
    const k = p.productName.toLowerCase();
    const pendingQtyPcs = num(p.qtyOnHandPcs);

    const previousMonthPhysicalQtyPcsRaw = prevPhysicalIndex.get(k);
    const previousMonthPhysicalQtyPcs =
      typeof previousMonthPhysicalQtyPcsRaw === "number"
        ? clamp0(previousMonthPhysicalQtyPcsRaw)
        : null;

    const openingStockQtyPcs =
      previousMonthPhysicalQtyPcs != null ? previousMonthPhysicalQtyPcs : 0;

    const auditQtyPcsRaw = auditPhysicalIndex.get(k);
    const hasAudit = !!auditInMonth?.id && typeof auditQtyPcsRaw === "number";
    const auditQtyPcs =
      hasAudit && typeof auditQtyPcsRaw === "number" ? clamp0(auditQtyPcsRaw) : null;

    const physicalQtyPcs =
      auditQtyPcs != null ? auditQtyPcs : pendingQtyPcs > 0 ? pendingQtyPcs : null;

    const auditSoldRaw = auditSoldIndex.get(k);
    const auditSoldQty =
      hasAudit && typeof auditSoldRaw === "number" ? clamp0(auditSoldRaw) : null;

    const soldQtyPcs =
      auditSoldQty != null
        ? auditSoldQty
        : physicalQtyPcs == null
        ? null
        : clamp0(openingStockQtyPcs - physicalQtyPcs);

    return {
      ...p,
      openingStockQtyPcs,
      previousMonthPhysicalQtyPcs,
      auditQtyPcs,
      physicalQtyPcs,
      soldQtyPcs,
      physicalSource: auditQtyPcs != null ? "AUDIT" : pendingQtyPcs > 0 ? "PENDING" : "NONE",
    };
  });

  // --------------------------------------------------
  // 8) SUMMARY
  // --------------------------------------------------
  const totalOrders = (orders as any[]).length;
  const totalSales = (orders as any[]).reduce((a, o: any) => a + num(o?.totalAmount), 0);

  return NextResponse.json({
    ok: true,
    meta: {
      month,
      orderModelKey: ordFound.key,
      stockModelKey,
      stockRowsCount,
      hasPendingStock: pendingByProduct.length > 0,
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },

      // current month audit
      auditId: auditInMonth?.id || null,
      auditAt: auditInMonth?.createdAt ? new Date(auditInMonth.createdAt).toISOString() : null,
      auditItemsCount,
      auditFoundInMonth: !!auditInMonth?.id,

      // latest audit
      latestAuditId: latestAudit?.id || null,
      latestAuditAt: latestAudit?.createdAt ? new Date(latestAudit.createdAt).toISOString() : null,

      // previous month audit
      previousMonth: prevRange?.month || null,
      previousAuditId: prevAudit?.id || null,
      previousAuditAt: prevAudit?.createdAt ? new Date(prevAudit.createdAt).toISOString() : null,
      previousAuditItemsCount: prevAuditItemsCount,
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