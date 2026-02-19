// app/api/distributor/reports/summary/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDateParam(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

export async function GET(req: Request) {
  try {
    const distributorId = await requireDistributorId();

    const { searchParams } = new URL(req.url);
    const from = parseDateParam(searchParams.get("from"));
    const to = parseDateParam(searchParams.get("to"));

    if (!from || !to) {
      return NextResponse.json(
        { ok: false, error: "from & to (YYYY-MM-DD) required" },
        { status: 400 }
      );
    }

    // inclusive "to"
    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
      where: {
        distributorId,
        createdAt: { gte: from, lte: toEnd },
      },
      select: {
        id: true,
        invoiceNo: true,
        totalAmount: true,
        paidAmount: true,
        paymentStatus: true,
        retailerId: true,
        createdAt: true,
        retailer: { select: { name: true } }, // ✅ relation se name
        items: {
          select: {
            productName: true,
            qty: true,
            amount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    let totalSalesAmount = 0;
    let pendingAmount = 0;

    const productAgg = new Map<string, { qty: number; amount: number }>();
    const retailerAgg = new Map<
      string,
      { retailerName: string; amount: number; invoices: number; pending: number }
    >();

    for (const inv of invoices) {
      const total = Number(inv.totalAmount || 0);
      const paid = Number(inv.paidAmount || 0);
      const pending = Math.max(0, total - paid);

      totalSalesAmount += total;
      pendingAmount += pending;

      const rid = String(inv.retailerId || "");
      const rname = inv.retailer?.name || "Retailer";

      if (rid) {
        const r =
          retailerAgg.get(rid) || {
            retailerName: rname,
            amount: 0,
            invoices: 0,
            pending: 0,
          };
        r.amount += total;
        r.invoices += 1;
        r.pending += pending;
        r.retailerName = rname || r.retailerName;
        retailerAgg.set(rid, r);
      }

      for (const it of inv.items || []) {
        const key = String(it.productName || "").trim() || "Unknown";
        const row = productAgg.get(key) || { qty: 0, amount: 0 };
        row.qty += Number(it.qty || 0);
        row.amount += Number(it.amount || 0);
        productAgg.set(key, row);
      }
    }

    const topProducts = Array.from(productAgg.entries())
      .map(([productName, v]) => ({ productName, qty: v.qty, amount: v.amount }))
      .sort((a, b) => b.amount - a.amount);

    const topRetailers = Array.from(retailerAgg.entries())
      .map(([retailerId, v]) => ({
        retailerId,
        retailerName: v.retailerName,
        amount: v.amount,
        invoices: v.invoices,
        pending: v.pending,
      }))
      .sort((a, b) => b.amount - a.amount);

    const totalRetailers = await prisma.retailer
      .count({ where: { distributorId } })
      .catch(() => 0);

    return NextResponse.json({
      ok: true,
      range: { from: from.toISOString(), to: toEnd.toISOString() },
      cards: {
        totalSalesAmount,
        totalInvoices: invoices.length,
        pendingAmount,
        totalRetailers,
      },
      topProducts: topProducts.slice(0, 20),
      topRetailers: topRetailers.slice(0, 20),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
