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
    if (!foUserId) return jsonError("foUserId required", 400);

    const fo = await prisma.user.findUnique({
      where: { id: foUserId },
      select: { id: true, name: true, role: true, distributorId: true },
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

    const distributor = await prisma.distributor.findUnique({
      where: { id: fo.distributorId },
      select: { id: true, name: true },
    });

    const maps = await prisma.retailerAssignmentActive.findMany({
      where: { foUserId },
      select: { id: true, retailerId: true, assignedAt: true, note: true },
      orderBy: { assignedAt: "desc" },
    });

    const retailerIds = maps.map((m) => m.retailerId).filter(Boolean);
    if (!retailerIds.length) return NextResponse.json({ ok: true, rows: [] });

    const retailers = await prisma.retailer.findMany({
      where: { id: { in: retailerIds } },
      select: { id: true, name: true, phone: true, city: true, status: true, distributorId: true },
    });
    const retailerById = new Map(retailers.map((r) => [r.id, r]));

    // last order/collection/audit per retailer
    const lastOrders = await prisma.order.groupBy({
      by: ["retailerId"],
      where: { retailerId: { in: retailerIds } },
      _max: { createdAt: true },
    });
    const lastCollections = await prisma.retailerLedger.groupBy({
      by: ["retailerId"],
      where: { retailerId: { in: retailerIds }, type: "CREDIT" as any },
      _max: { date: true as any }, // if you use createdAt, change to createdAt
    });
    const lastAudits = await prisma.retailerStockAudit.groupBy({
      by: ["retailerId"],
      where: { retailerId: { in: retailerIds } },
      _max: { auditDate: true },
    });

    const lo = new Map(lastOrders.map((x) => [x.retailerId, x._max.createdAt]));
    const lc = new Map(lastCollections.map((x) => [x.retailerId, (x as any)._max?.date]));
    const la = new Map(lastAudits.map((x) => [x.retailerId, x._max.auditDate]));

    // due per retailer = debit - credit
    const debit = await prisma.retailerLedger.groupBy({
      by: ["retailerId"],
      where: { retailerId: { in: retailerIds }, type: "DEBIT" as any },
      _sum: { amount: true },
    });
    const credit = await prisma.retailerLedger.groupBy({
      by: ["retailerId"],
      where: { retailerId: { in: retailerIds }, type: "CREDIT" as any },
      _sum: { amount: true },
    });
    const dMap = new Map(debit.map((x) => [x.retailerId, n(x._sum.amount)]));
    const cMap = new Map(credit.map((x) => [x.retailerId, n(x._sum.amount)]));

    const rows = maps
      .map((m) => {
        const r = retailerById.get(m.retailerId);
        if (!r) return null;

        const due = n(dMap.get(r.id)) - n(cMap.get(r.id));
        return {
          mapId: m.id,
          retailerId: r.id,
          assignedAt: m.assignedAt ? new Date(m.assignedAt as any).toISOString() : null,
          note: m.note ?? null,
          due,
          lastOrderAt: lo.get(r.id) ? new Date(lo.get(r.id) as any).toISOString() : null,
          lastCollectionAt: lc.get(r.id) ? new Date(lc.get(r.id) as any).toISOString() : null,
          lastAuditAt: la.get(r.id) ? new Date(la.get(r.id) as any).toISOString() : null,
          inactiveDays: 0, // if you have logic for inactive, plug it here
          retailer: r,
          distributorId: distributor?.id || fo.distributorId,
          distributorName: distributor?.name || "",
        };
      })
      .filter(Boolean);

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return jsonError(e?.message || "Failed", 500);
  }
}
