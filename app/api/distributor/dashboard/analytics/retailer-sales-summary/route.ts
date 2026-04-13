// ✅ NEW BACKEND API
// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/api/distributor/analytics/retailer-sales-summary/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function startOfMonth(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfPrevMonth(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth() - 1, 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfPrevMonth(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), 0);
  x.setHours(23, 59, 59, 999);
  return x;
}

function money(n: number) {
  return Math.round(n || 0);
}

async function ledgerTotals(distributorId: string, retailerId: string, from: Date, to: Date) {
  const rows = await prisma.retailerLedger.findMany({
    where: { distributorId, retailerId, date: { gte: from, lte: to } },
    select: { type: true, amount: true },
  });

  let sales = 0;
  let received = 0;

  for (const r of rows) {
    if (r.type === "DEBIT") sales += r.amount;
    else received += r.amount;
  }

  return { sales: money(sales), received: money(received), pending: money(sales - received) };
}

async function invoiceIdsForRange(distributorId: string, retailerId: string, from: Date, to: Date) {
  // assumes Invoice has createdAt (you have it in dispatch route comments)
  const inv = await prisma.invoice.findMany({
    where: { distributorId, retailerId, createdAt: { gte: from, lte: to } },
    select: { id: true },
  });
  return inv.map((x) => x.id);
}

async function topProductsByInvoices(invoiceIds: string[], take = 5) {
  if (!invoiceIds.length) return [];

  const groups = await prisma.invoiceItem.groupBy({
    by: ["productName"],
    where: { invoiceId: { in: invoiceIds } },
    _sum: { amount: true, qty: true },
    orderBy: { _sum: { amount: "desc" } },
    take,
  });

  return groups.map((g, idx) => ({
    rank: idx + 1,
    productName: g.productName,
    amount: money(Number(g._sum.amount || 0)),
    pcs: Number(g._sum.qty || 0),
  }));
}

export async function GET(req: Request) {
  try {
    const distributorId = await requireDistributorId();
    const { searchParams } = new URL(req.url);

    const retailerId = String(searchParams.get("retailerId") || "").trim();
    const take = Math.min(Number(searchParams.get("take") || "5"), 10);

    if (!retailerId) {
      return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });
    }

    // safety: retailer must belong to distributor
    const retailer = await prisma.retailer.findFirst({
      where: { id: retailerId, distributorId },
      select: { id: true, name: true, city: true, phone: true, status: true },
    });

    if (!retailer) {
      return NextResponse.json({ ok: false, error: "Retailer not found" }, { status: 404 });
    }

    const now = new Date();

    const thisMonthFrom = startOfMonth(now);
    const lastMonthFrom = startOfPrevMonth(now);
    const lastMonthTo = endOfPrevMonth(now);

    const [thisMonth, lastMonth] = await Promise.all([
      ledgerTotals(distributorId, retailerId, thisMonthFrom, now),
      ledgerTotals(distributorId, retailerId, lastMonthFrom, lastMonthTo),
    ]);

    const [thisInvIds, lastInvIds] = await Promise.all([
      invoiceIdsForRange(distributorId, retailerId, thisMonthFrom, now),
      invoiceIdsForRange(distributorId, retailerId, lastMonthFrom, lastMonthTo),
    ]);

    const [thisMonthTopProducts, lastMonthTopProducts] = await Promise.all([
      topProductsByInvoices(thisInvIds, take),
      topProductsByInvoices(lastInvIds, take),
    ]);

    return NextResponse.json({
      ok: true,
      retailer,
      thisMonth,
      lastMonth,
      thisMonthTopProducts,
      lastMonthTopProducts,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
