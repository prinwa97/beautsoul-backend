import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toInt(v: any, def: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : def;
}

export async function GET(req: Request) {
  try {
    const distributorId = await requireDistributorId();
    if (!distributorId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const retailerId = String(url.searchParams.get("retailerId") || "").trim();
    const take = Math.min(toInt(url.searchParams.get("take"), 50), 200);
    const skip = Math.max(toInt(url.searchParams.get("skip"), 0), 0);

    if (!retailerId) {
      return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });
    }

    // ✅ Security: retailer must belong to this distributor
    const okRetailer = await prisma.retailer.findFirst({
      where: { id: retailerId, distributorId },
      select: { id: true },
    });

    if (!okRetailer) {
      return NextResponse.json({ ok: false, error: "Retailer not found" }, { status: 404 });
    }

    const [rows, total] = await Promise.all([
      prisma.retailerLedger.findMany({
        where: { distributorId, retailerId },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }], // ✅ FIX
        take,
        skip,
        select: {
          id: true,
          retailerId: true,
          distributorId: true,
          date: true,
          type: true,
          amount: true,
          reference: true,
          narration: true,
          createdAt: true,
        },
      }),
      prisma.retailerLedger.count({
        where: { distributorId, retailerId },
      }),
    ]);

    return NextResponse.json(
      { ok: true, total, rows, take, skip },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("ledger entries error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
