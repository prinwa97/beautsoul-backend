import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/app/lib/sales-manager/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400, extra?: any) {
  return NextResponse.json({ ok: false, error: msg, ...extra }, { status });
}

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function GET(_req: Request, ctx: { params: Promise<{ retailerId: string }> }) {
  const auth = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);
  if (!auth.ok) return jsonError(auth.error || "UNAUTHORIZED", auth.status || 401);

  const { retailerId } = await ctx.params;
  if (!retailerId) return jsonError("retailerId required", 400);

  const retailer = await prisma.retailer.findFirst({
    where: { id: retailerId },
    select: {
      id: true,
      name: true,
      phone: true,
      gst: true,
      address: true,
      city: true,
      district: true,
      state: true,
      pincode: true,
      status: true,
      createdAt: true,
      distributor: { select: { id: true, name: true } },
    },
  });
  if (!retailer) return jsonError("RETAILER_NOT_FOUND", 404);

  // ✅ Orders list
  const orders = await prisma.order.findMany({
    where: { retailerId },
    orderBy: { createdAt: "desc" },
    take: 80,
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
  });

  // ✅ Month-wise (last 6 months)
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

  // orders for month aggregation WITH items qty
  const orders6m = await prisma.order.findMany({
    where: { retailerId, createdAt: { gte: start } },
    select: {
      createdAt: true,
      totalAmount: true,
      items: { select: { qty: true } },
    },
  });

  const orderMonthMap: Record<string, { orders: number; sales: number; orderQty: number }> = {};
  for (const o of orders6m) {
    const k = monthKey(new Date(o.createdAt));
    if (!orderMonthMap[k]) orderMonthMap[k] = { orders: 0, sales: 0, orderQty: 0 };
    orderMonthMap[k].orders += 1;
    orderMonthMap[k].sales += Number(o.totalAmount || 0);
    for (const it of o.items) orderMonthMap[k].orderQty += Number(it.qty || 0);
  }

  // ✅ Month-wise Physical + Sold Qty from FO audit
  // NOTE: audit missing => sold/physical should be NULL (so UI shows "—")
  const audits6m = await prisma.retailerStockAudit.findMany({
    where: { retailerId, auditDate: { gte: start } },
    select: {
      auditDate: true,
      items: { select: { physicalQty: true, soldQty: true } },
    },
    take: 3000,
    orderBy: { auditDate: "desc" },
  });

  const auditMonthMap: Record<string, { physicalQty: number; soldQty: number; auditsCount: number }> = {};
  for (const a of audits6m) {
    const k = monthKey(new Date(a.auditDate));
    if (!auditMonthMap[k]) auditMonthMap[k] = { physicalQty: 0, soldQty: 0, auditsCount: 0 };

    auditMonthMap[k].auditsCount += 1;
    for (const it of a.items) {
      auditMonthMap[k].physicalQty += Number(it.physicalQty ?? 0);
      auditMonthMap[k].soldQty += Number(it.soldQty ?? 0);
    }
  }

  // month keys chronological
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(monthKey(d));
  }

  const monthWise = monthKeys.map((k) => {
    const ordersCount = orderMonthMap[k]?.orders || 0;
    const orderQty = orderMonthMap[k]?.orderQty || 0;

    const hasAudit = (auditMonthMap[k]?.auditsCount || 0) > 0;

    return {
      month: k,
      orders: ordersCount,
      orderQty,
      // ✅ NULL if no audit (avoid fake 0 / fake 100% sell-through)
      physicalQty: hasAudit ? auditMonthMap[k].physicalQty : null,
      soldQty: hasAudit ? auditMonthMap[k].soldQty : null,
      // ✅ UI badge helper
      auditMissing: !hasAudit && ordersCount > 0,
      sales: orderMonthMap[k]?.sales || 0,
    };
  });

  const totalOrders = orders.length;
  const totalSales = orders.reduce((a, x) => a + Number(x.totalAmount || 0), 0);
  const lastOrderAt = orders?.[0]?.createdAt || null;

  return NextResponse.json({
    ok: true,
    retailer,
    summary: {
      totalOrders,
      totalSales,
      aov: totalOrders ? totalSales / totalOrders : 0,
      lastOrderAt,
    },
    monthWise,
    orders,
  });
}