// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/api/field-officer/collections/collect-retailer/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asFloat(n: any) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? x : 0;
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

const ALLOWED_MODES = new Set(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"]);

async function requireFieldOfficer() {
  const u: any = await getSessionUser();
  if (!u) return { ok: false as const, status: 401 as const, error: "Unauthorized" };

  const role = String(u.role || "").toUpperCase();
  if (role !== "FIELD_OFFICER") {
    return { ok: false as const, status: 403 as const, error: "Only Field Officer allowed" };
  }
  return { ok: true as const, user: u };
}

/**
 * ✅ Retailer-level collection (NOT invoice-wise)
 * Writes to: RetailerLedger (type CREDIT)
 */
export async function POST(req: Request) {
  try {
    const auth = await requireFieldOfficer();
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

    const body = await req.json().catch(() => ({}));

    const retailerId = cleanStr(body.retailerId);
    const amount = asFloat(body.amount);
    const modeRaw = cleanStr(body.mode);
    const mode = String(modeRaw || "").toUpperCase(); // normalize
    const utrNo = cleanStr(body.utrNo);

    if (!retailerId) return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });
    if (!(amount > 0)) return NextResponse.json({ ok: false, error: "amount > 0 required" }, { status: 400 });

    if (!mode || !ALLOWED_MODES.has(mode)) {
      return NextResponse.json(
        { ok: false, error: "mode invalid. Use CASH/UPI/BANK_TRANSFER/CHEQUE" },
        { status: 400 }
      );
    }

    if (mode !== "CASH" && !utrNo) {
      return NextResponse.json({ ok: false, error: "UTR/Ref No required (non-cash)" }, { status: 400 });
    }

    // ✅ retailer + distributorId needed for RetailerLedger
    const retailer = await prisma.retailer.findUnique({
      where: { id: retailerId },
      select: { id: true, distributorId: true },
    });

    if (!retailer) return NextResponse.json({ ok: false, error: "Retailer not found" }, { status: 404 });
    if (!retailer.distributorId) {
      return NextResponse.json({ ok: false, error: "Retailer has no distributorId" }, { status: 400 });
    }

    // ✅ IMPORTANT: FO should collect only for his distributor (if FO has distributorId in session)
    const foDistributorId = auth.user?.distributorId || null;
    if (foDistributorId && foDistributorId !== retailer.distributorId) {
      return NextResponse.json(
        { ok: false, error: "This retailer is not under your distributor" },
        { status: 403 }
      );
    }

    const entry = await prisma.retailerLedger.create({
      data: {
        retailerId,
        distributorId: retailer.distributorId,
        type: "CREDIT",
        amount,
        reference: mode === "CASH" ? null : utrNo,
        narration: `FO Collection • ${mode}`,
        // date: new Date(), // optional (default already)
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

    return NextResponse.json({ ok: true, entry });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

// ✅ health check (browser test)
export async function GET() {
  return NextResponse.json({ ok: true, route: "collect-retailer" });
}
