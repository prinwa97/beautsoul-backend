import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { earnFoCoinsOnce } from "@/lib/fo-gamification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asInt(n: any) {
  const x = Math.floor(Number(n || 0));
  return Number.isFinite(x) ? x : 0;
}

export async function POST(req: Request) {
  try {
    const u: any = await getSessionUser();
    if (!u) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const role = String(u.role || "").toUpperCase();
    if (role !== "FIELD_OFFICER") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const distributorId = String(u.distributorId || "").trim();
    if (!distributorId) {
      return NextResponse.json({ ok: false, error: "distributorId missing in session" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const retailerId = String(body.retailerId || "").trim();
    const amount = asInt(body.amount);
    const mode = String(body.mode || "CASH").toUpperCase(); // CASH | UPI
    const reference = body.reference ? String(body.reference).trim() : null;

    if (!retailerId) return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });
    if (amount <= 0) return NextResponse.json({ ok: false, error: "amount must be > 0" }, { status: 400 });
    if (!["CASH", "UPI"].includes(mode)) return NextResponse.json({ ok: false, error: "mode must be CASH/UPI" }, { status: 400 });

    // Ensure retailer belongs to this distributor
    const r = await prisma.retailer.findFirst({
      where: { id: retailerId, distributorId },
      select: { id: true, name: true },
    });
    if (!r) return NextResponse.json({ ok: false, error: "Retailer not found for this distributor" }, { status: 404 });

    // Create ledger credit entry (payment)
    const entry = await prisma.retailerLedger.create({
      data: {
        retailerId,
        distributorId,
        type: "CREDIT",
        amount,
        reference: reference,
        narration: `FO Collection • ${mode}`,
      },
      select: { id: true, date: true, amount: true, narration: true },
    });

    // Coins rule (simple, safe): base 5 + per 100 = 1 coin (cap 50)
    const coins = Math.min(50, 5 + Math.floor(amount / 100));

    await earnFoCoinsOnce({
      foUserId: String(u.id),
      points: coins,
      reason: "COLLECTION",
      refType: "ledger",
      refId: String(entry.id),
      meta: { retailerId, amount, mode },
    });

    return NextResponse.json({ ok: true, entry, coins });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
