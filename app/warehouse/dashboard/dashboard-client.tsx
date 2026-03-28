"use client";

import React, { useEffect, useMemo, useState } from "react";

type SummaryResp = {
  ok: boolean;
  cards?: {
    mtdQty: number;
    mtdAmt: number;
    growthQtyPct: number | null;
    growthAmtPct: number | null;
    totalOnHandPcs: number;
    committedPcs: number;
    lowStockCount: number;
  };
  error?: string;
};

type TrendResp = {
  ok: boolean;
  rows?: { month: string; qty: number; amount: number }[];
  error?: string;
};

type SkuPlanRow = {
  productName: string;
  m2Qty: number;
  m1Qty: number;
  m0Qty: number;
  forecastNextMonthQty: number;
  growthPct: number | null;
  onHandPcs: number;
  committedPcs: number;
  freeStock: number;
  safetyPcs: number;
  suggestedOrderQty: number;
};

type SkuPlanResp = {
  ok: boolean;
  safetyPct: number;
  totals: { forecast: number; suggested: number; onHand: number; committed: number };
  rows: SkuPlanRow[];
  error?: string;
};

type DistrictResp = {
  ok: boolean;
  rows?: { district: string; m0Amt: number; m1Amt: number; growthPct: number | null }[];
  error?: string;
};

type TimelineResp = {
  ok: boolean;
  avgHours: number | null;
  sample: number;
  buckets: {
    lt1h?: number;
    gt24?: number;
  } | null;
  error?: string;
};

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function pct(n: number | null) {
  if (n === null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function safeText(v?: string | null) {
  const s = String(v ?? "").trim();
  return s || "—";
}

export default function WarehouseDashboardPage() {
  const [summary, setSummary] = useState<SummaryResp | null>(null);
  const [trend, setTrend] = useState<TrendResp | null>(null);
  const [plan, setPlan] = useState<SkuPlanResp | null>(null);
  const [districts, setDistricts] = useState<DistrictResp | null>(null);
  const [timeline, setTimeline] = useState<TimelineResp | null>(null);

  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [safetyPct, setSafetyPct] = useState(0.15);

  async function loadAll() {
    setLoading(true);
    setPageError(null);

    try {
      const [aRes, bRes, cRes, dRes, eRes] = await Promise.all([
        fetch("/api/warehouse/dashboard/summary", { cache: "no-store" }),
        fetch("/api/warehouse/dashboard/trend", { cache: "no-store" }),
        fetch(`/api/warehouse/dashboard/sku-planning?safetyPct=${encodeURIComponent(String(safetyPct))}`, {
          cache: "no-store",
        }),
        fetch("/api/warehouse/dashboard/districts", { cache: "no-store" }),
        fetch("/api/warehouse/dashboard/timeline", { cache: "no-store" }),
      ]);

      const [a, b, c, d, e] = await Promise.all([
        aRes.json().catch(() => ({ ok: false, error: "Invalid summary response" })),
        bRes.json().catch(() => ({ ok: false, error: "Invalid trend response" })),
        cRes.json().catch(() => ({ ok: false, error: "Invalid planning response", rows: [], totals: { forecast: 0, suggested: 0, onHand: 0, committed: 0 }, safetyPct })),
        dRes.json().catch(() => ({ ok: false, error: "Invalid districts response" })),
        eRes.json().catch(() => ({ ok: false, error: "Invalid timeline response" })),
      ]);

      setSummary(a);
      setTrend(b);
      setPlan(c);
      setDistricts(d);
      setTimeline(e);

      const apiErrors = [a?.error, b?.error, c?.error, d?.error, e?.error].filter(Boolean);
      if (apiErrors.length) {
        setPageError(apiErrors[0] as string);
      }
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safetyPct]);

  const topSku = useMemo(() => (plan?.ok ? (plan.rows || []).slice(0, 15) : []), [plan]);
  const topDistricts = useMemo(
    () => (districts?.ok ? (districts.rows || []).slice(0, 10) : []),
    [districts]
  );

  return (
    <div className="space-y-4 text-gray-900">
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-2xl font-bold text-gray-900">Warehouse Control Tower</div>
          <div className="text-sm text-gray-600">
            Sales (InvoiceItem) → Forecast → Suggested Order → Stock Risk
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium text-gray-700">Safety Buffer</div>
          <select
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-black"
            value={String(safetyPct)}
            onChange={(e) => setSafetyPct(Number(e.target.value))}
            disabled={loading}
          >
            <option value="0.1">10%</option>
            <option value="0.15">15%</option>
            <option value="0.2">20%</option>
            <option value="0.25">25%</option>
          </select>

          <button
            onClick={loadAll}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            type="button"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {pageError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {pageError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Card
          title="MTD Sales (pcs)"
          value={summary?.cards ? String(summary.cards.mtdQty) : "—"}
          sub={summary?.cards ? `MTD Amount ${inr(summary.cards.mtdAmt)}` : ""}
          loading={loading && !summary}
        />
        <Card
          title="MoM Growth (pcs)"
          value={summary?.cards ? pct(summary.cards.growthQtyPct) : "—"}
          sub={summary?.cards ? `Amount ${pct(summary.cards.growthAmtPct)}` : ""}
          loading={loading && !summary}
        />
        <Card
          title="Forecast Next Month"
          value={plan?.ok ? String(plan.totals.forecast) : "—"}
          sub="(WMA last 3 months)"
          loading={loading && !plan}
        />
        <Card
          title="Suggested Order Qty"
          value={plan?.ok ? String(plan.totals.suggested) : "—"}
          sub={`Safety ${(plan?.ok ? Math.round(plan.safetyPct * 100) : Math.round(safetyPct * 100))}%`}
          loading={loading && !plan}
        />
        <Card
          title="Company Stock OnHand"
          value={summary?.cards ? String(summary.cards.totalOnHandPcs) : "—"}
          sub="(StockLot COMPANY)"
          loading={loading && !summary}
        />
        <Card
          title="Low Stock SKUs"
          value={summary?.cards ? String(summary.cards.lowStockCount) : "—"}
          sub="<= 20 pcs"
          loading={loading && !summary}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-1 text-lg font-semibold text-gray-900">Sales Trend (Last 6 months)</div>
          <div className="mb-3 text-sm text-gray-600">Qty + Amount aggregated from InvoiceItem</div>

          <DataTableWrap>
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
                  <th className="py-3 pr-4">Month</th>
                  <th className="py-3 pr-4">Qty</th>
                  <th className="py-3 pr-4">Amount</th>
                </tr>
              </thead>
              <tbody className="text-gray-900">
                {(trend?.rows || []).map((r) => (
                  <tr key={r.month} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 pr-4 font-medium text-gray-800">{safeText(r.month)}</td>
                    <td className="py-3 pr-4 text-gray-900">{r.qty}</td>
                    <td className="py-3 pr-4 text-gray-900">{inr(r.amount)}</td>
                  </tr>
                ))}
                {!loading && !(trend?.rows || []).length && (
                  <EmptyRow colSpan={3} text="No sales trend data available." />
                )}
              </tbody>
            </table>
          </DataTableWrap>
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-1 text-lg font-semibold text-gray-900">Payment Verification SLA</div>
          <div className="mb-3 text-sm text-gray-600">InboundOrder createdAt → paymentVerifiedAt</div>

          <div className="grid grid-cols-2 gap-3">
            <MiniCard
              title="Avg Verify Time"
              value={timeline?.ok && timeline.avgHours !== null ? `${timeline.avgHours.toFixed(2)}h` : "—"}
            />
            <MiniCard title="Sample Size" value={timeline?.ok ? String(timeline.sample) : "—"} />
            <MiniCard title="< 1h" value={timeline?.ok ? String(timeline.buckets?.lt1h || 0) : "—"} />
            <MiniCard title="> 24h" value={timeline?.ok ? String(timeline.buckets?.gt24 || 0) : "—"} />
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-lg font-semibold text-gray-900">
              SKU Planning (Next Month Order Suggestion)
            </div>
            <div className="text-sm text-gray-600">
              Based on last 3 months + company stock + committed outbound
            </div>
          </div>

          <div className="text-sm text-gray-700">
            Totals: Forecast{" "}
            <b className="text-gray-900">{plan?.ok ? plan.totals.forecast : "—"}</b> | Suggested{" "}
            <b className="text-gray-900">{plan?.ok ? plan.totals.suggested : "—"}</b>
          </div>
        </div>

        <div className="mt-3">
          <DataTableWrap>
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
                  <th className="py-3 pr-4">Product</th>
                  <th className="py-3 pr-4">M-2</th>
                  <th className="py-3 pr-4">M-1</th>
                  <th className="py-3 pr-4">MTD</th>
                  <th className="py-3 pr-4">Growth</th>
                  <th className="py-3 pr-4">Forecast</th>
                  <th className="py-3 pr-4">OnHand</th>
                  <th className="py-3 pr-4">Committed</th>
                  <th className="py-3 pr-4">Free</th>
                  <th className="py-3 pr-4">Suggested Order</th>
                </tr>
              </thead>
              <tbody className="text-gray-900">
                {topSku.map((r) => (
                  <tr key={r.productName} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 pr-4 font-semibold text-gray-900">{r.productName}</td>
                    <td className="py-3 pr-4">{r.m2Qty}</td>
                    <td className="py-3 pr-4">{r.m1Qty}</td>
                    <td className="py-3 pr-4">{r.m0Qty}</td>
                    <td className="py-3 pr-4">{pct(r.growthPct)}</td>
                    <td className="py-3 pr-4">{r.forecastNextMonthQty}</td>
                    <td className="py-3 pr-4">{r.onHandPcs}</td>
                    <td className="py-3 pr-4">{r.committedPcs}</td>
                    <td className="py-3 pr-4">{r.freeStock}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={
                          "inline-flex min-w-[2.5rem] justify-center rounded-lg px-2.5 py-1 text-xs font-bold " +
                          (r.suggestedOrderQty > 0
                            ? "bg-rose-100 text-rose-800"
                            : "bg-green-100 text-green-800")
                        }
                      >
                        {r.suggestedOrderQty}
                      </span>
                    </td>
                  </tr>
                ))}
                {!loading && !topSku.length && (
                  <EmptyRow colSpan={10} text="No SKU planning data available." />
                )}
              </tbody>
            </table>
          </DataTableWrap>
        </div>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="text-lg font-semibold text-gray-900">Highest Orders / Sales by District</div>
        <div className="mb-3 text-sm text-gray-600">
          Invoice.totalAmount grouped by Distributor.district
        </div>

        <DataTableWrap>
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
                <th className="py-3 pr-4">District</th>
                <th className="py-3 pr-4">This Month</th>
                <th className="py-3 pr-4">Last Month</th>
                <th className="py-3 pr-4">Growth</th>
              </tr>
            </thead>
            <tbody className="text-gray-900">
              {topDistricts.map((r) => (
                <tr key={r.district} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 pr-4 font-semibold text-gray-900">{safeText(r.district)}</td>
                  <td className="py-3 pr-4">{inr(r.m0Amt)}</td>
                  <td className="py-3 pr-4">{inr(r.m1Amt)}</td>
                  <td className="py-3 pr-4">{pct(r.growthPct)}</td>
                </tr>
              ))}
              {!loading && !topDistricts.length && (
                <EmptyRow colSpan={4} text="No district sales data available." />
              )}
            </tbody>
          </table>
        </DataTableWrap>
      </section>
    </div>
  );
}

function Card({
  title,
  value,
  sub,
  loading,
}: {
  title: string;
  value: string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-medium text-gray-700">{title}</div>
      <div className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
        {loading ? "..." : value}
      </div>
      {sub ? <div className="mt-1 text-sm text-gray-600">{sub}</div> : null}
    </div>
  );
}

function MiniCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-medium text-gray-700">{title}</div>
      <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function DataTableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-auto rounded-xl border border-gray-100">{children}</div>;
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-8 text-center text-sm font-medium text-gray-500">
        {text}
      </td>
    </tr>
  );
}