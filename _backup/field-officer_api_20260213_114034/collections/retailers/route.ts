import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asInt(v: any, def = 200) {
  const n = Math.floor(Number(v ?? def));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : def;
}

async function requireFieldOfficer() {
  const u: any = await getSessionUser();
  if (!u) return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  const role = String(u.role || "").toUpperCase();
  if (role !== "FIELD_OFFICER") return { ok: false as const, status: 403 as const, error: "Only Field Officer allowed" };
  return { ok: true as const, user: u };
}

// GET /api/field-officer/collections/retailers?take=200
export async function GET(req: Request) {
  try {
    const auth = await requireFieldOfficer();
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const take = asInt(searchParams.get("take"), 200);

    // ✅ FO should only see retailers under his distributorId (if present)
    const foDistributorId = auth.user?.distributorId ? String(auth.user.distributorId) : null;

    const retailers = await prisma.retailer.findMany({
      take,
      where: foDistributorId ? { distributorId: foDistributorId } : undefined,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        city: true,
        status: true,
        distributorId: true,
      },
    });

    const retailerIds = retailers.map((r) => r.id);

    // ✅ invoices aggregates
    const invAgg = retailerIds.length
      ? await prisma.invoice.groupBy({
          by: ["retailerId"],
          where: { retailerId: { in: retailerIds } },
          _sum: { totalAmount: true },
          _count: { _all: true },
          _max: { createdAt: true },
        })
      : [];

    // ✅ payments aggregates (RetailerLedger CREDIT = collected)
    const payAgg = retailerIds.length
      ? await prisma.retailerLedger.groupBy({
          by: ["retailerId"],
          where: { retailerId: { in: retailerIds }, type: "CREDIT" },
          _sum: { amount: true },
        })
      : [];

    const invMap = new Map<string, { total: number; count: number; lastAt: string | null }>();
    for (const r of invAgg) {
      const rid = String(r.retailerId || "");
      if (!rid) continue;
      invMap.set(rid, {
        total: Number(r._sum?.totalAmount || 0),
        count: Number(r._count?._all || 0),
        lastAt: r._max?.createdAt ? new Date(r._max.createdAt).toISOString() : null,
      });
    }

    const payMap = new Map<string, number>();
    for (const r of payAgg) {
      const rid = String(r.retailerId || "");
      if (!rid) continue;
      payMap.set(rid, Number(r._sum?.amount || 0));
    }

    const rows = retailers.map((r) => {
      const inv = invMap.get(r.id) || { total: 0, count: 0, lastAt: null };
      const paid = payMap.get(r.id) || 0;
      const pending = Math.max(inv.total - paid, 0);

      return {
        retailerId: r.id,
        name: r.name,
        city: r.city ?? null,
        status: r.status ?? null,
        pendingAmount: pending,
        invoiceCount: inv.count,
        lastInvoiceAt: inv.lastAt,
      };
    });

    return NextResponse.json({ ok: true, retailers: rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
