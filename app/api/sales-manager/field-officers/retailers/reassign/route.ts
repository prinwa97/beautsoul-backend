import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}
function cleanId(s: any) {
  const x = String(s ?? "").trim();
  return x.length ? x : "";
}

export async function POST(req: Request) {
  const auth = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);
  if (!auth.ok) return jsonError(auth.error || "Unauthorized", (auth as any).status || 401);

  const body = await req.json().catch(() => null);
  const retailerId = cleanId(body?.retailerId);
  const newFoUserId = cleanId(body?.newFoUserId);
  const reason = String(body?.reason || "").trim() || null;

  if (!retailerId || !newFoUserId) return jsonError("retailerId and newFoUserId required", 400);

  const newFo = await prisma.user.findUnique({
    where: { id: newFoUserId },
    select: { id: true, role: true, distributorId: true },
  });
  if (!newFo || String(newFo.role) !== "FIELD_OFFICER") return jsonError("Invalid FO", 400);

  const active = await prisma.retailerAssignmentActive.findUnique({
    where: { retailerId },
    select: { retailerId: true, foUserId: true, distributorId: true },
  });
  if (!active) return jsonError("Retailer not assigned", 404);

  // scope: retailer distributor must be under SM (unless ADMIN)
  if (auth.role !== "ADMIN") {
    const ok = await prisma.distributor.findFirst({
      where: { id: active.distributorId, salesManagerId: auth.userId },
      select: { id: true },
    });
    if (!ok) return jsonError("Retailer not in your distributors", 403);

    // scope: FO must also be under this SM (its own distributor under SM)
    if (!newFo.distributorId) return jsonError("FO distributorId missing", 400);
    const okFo = await prisma.distributor.findFirst({
      where: { id: newFo.distributorId, salesManagerId: auth.userId },
      select: { id: true },
    });
    if (!okFo) return jsonError("FO not in your distributors", 403);
  }

  if (active.foUserId === newFoUserId) {
    return NextResponse.json({ ok: true, note: "Already assigned to same FO" });
  }

  const now = new Date();

  await prisma.$transaction([
    prisma.retailerAssignmentActive.update({
      where: { retailerId },
      data: {
        foUserId: newFoUserId,
        assignedByUserId: auth.userId,
        assignedAt: now,
        // distributorId stays the retailer's distributor (active.distributorId)
      },
    }),
    prisma.retailerAssignmentHistory.create({
      data: {
        retailerId,
        fromFoUserId: active.foUserId,
        toFoUserId: newFoUserId,
        distributorId: active.distributorId,
        eventType: "REASSIGN",
        reason,
        actorUserId: auth.userId,
        createdAt: now,
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}