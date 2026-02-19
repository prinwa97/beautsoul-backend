import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clamp(n: number, a: number, b: number) {
  n = Number(n);
  if (!Number.isFinite(n)) n = a;
  return Math.min(Math.max(n, a), b);
}
function n(x: any) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET(req: Request) {
  let distributorId: string;

  try {
    distributorId = await requireDistributorId();
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED", message: String(e?.message || "Unauthorized") },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const days = clamp(searchParams.get("days") || "30" as any, 7, 365);

  const to = new Date();
  const from = startOfDay(new Date(Date.now() - (days - 1) * 24 * 3600 * 1000));

  // previous period
  const prevTo = new Date(from);
  prevTo.setMilliseconds(-1);
  const prevFrom = startOfDay(new Date(from.getTime() - days * 24 * 3600 * 1000));

  // ✅ IMPORTANT: Use Order + items + retailer (your schema)
  const orders = await prisma.order.findMany({
    where: {
      distributorId,
      createdAt: { gte: from, lte: to },
      status: { in: ["SUBMITTED", "CONFIRMED", "DISPATCHED", "DELIVERED"] },
    },
    select: {
      id: true,
      retailerId: true,
      totalAmount: true,
      createdAt: true,
      retailer: { select: { id: true, name: true, city: true } }, // ✅ FIX
      items: { select: { productName: true, qty: true, rate: true, amount: true } }, // ✅ FIX
    },
  });

  const prevOrders = await prisma.order.findMany({
    where: {
      distributorId,
      createdAt: { gte: prevFrom, lte: prevTo },
      status: { in: ["SUBMITTED", "CONFIRMED", "DISPATCHED", "DELIVERED"] },
    },
    select: {
      totalAmount: true,
      items: { select: { qty: true, rate: true, amount: true } }, // ✅ FIX
    },
  });

  const orderTotal = (o: any) => {
    const items = o?.items || [];
    const calc = items.reduce((s: number, it: any) => {
      const qty = n(it.qty);
      const rate = n(it.rate);
      const amt = it.amount != null ? n(it.amount) : qty * rate;
      return s + Math.max(0, amt);
    }, 0);
    const t = o?.totalAmount != null ? n(o.totalAmount) : 0;
    return t > 0 ? t : calc;
  };

  // ---- current aggregates ----
  let totalSales = 0;
  const activeRetailerSet = new Set<string>();

  const retailerAgg = new Map<
    string,
    { id: string; name: string; city: string | null; amount: number; orders: number }
  >();

  const productAgg = new Map<string, { amount: number; qty: number }>();

  for (const o of orders) {
    const amount = orderTotal(o);
    totalSales += amount;

    const rid = String(o.retailerId || "");
    if (rid && amount > 0) activeRetailerSet.add(rid);

    // retailer agg
    const rname = o.retailer?.name || "Retailer";
    const rcity = o.retailer?.city ?? null;
    const prev = retailerAgg.get(rid) || { id: rid, name: rname, city: rcity, amount: 0, orders: 0 };
    prev.amount += amount;
    prev.orders += 1;
    retailerAgg.set(rid, prev);

    // product agg
    for (const it of o.items || []) {
      const pn = String(it.productName || "").trim() || "Unknown";
      const qty = Math.max(0, Math.floor(n(it.qty)));
      const rate = n(it.rate);
      const amt = it.amount != null ? n(it.amount) : qty * rate;

      const p = productAgg.get(pn) || { amount: 0, qty: 0 };
      p.amount += Math.max(0, amt);
      p.qty += qty;
      productAgg.set(pn, p);
    }
  }

  const sortedRetailers = Array.from(retailerAgg.values()).sort((a, b) => b.amount - a.amount);
  const topRetailers = sortedRetailers.slice(0, 10);
  const topRetailer = sortedRetailers[0] || null;

  const topProductEntry =
    Array.from(productAgg.entries()).sort((a, b) => b[1].amount - a[1].amount)[0] || null;

  const topProduct = topProductEntry
    ? { name: topProductEntry[0], amount: Math.round(topProductEntry[1].amount), qty: topProductEntry[1].qty }
    : null;

  // ---- previous total for growth ----
  let prevTotalSales = 0;
  for (const o of prevOrders) prevTotalSales += orderTotal(o);

  const pctChange =
    prevTotalSales > 0 ? Math.round(((totalSales - prevTotalSales) / prevTotalSales) * 100) : null;

  return NextResponse.json({
    ok: true,
    days,
    totalSales: Math.round(totalSales),
    prevTotalSales: Math.round(prevTotalSales),
    pctChange,
    totalOrders: orders.length,
    activeRetailers: activeRetailerSet.size,

    topRetailer: topRetailer
      ? {
          id: topRetailer.id,
          name: topRetailer.name,
          city: topRetailer.city,
          amount: Math.round(topRetailer.amount),
          orders: topRetailer.orders,
        }
      : null,

    topRetailers: topRetailers.map((r) => ({
      id: r.id,
      name: r.name,
      city: r.city,
      amount: Math.round(r.amount),
      orders: r.orders,
    })),

    topProduct,
  });
}