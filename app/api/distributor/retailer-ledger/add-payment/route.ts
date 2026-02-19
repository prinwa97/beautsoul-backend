import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function clean(s: any) {
  const t = String(s ?? "").trim();
  return t;
}

export async function POST(req: Request) {
  try {
    const distributorId = await requireDistributorId();
    if (!distributorId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    const retailerId = clean(body?.retailerId);
    const amount = num(body?.amount);
    const paymentMode = clean(body?.paymentMode).toUpperCase(); // CASH/UPI/BANK_TRANSFER/CHEQUE
    const utrNo = clean(body?.utrNo);
    const narrationInput = clean(body?.narration);

    if (!retailerId) {
      return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: "amount must be > 0" }, { status: 400 });
    }

    const allowedModes = ["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"] as const;
    if (!allowedModes.includes(paymentMode as any)) {
      return NextResponse.json(
        { ok: false, error: `paymentMode must be ${allowedModes.join("/")}` },
        { status: 400 }
      );
    }

    // UTR only for non-cash
    if (paymentMode !== "CASH" && !utrNo) {
      return NextResponse.json(
        { ok: false, error: "utrNo required for non-cash payments" },
        { status: 400 }
      );
    }

    // ✅ Security: retailer must belong to this distributor
    const okRetailer = await prisma.retailer.findFirst({
      where: { id: retailerId, distributorId },
      select: { id: true },
    });

    if (!okRetailer) {
      return NextResponse.json({ ok: false, error: "Retailer not found" }, { status: 404 });
    }

    const narration =
      narrationInput ||
      (paymentMode === "CASH"
        ? "Cash payment received"
        : `Payment received (${paymentMode}) UTR: ${utrNo}`);

    // ✅ IMPORTANT: set date explicitly (dashboard uses date filters)
    const row = await prisma.retailerLedger.create({
      data: {
        distributorId,
        retailerId,
        type: "CREDIT",
        amount,
        reference: paymentMode === "CASH" ? null : utrNo,
        narration,
        date: new Date(), // ✅ FIX
      },
      select: {
        id: true,
        retailerId: true,
        distributorId: true,
        type: true,
        amount: true,
        reference: true,
        narration: true,
        date: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { ok: true, row },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("add-payment error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
