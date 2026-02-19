import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ inboundOrderId: string }> }
) {
  const { inboundOrderId } = await ctx.params; // ✅ unwrap params

  if (!inboundOrderId) {
    return NextResponse.json({ error: "inboundOrderId missing" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { id: inboundOrderId },
    include: {
      distributor: true,
      retailer: true,
      items: true,
      invoice: true,
    },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const inv = (order as any).Invoice;

  const html = `
  <html>
    <head>
      <title>Invoice - ${inv?.invoiceNo || (order as any).orderNo}</title>
      <style>
        body { font-family: Arial; padding: 20px; }
        table { width:100%; border-collapse:collapse; margin-top:12px; }
        th, td { border:1px solid #000; padding:6px; }
        th { background:#f2f2f2; }
        .right { text-align:right; }
      </style>
    </head>
    <body onload="window.print()">
      <h2>BeautSoul Invoice</h2>

      <b>Order No:</b> ${(order as any).orderNo}<br/>
      <b>Invoice No:</b> ${inv?.invoiceNo || "-"}<br/>
      <b>Status:</b> ${inv?.paymentStatus || "UNPAID"}<br/>
      <b>Paid:</b> ₹${inv?.paidAmount || (order as any).paidAmount || 0}<br/>
      <b>Mode:</b> ${inv?.paymentMode || "-"}<br/>
      <b>UTR:</b> ${inv?.utrNo || "-"}<br/><br/>

      <b>Distributor:</b> ${(order as any).distributor?.name || "-"}<br/>
      <b>Retailer:</b> ${(order as any).retailer?.name || "-"}<br/><br/>

      <table>
        <tr>
          <th>Product</th>
          <th>Qty</th>
          <th class="right">Rate</th>
          <th class="right">Amount</th>
        </tr>
        ${(((order as any).orderItem || []) as any[]).map((it:any)=>`
          <tr>
            <td>${it.productName}</td>
            <td>${it.qty}</td>
            <td class="right">₹${it.rate}</td>
            <td class="right">₹${it.amount}</td>
          </tr>
        `).join("")}
        <tr>
          <td colspan="3" class="right"><b>Total</b></td>
          <td class="right"><b>₹${(order as any).totalAmount}</b></td>
        </tr>
      </table>
    </body>
  </html>`;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}