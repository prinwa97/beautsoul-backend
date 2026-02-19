import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function money(n: any) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? Math.round(x) : 0;
}

export async function GET(req: Request) {
  try {
    const distributorId = await requireDistributorId();
    if (!distributorId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const take = Math.min(Number(searchParams.get("take") || "200"), 500);

    // ✅ Retailers list (include createdAt for fallback)
    const retailers = await prisma.retailer.findMany({
      where: { distributorId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        name: true,
        city: true,
        phone: true,
        status: true,
        createdAt: true,
      },
    });

    const retailerIds = retailers.map((r) => r.id);

    // ✅ Ledger sums by retailerId + type
    const groups = retailerIds.length
      ? await prisma.retailerLedger.groupBy({
          by: ["retailerId", "type"],
          where: { distributorId, retailerId: { in: retailerIds } },
          _sum: { amount: true },
        })
      : [];

    const sumMap = new Map<string, { debit: number; credit: number }>();
    for (const g of groups) {
      const cur = sumMap.get(g.retailerId) || { debit: 0, credit: 0 };
      const amt = money(g._sum.amount);
      if (g.type === "DEBIT") cur.debit += amt;
      else cur.credit += amt;
      sumMap.set(g.retailerId, cur);
    }

    // ✅ Last activity date (MAX ledger.date) per retailer
    const lastActGroups = retailerIds.length
      ? await prisma.retailerLedger.groupBy({
          by: ["retailerId"],
          where: { distributorId, retailerId: { in: retailerIds } },
          _max: { date: true },
        })
      : [];

    const lastMap = new Map<string, Date | null>();
    for (const g of lastActGroups) {
      lastMap.set(g.retailerId, g._max.date || null);
    }

    const rows = retailers.map((r) => {
      const v = sumMap.get(r.id) || { debit: 0, credit: 0 };
      const pending = money(v.debit - v.credit);

      const lastActivityAt = lastMap.get(r.id) || r.createdAt || null;

      return {
        retailerId: r.id,
        name: r.name,
        city: r.city || "",
        phone: r.phone || "",
        status: r.status,
        totalSale: money(v.debit),
        totalPaid: money(v.credit),
        pending,
        createdAt: r.createdAt,
        lastActivityAt,
      };
    });

    const grand = rows.reduce(
      (acc, r) => {
        acc.totalSale += r.totalSale;
        acc.totalPaid += r.totalPaid;
        acc.pending += r.pending;
        return acc;
      },
      { totalSale: 0, totalPaid: 0, pending: 0 }
    );

    return NextResponse.json({ ok: true, take, rows, grand });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
