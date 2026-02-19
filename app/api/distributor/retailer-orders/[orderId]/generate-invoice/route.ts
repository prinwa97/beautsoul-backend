import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function makeInvoiceNo() {
  return "INV" + Date.now();
}

function keyOf(s: string) {
  return String(s || "").trim().toLowerCase();
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ orderId: string }> }
) {
  try {
    const distributorId = await requireDistributorId();
    const { orderId } = await ctx.params;

    const body = await req.json().catch(() => null);
    const incomingItems = Array.isArray(body?.items) ? body.items : [];
    if (!incomingItems.length) {
      return NextResponse.json({ ok: false, error: "items required" }, { status: 400 });
    }

    // ✅ Get order with correct relations
    const order = await prisma.order.findFirst({
      where: { id: orderId, distributorId },
      include: {
        items: true,
        retailer: { select: { id: true, name: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    }

    // ✅ Build map of ordered qty by product key (canonical productName from order)
    const orderByKey = new Map<string, { productName: string; qty: number }>();
    for (const it of order.items) {
      const pn = String(it.productName || "").trim();
      const k = keyOf(pn);
      if (!k) continue;

      const prev = orderByKey.get(k);
      const q = Number(it.qty || 0);
      if (!prev) orderByKey.set(k, { productName: pn, qty: q });
      else orderByKey.set(k, { productName: prev.productName, qty: prev.qty + q });
    }

    // ✅ Deduplicate incoming; require batchNo + rate
    const incoming = new Map<string, { rawName: string; rate: number; batchNo: string }>();
    for (const x of incomingItems) {
      const rawName = String(x.productName || "").trim();
      const k = keyOf(rawName);
      const rate = Number(x.rate || 0);
      const batchNo = String(x.batchNo || "").trim();

      if (!k || !batchNo || !(rate > 0)) {
        return NextResponse.json(
          { ok: false, error: "Each item needs productName, batchNo, rate>0" },
          { status: 400 }
        );
      }

      if (!incoming.has(k)) incoming.set(k, { rawName, rate, batchNo });
    }

    const result = await prisma.$transaction(async (tx) => {
      // ✅ prevent double invoice
      const existing = await tx.invoice.findFirst({ where: { orderId: order.id } });
      if (existing) {
        return { invoiceId: existing.id, invoiceNo: existing.invoiceNo, totalAmount: existing.totalAmount, already: true };
      }

      const invoice = await tx.invoice.create({
        data: {
          invoiceNo: makeInvoiceNo(),
          invoiceType: "RETAILER",
          distributorId: order.distributorId,
          retailerId: order.retailerId,
          orderId: order.id,
          totalAmount: 0,
          paymentStatus: "UNPAID",
        },
      });

      let total = 0;

      for (const [k, row] of incoming.entries()) {
        const ord = orderByKey.get(k);
        if (!ord || ord.qty <= 0) {
          const have = Array.from(orderByKey.values()).map((v) => v.productName).join(", ");
          throw new Error(`Product not in order: ${row.rawName}. Order has: [${have}]`);
        }

        const productName = ord.productName;
        const qty = ord.qty;

        const batch = await tx.inventoryBatch.findFirst({
          where: {
            distributorId: order.distributorId,
            batchNo: row.batchNo,
            productName: { equals: productName, mode: "insensitive" as any },
          },
        });

        if (!batch) throw new Error(`Batch not found: ${productName} / ${row.batchNo}`);
        if (batch.qty < qty) throw new Error(`Insufficient stock for ${productName} (${row.batchNo}). Available=${batch.qty}`);

        const amount = qty * row.rate;
        total += amount;

        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            productName,
            qty,
            rate: row.rate,
            amount,
            batchNo: row.batchNo,
            mfgDate: batch.mfgDate ?? null,
            expiryDate: batch.expiryDate,
          },
        });

        // reduce batch stock
        await tx.inventoryBatch.update({
          where: { id: batch.id },
          data: { qty: batch.qty - qty },
        });

        // reduce summary inventory too
        await tx.inventory.upsert({
          where: { distributorId_productName: { distributorId: order.distributorId, productName } },
          create: { distributorId: order.distributorId, productName, qty: 0 },
          update: { qty: { decrement: qty } },
        });
      }

      await tx.invoice.update({ where: { id: invoice.id }, data: { totalAmount: total } });

      await tx.order.update({
        where: { id: order.id },
        data: { totalAmount: total, status: "DISPATCHED" },
      });

      // retailer ledger debit
      await tx.retailerLedger.create({
        data: {
          distributorId: order.distributorId,
          retailerId: order.retailerId,
          type: "DEBIT",
          amount: total,
          reference: invoice.invoiceNo,
          narration: `Invoice generated for Order ${order.orderNo}`,
        },
      });

      return { invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, totalAmount: total, already: false };
    });

    return NextResponse.json({ ok: true, ...result }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || e || "Server error");
    const isAuth =
      msg.toLowerCase().includes("unauthor") ||
      msg.toLowerCase().includes("session") ||
      msg.toLowerCase().includes("distributor");

    return NextResponse.json({ ok: false, error: msg }, { status: isAuth ? 401 : 500 });
  }
}
