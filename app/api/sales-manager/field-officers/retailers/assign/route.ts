import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clean(s: any) {
  const x = String(s ?? "").trim();
  return x.length ? x : "";
}
function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function POST(req: Request) {
  const auth = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);
  if (!auth.ok) return jsonError(auth.error || "Unauthorized", (auth as any).status || 401);

  try {
    const body = await req.json().catch(() => ({}));
    const foUserId = clean(body.foUserId);
    const retailerId = clean(body.retailerId);

    if (!foUserId || !retailerId) return jsonError("foUserId and retailerId required", 400);

    const fo = await prisma.user.findUnique({
      where: { id: foUserId },
      select: { id: true, role: true, distributorId: true },
    });
    if (!fo || fo.role !== "FIELD_OFFICER") return jsonError("Invalid FO", 400);
    if (!fo.distributorId) return jsonError("FO distributorId missing", 400);

    if (auth.role !== "ADMIN") {
      const ok = await prisma.distributor.findFirst({
        where: { id: fo.distributorId, salesManagerId: auth.userId },
        select: { id: true },
      });
      if (!ok) return jsonError("FO not in your distributors", 403);
    }

    // ensure retailer belongs to FO distributor (optional but recommended)
    const retailer = await prisma.retailer.findUnique({
      where: { id: retailerId },
      select: { id: true, distributorId: true },
    });
    if (!retailer) return jsonError("Retailer not found", 404);
    if (retailer.distributorId !== fo.distributorId) return jsonError("Retailer not in FO distributor", 400);

    const existing = await prisma.fieldOfficerRetailerMap.findFirst({
      where: { foUserId, retailerId },
      select: { id: true },
    });

    if (existing) {
      await prisma.fieldOfficerRetailerMap.update({
        where: { id: existing.id },
        data: { isActive: true, assignedAt: new Date() },
      });
    } else {
      await prisma.fieldOfficerRetailerMap.create({
        data: { foUserId, retailerId, isActive: true, assignedAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message || "Failed", 500);
  }
}
