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

function monthKeyOf(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextMonthKeyOf(d: Date) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + 1);
  return monthKeyOf(x);
}

export async function GET(req: Request) {
  const auth = await requireSalesManager();
  if (!auth.ok) return jsonError(auth.error, auth.status);

  const { searchParams } = new URL(req.url);
  const q = clean(searchParams.get("q"));
  const distributorId = clean(searchParams.get("distributorId"));

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

  const foIds = fos.map((x) => x.id);

  // ✅ assigned retailers count (SOURCE OF TRUTH: RetailerAssignmentActive)
  const counts = await prisma.retailerAssignmentActive.groupBy({
    by: ["foUserId"],
    where: { foUserId: { in: foIds } },
    _count: { _all: true },
  });
  const countMap = new Map(counts.map((c) => [c.foUserId, c._count._all]));

  const distNameMap = new Map(managedDists.map((d) => [d.id, d.name]));

  // ✅ Targets: this month + next month (so UI can enforce rule and show locked)
  const thisKey = monthKeyOf(new Date());
  const nextKey = nextMonthKeyOf(new Date());

  const targets = foIds.length
    ? await prisma.fieldOfficerTarget.findMany({
        where: { foUserId: { in: foIds }, monthKey: { in: [thisKey, nextKey] } },
        select: { foUserId: true, monthKey: true, targetValue: true, locked: true },
      })
    : [];

  const thisTargetMap = new Map(
    targets.filter((t) => t.monthKey === thisKey).map((t) => [t.foUserId, Number(t.targetValue || 0)])
  );
  const nextTargetMap = new Map(
    targets.filter((t) => t.monthKey === nextKey).map((t) => [t.foUserId, Number(t.targetValue || 0)])
  );
  const nextLockedMap = new Map(
    targets.filter((t) => t.monthKey === nextKey).map((t) => [t.foUserId, !!t.locked])
  );

  const fieldOfficers = fos.map((fo) => ({
    ...fo,
    distributorName: fo.distributorId ? distNameMap.get(fo.distributorId) || null : null,
    assignedRetailers: countMap.get(fo.id) || 0,

    // ✅ for TargetCell
    thisMonthTarget: thisTargetMap.get(fo.id) || 0,
    nextMonthTarget: nextTargetMap.get(fo.id) || 0,
    nextMonthLocked: nextLockedMap.get(fo.id) || false,

    // (optional) also return month keys
    _thisMonthKey: thisKey,
    _nextMonthKey: nextKey,
  }));

  return NextResponse.json({
    ok: true,
    distributors: managedDists,
    fieldOfficers,
  });
}