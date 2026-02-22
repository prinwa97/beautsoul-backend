// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/api/sales-manager/field-officers/retailers/assign/route.ts
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
    const note = clean(body.note);

    // ✅ accept BOTH formats:
    // - { retailerId: "..." }  (old / single)
    // - { retailerIds: ["...", "..."] } (new / multi)
    const singleRetailerId = clean(body.retailerId);
    const multiRetailerIds = Array.isArray(body.retailerIds)
      ? body.retailerIds.map((x: any) => clean(x)).filter(Boolean)
      : [];

    const retailerIds = Array.from(new Set([singleRetailerId, ...multiRetailerIds].filter(Boolean)));

    if (!foUserId || !retailerIds.length) {
      return jsonError("foUserId and retailerId/retailerIds required", 400);
    }

    // ✅ Validate FO
    const fo = await prisma.user.findUnique({
      where: { id: foUserId },
      select: { id: true, role: true, distributorId: true },
    });
    if (!fo || fo.role !== "FIELD_OFFICER") return jsonError("Invalid FO", 400);
    if (!fo.distributorId) return jsonError("FO distributorId missing", 400);

    const distributorId = fo.distributorId;

    // ✅ Scope check: FO distributor must belong to this Sales Manager (unless ADMIN)
    if (auth.role !== "ADMIN") {
      const ok = await prisma.distributor.findFirst({
        where: { id: distributorId, salesManagerId: auth.userId },
        select: { id: true },
      });
      if (!ok) return jsonError("FO not in your distributors", 403);
    }

    // ✅ Load retailers and ensure all belong to FO distributor
    const retailers = await prisma.retailer.findMany({
      where: { id: { in: retailerIds } },
      select: { id: true, distributorId: true },
    });

    const foundSet = new Set(retailers.map((r) => r.id));
    const missing = retailerIds.filter((id) => !foundSet.has(id));
    if (missing.length) return jsonError(`Retailer not found: ${missing.slice(0, 5).join(", ")}`, 404);

    const wrongDist = retailers.filter((r) => r.distributorId !== distributorId).map((r) => r.id);
    const validIds = retailers.filter((r) => r.distributorId === distributorId).map((r) => r.id);

    if (!validIds.length) return jsonError("Retailer not in FO distributor", 400);

    const now = new Date();

    // ✅ Upsert one-by-one (safest with retailerId @unique)
    // (keeps your existing behavior but supports multi)
    const results = {
      requested: retailerIds.length,
      valid: validIds.length,
      assigned: 0,
      updated: 0,
      skippedWrongDistributor: wrongDist.length,
    };

    for (const rid of validIds) {
      const existing = await prisma.retailerAssignmentActive.findUnique({
        where: { retailerId: rid },
        select: { id: true },
      });

      if (existing) {
        await prisma.retailerAssignmentActive.update({
          where: { id: existing.id },
          data: {
            distributorId, // ✅ required by schema
            foUserId,
            assignedByUserId: auth.userId,
            assignedAt: now,
            note: note || null,
          },
        });
        results.updated += 1;
      } else {
        await prisma.retailerAssignmentActive.create({
          data: {
            distributorId, // ✅ required by schema
            foUserId,
            retailerId: rid,
            assignedByUserId: auth.userId,
            assignedAt: now,
            note: note || null,
          },
        });
        results.assigned += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      ...results,
      wrongDistributorRetailerIds: wrongDist, // helpful for debugging (optional)
    });
  } catch (e: any) {
    const msg = String(e?.message || "Failed");
    if (String((e as any)?.code) === "P2002") return jsonError("Already assigned (unique constraint)", 409);
    return jsonError(msg, 500);
  }
}