import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fmtDate(iso?: Date | string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function daysLeft(iso?: Date | string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const now = new Date();
  const startNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startExp = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffMs = startExp.getTime() - startNow.getTime();
  return Math.ceil(diffMs / 86400000);
}

export default async function WarehouseReportsPage() {
  const now = new Date();
  const d30 = new Date(now);
  d30.setDate(d30.getDate() + 30);

  const companyWhere = { ownerType: "COMPANY" as const };

  const [totalAgg, totalBatches, productTotals, expiringBatches] = await Promise.all([
    prisma.stockLot.aggregate({
      _sum: { qtyOnHandPcs: true },
      where: companyWhere,
    }),

    prisma.stockLot.count({
      where: companyWhere,
    }),

    prisma.stockLot.groupBy({
      by: ["productName"],
      where: companyWhere,
      _sum: { qtyOnHandPcs: true },
      orderBy: { _sum: { qtyOnHandPcs: "desc" } },
    }),

    prisma.stockLot.findMany({
      where: {
        ownerType: "COMPANY",
        qtyOnHandPcs: { gt: 0 },
        expDate: { not: null, gte: now, lte: d30 },
      },
      orderBy: [{ expDate: "asc" }, { qtyOnHandPcs: "desc" }],
      take: 20,
    }),
  ]);

  const totalStock = totalAgg._sum.qtyOnHandPcs || 0;

  const lowStockCount = productTotals.filter(
    (p) => (p._sum.qtyOnHandPcs || 0) > 0 && (p._sum.qtyOnHandPcs || 0) < 50
  ).length;

  const expiringCount = expiringBatches.length;

  const topProducts = productTotals.slice(0, 10);

  return (
    <div className="space-y-5 text-gray-900">
      {/* Header */}
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Warehouse Reports</h1>
            <p className="mt-1 text-sm text-white/85">
              Company stock summary, low stock signals, and expiring batch visibility.
            </p>
          </div>

          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
            Live Snapshot
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card
          title="Total Stock (pcs)"
          value={totalStock.toLocaleString("en-IN")}
          sub="All COMPANY lots"
        />
        <Card
          title="Total Batches"
          value={totalBatches.toLocaleString("en-IN")}
          sub="Unique stock lot entries"
        />
        <Card
          title="Low Stock Products"
          value={lowStockCount.toLocaleString("en-IN")}
          sub="Total stock below 50 pcs"
          warn
        />
        <Card
          title="Expiring in 30 Days"
          value={expiringCount.toLocaleString("en-IN")}
          sub="Positive stock only"
          danger
        />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Top products */}
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gradient-to-r from-pink-50 to-rose-50 px-4 py-3">
            <div className="text-base font-bold text-gray-900">Top Products by Stock</div>
            <div className="mt-1 text-xs text-gray-600">Top 10 products by total on-hand quantity</div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white text-gray-700">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-bold">#</th>
                  <th className="px-4 py-3 text-left font-bold">Product</th>
                  <th className="px-4 py-3 text-right font-bold">Total Qty (pcs)</th>
                </tr>
              </thead>

              <tbody className="text-gray-900">
                {topProducts.map((p, idx) => (
                  <tr key={p.productName} className="border-b border-gray-100 hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{p.productName}</td>
                    <td className="px-4 py-3 text-right font-extrabold text-gray-900">
                      {(p._sum.qtyOnHandPcs || 0).toLocaleString("en-IN")}
                    </td>
                  </tr>
                ))}

                {topProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm font-medium text-gray-500">
                      No stock data found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Expiring batches */}
        <section className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gradient-to-r from-amber-50 to-rose-50 px-4 py-3">
            <div className="text-base font-bold text-gray-900">Expiring Batches (30 Days)</div>
            <div className="mt-1 text-xs text-gray-600">
              Only batches with stock on hand and expiry between today and next 30 days
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-white text-gray-700">
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left font-bold">Product</th>
                  <th className="px-4 py-3 text-left font-bold">Batch</th>
                  <th className="px-4 py-3 text-right font-bold">Qty</th>
                  <th className="px-4 py-3 text-left font-bold">Expiry</th>
                  <th className="px-4 py-3 text-left font-bold">Days Left</th>
                </tr>
              </thead>

              <tbody className="text-gray-900">
                {expiringBatches.map((b) => {
                  const left = daysLeft(b.expDate);
                  const riskClass =
                    left !== null && left <= 7
                      ? "bg-rose-100 text-rose-800"
                      : "bg-amber-100 text-amber-800";

                  return (
                    <tr key={b.id} className="border-b border-gray-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-gray-900">{b.productName}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                          {b.batchNo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        {b.qtyOnHandPcs.toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3 text-gray-800">{fmtDate(b.expDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-xl px-2.5 py-1 text-xs font-bold ${riskClass}`}>
                          {left === null ? "-" : `${left} day${left === 1 ? "" : "s"}`}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {expiringBatches.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm font-medium text-gray-500">
                      No expiring batches found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Card({
  title,
  value,
  sub,
  warn,
  danger,
}: {
  title: string;
  value: string;
  sub?: string;
  warn?: boolean;
  danger?: boolean;
}) {
  const border = danger ? "border-rose-200" : warn ? "border-amber-200" : "border-gray-200";
  const bg = danger ? "bg-rose-50" : warn ? "bg-amber-50" : "bg-white";
  const valueColor = danger ? "text-rose-700" : warn ? "text-amber-700" : "text-gray-900";

  return (
    <div className={`rounded-3xl border ${border} ${bg} p-4 shadow-sm`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</div>
      <div className={`mt-2 text-3xl font-extrabold ${valueColor}`}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-600">{sub}</div> : null}
    </div>
  );
}