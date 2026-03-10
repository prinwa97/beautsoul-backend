import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { badRequest, notFound } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function esc(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function money(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ inboundOrderId: string }> }
) {
  try {
    const { inboundOrderId } = await ctx.params;

    if (!inboundOrderId || !String(inboundOrderId).trim()) {
      throw badRequest("inboundOrderId missing");
    }

    const order = await prisma.order.findUnique({
      where: { id: String(inboundOrderId).trim() },
      include: {
        distributor: true,
        retailer: true,
        items: true,
        invoice: true,
      },
    });

    if (!order) {
      throw notFound("Order not found");
    }

    const inv = (order as any).invoice ?? null;
    const items = Array.isArray((order as any).items) ? (order as any).items : [];

    const orderNo = esc((order as any).orderNo || order.id);
    const invoiceNo = esc(inv?.invoiceNo || (order as any).orderNo || "-");
    const paymentStatus = esc(inv?.paymentStatus || "UNPAID");
    const paidAmount = money(inv?.paidAmount ?? (order as any).paidAmount ?? 0);
    const paymentMode = esc(inv?.paymentMode || "-");
    const utrNo = esc(inv?.utrNo || "-");
    const distributorName = esc((order as any).distributor?.name || "-");
    const retailerName = esc((order as any).retailer?.name || "-");
    const totalAmount = money((order as any).totalAmount ?? 0);

    const rowsHtml = items
      .map((it: any) => {
        const productName = esc(it?.productName || it?.name || "-");
        const qty = esc(it?.qty ?? 0);
        const rate = money(it?.rate ?? 0);
        const amount = money(it?.amount ?? (Number(it?.qty ?? 0) * Number(it?.rate ?? 0)));

        return `
          <tr>
            <td>${productName}</td>
            <td>${qty}</td>
            <td class="right">₹${rate}</td>
            <td class="right">₹${amount}</td>
          </tr>
        `;
      })
      .join("");

    const html = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <title>Invoice - ${invoiceNo}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            padding: 24px;
            color: #111;
          }
          .wrap {
            max-width: 900px;
            margin: 0 auto;
          }
          .top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 20px;
          }
          h2 {
            margin: 0 0 8px 0;
          }
          .meta {
            line-height: 1.7;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 16px;
          }
          th, td {
            border: 1px solid #000;
            padding: 8px;
            font-size: 14px;
          }
          th {
            background: #f2f2f2;
            text-align: left;
          }
          .right {
            text-align: right;
          }
          .total-row td {
            font-weight: 700;
          }
          @media print {
            body {
              padding: 0;
            }
            .wrap {
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body onload="window.print()">
        <div class="wrap">
          <div class="top">
            <div>
              <h2>BeautSoul Invoice</h2>
              <div class="meta">
                <div><b>Order No:</b> ${orderNo}</div>
                <div><b>Invoice No:</b> ${invoiceNo}</div>
                <div><b>Status:</b> ${paymentStatus}</div>
                <div><b>Paid:</b> ₹${paidAmount}</div>
                <div><b>Mode:</b> ${paymentMode}</div>
                <div><b>UTR:</b> ${utrNo}</div>
              </div>
            </div>

            <div class="meta">
              <div><b>Distributor:</b> ${distributorName}</div>
              <div><b>Retailer:</b> ${retailerName}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Qty</th>
                <th class="right">Rate</th>
                <th class="right">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || `
                <tr>
                  <td colspan="4" style="text-align:center;">No items found</td>
                </tr>
              `}
              <tr class="total-row">
                <td colspan="3" class="right"><b>Total</b></td>
                <td class="right"><b>₹${totalAmount}</b></td>
              </tr>
            </tbody>
          </table>
        </div>
      </body>
    </html>`;

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (err: any) {
    const status = Number(err?.status || err?.statusCode || 500);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Internal Server Error",
        code: err?.code || "INTERNAL_SERVER_ERROR",
      },
      { status: Number.isFinite(status) ? status : 500 }
    );
  }
}