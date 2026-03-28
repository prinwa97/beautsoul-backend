import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "cache-control": "no-store" };

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function hasPaymentEntered(order: any) {
  return (
    !!order?.paymentEnteredByUserId ||
    !!order?.paymentMode ||
    !!order?.utrNo ||
    !!order?.paidAt ||
    Number(order?.paidAmount || 0) > 0 ||
    !!String(order?.paymentRemarks || "").trim() ||
    String(order?.paymentStatus || "").toUpperCase() !== "UNPAID"
  );
}

async function requireSalesManager() {
  const u = await getSessionUser();
  if (!u) return null;
  if (String((u as any).role || "").toUpperCase() !== "SALES_MANAGER") return null;
  return u as any;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ inboundOrderId: string }> }
) {
  try {
    const sm = await requireSalesManager();

    if (!sm) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const smUserId = String((sm as any).userId || (sm as any).id || "").trim();
    if (!smUserId) {
      return NextResponse.json(
        { ok: false, error: "Invalid session" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const { inboundOrderId } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const paymentMode = String(body?.paymentMode || "").trim().toUpperCase();
    const utrNo = String(body?.utrNo || "").trim();
    const paymentRemarks = String(body?.paymentRemarks || "").trim();

    if (!["UPI", "BANK_TRANSFER", "CHEQUE"].includes(paymentMode)) {
      return NextResponse.json(
        { ok: false, error: "PaymentMode must be UPI / BANK_TRANSFER / CHEQUE (NO CASH)" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (!utrNo) {
      return NextResponse.json(
        { ok: false, error: "UTR is required" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const order = await prisma.inboundOrder.findUnique({
      where: { id: String(inboundOrderId || "").trim() },
      include: {
        items: true,
        distributor: { select: { id: true, name: true } },
        dispatches: { select: { id: true } },
        receives: { select: { id: true } },
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Order not found" },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    if (String(order.createdByUserId || "").trim() !== smUserId) {
      return NextResponse.json(
        { ok: false, error: "You can update payment only for your own orders" },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    if (hasPaymentEntered(order)) {
      return NextResponse.json(
        { ok: false, error: "Payment already entered for this order" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if ((order.dispatches?.length || 0) > 0 || (order.receives?.length || 0) > 0) {
      return NextResponse.json(
        { ok: false, error: "Payment cannot be entered after dispatch/receive has started" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const totalAmount = (order.items || []).reduce((s, it) => {
      const rate = n(it.rate || 0);
      const qty = n(it.orderedQtyPcs || 0);
      return s + rate * qty;
    }, 0);

    if (totalAmount <= 0) {
      return NextResponse.json(
        { ok: false, error: "Order total must be greater than zero" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const updated = await prisma.inboundOrder.update({
      where: { id: order.id },
      data: {
        paymentMode: paymentMode as any,
        paymentStatus: "PAID",
        paidAmount: totalAmount,
        utrNo,
        paidAt: new Date(),
        paymentRemarks: paymentRemarks || null,
        paymentEnteredByUserId: smUserId,
        paymentVerified: false,
        paymentVerifiedAt: null,
        paymentVerifiedByUserId: null,
      },
      include: {
        distributor: { select: { id: true, name: true } },
        items: true,
      },
    });

    return NextResponse.json(
      { ok: true, order: updated, totalAmount },
      { headers: NO_STORE_HEADERS }
    );
  } catch (e: any) {
    console.error("SM payment error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}