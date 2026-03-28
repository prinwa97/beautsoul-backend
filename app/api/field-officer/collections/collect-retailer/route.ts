import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { earnFoCoinsOnce } from "@/lib/fo-gamification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PayMode = "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";

function asInt(n: any) {
  const x = Math.floor(Number(n || 0));
  return Number.isFinite(x) ? x : 0;
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function parseMode(v: any): PayMode | null {
  const s = String(v || "")
    .trim()
    .toUpperCase();
  if (s === "CASH" || s === "UPI" || s === "BANK_TRANSFER" || s === "CHEQUE") return s;
  return null;
}

function parseDateOnly(v: any) {
  const s = String(v || "").trim();
  if (!s) return new Date();

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);

  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;

  // local-midday style safe timestamp to avoid timezone date shifting
  return new Date(Date.UTC(y, mo - 1, d, 12, 0, 0));
}

async function getRetailerLedgerBalance(distributorId: string, retailerId: string) {
  const sums = await prisma.retailerLedger.groupBy({
    by: ["type"],
    where: { distributorId, retailerId },
    _sum: { amount: true },
  });

  let debit = 0;
  let credit = 0;

  for (const s of sums as any[]) {
    const amt = Number(s?._sum?.amount || 0);
    if (s.type === "DEBIT") debit += amt;
    if (s.type === "CREDIT") credit += amt;
  }

  return {
    debit,
    credit,
    balance: debit - credit, // + = due, - = advance
  };
}

export async function POST(req: Request) {
  try {
    const u: any = await getSessionUser();
    if (!u) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = String(u.role || "").toUpperCase();
    if (role !== "FIELD_OFFICER") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const distributorId = cleanStr(u.distributorId);
    if (!distributorId) {
      return NextResponse.json({ ok: false, error: "distributorId missing in session" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));

    const retailerId = cleanStr(body.retailerId);
    const amount = asInt(body.amount);
    const mode = parseMode(body.mode);
    const reference = cleanStr(body.reference) || null;
    const note = cleanStr(body.note) || null;
    const entryDate = parseDateOnly(body.date);

    if (!retailerId) {
      return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });
    }

    if (amount <= 0) {
      return NextResponse.json({ ok: false, error: "amount must be > 0" }, { status: 400 });
    }

    if (!mode) {
      return NextResponse.json(
        { ok: false, error: "mode must be CASH / UPI / BANK_TRANSFER / CHEQUE" },
        { status: 400 }
      );
    }

    if (!entryDate) {
      return NextResponse.json({ ok: false, error: "invalid date" }, { status: 400 });
    }

    if (mode !== "CASH" && !reference) {
      return NextResponse.json({ ok: false, error: "UTR / Reference required" }, { status: 400 });
    }

    const retailer = await prisma.retailer.findFirst({
      where: { id: retailerId, distributorId },
      select: { id: true, name: true },
    });

    if (!retailer) {
      return NextResponse.json(
        { ok: false, error: "Retailer not found for this distributor" },
        { status: 404 }
      );
    }

    const before = await getRetailerLedgerBalance(distributorId, retailerId);

    // IMPORTANT:
    // If balance <= 0, there is no due in ledger. This usually means:
    // - either retailer already has advance
    // - or order debit entries are missing from retailerLedger
    if (before.balance <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "No due available in ledger for this retailer. Order debit entries may be missing, so collection is blocked to prevent wrong advance.",
          balance: before.balance,
          diagnostic: {
            totalDebit: before.debit,
            totalCredit: before.credit,
          },
        },
        { status: 400 }
      );
    }

    if (amount > before.balance) {
      return NextResponse.json(
        {
          ok: false,
          error: `Collection exceeds due. Current due is ₹${before.balance}, attempted ₹${amount}.`,
          balance: before.balance,
        },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const entry = await tx.retailerLedger.create({
        data: {
          retailerId,
          distributorId,
          type: "CREDIT",
          amount,
          reference,
          narration: note ? `${note} • ${mode}` : `FO Collection • ${mode}`,
          date: entryDate,
        },
        select: {
          id: true,
          date: true,
          amount: true,
          narration: true,
          type: true,
          reference: true,
        },
      });

      return { entry };
    });

    const after = await getRetailerLedgerBalance(distributorId, retailerId);

    const coins = Math.min(50, 5 + Math.floor(amount / 100));

    await earnFoCoinsOnce({
      foUserId: String(u.id),
      points: coins,
      reason: "COLLECTION",
      refType: "ledger",
      refId: String(result.entry.id),
      meta: {
        retailerId,
        amount,
        mode,
        beforeBalance: before.balance,
        afterBalance: after.balance,
      },
    });

    return NextResponse.json({
      ok: true,
      entry: result.entry,
      coins,
      beforeBalance: before.balance,
      afterBalance: after.balance,
    });
  } catch (e: any) {
    console.error("FO collect retailer POST error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}