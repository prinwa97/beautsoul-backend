// app/api/distributor/orders/[inboundOrderId]/status/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Allowed statuses (match your enum values if different)
type AllowedStatus =
  | "SUBMITTED"
  | "CONFIRMED"
  | "DISPATCHED"
  | "DELIVERED"
  | "REJECTED"
  | "CANCELLED";

export async function POST(
  req: Request,
  ctx: { params: Promise<{ inboundOrderId: string }> }
) {
  try {
    // ✅ SINGLE SOURCE OF TRUTH
    const distributorId = await requireDistributorId();

    const { inboundOrderId } = await ctx.params;
    if (!inboundOrderId)
      return NextResponse.json({ error: "inboundOrderId missing" }, { status: 400 });

    const body = await req.json().catch(() => ({}));
    const status = String(body?.status || "").toUpperCase() as AllowedStatus;

    const allowed: AllowedStatus[] = [
      "SUBMITTED",
      "CONFIRMED",
      "DISPATCHED",
      "DELIVERED",
      "REJECTED",
      "CANCELLED",
    ];

    if (!allowed.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${allowed.join(", ")}` },
        { status: 400 }
      );
    }

    // ✅ Verify order belongs to this distributor
    const order = await prisma.order.findUnique({
      where: { id: inboundOrderId },
      select: {
        id: true,
        status: true,
        distributorId: true,
      },
    });

    if (!order)
      return NextResponse.json({ error: "Order not found" }, { status: 404 });

    if (order.distributorId !== distributorId) {
      return NextResponse.json(
        { error: "Forbidden: this order is not under your distributor" },
        { status: 403 }
      );
    }

    const updated = await prisma.order.update({
      where: { id: inboundOrderId },
      data: { status: status as any },
      select: { id: true, status: true, updatedAt: true },
    });

    return NextResponse.json({ ok: true, order: updated }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || e || "Unauthorized");
    const isAuth =
      msg.toLowerCase().includes("unauthor") ||
      msg.toLowerCase().includes("session") ||
      msg.toLowerCase().includes("distributor");

    return NextResponse.json(
      { ok: false, error: msg },
      { status: isAuth ? 401 : 500 }
    );
  }
}
