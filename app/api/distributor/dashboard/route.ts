import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function money(n: number) {
  return Math.round(n || 0);
}

export async function GET() {
  try {
    const distributorId = await requireDistributorId();

    const distributor = await prisma.distributor.findUnique({
      where: { id: distributorId },
      select: { id: true, name: true, code: true, status: true },
    });

    const now = new Date();
    const todayFrom = startOfToday();
    const weekFrom = startOfWeek();
    const monthFrom = startOfMonth();
    const last30From = new Date(Date.now() - 29 * 86400000);

    // 1) Retailers count
    const [retailersCount, activeRetailersCount] = await Promise.all([
      prisma.retailer.count({ where: { distributorId } }),
      prisma.retailer.count({ where: { distributorId, status: "ACTIVE" } }),
    ]);

    // 2) Field officers count
    const fieldOfficersCount = await prisma.user.count({
      where: { distributorId, role: "FIELD_OFFICER", status: "ACTIVE" },
    });

    // 3) Stock summary
    const invRows = await prisma.inventory.findMany({
      where: { distributorId },
      select: { qty: true },
    });

    const stockSkus = invRows.length;
    const stockTotalQty = invRows.reduce((a, b) => a + (b.qty || 0), 0);

    async function ledgerTotals(from: Date, to: Date) {
      const rows = await prisma.retailerLedger.findMany({
        where: { distributorId, date: { gte: from, lte: to } },
        select: { type: true, amount: true },
      });

      let sales = 0;
      let received = 0;

      for (const r of rows) {
        if (r.type === "DEBIT") sales += r.amount;
        else received += r.amount;
      }

      return {
        sales: money(sales),
        received: money(received),
        pending: money(sales - received),
      };
    }

    const [today, week, month] = await Promise.all([
      ledgerTotals(todayFrom, now),
      ledgerTotals(weekFrom, now),
      ledgerTotals(monthFrom, now),
    ]);

    const allLedger = await prisma.retailerLedger.findMany({
      where: { distributorId },
      select: { type: true, amount: true },
    });

    let allSales = 0;
    let allReceived = 0;

    for (const r of allLedger) {
      if (r.type === "DEBIT") allSales += r.amount;
      else allReceived += r.amount;
    }

    const totalPending = money(allSales - allReceived);

    // ✅ 4) Top 5 Products (InvoiceItem based) - SAFE VERSION
    const invoiceIdsRows = await prisma.invoice.findMany({
      where: { distributorId },
      select: { id: true },
      // optional: last 30 days
      // where: { distributorId, createdAt: { gte: last30From, lte: now } },
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

    // Top retailers (last 30 days) (ledger based)
    const last30 = await prisma.retailerLedger.findMany({
      where: { distributorId, date: { gte: last30From, lte: now } },
      select: { retailerId: true, type: true, amount: true },
    });

    const agg = new Map<string, { sales: number; received: number }>();

    for (const r of last30) {
      const cur = agg.get(r.retailerId) || { sales: 0, received: 0 };
      if (r.type === "DEBIT") cur.sales += r.amount;
      else cur.received += r.amount;
      agg.set(r.retailerId, cur);
    }

    const retailerIds = [...agg.keys()];

    const retailerMeta = retailerIds.length
      ? await prisma.retailer.findMany({
          where: { id: { in: retailerIds } },
          select: { id: true, name: true, city: true },
        })
      : [];

    const nameMap = new Map(retailerMeta.map((r) => [r.id, r]));

    const topRetailers = retailerIds
      .map((id) => {
        const v = agg.get(id)!;
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
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    const topDefaulters = [...topRetailers]
      .sort((a, b) => b.pending - a.pending)
      .slice(0, 10);

    const last30Debit = new Set(
      (
        await prisma.retailerLedger.findMany({
          where: {
            distributorId,
            date: { gte: last30From, lte: now },
            type: "DEBIT",
          },
          select: { retailerId: true },
        })
      ).map((x) => x.retailerId)
    );

    const allRetailers = await prisma.retailer.findMany({
      where: { distributorId },
      select: { id: true, name: true, city: true, status: true },
    });

    const nonPerformingRetailers = allRetailers
      .filter((r) => !last30Debit.has(r.id))
      .slice(0, 20)
      .map((r) => ({
        retailerId: r.id,
        name: r.name,
        city: r.city || "",
        status: r.status,
      }));

    return NextResponse.json({
      ok: true, // ✅ IMPORTANT
      distributorId,
      distributor,
      counts: {
        retailers: retailersCount,
        activeRetailers: activeRetailersCount,
        fieldOfficers: fieldOfficersCount,
      },
      stock: {
        skus: stockSkus,
        totalQty: stockTotalQty,
      },
      totals: {
        today,
        week,
        month,
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
