// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/api/sales-manager/field-officers/retailers/list/route.ts
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

/**
 * GET /api/sales-manager/field-officers/retailers/list?foUserId=TARGET_FO_ID
 * OR  /api/sales-manager/field-officers/retailers/list?distributorId=...
 *
 * Returns:
 * {
 *   ok:true,
 *   distributorId,
 *   fieldOfficers:[{id,name,phone,distributorId}]
 * }
 */
export async function GET(req: Request) {
  const auth = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);
  if (!auth.ok) return jsonError(auth.error || "Unauthorized", (auth as any).status || 401);

  try {
    const { searchParams } = new URL(req.url);

    const foUserId = clean(searchParams.get("foUserId"));
    let distributorId = clean(searchParams.get("distributorId"));

    // ✅ Prefer resolving distributor from target FO (prevents wrong distributorId being passed from UI)
    if (foUserId) {
      const fo = await prisma.user.findUnique({
        where: { id: foUserId },
        select: { id: true, role: true, distributorId: true },
      });
      if (!fo || String(fo.role) !== "FIELD_OFFICER") return jsonError("Invalid foUserId", 400);
      if (!fo.distributorId) return jsonError("Target FO distributorId missing", 400);
      distributorId = fo.distributorId;
    }

    if (!distributorId) return jsonError("foUserId or distributorId required", 400);

    // ✅ Scope: distributor must belong to this Sales Manager (unless ADMIN)
    if (auth.role !== "ADMIN") {
      const ok = await prisma.distributor.findFirst({
        where: { id: distributorId, salesManagerId: auth.userId },
        select: { id: true },
      });
      if (!ok) return jsonError("Not your distributor", 403);
    }

    const fieldOfficers = await prisma.user.findMany({
      where: { role: "FIELD_OFFICER", distributorId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, phone: true, distributorId: true },
    });

    return NextResponse.json({ ok: true, distributorId, fieldOfficers });
  } catch (e: any) {
    return jsonError(String(e?.message || "Failed"), 500);
  }
}