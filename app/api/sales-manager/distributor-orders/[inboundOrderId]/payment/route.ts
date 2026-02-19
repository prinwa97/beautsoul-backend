import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

async function requireSalesManager() {
  const u = await getSessionUser();
  if (!u) return null;
  if (u.role !== "SALES_MANAGER") return null;
  return u;
}

export async function POST(req: Request, ctx: { params: Promise<{ inboundOrderId: string }> }) {
  try {
    const sm = await requireSalesManager();
    if (!sm) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const { inboundOrderId } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const paymentMode = String(body?.paymentMode || "").trim(); // UPI / BANK_TRANSFER / CHEQUE
    const utrNo = String(body?.utrNo || "").trim();
    const paymentRemarks = String(body?.paymentRemarks || "").trim();

    // ✅ NO CASH
    if (!["UPI", "BANK_TRANSFER", "CHEQUE"].includes(paymentMode)) {
      return NextResponse.json(
        { ok: false, error: "PaymentMode must be UPI / BANK_TRANSFER / CHEQUE (NO CASH)" },
        { status: 400 }
      );
    }

    // ✅ UTR compulsory
    if (!utrNo) {
      return NextResponse.json({ ok: false, error: "UTR is required" }, { status: 400 });
    }

    // load order + items
    const order = await prisma.inboundOrder.findUnique({
      where: { id: inboundOrderId },
      include: { items: true, distributor: { select: { id: true, name: true } } },
    });

    if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

    // ✅ compute totalAmount from items
    const totalAmount = (order.items || []).reduce((s, it) => {
      const rate = n(it.rate || 0);
      const qty = n(it.orderedQtyPcs || 0);
      return s + rate * qty;
    }, 0);

    // ✅ save payment: paidAmount locked to totalAmount; paymentStatus -> PAID
    const updated = await prisma.inboundOrder.update({
      where: { id: inboundOrderId },
      data: {
        paymentMode: paymentMode as any,
        paymentStatus: "PAID",
        paidAmount: totalAmount,
        utrNo,
        paidAt: new Date(),
        paymentRemarks: paymentRemarks || null,

        paymentEnteredByUserId: sm.id,

        // Warehouse will verify later
        paymentVerified: false,
        paymentVerifiedAt: null,
        paymentVerifiedByUserId: null,
      },
      include: {
        distributor: { select: { id: true, name: true } },
        items: true,
      },
    });

    return NextResponse.json({ ok: true, order: updated, totalAmount });
  } catch (e: any) {
    console.error("SM payment error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
