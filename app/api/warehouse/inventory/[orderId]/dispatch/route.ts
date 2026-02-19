// app/api/warehouse/inventory/[orderId]/dispatch/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fefoDeductProduct } from "@/lib/warehouse/inventory/fefo-dispatch";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : undefined;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ orderId: string }> }
) {
  try {
    const session = await getSessionUser();
    if (!session) return jsonError("Unauthorized", 401);

    // ✅ Warehouse guard
    if (session.role !== "WAREHOUSE_MANAGER" && session.role !== "ADMIN") {
      return jsonError("Forbidden", 403);
    }

    const { orderId } = await ctx.params;
    if (!orderId) return jsonError("orderId missing", 400);

    const body = await req.json().catch(() => ({}));
    const shippingMode = cleanStr(body.shippingMode);
    const lrNumber = cleanStr(body.lrNumber);
    const transporter = cleanStr(body.transporter);
    const note = cleanStr(body.note);

    // ✅ Warehouse entityId (since session doesn't have warehouseId)
    const warehouseEntityId = (process.env.DEFAULT_WAREHOUSE_ID || "MAIN").trim();

    // ✅ Fetch order + items (OrderItem doesn't have productId in your schema)
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        distributorId: true,
        items: {
          select: {
            productName: true,
            qty: true,
            // optional fields if exist:
            // id: true,
            // rate: true,
            // amount: true,
          },
        },
      },
    });

    if (!order) return jsonError("Order not found", 404);

    // ✅ Your order is SUBMITTED currently, so allow SUBMITTED/CONFIRMED
    if (order.status !== "CONFIRMED" && order.status !== "SUBMITTED") {
      return jsonError("Only SUBMITTED/CONFIRMED orders can be dispatched", 400);
    }

    if (!order.items?.length) return jsonError("Order has no items", 400);

    const result = await prisma.$transaction(async (tx) => {
      const entity = {
        entityType: "WAREHOUSE" as const,
        entityId: warehouseEntityId,
      };

      const perItem: any[] = [];

      for (const it of order.items) {
        const qty = Number(it.qty || 0);
        const productName = String((it as any).productName || "").trim();
        if (!productName || qty <= 0) {
          throw new Error("Invalid order item data");
        }

        // ✅ Since OrderItem has no productId, use productName as stable key for now
        const productId = productName;

        const r = await fefoDeductProduct({
          tx: tx as any,
          entity,
          productId,
          productName,
          qty,
          refType: "ORDER",
          refId: orderId,
          actorUserId: session.id || null,
          actorRole: session.role || null,
          blockExpired: true,
        });

        perItem.push({
          productId,
          productName,
          qty,
          txnId: r.txnId,
          batches: r.maps,
        });
      }

      // ✅ Update order status -> DISPATCHED
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: "DISPATCHED",
          // If you have these fields in schema, uncomment:
          // dispatchedAt: new Date(),
          // shippingMode: shippingMode as any,
          // lrNumber,
          // transporter,
          // dispatchNote: note,
        },
        select: { id: true, status: true },
      });

      return { updated, perItem };
    });

    return NextResponse.json({
      ok: true,
      entityType: "WAREHOUSE",
      entityId: warehouseEntityId,
      orderId,
      status: result.updated.status,
      dispatch: { shippingMode, lrNumber, transporter, note },
      items: result.perItem,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
