"use client";

import { useEffect, useMemo, useState } from "react";
import {
  SalesTrendGraph,
  TopProductsGraph,
  TopProductsDonut,
  TopRetailersDonut,
} from "./sales-graphs";

type TrendPoint = { date: string; amount: number };
type TopProduct = { productName: string; amount: number; qty: number };

type TopRetailer = {
  id: string;
  name: string;
  city: string | null;
  amount: number;
  orders: number;
};

type Summary = {
  ok: boolean;
  days: number;
  totalSales: number;
  prevTotalSales: number;
  pctChange: number | null;
  totalOrders: number;
  activeRetailers: number;

  topRetailer: null | TopRetailer;
  topRetailers?: TopRetailer[];

  topProduct: null | { name: string; amount: number; qty: number };
};

type ProductBreakRow = {
  retailerId: string;
  retailerName: string;
  city: string | null;
  amount: number;
  qty: number;
  orders: number;
};

type RetailerBreakRow = {
  productName: string;
  amount: number;
  qty: number;
  orders: number;
};

function money(n: any) {
  const x = Number(n || 0);
  return x.toLocaleString("en-IN");
}

function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-600">{sub}</div> : null}
    </div>
  );
}

export default function SalesClient() {
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  // ✅ popup state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalSub, setModalSub] = useState("");
  const [modalLoading, setModalLoading] = useState(false);
  const [productBreak, setProductBreak] = useState<ProductBreakRow[]>([]);
  const [retailerBreak, setRetailerBreak] = useState<RetailerBreakRow[]>([]);

  const retailerNameToId = useMemo(() => {
    const m = new Map<string, string>();
    (summary?.topRetailers || []).forEach((r) => {
      if (r?.name && r?.id) m.set(String(r.name).toLowerCase(), r.id);
    });
    return m;
  }, [summary?.topRetailers]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const sRes = await fetch(`/api/distributor/sales/summary?days=${days}`, {
          cache: "no-store",
        });
        const sJson = await sRes.json().catch(() => null);
        if (sRes.ok && sJson?.ok) setSummary(sJson);
        else setSummary(null);

        const gRes = await fetch(`/api/distributor/sales/graphs?days=${days}`, {
          cache: "no-store",
        });
        const gJson = await gRes.json().catch(() => null);
        if (gRes.ok && gJson?.ok) {
          setTrend(gJson.trend || []);
          setTopProducts(gJson.topProducts || []);
        } else {
          setTrend([]);
          setTopProducts([]);
        }
      } catch (e) {
        console.log("sales load error:", e);
        setSummary(null);
        setTrend([]);
        setTopProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [days]);

  const growthText = (() => {
    if (!summary) return "—";
    if (summary.pctChange === null) return "No previous period data";
    if (summary.pctChange >= 0) return `↑ ${summary.pctChange}% vs last ${days} days`;
    return `↓ ${Math.abs(summary.pctChange)}% vs last ${days} days`;
  })();

  async function openProductModal(productName: string) {
    if (!productName) return;
    setModalTitle(`Product: ${productName}`);
    setModalSub(`Who sells ${productName} the most (Top 10)`);
    setModalOpen(true);
    setModalLoading(true);
    setRetailerBreak([]);
    try {
      const res = await fetch(
        `/api/distributor/sales/product-breakdown?days=${days}&productName=${encodeURIComponent(
          productName
        )}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) setProductBreak(Array.isArray(json.rows) ? json.rows : []);
      else setProductBreak([]);
    } finally {
      setModalLoading(false);
    }
  }

  async function openRetailerModal(retailerName: string) {
    const rid = retailerNameToId.get(String(retailerName || "").toLowerCase()) || "";
    if (!rid) return;

    setModalTitle(`Retailer: ${retailerName}`);
    setModalSub(`Which products are sold the most by ${retailerName} (Top 10)`);
    setModalOpen(true);
    setModalLoading(true);
    setProductBreak([]);
    try {
      const res = await fetch(
        `/api/distributor/sales/retailer-breakdown?days=${days}&retailerId=${encodeURIComponent(
          rid
        )}`,
        { cache: "no-store" }
      );
      const json = await res.json().catch(() => null);
      if (res.ok && json?.ok) setRetailerBreak(Array.isArray(json.rows) ? json.rows : []);
      else setRetailerBreak([]);
    } finally {
      setModalLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header + Days */}
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <div className="text-xl font-semibold">Sales</div>
          <div className="text-xs text-gray-500">
            Retailer wise report (30/60/90 days)
          </div>
        </div>

        <div className="ml-auto flex gap-2">
          {[30, 60, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`rounded-xl border px-3 py-1 text-sm transition ${
                days === d ? "bg-black text-white" : "bg-white hover:bg-gray-50"
              }`}
            >
              {d} Days
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-white p-6 text-sm text-gray-500">
          Loading…
        </div>
      ) : (
        <>
          {/* ✅ TOP: 4 Cards */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              title={`Total Sales (last ${days} days)`}
              value={`₹${money(summary?.totalSales)}`}
              sub={growthText}
            />
            <StatCard
              title="Top Retailer"
              value={summary?.topRetailer?.name ? summary.topRetailer.name : "—"}
              sub={
                summary?.topRetailer
                  ? `₹${money(summary.topRetailer.amount)} • ${summary.topRetailer.orders} orders`
                  : "No data"
              }
            />
            <StatCard
              title="Top Product"
              value={summary?.topProduct?.name ? summary.topProduct.name : "—"}
              sub={
                summary?.topProduct
                  ? `₹${money(summary.topProduct.amount)} • ${summary.topProduct.qty} pcs`
                  : "No data"
              }
            />
            <StatCard
              title="Active Retailers"
              value={`${money(summary?.activeRetailers || 0)}`}
              sub={`Orders: ${money(summary?.totalOrders || 0)}`}
            />
          </div>

          {/* ✅ 50/50 Share */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <TopProductsDonut
              data={topProducts}
              topN={6}
              onClickProduct={openProductModal}
            />

            <TopRetailersDonut
              data={(summary?.topRetailers || []) as any}
              topN={6}
              onClickRetailer={openRetailerModal}
            />
          </div>

          <SalesTrendGraph data={trend} />
          <TopProductsGraph data={topProducts} title="Top Products (All Retailers)" />
        </>
      )}

      {/* ✅ POPUP MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="p-4 border-b flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">{modalTitle}</div>
                <div className="text-xs text-gray-600">{modalSub}</div>
              </div>
              <button
                className="px-4 py-2 rounded-xl bg-gray-100"
                onClick={() => {
                  setModalOpen(false);
                  setProductBreak([]);
                  setRetailerBreak([]);
                }}
              >
                Close
              </button>
            </div>

            <div className="p-4">
              {modalLoading ? (
                <div className="text-sm text-gray-600">Loading…</div>
              ) : (
                <>
                  {productBreak.length > 0 && (
                    <div className="overflow-auto rounded-xl border">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left">
                          <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">Retailer</th>
                            <th className="p-3">City</th>
                            <th className="p-3 text-right">Orders</th>
                            <th className="p-3 text-right">Qty</th>
                            <th className="p-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productBreak.map((r, idx) => (
                            <tr key={r.retailerId} className="border-t">
                              <td className="p-3 font-semibold">{idx + 1}</td>
                              <td className="p-3">{r.retailerName}</td>
                              <td className="p-3">{r.city || "-"}</td>
                              <td className="p-3 text-right">{r.orders}</td>
                              <td className="p-3 text-right">{r.qty}</td>
                              <td className="p-3 text-right font-semibold">
                                ₹{money(r.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {retailerBreak.length > 0 && (
                    <div className="overflow-auto rounded-xl border">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left">
                          <tr>
                            <th className="p-3">#</th>
                            <th className="p-3">Product</th>
                            <th className="p-3 text-right">Orders</th>
                            <th className="p-3 text-right">Qty</th>
                            <th className="p-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {retailerBreak.map((r, idx) => (
                            <tr key={r.productName} className="border-t">
                              <td className="p-3 font-semibold">{idx + 1}</td>
                              <td className="p-3">{r.productName}</td>
                              <td className="p-3 text-right">{r.orders}</td>
                              <td className="p-3 text-right">{r.qty}</td>
                              <td className="p-3 text-right font-semibold">
                                ₹{money(r.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {productBreak.length === 0 && retailerBreak.length === 0 && (
                    <div className="text-sm text-gray-600">
                      No data found for this selection.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
