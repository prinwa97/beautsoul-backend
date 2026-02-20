// app/api/distributor/retailer-orders/[orderId]/generate-invoice/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function makeInvoiceNo() {
  return "INV" + Date.now();
}

function keyOf(s: string) {
  return String(s || "").trim().toLowerCase();
}

export async function POST(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const distributorId = await requireDistributorId();
    const { orderId } = await ctx.params;

    const body = await req.json().catch(() => null);
    const incomingItems = Array.isArray(body?.items) ? body.items : [];
    if (!incomingItems.length) {
      return NextResponse.json({ ok: false, error: "items required" }, { status: 400 });
    }

    // ✅ Order fetch
    const order = await prisma.order.findFirst({
      where: { id: orderId, distributorId },
      include: {
        items: true,
        retailer: { select: { id: true, name: true } },
      },
    });

    if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

    // ✅ Build ordered qty map (canonical productName from order)
    const orderByKey = new Map<string, { productName: string; qty: number }>();
    for (const it of order.items as any[]) {
      const pn = String(it.productName || "").trim();
      const k = keyOf(pn);
      if (!k) continue;

      const q = Number(it.qty || 0);
      const prev = orderByKey.get(k);
      if (!prev) orderByKey.set(k, { productName: pn, qty: q });
      else orderByKey.set(k, { productName: prev.productName, qty: prev.qty + q });
    }

    // ✅ Deduplicate incoming; require batchNo + rate
    const incoming = new Map<string, { rawName: string; rate: number; batchNo: string }>();
    for (const x of incomingItems) {
      const rawName = String(x?.productName || "").trim();
      const k = keyOf(rawName);
      const rate = Number(x?.rate || 0);
      const batchNo = String(x?.batchNo || "").trim();

      if (!k || !batchNo || !(rate > 0)) {
        return NextResponse.json(
          { ok: false, error: "Each item needs productName, batchNo, rate>0" },
          { status: 400 }
        );
      }

      if (!incoming.has(k)) incoming.set(k, { rawName, rate, batchNo });
    }

    // ✅ validate products exist in order, build lines
    const neededLines: Array<{ productName: string; qty: number; batchNo: string; rate: number }> = [];
    for (const [k, row] of incoming.entries()) {
      const ord = orderByKey.get(k);
      if (!ord || ord.qty <= 0) {
        const have = Array.from(orderByKey.values()).map((v) => v.productName).join(", ");
        return NextResponse.json(
          { ok: false, error: `Product not in order: ${row.rawName}. Order has: [${have}]` },
          { status: 400 }
        );
      }
      neededLines.push({
        productName: ord.productName, // canonical from order
        qty: ord.qty,
        batchNo: row.batchNo,
        rate: row.rate,
      });
    }

    // ✅ prefetch all required batches (outside tx, fast)
    const orWhere = neededLines.map((l) => ({
      batchNo: l.batchNo,
      productName: l.productName,
    }));

    const batches = await prisma.inventoryBatch.findMany({
      where: { distributorId: order.distributorId, OR: orWhere },
      select: { id: true, productName: true, batchNo: true, qty: true, mfgDate: true, expiryDate: true },
    });

    const batchMap = new Map<string, (typeof batches)[number]>();
    for (const b of batches) {
      batchMap.set(`${keyOf(b.productName)}__${String(b.batchNo).trim()}`, b);
    }

    // ✅ prepare invoice items + batch decrement ops + inventory summary delta (per product)
    const invoiceNo = makeInvoiceNo();
    let total = 0;

    const invoiceItemsData: Array<{
      // invoiceId will be added after invoice create
      invoiceId: string;
      productName: string;
      qty: number;
      rate: number;
      amount: number;
      batchNo: string;
      mfgDate: Date | null;
      expiryDate: Date;
    }> = [];

    // inventory summary delta (do AFTER tx to avoid tx-close error)
    const decByProduct = new Map<string, number>();

    // We also keep the exact batch decrement tasks (inside tx)
    const batchDecTasks: Array<{ batchId: string; qty: number; productName: string; batchNo: string }> = [];

    for (const line of neededLines) {
      const mapKey = `${keyOf(line.productName)}__${String(line.batchNo).trim()}`;
      const batch = batchMap.get(mapKey);
      if (!batch) {
        return NextResponse.json({ ok: false, error: `Batch not found: ${line.productName} / ${line.batchNo}` }, { status: 400 });
      }

      if (Number(batch.qty || 0) < line.qty) {
        return NextResponse.json(
          { ok: false, error: `Insufficient stock for ${line.productName} (${line.batchNo}). Available=${batch.qty}` },
          { status: 400 }
        );
      }

      const amount = line.qty * line.rate;
      total += amount;

      batchDecTasks.push({ batchId: batch.id, qty: line.qty, productName: line.productName, batchNo: line.batchNo });
      decByProduct.set(line.productName, (decByProduct.get(line.productName) || 0) + line.qty);

      // invoiceItemsData invoiceId later
      invoiceItemsData.push({
        invoiceId: "__TEMP__", // placeholder
        productName: line.productName,
        qty: line.qty,
        rate: line.rate,
        amount,
        batchNo: line.batchNo,
        mfgDate: batch.mfgDate ?? null,
        expiryDate: batch.expiryDate,
      });
    }

    // ✅ MAIN TX: keep it SHORT (no inventory.upsert inside)
    const result = await prisma.$transaction(
      async (tx) => {
        // prevent double invoice (inside tx)
        const existing = await tx.invoice.findFirst({ where: { orderId: order.id } });
        if (existing) {
          return {
            invoiceId: existing.id,
            invoiceNo: existing.invoiceNo,
            totalAmount: existing.totalAmount,
            already: true as const,
          };
        }

        const invoice = await tx.invoice.create({
          data: {
            invoiceNo,
            invoiceType: "RETAILER",
            distributorId: order.distributorId,
            retailerId: order.retailerId,
            orderId: order.id,
            totalAmount: 0,
            paymentStatus: "UNPAID",
          },
          select: { id: true, invoiceNo: true },
        });

        // attach invoiceId
        for (const it of invoiceItemsData) it.invoiceId = invoice.id;

        // bulk create invoice items
        if (invoiceItemsData.length) {
          await tx.invoiceItem.createMany({ data: invoiceItemsData });
        }

        // ✅ guarded batch decrements (race-safe) — keep sequential (less stress on tx)
        for (const t of batchDecTasks) {
          const dec = await tx.inventoryBatch.updateMany({
            where: { id: t.batchId, qty: { gte: t.qty } },
            data: { qty: { decrement: t.qty } },
          });
          if (!dec.count) {
            throw new Error(`Insufficient stock (race) for ${t.productName} (${t.batchNo}). Try again.`);
          }
        }

        await tx.invoice.update({ where: { id: invoice.id }, data: { totalAmount: total } });

        await tx.order.update({
          where: { id: order.id },
          data: { totalAmount: total, status: "DISPATCHED" },
        });

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

        return { invoiceId: invoice.id, invoiceNo: invoice.invoiceNo, totalAmount: total, already: false as const };
      },
      { timeout: 60000, maxWait: 60000 }
    );

    // ✅ AFTER TX: update inventory summary (this was causing "Transaction not found")
    // If tx returned already:true, skip updates
    if (!result.already) {
      await Promise.all(
        Array.from(decByProduct.entries()).map(([productName, qty]) =>
          prisma.inventory.upsert({
            where: { distributorId_productName: { distributorId: order.distributorId, productName } },
            create: { distributorId: order.distributorId, productName, qty: 0 },
            update: { qty: { decrement: qty } },
          })
        )
      );
    }

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