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

function n(v: any) {
  const x = Number(v || 0);
  return Number.isFinite(x) ? x : 0;
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

    // ✅ Schema ke hisaab se: retailer (small r), code nahi hai
    const invoices = await prisma.invoice.findMany({
      where: { distributorId, createdAt: { gte: from, lte: toEnd } },
      select: {
        invoiceNo: true,
        createdAt: true,
        retailerId: true,
        totalAmount: true,
        paidAmount: true,
        paymentStatus: true,
        paymentMode: true,
        utrNo: true,
        remarks: true,
        retailer: { select: { name: true, phone: true, city: true, state: true } },
        items: { select: { productName: true, qty: true, amount: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    // Aggregations
    let totalSalesAmount = 0;
    let pendingAmount = 0;

    const productAgg = new Map<string, { qty: number; amount: number }>();
    const retailerAgg = new Map<
      string,
      { name: string; amount: number; invoices: number; pending: number }
    >();

    for (const inv of invoices) {
      const total = n(inv.totalAmount);
      const paid = n(inv.paidAmount);
      const pending = Math.max(0, total - paid);

      totalSalesAmount += total;
      pendingAmount += pending;

      const rid = String(inv.retailerId || "");
      const rname = inv.retailer?.name || "Retailer";

      if (rid) {
        const r = retailerAgg.get(rid) || { name: rname, amount: 0, invoices: 0, pending: 0 };
        r.amount += total;
        r.invoices += 1;
        r.pending += pending;
        r.name = rname || r.name;
        retailerAgg.set(rid, r);
      }

      for (const it of inv.items || []) {
        const key = String(it.productName || "").trim() || "Unknown";
        const row = productAgg.get(key) || { qty: 0, amount: 0 };
        row.qty += n(it.qty);
        row.amount += n(it.amount);
        productAgg.set(key, row);
      }
    }

    const topProducts = Array.from(productAgg.entries())
      .map(([productName, v]) => ({ productName, qty: v.qty, amount: v.amount }))
      .sort((a, b) => b.amount - a.amount);

    const topRetailers = Array.from(retailerAgg.entries())
      .map(([retailerId, v]) => ({
        retailerId,
        retailerName: v.name,
        amount: v.amount,
        invoices: v.invoices,
        pending: v.pending,
      }))
      .sort((a, b) => b.amount - a.amount);

    // ✅ Excel Workbook
    const wb = new ExcelJS.Workbook();
    wb.creator = "BeautSoul";
    wb.created = new Date();

    // Sheet 1: Summary
    const sh1 = wb.addWorksheet("Summary");
    sh1.addRow(["From", from.toISOString().slice(0, 10)]);
    sh1.addRow(["To", toEnd.toISOString().slice(0, 10)]);
    sh1.addRow([]);
    sh1.addRow(["Total Sales", totalSalesAmount]);
    sh1.addRow(["Total Invoices", invoices.length]);
    sh1.addRow(["Pending Amount", pendingAmount]);

    sh1.getColumn(1).width = 20;
    sh1.getColumn(2).width = 25;

    // Sheet 2: Invoices
    const sh2 = wb.addWorksheet("Invoices");
    sh2.columns = [
      { header: "Invoice No", key: "invoiceNo", width: 16 },
      { header: "Date", key: "date", width: 12 },
      { header: "Retailer", key: "retailer", width: 22 },
      { header: "City", key: "city", width: 14 },
      { header: "State", key: "state", width: 14 },
      { header: "Phone", key: "phone", width: 14 },
      { header: "Total", key: "total", width: 12 },
      { header: "Paid", key: "paid", width: 12 },
      { header: "Pending", key: "pending", width: 12 },
      { header: "Payment Status", key: "pstatus", width: 14 },
      { header: "Payment Mode", key: "pmode", width: 14 },
      { header: "UTR", key: "utr", width: 18 },
      { header: "Remarks", key: "remarks", width: 30 },
    ];

    for (const inv of invoices) {
      const total = n(inv.totalAmount);
      const paid = n(inv.paidAmount);
      const pending = Math.max(0, total - paid);

      sh2.addRow({
        invoiceNo: inv.invoiceNo || "",
        date: inv.createdAt ? new Date(inv.createdAt).toISOString().slice(0, 10) : "",
        retailer: inv.retailer?.name || "",
        city: inv.retailer?.city || "",
        state: inv.retailer?.state || "",
        phone: inv.retailer?.phone || "",
        total,
        paid,
        pending,
        pstatus: inv.paymentStatus || "",
        pmode: inv.paymentMode || "",
        utr: inv.utrNo || "",
        remarks: inv.remarks || "",
      });
    }

    // Sheet 3: Top Products
    const sh3 = wb.addWorksheet("Top Products");
    sh3.columns = [
      { header: "Rank", key: "rank", width: 8 },
      { header: "Product", key: "product", width: 22 },
      { header: "Qty", key: "qty", width: 10 },
      { header: "Amount", key: "amount", width: 14 },
    ];
    topProducts.slice(0, 50).forEach((p, idx) => {
      sh3.addRow({ rank: idx + 1, product: p.productName, qty: p.qty, amount: p.amount });
    });

    // Sheet 4: Top Retailers
    const sh4 = wb.addWorksheet("Top Retailers");
    sh4.columns = [
      { header: "Rank", key: "rank", width: 8 },
      { header: "Retailer", key: "retailer", width: 24 },
      { header: "Invoices", key: "invoices", width: 10 },
      { header: "Amount", key: "amount", width: 14 },
      { header: "Pending", key: "pending", width: 14 },
    ];
    topRetailers.slice(0, 50).forEach((r, idx) => {
      sh4.addRow({
        rank: idx + 1,
        retailer: r.retailerName,
        invoices: r.invoices,
        amount: r.amount,
        pending: r.pending,
      });
    });

    // Header rows bold
    [sh2, sh3, sh4].forEach((sh) => {
      const headerRow = sh.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: "middle" };
      headerRow.height = 18;
    });

    const buf = await wb.xlsx.writeBuffer();

    const filename = `Distributor_Report_${from.toISOString().slice(0, 10)}_to_${toEnd
      .toISOString()
      .slice(0, 10)}.xlsx`;

    return new NextResponse(buf as any, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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