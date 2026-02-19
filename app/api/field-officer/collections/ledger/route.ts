import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asInt(v: any, d = 0) {
  const x = Math.floor(Number(v ?? d));
  return Number.isFinite(x) ? x : d;
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

export async function GET(req: Request) {
  try {
    const u: any = await getSessionUser();
    if (!u) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const role = String(u.role || "").toUpperCase();
    if (role !== "FIELD_OFFICER") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const distributorId = u.distributorId ? String(u.distributorId) : null;
    if (!distributorId) return NextResponse.json({ ok: false, error: "Missing distributorId in session" }, { status: 400 });

    const { searchParams } = new URL(req.url);
    const retailerId = cleanStr(searchParams.get("retailerId"));
    const take = Math.min(100, Math.max(10, asInt(searchParams.get("take"), 30)));
    const skip = Math.max(0, asInt(searchParams.get("skip"), 0));

    if (!retailerId) return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });

    // Ensure retailer belongs to distributor
    const okRetailer = await prisma.retailer.findFirst({
      where: { id: retailerId, distributorId },
      select: { id: true },
    });
    if (!okRetailer) return NextResponse.json({ ok: false, error: "Retailer not found" }, { status: 404 });

    const total = await prisma.retailerLedger.count({
      where: { distributorId, retailerId },
    });

    const rows = await prisma.retailerLedger.findMany({
      where: { distributorId, retailerId },
      orderBy: { date: "desc" },
      take,
      skip,
      select: {
        id: true,
        date: true,
        type: true,
        amount: true,
        reference: true,
        narration: true,
      },
    });

    return NextResponse.json({ ok: true, total, take, skip, rows });
  } catch (e: any) {
    console.error("FO collection ledger error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
