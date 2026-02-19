import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/app/lib/sales-manager/auth";

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

  // India TZ safe: month boundaries in local time can shift in ISO,
  // but for postgres DateTime it is ok. We'll use JS Date.
  const from = new Date(yy, mm - 1, 1, 0, 0, 0, 0);
  const to = new Date(yy, mm, 1, 0, 0, 0, 0);
  return { from, to };
}

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
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

  const ordFound = pickRetailerOrderDelegate(pr);
  if (!ordFound) {
    return jsonError("RETAILER_ORDER_MODEL_NOT_FOUND", 500, {
      availableDelegatesSample: Object.keys(pr || {})
        .filter((k) => typeof pr?.[k]?.findMany === "function")
        .slice(0, 80),
    });
  }
  const Order = ordFound.delegate;

  // ✅ Orders in this month
  // IMPORTANT: OrderItem has NO productId in your schema -> do NOT select it.
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

  // ✅ Aggregate ordered products month-wise (by productName only)
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

  // ✅ Pending / Physical available stock (safe)
  const stockFound = pickStockLotDelegate(pr);
  let pendingByProduct: Array<{ productName: string; qtyOnHandPcs: number }> = [];
  let stockModelKey: string | null = null;

  if (stockFound) {
    const Stock: any = stockFound.delegate;
    stockModelKey = stockFound.key;

    // Your error shows: retailerId is NOT a valid where arg.
    // So we only use ownerType+ownerId (your other code already uses this pattern).
    const rows = await Stock.findMany({
      where: { ownerType: "RETAILER", ownerId: retailerId },
      select: {
        productName: true,
        qtyOnHandPcs: true,
        qty: true,
        quantity: true,
      },
      take: 2000,
    }).catch(async () => []);

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

  const orderedProducts = orderedProductsBase.map((p) => ({
    ...p,
    pendingQtyPcs: pendingIndex.get(p.productName.toLowerCase()) ?? 0,
  }));

  const totalOrders = (orders as any[]).length;
  const totalSales = (orders as any[]).reduce((a, o: any) => a + Number(o?.totalAmount || 0), 0);

  return NextResponse.json({
    ok: true,
    meta: {
      month,
      orderModelKey: ordFound.key,
      stockModelKey,
      hasPendingStock: pendingByProduct.length > 0,
      range: { from: range.from.toISOString(), to: range.to.toISOString() },
    },
    summary: {
      totalOrders,
      totalSales,
      aov: totalOrders ? totalSales / totalOrders : 0,
    },
    orders,
    orderedProducts,
    pendingStock: pendingByProduct,
  });
}
