import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";
import { apiHandler } from "@/lib/api-handler";
import { badRequest, forbidden, internal, unauthorized } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function toIsoOrNull(v: any) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
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

type BatchDetailRow = {
  id: string;
  productName: string;
  batchNo: string | null;
  mfgDate: string | null;
  expiryDate: string | null;
  qtyOnHandPcs: number;
  rawQty: number;
  sourceFields: {
    batchField: string | null;
    qtyField: string | null;
    mfgField: string | null;
    expiryField: string | null;
  };
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

function normalizeBatchRows(rows: any[]): BatchDetailRow[] {
  const out: BatchDetailRow[] = [];

  for (const r of rows || []) {
    out.push({
      id: cleanStr(r.id) || `${cleanStr(r.productName)}-${cleanStr(r.batchNo)}`,
      productName: cleanStr(r.productName) || "Unknown",
      batchNo: cleanStr(r.batchNo) || null,
      mfgDate: toIsoOrNull(r.mfgDate),
      expiryDate: toIsoOrNull(r.expDate),
      qtyOnHandPcs: clamp0(num(r.qtyOnHandPcs)),
      rawQty: num(r.qtyOnHandPcs),
      sourceFields: {
        batchField: "batchNo",
        qtyField: "qtyOnHandPcs",
        mfgField: "mfgDate",
        expiryField: "expDate",
      },
    });
  }

  out.sort((a, b) => {
    const aExp = a.expiryDate ? new Date(a.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
    const bExp = b.expiryDate ? new Date(b.expiryDate).getTime() : Number.MAX_SAFE_INTEGER;
    if (aExp !== bExp) return aExp - bExp;
    return b.qtyOnHandPcs - a.qtyOnHandPcs;
  });

  return out;
}

const STOCK_SAFE_SELECT = {
  id: true,
  productName: true,
  batchNo: true,
  mfgDate: true,
  expDate: true,
  qtyOnHandPcs: true,
  createdAt: true,
} as const;

async function getBatchDetailsForRetailerProduct(params: {
  Stock: any;
  retailerId: string;
  productName: string;
}) {
  const { Stock, retailerId, productName } = params;
  const pname = cleanStr(productName);

  if (!Stock || !pname) return [];

  const candidateQueries = [
    {
      where: {
        ownerType: "RETAILER",
        ownerId: retailerId,
        productName: pname,
      },
    },
    {
      where: {
        ownerType: "RETAILER",
        ownerId: retailerId,
        productName: { equals: pname, mode: "insensitive" as const },
      },
    },
  ];

  for (const q of candidateQueries) {
    try {
      const rows = await Stock.findMany({
        ...q,
        select: STOCK_SAFE_SELECT,
        take: 500,
      });

      if (Array.isArray(rows) && rows.length > 0) {
        return normalizeBatchRows(rows);
      }
    } catch (err) {
      console.error("getBatchDetailsForRetailerProduct failed:", err);
    }
  }

  return [];
}

export const GET = apiHandler(
  async (
    req: Request,
    { params }: { params: Promise<{ retailerId: string }> }
  ) => {
    const auth = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);

    if (!auth?.ok) {
      const status = Number(auth?.status || 401);
      const message = String(auth?.error || "UNAUTHORIZED");

      if (status === 403) {
        throw forbidden(message);
      }

      throw unauthorized(message);
    }

    const { retailerId } = await params;

    if (!retailerId || !String(retailerId).trim()) {
      throw badRequest("retailerId required");
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month") || "";

    const range = parseMonthToRangeUTC(month);
    if (!range) {
      throw badRequest("Invalid month. Use YYYY-MM");
    }

    const prevRange = getPreviousMonthRangeUTC(month);
    const pr: any = prisma as any;

    const ordFound = pickRetailerOrderDelegate(pr);
    if (!ordFound) {
      throw internal("RETAILER_ORDER_MODEL_NOT_FOUND", "RETAILER_ORDER_MODEL_NOT_FOUND", {
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

    const orderedProductsBase = buildProductAggFromOrders(orders as any[]);

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

    const stockFound = pickStockLotDelegate(pr);
    let pendingByProduct: Array<{ productName: string; qtyOnHandPcs: number }> = [];
    let stockModelKey: string | null = null;
    let stockRowsCount = 0;
    let Stock: any = null;

    if (stockFound) {
      Stock = stockFound.delegate;
      stockModelKey = stockFound.key;

      const rows = await Stock.findMany({
        where: { ownerType: "RETAILER", ownerId: retailerId },
        select: {
          productName: true,
          qtyOnHandPcs: true,
        },
        take: 5000,
      }).catch(async (err: any) => {
        console.error("stock summary query failed:", err);
        return [];
      });

      stockRowsCount = Array.isArray(rows) ? rows.length : 0;

      const map: Record<string, { productName: string; qtyOnHandPcs: number }> = {};

      for (const r of rows as any[]) {
        const pname = cleanStr(r.productName) || "Unknown";
        const k = pname.toLowerCase();
        const q = num(r.qtyOnHandPcs ?? 0);

        if (!map[k]) map[k] = { productName: pname, qtyOnHandPcs: 0 };
        map[k].qtyOnHandPcs += q;
      }

      pendingByProduct = Object.values(map).sort((a, b) => b.qtyOnHandPcs - a.qtyOnHandPcs);
    }

    const pendingIndex = new Map<string, number>();
    for (const p of pendingByProduct) {
      pendingIndex.set(p.productName.toLowerCase(), p.qtyOnHandPcs);
    }

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
          _sum: { physicalQty: true },
          _count: { _all: true },
        })
        .catch(async () => []);

      for (const r of agg as any[]) {
        const pn = cleanStr(r.productName) || "Unknown";
        const k = pn.toLowerCase();

        const physicalRaw = toOptionalNumber(r?._sum?.physicalQty);
        auditPhysicalIndex.set(k, clamp0(physicalRaw ?? 0));

        if (!auditNameIndex.has(k)) auditNameIndex.set(k, pn);
        auditItemsCount += num(r?._count?._all);
      }
    }

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

    if (!hasAuditInMonth) {
      for (const k of pendingIndex.keys()) keySet.add(k);
    }

    const keys = Array.from(keySet.values());

    const orderedProducts = await Promise.all(
      keys.map(async (k) => {
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

        const physicalQtyPcs =
          hasAuditInMonth
            ? auditQtyPcs
            : auditQtyPcs != null
            ? auditQtyPcs
            : pendingQtyPcs > 0
            ? pendingQtyPcs
            : null;

        const soldQtyPcs =
          physicalQtyPcs == null ? null : clamp0(openingStockQtyPcs + orderQty - physicalQtyPcs);

        const soldSource: "FORMULA" | "NONE" = physicalQtyPcs != null ? "FORMULA" : "NONE";

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

        const batchDetails = Stock
          ? await getBatchDetailsForRetailerProduct({
              Stock,
              retailerId,
              productName,
            })
          : [];

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
          batchDetails,
          batchCount: batchDetails.length,
        };
      })
    );

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

    const pendingStock = hasAuditInMonth
      ? []
      : await Promise.all(
          pendingByProduct.map(async (p) => {
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

            const physicalQtyPcs = pendingQtyPcs > 0 ? pendingQtyPcs : null;

            const soldQtyPcs =
              physicalQtyPcs == null ? null : clamp0(openingStockQtyPcs - physicalQtyPcs);

            const soldSource: "FORMULA" | "NONE" = physicalQtyPcs != null ? "FORMULA" : "NONE";

            const batchDetails = Stock
              ? await getBatchDetailsForRetailerProduct({
                  Stock,
                  retailerId,
                  productName: p.productName,
                })
              : [];

            return {
              ...p,
              openingStockQtyPcs,
              openingSource,
              previousMonthPhysicalQtyPcs,
              auditQtyPcs: null,
              physicalQtyPcs,
              soldQtyPcs,
              soldSource,
              physicalSource: pendingQtyPcs > 0 ? "PENDING" : "NONE",
              batchDetails,
              batchCount: batchDetails.length,
            };
          })
        );

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
        auditAt: auditInMonth?.createdAt ? new Date(auditInMonth.createdAt).toISOString() : null,
        auditItemsCount,
        auditFoundInMonth: !!auditInMonth?.id,
        latestAuditId: latestAudit?.id || null,
        latestAuditAt: latestAudit?.createdAt ? new Date(latestAudit.createdAt).toISOString() : null,
        previousMonth: prevRange?.month || null,
        previousAuditId: prevAudit?.id || null,
        previousAuditAt: prevAudit?.createdAt ? new Date(prevAudit.createdAt).toISOString() : null,
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
);