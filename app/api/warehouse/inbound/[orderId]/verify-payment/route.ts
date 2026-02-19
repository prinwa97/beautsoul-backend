import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isWarehouseRole(role: unknown) {
  const r = String(role || "").toUpperCase();
  return r.includes("WAREHOUSE") || r.includes("STORE") || r === "ADMIN" || r === "WAREHOUSE_MANAGER";
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

export async function POST(_req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const me: any = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!isWarehouseRole(me?.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden (Warehouse only)" }, { status: 403 });
    }

    const { orderId } = await ctx.params;
    if (!orderId) return NextResponse.json({ ok: false, error: "orderId missing" }, { status: 400 });

    const order = await prisma.inboundOrder.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        paymentStatus: true,
        paidAmount: true,
        utrNo: true,
        paymentVerified: true,
        status: true,
      },
    });

    if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    if (order.paymentVerified) return NextResponse.json({ ok: true, already: true }, { status: 200 });

    // ✅ Keep it strict to avoid enum mismatch (PARTIAL may not exist)
    const isPaid = String(order.paymentStatus || "").toUpperCase() === "PAID";
    const utr = cleanStr(order.utrNo);
    const paidAmount = Number(order.paidAmount || 0);

    if (!isPaid || paidAmount <= 0 || !utr) {
      return NextResponse.json(
        { ok: false, error: "Payment not complete (need paymentStatus=PAID, paidAmount>0 and UTR)" },
        { status: 400 }
      );
    }

    const updated = await prisma.inboundOrder.update({
      where: { id: orderId },
      data: {
        paymentVerified: true,
        paymentVerifiedAt: new Date(),
        paymentVerifiedByUserId: String(me.id),
        // ✅ don’t depend on TS enum import; keep string
        status: "PAYMENT_VERIFIED" as any,
      },
      select: { id: true, status: true, paymentVerified: true, paymentVerifiedAt: true },
    });

    return NextResponse.json({ ok: true, order: updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || "Server error") }, { status: 500 });
  }
}
