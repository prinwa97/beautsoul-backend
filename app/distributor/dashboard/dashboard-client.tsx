"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TopRetailersDonut from "@/components/charts/TopRetailersDonut";
import SalesLine from "@/components/charts/SalesLine";

type SaleMode = "today" | "week" | "month" | "year";

type TopProduct = {
  rank: number;
  productName: string;
  pcs: number;
  amount: number;
};

type DashboardResponse = {
  ok: boolean;
  distributorId: string;
  period: SaleMode;
  counts: {
    retailers: number;
    activeRetailers: number;
    fieldOfficers: number;
  };
  totals: {
    sales: number;
    received: number;
    pending: number;
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
    nonPerformingRetailers: {
      retailerId: string;
      name: string;
      city: string;
      status?: string | null;
    }[];
  };
};

type RetailerSalesSummary = {
  ok: boolean;
  retailer: {
    id: string;
    name: string;
    city?: string | null;
    phone?: string | null;
    status?: string | null;
  };
  thisMonth: { sales: number; received: number; pending: number };
  lastMonth: { sales: number; received: number; pending: number };
  thisMonthTopProducts: {
    rank: number;
    productName: string;
    amount: number;
    pcs: number;
  }[];
  lastMonthTopProducts: {
    rank: number;
    productName: string;
    amount: number;
    pcs: number;
  }[];
};

export default function DashboardClient() {
  const router = useRouter();

  const [mode, setMode] = useState<SaleMode>("today");
  const [loading, setLoading] = useState(false);
  const [unauth, setUnauth] = useState<string | null>(null);
  const [data, setData] = useState<DashboardResponse | null>(null);

  const [salesTrend, setSalesTrend] = useState<{ date: string; amount: number }[]>([]);
  const [salesTrendLoading, setSalesTrendLoading] = useState(false);

  const [productPopupOpen, setProductPopupOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [ranking, setRanking] = useState<any[]>([]);
  const [rankingLoading, setRankingLoading] = useState(false);

  const [retailerPopupOpen, setRetailerPopupOpen] = useState(false);
  const [retailerSummaryLoading, setRetailerSummaryLoading] = useState(false);
  const [retailerSummary, setRetailerSummary] = useState<RetailerSalesSummary | null>(null);
  const [selectedRetailer, setSelectedRetailer] = useState<{
    id: string;
    name: string;
    city?: string;
  } | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setUnauth(null);

      try {
        const res = await fetch(`/api/distributor/dashboard?period=${mode}`, {
          cache: "no-store",
        });
        const j = await res.json().catch(() => null);

        if (res.status === 401) {
          setUnauth(j?.error || j?.message || "Unauthorized. Please login as Distributor.");
          setData(null);
          return;
        }

        if (res.ok && j?.ok) {
          setData(j as DashboardResponse);
        } else {
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
  }, [mode]);

  useEffect(() => {
    (async () => {
      setSalesTrendLoading(true);
      try {
        let days = 7;
        if (mode === "week") days = 7;
        if (mode === "month") days = 30;
        if (mode === "year") days = 365;
        if (mode === "today") days = 1;

        const res = await fetch(`/api/distributor/dashboard/analytics/sales-trend?days=${days}`, {
          cache: "no-store",
        });
        const j = await res.json().catch(() => null);

        if (res.ok && j?.ok) setSalesTrend(j.list || []);
        else setSalesTrend([]);
      } catch (e) {
        console.log("sales-trend load error:", e);
        setSalesTrend([]);
      } finally {
        setSalesTrendLoading(false);
      }
    })();
  }, [mode]);

  async function openProduct(productName: string) {
    setSelectedProduct(productName);
    setProductPopupOpen(true);
    setRanking([]);
    setRankingLoading(true);

    try {
      const res = await fetch(
        `/api/distributor/dashboard/analytics/product-retailer-ranking?productName=${encodeURIComponent(
          productName
        )}&take=5`,
        { cache: "no-store" }
      );

      const j = await res.json().catch(() => null);

      if (res.ok && j?.ok) setRanking(j.list || []);
      else setRanking([]);
    } catch (e) {
      console.log("ranking load error:", e);
      setRanking([]);
    } finally {
      setRankingLoading(false);
    }
  }

  async function openRetailer(retailerId: string, name: string, city?: string) {
    setSelectedRetailer({ id: retailerId, name, city });
    setRetailerPopupOpen(true);
    setRetailerSummary(null);
    setRetailerSummaryLoading(true);

    try {
      const res = await fetch(
        `/api/distributor/dashboard/analytics/retailer-sales-summary?retailerId=${encodeURIComponent(
          retailerId
        )}&take=5`,
        { cache: "no-store" }
      );
      const j = await res.json().catch(() => null);

      if (res.ok && j?.ok) setRetailerSummary(j as RetailerSalesSummary);
      else setRetailerSummary(null);
    } catch (e) {
      console.log("retailer summary load error:", e);
      setRetailerSummary(null);
    } finally {
      setRetailerSummaryLoading(false);
    }
  }

  const retailers = data?.counts?.retailers ?? 0;
  const activeRetailers = data?.counts?.activeRetailers ?? 0;
  const fieldOfficers = data?.counts?.fieldOfficers ?? 0;

  const modeLabel =
    mode === "today"
      ? "Today"
      : mode === "week"
      ? "This Week"
      : mode === "month"
      ? "This Month"
      : "This Year";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card onClick={() => router.push("/distributor/ledger")}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-500">Sales (₹)</span>

            <select
              className="rounded border bg-white px-2 py-1 text-xs"
              value={mode}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setMode(e.target.value as SaleMode)}
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
          </div>

          <div className="mt-3 text-2xl font-extrabold text-gray-900">
            {formatINR(data?.totals?.sales || 0)}
          </div>

          <div className="mt-1 text-xs text-gray-500">
            Received: <b className="text-gray-700">{formatINR(data?.totals?.received || 0)}</b> • Pending:{" "}
            <b className="text-gray-700">{formatINR(data?.totals?.pending || 0)}</b>
          </div>

          <div className="mt-2 text-[11px] text-gray-400">
            Period: {modeLabel}
          </div>
        </Card>

        <Card title="Retailers" value={retailers} onClick={() => router.push("/distributor/users")} />
        <Card title="Active Retailers" value={activeRetailers} onClick={() => router.push("/distributor/users")} />
        <Card title="Field Officers" value={fieldOfficers} onClick={() => router.push("/distributor/users")} />
      </div>

      {loading ? (
        <div className="rounded-2xl border bg-white p-4 text-sm text-gray-500 shadow-sm">
          Loading dashboard…
        </div>
      ) : unauth ? (
        <div className="rounded-2xl border bg-white p-4 text-sm shadow-sm">
          <div className="font-semibold">Dashboard issue</div>
          <div className="mt-1 text-gray-600">{unauth}</div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopRetailersDonut
          data={(data?.lists?.topRetailers || []).map((r) => ({
            id: r.retailerId,
            name: r.name,
            city: r.city || null,
            amount: Number(r.sales || 0),
            orders: 0,
          }))}
          topN={6}
          onClickRetailer={(retailerName) => {
            const row = (data?.lists?.topRetailers || []).find((r) => r.name === retailerName);
            if (row) openRetailer(row.retailerId, row.name, row.city);
          }}
        />

        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">{modeLabel} Sales Trend</h3>
            <span className="text-xs text-gray-500">Dynamic by selection</span>
          </div>

          <div className="mt-3">
            {salesTrendLoading ? (
              <div className="text-sm text-gray-500">Loading trend…</div>
            ) : salesTrend.length === 0 ? (
              <div className="text-sm text-gray-500">No sales trend found.</div>
            ) : (
              <SalesLine
                data={salesTrend.map((x) => ({
                  day: x.date,
                  sales: Number(x.amount || 0),
                }))}
              />
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Top Products</h3>
            <span className="text-xs text-gray-500">{modeLabel}</span>
          </div>

          <div className="mt-3 space-y-2">
            {(data?.lists?.topProducts || []).length === 0 ? (
              <div className="text-sm text-gray-500">No product sales found.</div>
            ) : (
              (data?.lists?.topProducts || []).map((p) => (
                <button
                  key={p.productName}
                  type="button"
                  onClick={() => openProduct(p.productName)}
                  className="w-full rounded-xl border p-3 text-left transition hover:bg-gray-50 active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {p.rank}. {p.productName}
                    </div>
                    <div className="text-sm text-gray-700">{Number(p.pcs || 0)} pcs</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    ₹ {Number(p.amount || 0).toLocaleString("en-IN")}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h3 className="mb-3 font-semibold">Top 5 Debtors</h3>
          <div className="mb-3 text-xs text-gray-500">{modeLabel}</div>

          <div className="space-y-2">
            {(data?.lists?.topDefaulters || []).length === 0 ? (
              <div className="text-sm text-gray-500">No defaulters found.</div>
            ) : (
              (data?.lists?.topDefaulters || []).slice(0, 5).map((r, idx) => (
                <button
                  key={r.retailerId}
                  type="button"
                  onClick={() => router.push(`/distributor/ledger/${r.retailerId}`)}
                  className="w-full rounded-xl border p-3 text-left transition hover:bg-gray-50 active:scale-[0.99]"
                >
                  <div className="truncate font-medium">
                    {idx + 1}. {r.name} {r.city ? `(${r.city})` : ""}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Pending: ₹ {Number(r.pending || 0).toLocaleString("en-IN")}
                  </div>
                </button>
              ))
            )}
          </div>
        </Card>
      </div>

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
                    <div
                      key={r.retailerId}
                      className="flex items-center justify-between rounded-xl border p-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {r.rank}. {r.name} {r.city ? `(${r.city})` : ""}
                        </div>
                        <div className="text-xs text-gray-500">{r.phone || "-"}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">{Number(r.pcs || 0)} pcs</div>
                        <div className="text-xs text-gray-500">
                          ₹ {Number(r.amount || 0).toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

            <div className="space-y-4 p-4">
              {retailerSummaryLoading ? (
                <div className="text-sm text-gray-600">Loading…</div>
              ) : !retailerSummary ? (
                <div className="text-sm text-gray-600">No data found.</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-gray-500">This Month Sale</div>
                      <div className="mt-1 text-lg font-extrabold">
                        {formatINR(retailerSummary.thisMonth.sales)}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Received: {formatINR(retailerSummary.thisMonth.received)} • Pending:{" "}
                        {formatINR(retailerSummary.thisMonth.pending)}
                      </div>
                    </div>

                    <div className="rounded-xl border p-3">
                      <div className="text-xs text-gray-500">Last Month Sale</div>
                      <div className="mt-1 text-lg font-extrabold">
                        {formatINR(retailerSummary.lastMonth.sales)}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Received: {formatINR(retailerSummary.lastMonth.received)} • Pending:{" "}
                        {formatINR(retailerSummary.lastMonth.pending)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
                      className="flex-1 rounded-xl border px-4 py-2 text-sm transition hover:bg-gray-50 active:scale-[0.99]"
                    >
                      Open Ledger Detail
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(
                          `/distributor/retailer-orders?retailerId=${encodeURIComponent(
                            retailerSummary.retailer.id
                          )}`
                        )
                      }
                      className="flex-1 rounded-xl border px-4 py-2 text-sm transition hover:bg-gray-50 active:scale-[0.99]"
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
        "rounded-2xl border bg-white p-4 shadow-sm",
        clickable ? "cursor-pointer transition hover:bg-gray-50 active:scale-[0.99]" : "",
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

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}