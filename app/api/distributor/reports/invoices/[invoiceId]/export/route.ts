import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ymd(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function n(v: any) {
  const x = Number(v || 0);
  return Number.isFinite(x) ? x : 0;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const distributorId = await requireDistributorId();
    const { invoiceId } = await ctx.params;

    const inv = await prisma.invoice.findFirst({
      where: { id: invoiceId, distributorId },
      select: {
        id: true,
        invoiceNo: true,
        createdAt: true,
        invoiceType: true,
        totalAmount: true,
        paidAmount: true,
        paymentStatus: true,
        paymentMode: true,
        remarks: true,
        retailer: { select: { name: true } },
        items: { select: { productName: true, qty: true, amount: true } },
      },
    });

    if (!inv) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet("Invoice");

    sheet.addRow(["Invoice No", inv.invoiceNo || inv.id]);
    sheet.addRow(["Date", inv.createdAt ? ymd(new Date(inv.createdAt)) : ""]);
    sheet.addRow(["Retailer", inv.retailer?.name || ""]);
    sheet.addRow(["Total", n(inv.totalAmount)]);
    sheet.addRow(["Paid", n(inv.paidAmount)]);
    sheet.addRow(["Status", inv.paymentStatus || ""]);
    sheet.addRow([]);

    sheet.addRow(["Product", "Qty", "Amount"]).font = { bold: true };

    for (const it of inv.items || []) {
      sheet.addRow([
        it.productName || "",
        n(it.qty),
        n(it.amount),
      ]);
    }

    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer as any, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="invoice.xlsx"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
