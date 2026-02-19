"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const COLORS = ["#f8b4b4", "#fcd5ce", "#fde68a", "#e9d5ff", "#bbf7d0", "#bfdbfe"];

type SaleMode = "today" | "week" | "month";

type TopProduct = { rank: number; productName: string; pcs: number; amount: number };

type DashboardResponse = {
  ok: boolean;
  distributorId: string;
  distributor?: { id: string; name: string; code?: string | null; status?: string | null } | null;

  counts: { retailers: number; activeRetailers: number; fieldOfficers: number };
  stock: { skus: number; totalQty: number };

  totals: {
    today: { sales: number; received: number; pending: number };
    week: { sales: number; received: number; pending: number };
    month: { sales: number; received: number; pending: number };
    totalPending: number;
  };

  lists: {
    topProducts: TopProduct[];
    topRetailers: {
      retailerId: string;
      name: string;
      city: string;
      sales: number;
      received: number;
      pending: number;
    }[];
    topDefaulters: {
      retailerId: string;
      name: string;
      city: string;
      sales: number;
      received: number;
      pending: number;
    }[];
    nonPerformingRetailers: { retailerId: string; name: string; city: string; status?: string | null }[];
  };
};

type RetailerSalesSummary = {
  ok: boolean;
  retailer: { id: string; name: string; city?: string | null; phone?: string | null; status?: string | null };
  thisMonth: { sales: number; received: number; pending: number };
  lastMonth: { sales: number; received: number; pending: number };
  thisMonthTopProducts: { rank: number; productName: string; amount: number; pcs: number }[];
  lastMonthTopProducts: { rank: number; productName: string; amount: number; pcs: number }[];
};

export default function DashboardClient() {
  const router = useRouter();

  const [mode, setMode] = useState<SaleMode>("today");
  const [loading, setLoading] = useState(false);
  const [unauth, setUnauth] = useState<string | null>(null);
  const [data, setData] = useState<DashboardResponse | null>(null);

  // ✅ Top Products (from dedicated endpoint)
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topProductsLoading, setTopProductsLoading] = useState(false);

  // ✅ Last 7 days trend
  const [sales7Days, setSales7Days] = useState<{ date: string; amount: number }[]>([]);
  const [sales7Loading, setSales7Loading] = useState(false);

  // ✅ Product popup: Top 5 retailers for that product
  const [productPopupOpen, setProductPopupOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);

  // ✅ Retailer popup: month summary + top products
  const [retailerPopupOpen, setRetailerPopupOpen] = useState(false);
  const [retailerSummaryLoading, setRetailerSummaryLoading] = useState(false);
  const [retailerSummary, setRetailerSummary] = useState<RetailerSalesSummary | null>(null);
  const [selectedRetailer, setSelectedRetailer] = useState<{ id: string; name: string; city?: string } | null>(null);

  // ✅ load dashboard
  useEffect(() => {
    (async () => {
      setLoading(true);
      setUnauth(null);

      try {
        const res = await fetch("/api/distributor/dashboard", { cache: "no-store" });
        const j = await res.json().catch(() => null);

        console.log("DASHBOARD API:", res.status, j);

        if (res.status === 401) {
          setUnauth(j?.error || j?.message || "Unauthorized. Please login as Distributor.");
          setData(null);
          return;
        }

        if (res.ok && j?.ok) setData(j as DashboardResponse);
        else {
          setUnauth(j?.error || "Dashboard API failed");
          setData(null);
        }
      } catch (e) {
        console.log("dashboard load error:", e);
        setUnauth("Dashboard load failed");
        setData(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ✅ Load Top Products
  useEffect(() => {
    (async () => {
      setTopProductsLoading(true);
      try {
        const res = await fetch("/api/distributor/analytics/top-products?take=5", { cache: "no-store" });
        const j = await res.json().catch(() => null);
        console.log("TOP PRODUCTS API:", res.status, j);

        if (res.ok && j?.ok) setTopProducts(j.products || []);
        else setTopProducts([]);
      } catch (e) {
        console.log("top-products load error:", e);
        setTopProducts([]);
      } finally {
        setTopProductsLoading(false);
      }
    })();
  }, []);

  // ✅ Load Last 7 Days Sales Trend
  useEffect(() => {
    (async () => {
      setSales7Loading(true);
      try {
        const res = await fetch("/api/distributor/analytics/sales-trend?days=7", { cache: "no-store" });
        const j = await res.json().catch(() => null);
        console.log("SALES TREND API:", res.status, j);

        if (res.ok && j?.ok) setSales7Days(j.list || []);
        else setSales7Days([]);
      } catch (e) {
        console.log("sales-trend load error:", e);
        setSales7Days([]);
      } finally {
        setSales7Loading(false);
      }
    })();
  }, []);

  // ✅ Product -> Top 5 retailers popup
  async function openProduct(productName: string) {
    setSelectedProduct(productName);
    setProductPopupOpen(true);
    setRanking([]);
    setRankingLoading(true);

    try {
      const res = await fetch(
        `/api/distributor/analytics/product-retailer-ranking?productName=${encodeURIComponent(productName)}&take=5`,
        { cache: "no-store" }
      );

      const j = await res.json().catch(() => null);
      console.log("product-retailer-ranking:", res.status, j);

      if (res.ok && j?.ok) setRanking(j.list || []);
      else setRanking([]);
    } catch (e) {
      console.log("ranking load error:", e);
      setRanking([]);
    } finally {
      setRankingLoading(false);
    }
  }

  // ✅ Retailer -> month summary popup
  async function openRetailer(retailerId: string, name: string, city?: string) {
    setSelectedRetailer({ id: retailerId, name, city });
    setRetailerPopupOpen(true);
    setRetailerSummary(null);
    setRetailerSummaryLoading(true);

    try {
      const res = await fetch(
        `/api/distributor/analytics/retailer-sales-summary?retailerId=${encodeURIComponent(retailerId)}&take=5`,
        { cache: "no-store" }
      );
      const j = await res.json().catch(() => null);
      console.log("retailer-sales-summary:", res.status, j);

      if (res.ok && j?.ok) setRetailerSummary(j as RetailerSalesSummary);
      else setRetailerSummary(null);
    } catch (e) {
      console.log("retailer summary load error:", e);
      setRetailerSummary(null);
    } finally {
      setRetailerSummaryLoading(false);
    }
  }

  const stockData = useMemo(() => {
    const total = data?.stock?.totalQty ?? 0;
    return [{ name: "Total Stock", pcs: total }];
  }, [data]);

  const totalStock = data?.stock?.totalQty ?? 0;
  const totals = data?.totals;
  const current = totals ? totals[mode] : { sales: 0, received: 0, pending: 0 };

  const retailers = data?.counts?.retailers ?? 0;
  const activeRetailers = data?.counts?.activeRetailers ?? 0;
  const fieldOfficers = data?.counts?.fieldOfficers ?? 0;

  // Placeholder (other counts not wired)
  const orderStatus = { pending: 0, approved: 0, dispatched: 0, delivered: 0 };

  return (
    <div className="space-y-6">
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card onClick={() => router.push("/distributor/ledger")}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Sales (₹)</span>

            <select
              className="text-xs border rounded px-2 py-1 bg-white"
              value={mode}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setMode(e.target.value as SaleMode)}
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>

          <div className="mt-3 text-2xl font-extrabold text-gray-900">{formatINR(current.sales)}</div>

          <div className="mt-1 text-xs text-gray-500">
            Received: <b className="text-gray-700">{formatINR(current.received)}</b> • Pending:{" "}
            <b className="text-gray-700">{formatINR(current.pending)}</b>
          </div>

          <div className="mt-2 text-[11px] text-gray-400">Click to open Ledger</div>
        </Card>

        <Card title="Retailers" value={retailers} onClick={() => router.push("/distributor/users")} />
        <Card title="Active Retailers" value={activeRetailers} onClick={() => router.push("/distributor/users")} />
        <Card title="Field Officers" value={fieldOfficers} onClick={() => router.push("/distributor/users")} />
      </div>

      {/* LOADING / UNAUTH */}
      {loading ? (
        <div className="bg-white rounded-2xl border p-4 shadow-sm text-sm text-gray-500">Loading dashboard…</div>
      ) : unauth ? (
        <div className="bg-white rounded-2xl border p-4 shadow-sm text-sm">
          <div className="font-semibold">Dashboard issue</div>
          <div className="mt-1 text-gray-600">{unauth}</div>
          <div className="mt-2 text-xs text-gray-500">Tip: Console me logs check karo.</div>
        </div>
      ) : null}

      {/* MIDDLE SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card onClick={() => router.push("/distributor/stock")}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Total Stock (PCS)</h3>
            <span className="text-xs text-gray-500">Click to open Stock</span>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stockData}
                    dataKey="pcs"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={3}
                    isAnimationActive={false}
                  >
                    {stockData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${Number(value || 0).toLocaleString("en-IN")} pcs`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              <div className="text-sm">
                Total: <b>{Number(totalStock || 0).toLocaleString("en-IN")} PCS</b>
              </div>
              <div className="pt-2 text-xs text-gray-500">
                Note: product-wise donut chahiye to backend me product-wise stock list add karni hogi.
              </div>
            </div>
          </div>
        </Card>

        <Card onClick={() => router.push("/distributor/sales")}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Last 7 Days Sales (₹)</h3>
            <span className="text-xs text-gray-500">Click to open Sales</span>
          </div>

          <div className="h-64 mt-3">
            {sales7Loading ? (
              <div className="text-sm text-gray-500">Loading trend…</div>
            ) : sales7Days.length === 0 ? (
              <div className="text-sm text-gray-500">No sales in last 7 days.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sales7Days}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(v) => shortINR(Number(v || 0))} />
                  <Tooltip formatter={(value: any) => [formatINR(Number(value || 0)), "Sales"]} />
                  <Line type="monotone" dataKey="amount" strokeWidth={3} dot={false} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* LOWER SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ✅ Top Products (CLICKABLE -> Top 5 Retailers popup) */}
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Top Products</h3>
            <span className="text-xs text-gray-500">Click product → Top 5 Retailers</span>
          </div>

          <div className="mt-3 space-y-2">
            {topProductsLoading ? (
              <div className="text-sm text-gray-500">Loading…</div>
            ) : topProducts.length === 0 ? (
              <div className="text-sm text-gray-500">No product sales found.</div>
            ) : (
              topProducts.map((p) => (
                <button
                  key={p.productName}
                  type="button"
                  onClick={() => openProduct(p.productName)}
                  className="w-full rounded-xl border p-3 text-left hover:bg-gray-50 active:scale-[0.99] transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {p.rank}. {p.productName}
                    </div>
                    <div className="text-sm text-gray-700">{Number(p.pcs || 0)} pcs</div>
                  </div>
                  <div className="text-xs text-gray-500">₹ {Number(p.amount || 0).toLocaleString("en-IN")}</div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Order Status (clickable placeholders) */}
        <Card onClick={() => router.push("/distributor/retailer-orders")}>
          <h3 className="font-semibold mb-3">Order Status</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Status label="Pending" value={orderStatus.pending} />
            <Status label="Approved" value={orderStatus.approved} />
            <Status label="Dispatched" value={orderStatus.dispatched} />
            <Status label="Delivered" value={orderStatus.delivered} />
          </div>
          <div className="mt-3 text-xs text-gray-500">Counts add later, but click opens Orders.</div>
        </Card>
      </div>

      {/* ✅ Top Retailers rank 1–5 + click -> retailer summary popup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Top Retailers (Rank 1–5)</h3>
            <span className="text-xs text-gray-500">Click retailer → month summary</span>
          </div>

          <div className="mt-3 space-y-2">
            {(data?.lists?.topRetailers || []).length === 0 ? (
              <div className="text-sm text-gray-500">No retailer sales found.</div>
            ) : (
              (data?.lists?.topRetailers || []).slice(0, 5).map((r, idx) => (
                <button
                  key={r.retailerId}
                  type="button"
                  onClick={() => openRetailer(r.retailerId, r.name, r.city)}
                  className="w-full text-left rounded-xl border p-3 hover:bg-gray-50 active:scale-[0.99] transition"
                >
                  <div className="font-medium truncate">
                    {idx + 1}. {r.name} {r.city ? `(${r.city})` : ""}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Last 30d Sales: ₹ {Number(r.sales || 0).toLocaleString("en-IN")} • Pending: ₹{" "}
                    {Number(r.pending || 0).toLocaleString("en-IN")}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        {/* Top Defaulters clickable -> open ledger */}
        <Card>
          <h3 className="font-semibold mb-3">Top Defaulters</h3>
          <div className="space-y-2">
            {(data?.lists?.topDefaulters || []).length === 0 ? (
              <div className="text-sm text-gray-500">No defaulters found.</div>
            ) : (
              (data?.lists?.topDefaulters || []).slice(0, 10).map((r, idx) => (
                <button
                  key={r.retailerId}
                  type="button"
                  onClick={() => router.push(`/distributor/ledger/${r.retailerId}`)}
                  className="w-full text-left rounded-xl border p-3 hover:bg-gray-50 active:scale-[0.99] transition"
                >
                  <div className="font-medium truncate">
                    {idx + 1}. {r.name} {r.city ? `(${r.city})` : ""}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Pending: ₹ {Number(r.pending || 0).toLocaleString("en-IN")}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* ✅ POPUP 1: Product -> Top 5 Retailers */}
      {productPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <div className="text-lg font-semibold">{selectedProduct}</div>
                <div className="text-xs text-gray-500">Top 5 Retailers (Amount + PCS)</div>
              </div>
              <button
                type="button"
                onClick={() => setProductPopupOpen(false)}
                className="rounded-lg px-3 py-1 text-sm hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="p-4">
              {rankingLoading ? (
                <div className="text-sm text-gray-600">Loading…</div>
              ) : ranking.length === 0 ? (
                <div className="text-sm text-gray-600">No data found.</div>
              ) : (
                <div className="space-y-2">
                  {ranking.map((r: any) => (
                    <div key={r.retailerId} className="flex items-center justify-between rounded-xl border p-3">
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {r.rank}. {r.name} {r.city ? `(${r.city})` : ""}
                        </div>
                        <div className="text-xs text-gray-500">{r.phone || "-"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{Number(r.pcs || 0)} pcs</div>
                        <div className="text-xs text-gray-500">₹ {Number(r.amount || 0).toLocaleString("en-IN")}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ✅ POPUP 2: Retailer -> This month/Last month + Top 5 products */}
      {retailerPopupOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b p-4">
              <div>
                <div className="text-lg font-semibold">
                  {selectedRetailer?.name} {selectedRetailer?.city ? `(${selectedRetailer.city})` : ""}
                </div>
                <div className="text-xs text-gray-500">This Month / Last Month + Top Products</div>
              </div>
              <button
                type="button"
                onClick={() => setRetailerPopupOpen(false)}
                className="rounded-lg px-3 py-1 text-sm hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-4">
              {retailerSummaryLoading ? (
                <div className="text-sm text-gray-600">Loading…</div>
              ) : !retailerSummary ? (
                <div className="text-sm text-gray-600">No data found.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-gray-500">This Month Sale</div>
                      <div className="text-lg font-extrabold mt-1">{formatINR(retailerSummary.thisMonth.sales)}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Received: {formatINR(retailerSummary.thisMonth.received)} • Pending:{" "}
                        {formatINR(retailerSummary.thisMonth.pending)}
                      </div>
                    </div>

                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-gray-500">Last Month Sale</div>
                      <div className="text-lg font-extrabold mt-1">{formatINR(retailerSummary.lastMonth.sales)}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Received: {formatINR(retailerSummary.lastMonth.received)} • Pending:{" "}
                        {formatINR(retailerSummary.lastMonth.pending)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="rounded-xl border p-3">
                      <div className="text-sm font-semibold">This Month Top 5 Products</div>
                      <div className="mt-2 space-y-2">
                        {retailerSummary.thisMonthTopProducts.length === 0 ? (
                          <div className="text-sm text-gray-500">No invoice items found.</div>
                        ) : (
                          retailerSummary.thisMonthTopProducts.map((p) => (
                            <div
                              key={p.productName}
                              className="flex items-center justify-between rounded-lg border px-3 py-2"
                            >
                              <div className="text-sm font-medium">
                                {p.rank}. {p.productName}
                              </div>
                              <div className="text-sm font-semibold">{formatINR(p.amount)}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border p-3">
                      <div className="text-sm font-semibold">Last Month Top 5 Products</div>
                      <div className="mt-2 space-y-2">
                        {retailerSummary.lastMonthTopProducts.length === 0 ? (
                          <div className="text-sm text-gray-500">No invoice items found.</div>
                        ) : (
                          retailerSummary.lastMonthTopProducts.map((p) => (
                            <div
                              key={p.productName}
                              className="flex items-center justify-between rounded-lg border px-3 py-2"
                            >
                              <div className="text-sm font-medium">
                                {p.rank}. {p.productName}
                              </div>
                              <div className="text-sm font-semibold">{formatINR(p.amount)}</div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/distributor/ledger/${retailerSummary.retailer.id}`)}
                      className="flex-1 rounded-xl border px-4 py-2 hover:bg-gray-50 active:scale-[0.99] transition text-sm"
                    >
                      Open Ledger Detail
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/distributor/retailer-orders?retailerId=${encodeURIComponent(retailerSummary.retailer.id)}`
                        )
                      }
                      className="flex-1 rounded-xl border px-4 py-2 hover:bg-gray-50 active:scale-[0.99] transition text-sm"
                    >
                      Open Orders
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================== UI Helpers ================== */

function Card({
  title,
  value,
  children,
  onClick,
}: {
  title?: string;
  value?: string | number;
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  const clickable = typeof onClick === "function";
  return (
    <div
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") onClick?.();
      }}
      className={[
        "bg-white rounded-2xl border p-4 shadow-sm",
        clickable ? "cursor-pointer hover:bg-gray-50 active:scale-[0.99] transition" : "",
      ].join(" ")}
    >
      {title && <div className="text-sm text-gray-500">{title}</div>}
      {value !== undefined && value !== null && title && (
        <div className="mt-2 text-2xl font-extrabold text-gray-900">{value}</div>
      )}
      {children}
    </div>
  );
}

function Status({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-xl p-3 text-center bg-white">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-lg font-extrabold text-gray-900">{value}</div>
    </div>
  );
}

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function shortINR(n: number) {
  const x = Number(n || 0);
  if (x >= 10000000) return `${(x / 10000000).toFixed(1)}Cr`;
  if (x >= 100000) return `${(x / 100000).toFixed(1)}L`;
  if (x >= 1000) return `${(x / 1000).toFixed(1)}k`;
  return `${x}`;
}