import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Period = "today" | "week" | "month" | "year";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek() {
  const d = new Date();
  const day = d.getDay(); // 0 Sun..6 Sat
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const d = new Date();
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfYear() {
  const d = new Date();
  const x = new Date(d.getFullYear(), 0, 1);
  x.setHours(0, 0, 0, 0);
  return x;
}

function money(n: number) {
  return Math.round(Number(n || 0));
}

function getPeriodStart(period: Period) {
  switch (period) {
    case "today":
      return startOfToday();
    case "week":
      return startOfWeek();
    case "month":
      return startOfMonth();
    case "year":
      return startOfYear();
    default:
      return startOfToday();
  }
}

export async function GET(req: NextRequest) {
  try {
    const distributorId = await requireDistributorId();

    const rawPeriod = req.nextUrl.searchParams.get("period");
    const period: Period =
      rawPeriod === "today" ||
      rawPeriod === "week" ||
      rawPeriod === "month" ||
      rawPeriod === "year"
        ? rawPeriod
        : "today";

    const now = new Date();
    const periodFrom = getPeriodStart(period);

    // ✅ Use only real Distributor fields from your schema
    const distributor = await prisma.distributor.findUnique({
      where: { id: distributorId },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
      },
    });

    const [retailersCount, activeRetailersCount, fieldOfficersCount] =
      await Promise.all([
        prisma.retailer.count({ where: { distributorId } }),
        prisma.retailer.count({ where: { distributorId, status: "ACTIVE" } }),
        prisma.user.count({
          where: { distributorId, role: "FIELD_OFFICER", status: "ACTIVE" },
        }),
      ]);

    async function ledgerTotals(from: Date, to: Date) {
      const rows = await prisma.retailerLedger.findMany({
        where: {
          distributorId,
          date: { gte: from, lte: to },
        },
        select: { type: true, amount: true },
      });

      let sales = 0;
      let received = 0;

      for (const r of rows) {
        if (r.type === "DEBIT") sales += Number(r.amount || 0);
        else received += Number(r.amount || 0);
      }

      return {
        sales: money(sales),
        received: money(received),
        pending: money(sales - received),
      };
    }

    const totals = await ledgerTotals(periodFrom, now);

    const totalAgg = await prisma.retailerLedger.groupBy({
      by: ["type"],
      where: { distributorId },
      _sum: { amount: true },
    });

    let totalSalesAll = 0;
    let totalReceivedAll = 0;

    for (const r of totalAgg) {
      if (r.type === "DEBIT") totalSalesAll += Number(r._sum.amount || 0);
      else totalReceivedAll += Number(r._sum.amount || 0);
    }

    const totalPending = money(totalSalesAll - totalReceivedAll);

    const invoiceIdsRows = await prisma.invoice.findMany({
      where: {
        distributorId,
        createdAt: { gte: periodFrom, lte: now },
      },
      select: { id: true },
    });

    const invoiceIds = invoiceIdsRows.map((x) => x.id);

    const topProductGroups = invoiceIds.length
      ? await prisma.invoiceItem.groupBy({
          by: ["productName"],
          where: { invoiceId: { in: invoiceIds } },
          _sum: { qty: true, amount: true },
          orderBy: { _sum: { qty: "desc" } },
          take: 5,
        })
      : [];

    const topProducts = topProductGroups.map((g, idx) => ({
      rank: idx + 1,
      productName: g.productName,
      pcs: Number(g._sum.qty || 0),
      amount: money(Number(g._sum.amount || 0)),
    }));

    const periodLedger = await prisma.retailerLedger.findMany({
      where: {
        distributorId,
        date: { gte: periodFrom, lte: now },
      },
      select: {
        retailerId: true,
        type: true,
        amount: true,
      },
    });

    const agg = new Map<string, { sales: number; received: number; hasDebit: boolean }>();

    for (const r of periodLedger) {
      const cur = agg.get(r.retailerId) || {
        sales: 0,
        received: 0,
        hasDebit: false,
      };

      if (r.type === "DEBIT") {
        cur.sales += Number(r.amount || 0);
        cur.hasDebit = true;
      } else {
        cur.received += Number(r.amount || 0);
      }

      agg.set(r.retailerId, cur);
    }

    const retailerMeta = await prisma.retailer.findMany({
      where: { distributorId },
      select: { id: true, name: true, city: true, status: true },
    });

    const nameMap = new Map(retailerMeta.map((r) => [r.id, r]));

    const topRetailers = [...agg.entries()]
      .map(([id, v]) => {
        const meta = nameMap.get(id);
        return {
          retailerId: id,
          name: meta?.name || "Retailer",
          city: meta?.city || "",
          sales: money(v.sales),
          received: money(v.received),
          pending: money(v.sales - v.received),
        };
      })
      .sort((a, b) => b.sales - a.sales);

    const topDefaulters = [...agg.entries()]
      .map(([id, v]) => {
        const meta = nameMap.get(id);
        return {
          retailerId: id,
          name: meta?.name || "Retailer",
          city: meta?.city || "",
          sales: money(v.sales),
          received: money(v.received),
          pending: money(v.sales - v.received),
        };
      })
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 5);

    const nonPerformingRetailers = retailerMeta
      .filter((r) => !agg.get(r.id)?.hasDebit)
      .slice(0, 20)
      .map((r) => ({
        retailerId: r.id,
        name: r.name,
        city: r.city || "",
        status: r.status,
      }));

    return NextResponse.json({
      ok: true,
      distributorId,
      distributor: distributor
        ? {
            id: distributor.id,
            name: distributor.name || "",
            code: distributor.code || null,
            status: distributor.status || null,
          }
        : null,
      period,
      counts: {
        retailers: retailersCount,
        activeRetailers: activeRetailersCount,
        fieldOfficers: fieldOfficersCount,
      },
      totals: {
        sales: totals.sales,
        received: totals.received,
        pending: totals.pending,
        totalPending,
      },
      lists: {
        topProducts,
        topRetailers,
        topDefaulters,
        nonPerformingRetailers,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}