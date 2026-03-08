import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400, extra?: any) {
  return NextResponse.json({ ok: false, error: msg, ...extra }, { status });
}

function parseMonthToRangeUTC(month: string) {
  const m = String(month || "").trim();
  if (!/^\d{4}-\d{2}$/.test(m)) return null;

  const [yy, mm] = m.split("-").map((x) => Number(x));
  if (!yy || !mm || mm < 1 || mm > 12) return null;

  const from = new Date(Date.UTC(yy, mm - 1, 1, 0, 0, 0));
  const to = new Date(Date.UTC(yy, mm, 1, 0, 0, 0));
  return { from, to, month: `${yy}-${String(mm).padStart(2, "0")}` };
}

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

function toOptionalNumber(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
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

type ProductAggRow = {
  productName: string;
  qty: number;
  amount: number;
  orders: number;
};

function buildProductAggFromOrders(orders: any[]): ProductAggRow[] {
  const productAgg: Record<string, ProductAggRow> = {};

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

  return Object.values(productAgg).sort((a, b) => b.amount - a.amount);
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ retailerId: string }> }
) {
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
  // 1) ORDER MODEL
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

  // --------------------------------------------------
  // 2) CURRENT MONTH ORDERS
  // --------------------------------------------------
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

  const orderedProductsBase = buildProductAggFromOrders(orders as any[]);

  // --------------------------------------------------
  // 3) PREVIOUS MONTH ORDERS
  // --------------------------------------------------
  let prevMonthOrders: any[] = [];
  let prevOrderedProductsBase: ProductAggRow[] = [];

  if (prevRange) {
    prevMonthOrders = await Order.findMany({
      where: {
        retailerId,
        createdAt: { gte: prevRange.from, lt: prevRange.to },
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
      },
    }).catch(async () => []);

    prevOrderedProductsBase = buildProductAggFromOrders(prevMonthOrders as any[]);
  }

  // --------------------------------------------------
  // 4) SYSTEM PENDING STOCK (CURRENT LIVE STOCK)
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
  // 5) CURRENT MONTH AUDIT
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

  const hasAuditInMonth = !!auditInMonth?.id;

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

      const physicalRaw = toOptionalNumber(r?._sum?.physicalQty);
      const soldRaw = toOptionalNumber(r?._sum?.soldQty);

      auditPhysicalIndex.set(k, clamp0(physicalRaw ?? 0));

      // soldQty tabhi set karo jab actually value present ho
      if (soldRaw !== null) {
        auditSoldIndex.set(k, clamp0(soldRaw));
      }

      if (!auditNameIndex.has(k)) auditNameIndex.set(k, pn);

      auditItemsCount += num(r?._count?._all);
    }
  }

  // --------------------------------------------------
  // 6) PREVIOUS MONTH AUDIT
  // --------------------------------------------------
  const prevAudit = prevRange
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
      const physicalRaw = toOptionalNumber(r?._sum?.physicalQty);

      prevPhysicalIndex.set(k, clamp0(physicalRaw ?? 0));
      if (!prevAuditNameIndex.has(k)) prevAuditNameIndex.set(k, pn);

      prevAuditItemsCount += num(r?._count?._all);
    }
  }

  // --------------------------------------------------
  // 7) PREVIOUS MONTH OPENING ESTIMATE BASE
  // --------------------------------------------------
  const prevPrevRange = prevRange ? getPreviousMonthRangeUTC(prevRange.month) : null;

  const prevPrevAudit = prevPrevRange
    ? await prisma.retailerStockAudit.findFirst({
        where: {
          retailerId,
          createdAt: { gte: prevPrevRange.from, lt: prevPrevRange.to },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, createdAt: true },
      })
    : null;

  const prevPrevPhysicalIndex = new Map<string, number>();

  if (prevPrevAudit?.id) {
    const prevPrevAgg = await prisma.retailerStockAuditItem
      .groupBy({
        by: ["productName"],
        where: { auditId: prevPrevAudit.id },
        _sum: { physicalQty: true },
      })
      .catch(async () => []);

    for (const r of prevPrevAgg as any[]) {
      const pn = cleanStr(r.productName) || "Unknown";
      const k = pn.toLowerCase();
      const physicalRaw = toOptionalNumber(r?._sum?.physicalQty);
      prevPrevPhysicalIndex.set(k, clamp0(physicalRaw ?? 0));
    }
  }

  const prevBaseMap = new Map<string, ProductAggRow>();
  for (const p of prevOrderedProductsBase) {
    prevBaseMap.set(p.productName.toLowerCase(), p);
  }

  // --------------------------------------------------
  // 8) MERGE PRODUCTS
  // --------------------------------------------------
  const baseMap = new Map<string, ProductAggRow>();
  for (const p of orderedProductsBase) {
    baseMap.set(p.productName.toLowerCase(), p);
  }

  const pendingMap = new Map<string, { productName: string; qtyOnHandPcs: number }>();
  for (const p of pendingByProduct) {
    pendingMap.set(p.productName.toLowerCase(), p);
  }

  const keySet = new Set<string>();
  for (const p of orderedProductsBase) keySet.add(p.productName.toLowerCase());
  for (const p of prevOrderedProductsBase) keySet.add(p.productName.toLowerCase());
  for (const k of auditPhysicalIndex.keys()) keySet.add(k);
  for (const k of prevPhysicalIndex.keys()) keySet.add(k);
  for (const k of prevPrevPhysicalIndex.keys()) keySet.add(k);

  // current pending ko sirf tab include karo jab current month audit NA ho
  if (!hasAuditInMonth) {
    for (const k of pendingIndex.keys()) keySet.add(k);
  }

  const keys = Array.from(keySet.values());

  const orderedProducts = keys.map((k) => {
    const base = baseMap.get(k);
    const prevBase = prevBaseMap.get(k);
    const pendingRow = pendingMap.get(k);

    const productName =
      base?.productName ||
      prevBase?.productName ||
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

    const prevOrderQty = num(prevBase?.qty);

    const prevPrevPhysical = prevPrevPhysicalIndex.has(k)
      ? clamp0(num(prevPrevPhysicalIndex.get(k)))
      : null;

    let openingStockQtyPcs = 0;
    let openingSource:
      | "PREVIOUS_AUDIT"
      | "PREVIOUS_ESTIMATED_CLOSING"
      | "PENDING_FALLBACK"
      | "OPENING_PLUS_ORDERS"
      | "NONE" = "NONE";

    if (previousMonthPhysicalQtyPcs != null) {
      openingStockQtyPcs = previousMonthPhysicalQtyPcs;
      openingSource = "PREVIOUS_AUDIT";
    } else {
      const prevEstimatedFromOlderAudit =
        prevPrevPhysical != null
          ? clamp0(prevPrevPhysical + prevOrderQty - pendingQtyPcs)
          : null;

      if (prevEstimatedFromOlderAudit != null) {
        openingStockQtyPcs = prevEstimatedFromOlderAudit;
        openingSource = "PREVIOUS_ESTIMATED_CLOSING";
      } else if (!hasAuditInMonth && pendingQtyPcs > 0) {
        openingStockQtyPcs = pendingQtyPcs;
        openingSource = "PENDING_FALLBACK";
      } else if (prevOrderQty > 0) {
        openingStockQtyPcs = prevOrderQty;
        openingSource = "OPENING_PLUS_ORDERS";
      } else {
        openingStockQtyPcs = 0;
        openingSource = "NONE";
      }
    }

    const auditQtyPcsRaw = auditPhysicalIndex.get(k);
    const auditQtyPcs =
      hasAuditInMonth && typeof auditQtyPcsRaw === "number" ? clamp0(auditQtyPcsRaw) : null;

    // IMPORTANT:
    // audit month me pending fallback mat use karo
    const physicalQtyPcs =
      hasAuditInMonth
        ? auditQtyPcs
        : auditQtyPcs != null
        ? auditQtyPcs
        : pendingQtyPcs > 0
        ? pendingQtyPcs
        : null;

    const auditSoldRaw = auditSoldIndex.get(k);
    const auditSoldQty =
      hasAuditInMonth && typeof auditSoldRaw === "number" ? clamp0(auditSoldRaw) : null;

    const soldQtyPcs =
      auditSoldQty != null
        ? auditSoldQty
        : physicalQtyPcs == null
        ? null
        : clamp0(openingStockQtyPcs + orderQty - physicalQtyPcs);

    const soldSource: "AUDIT" | "FORMULA" | "NONE" =
      auditSoldQty != null ? "AUDIT" : physicalQtyPcs != null ? "FORMULA" : "NONE";

    const physicalSource: "AUDIT" | "PENDING" | "NONE" =
      hasAuditInMonth
        ? auditQtyPcs != null
          ? "AUDIT"
          : "NONE"
        : auditQtyPcs != null
        ? "AUDIT"
        : pendingQtyPcs > 0
        ? "PENDING"
        : "NONE";

    return {
      productName,
      openingStockQtyPcs,
      openingSource,
      previousMonthPhysicalQtyPcs,
      orders: ordersCount,
      qty: orderQty,
      amount,
      pendingQtyPcs,
      soldQtyPcs,
      soldSource,
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
  // 9) PENDING STOCK LIST
  // --------------------------------------------------
  const pendingStock = hasAuditInMonth
    ? []
    : pendingByProduct.map((p) => {
        const k = p.productName.toLowerCase();
        const pendingQtyPcs = num(p.qtyOnHandPcs);

        const previousMonthPhysicalQtyPcsRaw = prevPhysicalIndex.get(k);
        const previousMonthPhysicalQtyPcs =
          typeof previousMonthPhysicalQtyPcsRaw === "number"
            ? clamp0(previousMonthPhysicalQtyPcsRaw)
            : null;

        const prevOrderQty = num(prevBaseMap.get(k)?.qty);

        const prevPrevPhysical = prevPrevPhysicalIndex.has(k)
          ? clamp0(num(prevPrevPhysicalIndex.get(k)))
          : null;

        let openingStockQtyPcs = 0;
        let openingSource:
          | "PREVIOUS_AUDIT"
          | "PREVIOUS_ESTIMATED_CLOSING"
          | "PENDING_FALLBACK"
          | "OPENING_PLUS_ORDERS"
          | "NONE" = "NONE";

        if (previousMonthPhysicalQtyPcs != null) {
          openingStockQtyPcs = previousMonthPhysicalQtyPcs;
          openingSource = "PREVIOUS_AUDIT";
        } else {
          const prevEstimatedFromOlderAudit =
            prevPrevPhysical != null
              ? clamp0(prevPrevPhysical + prevOrderQty - pendingQtyPcs)
              : null;

          if (prevEstimatedFromOlderAudit != null) {
            openingStockQtyPcs = prevEstimatedFromOlderAudit;
            openingSource = "PREVIOUS_ESTIMATED_CLOSING";
          } else if (pendingQtyPcs > 0) {
            openingStockQtyPcs = pendingQtyPcs;
            openingSource = "PENDING_FALLBACK";
          } else if (prevOrderQty > 0) {
            openingStockQtyPcs = prevOrderQty;
            openingSource = "OPENING_PLUS_ORDERS";
          } else {
            openingStockQtyPcs = 0;
            openingSource = "NONE";
          }
        }

        const auditQtyPcsRaw = auditPhysicalIndex.get(k);
        const auditQtyPcs =
          hasAuditInMonth && typeof auditQtyPcsRaw === "number" ? clamp0(auditQtyPcsRaw) : null;

        const physicalQtyPcs =
          auditQtyPcs != null ? auditQtyPcs : pendingQtyPcs > 0 ? pendingQtyPcs : null;

        const auditSoldRaw = auditSoldIndex.get(k);
        const auditSoldQty =
          hasAuditInMonth && typeof auditSoldRaw === "number" ? clamp0(auditSoldRaw) : null;

        const soldQtyPcs =
          auditSoldQty != null
            ? auditSoldQty
            : physicalQtyPcs == null
            ? null
            : clamp0(openingStockQtyPcs - physicalQtyPcs);

        const soldSource: "AUDIT" | "FORMULA" | "NONE" =
          auditSoldQty != null ? "AUDIT" : physicalQtyPcs != null ? "FORMULA" : "NONE";

        return {
          ...p,
          openingStockQtyPcs,
          openingSource,
          previousMonthPhysicalQtyPcs,
          auditQtyPcs,
          physicalQtyPcs,
          soldQtyPcs,
          soldSource,
          physicalSource: auditQtyPcs != null ? "AUDIT" : pendingQtyPcs > 0 ? "PENDING" : "NONE",
        };
      });

  // --------------------------------------------------
  // 10) SUMMARY
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
      hasAuditInMonth,
      range: {
        from: range.from.toISOString(),
        to: range.to.toISOString(),
      },
      auditId: auditInMonth?.id || null,
      auditAt: auditInMonth?.createdAt
        ? new Date(auditInMonth.createdAt).toISOString()
        : null,
      auditItemsCount,
      auditFoundInMonth: !!auditInMonth?.id,
      latestAuditId: latestAudit?.id || null,
      latestAuditAt: latestAudit?.createdAt
        ? new Date(latestAudit.createdAt).toISOString()
        : null,
      previousMonth: prevRange?.month || null,
      previousAuditId: prevAudit?.id || null,
      previousAuditAt: prevAudit?.createdAt
        ? new Date(prevAudit.createdAt).toISOString()
        : null,
      previousAuditItemsCount: prevAuditItemsCount,
      previousPreviousMonth: prevPrevRange?.month || null,
      previousPreviousAuditId: prevPrevAudit?.id || null,
      previousPreviousAuditAt: prevPrevAudit?.createdAt
        ? new Date(prevPrevAudit.createdAt).toISOString()
        : null,
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