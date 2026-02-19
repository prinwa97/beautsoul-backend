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
    const mapId = clean(body.mapId);
    if (!mapId) return jsonError("mapId required", 400);

    const map = await prisma.retailerAssignmentActive.findUnique({
      where: { id: mapId },
      select: { id: true, foUserId: true },
    });
    if (!map) return jsonError("Map not found", 404);

    if (auth.role !== "ADMIN") {
      const fo = await prisma.user.findUnique({
        where: { id: map.foUserId },
        select: { distributorId: true, role: true },
      });
      if (!fo || fo.role !== "FIELD_OFFICER" || !fo.distributorId) return jsonError("Invalid FO", 400);

      const ok = await prisma.distributor.findFirst({
        where: { id: fo.distributorId, salesManagerId: auth.userId },
        select: { id: true },
      });
      if (!ok) return jsonError("Forbidden", 403);
    }

    await prisma.retailerAssignmentActive.delete({ where: { id: mapId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return jsonError(e?.message || "Failed", 500);
  }
}
