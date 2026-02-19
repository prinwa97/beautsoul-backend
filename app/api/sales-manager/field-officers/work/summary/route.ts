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
function toDateStart(s: string | null) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
}
function toDateEnd(s: string | null) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
}
function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export async function GET(req: Request) {
  const auth = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);
  if (!auth.ok) return jsonError(auth.error || "Unauthorized", (auth as any).status || 401);

  try {
    const { searchParams } = new URL(req.url);
    const foUserId = clean(searchParams.get("foUserId"));
    const from = toDateStart(searchParams.get("from"));
    const to = toDateEnd(searchParams.get("to"));

    if (!foUserId) return jsonError("foUserId required", 400);

    const fo = await prisma.user.findUnique({
      where: { id: foUserId },
      select: { id: true, name: true, role: true, distributorId: true },
    });
    if (!fo || String(fo.role) !== "FIELD_OFFICER") return jsonError("Invalid FO", 400);
    if (!fo.distributorId) return jsonError("FO distributorId missing", 400);

    // scope check
    if (auth.role !== "ADMIN") {
      const dist = await prisma.distributor.findFirst({
        where: { id: fo.distributorId, salesManagerId: auth.userId },
        select: { id: true, name: true },
      });
      if (!dist) return jsonError("FO not in your distributors", 403);
    }

    const distributor = await prisma.distributor.findUnique({
      where: { id: fo.distributorId },
      select: { id: true, name: true },
    });

    // ✅ SOURCE OF TRUTH: RetailerAssignmentActive
    const maps = await prisma.retailerAssignmentActive.findMany({
      where: { foUserId },
      select: { retailerId: true },
    });
    const retailerIds = maps.map((m) => m.retailerId).filter(Boolean);

    if (!retailerIds.length) {
      return NextResponse.json({
        ok: true,
        debug: { assignmentSource: "RetailerAssignmentActive" },
        fo: {
          id: fo.id,
          name: fo.name || "-",
          distributor: distributor
            ? { id: distributor.id, name: distributor.name }
            : { id: fo.distributorId, name: "" },
        },
        summary: {
          assignedRetailers: 0,
          orders: 0,
          sales: 0,
          collections: 0,
          audits: 0,
          totalDue: 0,
        },
      });
    }

    const dateWhereOrder: any = { retailerId: { in: retailerIds } };
    if (from || to) dateWhereOrder.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const dateWhereLedger: any = { retailerId: { in: retailerIds } };
    // NOTE: if your ledger uses createdAt instead of date, change here
    if (from || to) dateWhereLedger.date = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const dateWhereAudit: any = { retailerId: { in: retailerIds } };
    if (from || to) dateWhereAudit.auditDate = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

    const ordersAgg = await prisma.order.aggregate({
      where: dateWhereOrder,
      _count: { _all: true },
      _sum: { totalAmount: true as any },
    });

    const collAgg = await prisma.retailerLedger.aggregate({
      where: { ...dateWhereLedger, type: "CREDIT" as any },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const auditAgg = await prisma.retailerStockAudit.aggregate({
      where: dateWhereAudit,
      _count: { _all: true },
    });

    // totalDue = all-time due (not range)
    const debitAll = await prisma.retailerLedger.aggregate({
      where: { retailerId: { in: retailerIds }, type: "DEBIT" as any },
      _sum: { amount: true },
    });
    const creditAll = await prisma.retailerLedger.aggregate({
      where: { retailerId: { in: retailerIds }, type: "CREDIT" as any },
      _sum: { amount: true },
    });

    const totalDue = n(debitAll._sum.amount) - n(creditAll._sum.amount);

    return NextResponse.json({
      ok: true,
      debug: { assignmentSource: "RetailerAssignmentActive" },
      fo: {
        id: fo.id,
        name: fo.name || "-",
        distributor: distributor
          ? { id: distributor.id, name: distributor.name }
          : { id: fo.distributorId, name: "" },
      },
      summary: {
        assignedRetailers: retailerIds.length,
        orders: n(ordersAgg._count._all),
        sales: n((ordersAgg as any)?._sum?.totalAmount),
        collections: n(collAgg._sum.amount),
        collectionsCount: n(collAgg._count._all),
        audits: n(auditAgg._count._all),
        totalDue,
      },
    });
  } catch (e: any) {
    return jsonError(e?.message || "Failed", 500);
  }
}
