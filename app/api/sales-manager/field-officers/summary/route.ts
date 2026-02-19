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

function monthRange(monthKey: string) {
  // monthKey = YYYY-MM (UTC boundaries)
  const [y, m] = monthKey.split("-").map((x) => Number(x));
  if (!y || !m || m < 1 || m > 12) return null;
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, end };
}

function currentMonthKeyUTC() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * GET /api/sales-manager/field-officers/summary?foUserId=...&month=YYYY-MM
 * Returns KPIs for assigned retailers of FO in that month.
 */
export async function GET(req: Request) {
  const auth = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);
  if (!auth.ok) return jsonError(auth.error || "Unauthorized", (auth as any).status || 401);

  try {
    const { searchParams } = new URL(req.url);
    const foUserId = clean(searchParams.get("foUserId"));
    const monthKey = clean(searchParams.get("month")) || currentMonthKeyUTC();
    if (!foUserId) return jsonError("foUserId required", 400);

    const rng = monthRange(monthKey);
    if (!rng) return jsonError("month must be YYYY-MM", 400);

    // FO basic + access guard
    const fo = await prisma.user.findUnique({
      where: { id: foUserId },
      select: { id: true, role: true, distributorId: true },
    });
    if (!fo || String(fo.role) !== "FIELD_OFFICER") return jsonError("Invalid FO", 400);

    if (auth.role !== "ADMIN") {
      const ok = await prisma.distributor.findFirst({
        where: { id: fo.distributorId || "__", salesManagerId: auth.userId },
        select: { id: true },
      });
      if (!ok) return jsonError("Forbidden", 403);
    }

    // ✅ SOURCE OF TRUTH: RetailerAssignmentActive
    const maps = await prisma.retailerAssignmentActive.findMany({
      where: { foUserId },
      select: { retailerId: true },
    });

    const retailerIds = maps.map((x) => x.retailerId).filter(Boolean) as string[];
    const assignedRetailers = retailerIds.length;

    if (!assignedRetailers) {
      return NextResponse.json({
        ok: true,
        debug: { assignmentSource: "RetailerAssignmentActive" },
        monthKey,
        assignedRetailers: 0,
        activeRetailers: 0,
        ordersCount: 0,
        ordersAmount: 0,
        collectionsAmount: 0,
        auditsCount: 0,
      });
    }

    // Orders count + sum(totalAmount)
    const ordersAgg = await prisma.order.aggregate({
      where: {
        retailerId: { in: retailerIds },
        createdAt: { gte: rng.start, lt: rng.end },
      },
      _count: { _all: true },
      _sum: { totalAmount: true },
    });

    // Collections sum: CREDIT in RetailerLedger
    const colAgg = await prisma.retailerLedger.aggregate({
      where: {
        retailerId: { in: retailerIds },
        type: "CREDIT",
        date: { gte: rng.start, lt: rng.end },
      },
      _sum: { amount: true },
    });

    // Audits count by FO
    const auditsCount = await prisma.retailerStockAudit.count({
      where: {
        fieldOfficerId: foUserId,
        auditDate: { gte: rng.start, lt: rng.end },
      },
    });

    // Active retailers = had ANY activity this month (order OR collection OR audit)
    const orderActive = await prisma.order.groupBy({
      by: ["retailerId"],
      where: {
        retailerId: { in: retailerIds },
        createdAt: { gte: rng.start, lt: rng.end },
      },
    });

    const collActive = await prisma.retailerLedger.groupBy({
      by: ["retailerId"],
      where: {
        retailerId: { in: retailerIds },
        type: "CREDIT",
        date: { gte: rng.start, lt: rng.end },
      },
    });

    const auditActive = await prisma.retailerStockAudit.groupBy({
      by: ["retailerId"],
      where: {
        retailerId: { in: retailerIds },
        fieldOfficerId: foUserId,
        auditDate: { gte: rng.start, lt: rng.end },
      },
    });

    const set = new Set<string>();
    for (const r of orderActive) set.add(r.retailerId);
    for (const r of collActive) set.add(r.retailerId);
    for (const r of auditActive) set.add(r.retailerId);

    return NextResponse.json({
      ok: true,
      debug: { assignmentSource: "RetailerAssignmentActive" },
      monthKey,
      assignedRetailers,
      activeRetailers: set.size,
      ordersCount: Number(ordersAgg._count._all || 0),
      ordersAmount: Number(ordersAgg._sum.totalAmount || 0),
      collectionsAmount: Number(colAgg._sum.amount || 0),
      auditsCount,
    });
  } catch (e: any) {
    return jsonError(e?.message || "Failed", 500);
  }
}
