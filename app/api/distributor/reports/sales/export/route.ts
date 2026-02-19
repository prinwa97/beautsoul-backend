import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";
import ExcelJS from "exceljs";

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
        createdAt: true,
        totalAmount: true,
        items: { select: { qty: true, amount: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 5000,
    });

    const map = new Map<string, { invoices: number; qty: number; amount: number }>();
    let totalInvoices = 0, totalQty = 0, totalAmount = 0;

    for (const inv of invoices) {
      const key = inv.createdAt ? ymd(new Date(inv.createdAt)) : "Unknown";
      const row = map.get(key) || { invoices: 0, qty: 0, amount: 0 };

      row.invoices += 1; totalInvoices += 1;

      let invQty = 0, invAmt = 0;
      for (const it of inv.items || []) {
        invQty += Number(it.qty || 0);
        invAmt += Number(it.amount || 0);
      }
      const invTotal = Number(inv.totalAmount || invAmt || 0);

      row.qty += invQty;
      row.amount += invTotal;

      totalQty += invQty;
      totalAmount += invTotal;

      map.set(key, row);
    }

    const rows = Array.from(map.entries())
      .map(([date, v]) => ({ date, invoices: v.invoices, qty: v.qty, amount: v.amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const wb = new ExcelJS.Workbook();
    const sh = wb.addWorksheet("Sales Datewise");

    sh.columns = [
      { header: "Date", key: "date", width: 14 },
      { header: "Invoices", key: "invoices", width: 12 },
      { header: "Qty", key: "qty", width: 10 },
      { header: "Amount", key: "amount", width: 14 },
    ];

    sh.getRow(1).font = { bold: true };
    rows.forEach((r) => sh.addRow(r));

    sh.addRow({});
    sh.addRow({ date: "TOTAL", invoices: totalInvoices, qty: totalQty, amount: totalAmount });
    sh.getRow(sh.rowCount).font = { bold: true };

    const buf = await wb.xlsx.writeBuffer();
    const filename = `Sales_Report_${ymd(from)}_to_${ymd(toEnd)}.xlsx`;

    return new NextResponse(buf as any, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
