import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SessionUser = {
  id: string;
  role?: string;
  distributorId?: string | null;
};

async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const raw = store.get("session_user")?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

function invNo() {
  // simple unique invoice no
  const n = Math.floor(100000 + Math.random() * 900000);
  return `INV${n}${Date.now().toString().slice(-4)}`;
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const distributorId = session.distributorId;
    if (!distributorId) {
      return NextResponse.json(
        { error: "DistributorId missing (login/session issue)." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const orderId = String(body?.orderId || "").trim();
    const batches = Array.isArray(body?.batches) ? body.batches : [];

    if (!orderId) return NextResponse.json({ error: "orderId missing" }, { status: 400 });
    if (batches.length === 0)
      return NextResponse.json({ error: "batches missing" }, { status: 400 });

    // Validate batches
    for (const b of batches) {
      const orderItemId = String(b?.orderItemId || "").trim();
      const batchNo = String(b?.batchNo || "").trim();
      if (!orderItemId || !batchNo) {
        return NextResponse.json(
          { error: "Each batch must include orderItemId and batchNo" },
          { status: 400 }
        );
      }
    }

    // Load order with items
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        distributorId: true,
        retailerId: true,
        status: true,
        totalAmount: true,
        paidAmount: true,
        items: {
          select: {
            id: true,
            productName: true,
            qty: true,
            rate: true,
            amount: true,
          },
        },
        invoice: {
          select: { id: true, invoiceNo: true },
        },
      },
    });

    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (order.distributorId !== distributorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (order.status === "DISPATCHED" || order.status === "DELIVERED") {
      return NextResponse.json({ error: "Order already dispatched" }, { status: 400 });
    }

    // Ensure batches provided for all items (frontend already validates, but backend double-check)
    const itemIds = new Set(order.items.map((x) => x.id));
    for (const it of order.items) {
      const found = batches.find((b: any) => String(b.orderItemId).trim() === it.id);
      if (!found || !String(found.batchNo || "").trim()) {
        return NextResponse.json(
          { error: `Batch number missing for ${it.productName}` },
          { status: 400 }
        );
      }
    }

    // If invoice already exists, prevent duplicate invoice
    if (order.invoice?.id) {
      return NextResponse.json(
        { error: `Invoice already exists: ${order.invoice.invoiceNo}` },
        { status: 400 }
      );
    }

    // Create invoice + invoice items in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNo: invNo(),
          distributorId: order.distributorId,
          retailerId: order.retailerId,
          orderId: order.id,
          totalAmount: order.totalAmount ?? 0,
          // createdAt default in schema
        },
        select: { id: true, invoiceNo: true, totalAmount: true, createdAt: true },
      });

      // Invoice items: use order items
      await tx.invoiceItem.createMany({
        data: order.items.map((it) => {
          const batch = batches.find((b: any) => String(b.orderItemId).trim() === it.id);
          const batchNo = String(batch?.batchNo || "").trim();

          return {
            invoiceId: createdInvoice.id,
            productName: it.productName,
            qty: it.qty,
            rate: it.rate,
            amount: it.amount,
            // NOTE: If your InvoiceItem model has batchNo field, add it here.
            // batchNo: batchNo,
          } as any;
        }),
      });

      // Update order status
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: "DISPATCHED" as any,
          updatedAt: new Date(), // REQUIRED in your schema
        },
        select: { id: true, status: true, updatedAt: true },
      });

      // Ledger balance calc (simple): total - paid
      const balanceAfter = (order.totalAmount ?? 0) - (order.paidAmount ?? 0);

      return { createdInvoice, updatedOrder, balanceAfter };
    });

    return NextResponse.json({
      ok: true,
      order: result.updatedOrder,
      invoice: result.createdInvoice,
      balanceAfter: result.balanceAfter,
    });
  } catch (e: any) {
    console.error("DISPATCH ERROR:", e);
    return NextResponse.json(
      { error: "Server error", detail: String(e?.message || e) },
      { status: 500 }
    );
  }
}
