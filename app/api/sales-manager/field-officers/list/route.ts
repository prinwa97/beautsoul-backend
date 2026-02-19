import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}
function clean(s: any) {
  const x = String(s ?? "").trim();
  return x.length ? x : "";
}

export async function GET(req: Request) {
  const auth = await requireSalesManager();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { searchParams } = new URL(req.url);
  const q = clean(searchParams.get("q"));
  const distributorId = clean(searchParams.get("distributorId"));

  // ✅ SM can only see distributors assigned to them (unless ADMIN)
  const managedDists = await prisma.distributor.findMany({
    where:
      auth.role === "ADMIN"
        ? distributorId
          ? { id: distributorId }
          : {}
        : distributorId
        ? { id: distributorId, salesManagerId: auth.userId }
        : { salesManagerId: auth.userId },
    select: { id: true, name: true, code: true },
  });

  const distIds = managedDists.map((d) => d.id);
  if (!distIds.length) {
    return NextResponse.json({ ok: true, fieldOfficers: [], distributors: [] });
  }

  const whereFO: any = {
    role: "FIELD_OFFICER",
    distributorId: { in: distIds },
  };

  if (q) {
    whereFO.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
      { code: { contains: q, mode: "insensitive" } },
    ];
  }

  const fos = await prisma.user.findMany({
    where: whereFO,
    select: {
      id: true,
      name: true,
      phone: true,
      code: true,
      status: true,
      distributorId: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
    take: 500,
  });

  // ✅ assigned retailers count (SOURCE OF TRUTH: RetailerAssignmentActive)
  const counts = await prisma.retailerAssignmentActive.groupBy({
    by: ["foUserId"],
    where: { foUserId: { in: fos.map((x) => x.id) } },
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [c.foUserId, c._count._all]));

  const distNameMap = new Map(managedDists.map((d) => [d.id, d.name]));

  const fieldOfficers = fos.map((fo) => ({
    ...fo,
    distributorName: fo.distributorId ? distNameMap.get(fo.distributorId) || null : null,
    assignedRetailers: countMap.get(fo.id) || 0,
  }));

  return NextResponse.json({
    ok: true,
    distributors: managedDists,
    fieldOfficers,
  });
}
