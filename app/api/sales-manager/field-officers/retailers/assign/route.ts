// app/api/sales-manager/field-officers/retailers/assign/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}
function clean(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

export async function POST(req: Request) {
  const auth = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);
  if (!auth.ok) return jsonError(auth.error || "Unauthorized", (auth as any).status || 401);

  try {
    const body = await req.json().catch(() => ({}));
    const foUserId = clean(body.foUserId);
    const retailerId = clean(body.retailerId);
    const note = clean(body.note);

    if (!foUserId || !retailerId) return jsonError("foUserId and retailerId required", 400);

    const fo = await prisma.user.findUnique({
      where: { id: foUserId },
      select: { id: true, role: true, distributorId: true },
    });
    if (!fo || fo.role !== "FIELD_OFFICER") return jsonError("Invalid FO", 400);
    if (!fo.distributorId) return jsonError("FO distributorId missing", 400);

    const distributorId = fo.distributorId;

    if (auth.role !== "ADMIN") {
      const ok = await prisma.distributor.findFirst({
        where: { id: distributorId, salesManagerId: auth.userId },
        select: { id: true },
      });
      if (!ok) return jsonError("FO not in your distributors", 403);
    }

    const retailer = await prisma.retailer.findUnique({
      where: { id: retailerId },
      select: { id: true, distributorId: true },
    });
    if (!retailer) return jsonError("Retailer not found", 404);
    if (retailer.distributorId !== distributorId) return jsonError("Retailer not in FO distributor", 400);

    // safest: find then create/update
    const existing = await prisma.retailerAssignmentActive.findFirst({
      where: { retailerId },
      select: { id: true },
    });

    if (existing) {
      await prisma.retailerAssignmentActive.update({
        where: { id: existing.id },
        data: {
          distributorId, // ✅ REQUIRED by schema
          foUserId,
          assignedAt: new Date(),
          note: note || null,
        },
      });
    } else {
      await prisma.retailerAssignmentActive.create({
        data: {
          distributorId, // ✅ REQUIRED by schema
          foUserId,
          retailerId,
          assignedAt: new Date(),
          note: note || null,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || "Failed");
    if (String((e as any)?.code) === "P2002") return jsonError("Already assigned (unique constraint)", 409);
    return jsonError(msg, 500);
  }
}