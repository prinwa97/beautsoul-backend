// app/api/distributor/reports/sales/route.ts
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

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

type Row = {
  id: string; // ✅ for unique key + download
  date: string; // YYYY-MM-DD
  invoiceNo: string;
  retailerId: string;
  retailerName: string;
  qty: number;
  amount: number;
};

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

    const toEnd = new Date(to);
    toEnd.setHours(23, 59, 59, 999);

    const invoices = await prisma.invoice.findMany({
      where: { distributorId, createdAt: { gte: from, lte: toEnd } },
      select: {
        id: true,
        invoiceNo: true,
        createdAt: true,
        totalAmount: true,
        retailerId: true,
        retailer: { select: { name: true } },
        items: { select: { qty: true, amount: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const rows: Row[] = [];

    let totalInvoices = 0;
    let totalQty = 0;
    let totalAmount = 0;

    for (const inv of invoices) {
      totalInvoices += 1;

      let invQty = 0;
      let invItemsAmt = 0;

      for (const it of inv.items || []) {
        invQty += Number(it.qty || 0);
        invItemsAmt += Number(it.amount || 0);
      }

      const invTotal = Number(inv.totalAmount || invItemsAmt || 0);

      totalQty += invQty;
      totalAmount += invTotal;

      rows.push({
        id: inv.id,
        date: inv.createdAt ? ymd(new Date(inv.createdAt)) : "Unknown",
        invoiceNo: inv.invoiceNo || "",
        retailerId: inv.retailerId || "",
        retailerName: inv.retailer?.name || "Unknown Retailer",
        qty: invQty,
        amount: invTotal,
      });
    }

    return NextResponse.json({
      ok: true,
      rows,
      totals: { invoices: totalInvoices, qty: totalQty, amount: totalAmount },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
