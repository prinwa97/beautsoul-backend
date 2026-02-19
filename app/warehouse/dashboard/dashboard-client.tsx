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

type TrendResp = { ok: boolean; rows?: { month: string; qty: number; amount: number }[]; error?: string };

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

type DistrictResp = { ok: boolean; rows?: { district: string; m0Amt: number; m1Amt: number; growthPct: number | null }[]; error?: string };

type TimelineResp = { ok: boolean; avgHours: number | null; sample: number; buckets: any; error?: string };

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(n || 0));
}
function pct(n: number | null) {
  if (n === null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export default function WarehouseDashboardPage() {
  const [summary, setSummary] = useState<SummaryResp | null>(null);
  const [trend, setTrend] = useState<TrendResp | null>(null);
  const [plan, setPlan] = useState<SkuPlanResp | null>(null);
  const [districts, setDistricts] = useState<DistrictResp | null>(null);
  const [timeline, setTimeline] = useState<TimelineResp | null>(null);
  const [loading, setLoading] = useState(false);

  const [safetyPct, setSafetyPct] = useState(0.15);

  async function loadAll() {
    setLoading(true);
    try {
      const [a, b, c, d, e] = await Promise.all([
        fetch("/api/warehouse/dashboard/summary", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/warehouse/dashboard/trend", { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/warehouse/dashboard/sku-planning?safetyPct=${encodeURIComponent(String(safetyPct))}`, { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/warehouse/dashboard/districts", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/warehouse/dashboard/timeline", { cache: "no-store" }).then((r) => r.json()),
      ]);

      setSummary(a);
      setTrend(b);
      setPlan(c);
      setDistricts(d);
      setTimeline(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, []);

  const topSku = useMemo(() => (plan?.ok ? plan.rows.slice(0, 15) : []), [plan]);
  const topDistricts = useMemo(() => (districts?.ok ? (districts.rows || []).slice(0, 10) : []), [districts]);

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div>
          <div className="text-xl font-bold text-gray-800">Warehouse Control Tower</div>
          <div className="text-xs text-gray-600">Sales (InvoiceItem) → Forecast → Suggested Order → Stock Risk</div>
        </div>

        <div className="flex gap-2 items-center">
          <div className="text-xs text-gray-600">Safety Buffer</div>
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={String(safetyPct)}
            onChange={(e) => setSafetyPct(Number(e.target.value))}
          >
            <option value="0.1">10%</option>
            <option value="0.15">15%</option>
            <option value="0.2">20%</option>
            <option value="0.25">25%</option>
          </select>
          <button
            onClick={loadAll}
            className="px-4 py-2 rounded-lg text-sm bg-gray-900 text-white hover:bg-black disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Card title="MTD Sales (pcs)" value={summary?.cards ? String(summary.cards.mtdQty) : "—"} sub={summary?.cards ? `MTD Amount ${inr(summary.cards.mtdAmt)}` : ""} />
        <Card title="MoM Growth (pcs)" value={summary?.cards ? pct(summary.cards.growthQtyPct) : "—"} sub={summary?.cards ? `Amount ${pct(summary.cards.growthAmtPct)}` : ""} />
        <Card title="Forecast Next Month" value={plan?.ok ? String(plan.totals.forecast) : "—"} sub="(WMA last 3 months)" />
        <Card title="Suggested Order Qty" value={plan?.ok ? String(plan.totals.suggested) : "—"} sub={`Safety ${(plan?.ok ? Math.round(plan.safetyPct * 100) : 0)}%`} />
        <Card title="Company Stock OnHand" value={summary?.cards ? String(summary.cards.totalOnHandPcs) : "—"} sub="(StockLot COMPANY)" />
        <Card title="Low Stock SKUs" value={summary?.cards ? String(summary.cards.lowStockCount) : "—"} sub="<= 20 pcs" />
      </div>

      {/* Trend + Timeline */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="border rounded-2xl p-4">
          <div className="font-semibold text-gray-800 mb-2">Sales Trend (Last 6 months)</div>
          <div className="text-xs text-gray-600 mb-3">Qty + Amount aggregated from InvoiceItem</div>

          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600">
                  <th className="py-2">Month</th>
                  <th className="py-2">Qty</th>
                  <th className="py-2">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(trend?.rows || []).map((r) => (
                  <tr key={r.month} className="border-t">
                    <td className="py-2">{r.month}</td>
                    <td className="py-2">{r.qty}</td>
                    <td className="py-2">{inr(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="border rounded-2xl p-4">
          <div className="font-semibold text-gray-800 mb-2">Payment Verification SLA</div>
          <div className="text-xs text-gray-600 mb-3">InboundOrder createdAt → paymentVerifiedAt</div>

          <div className="grid grid-cols-2 gap-3">
            <MiniCard title="Avg Verify Time" value={timeline?.ok && timeline.avgHours !== null ? `${timeline.avgHours.toFixed(2)}h` : "—"} />
            <MiniCard title="Sample Size" value={timeline?.ok ? String(timeline.sample) : "—"} />
            <MiniCard title="< 1h" value={timeline?.ok ? String(timeline.buckets?.lt1h || 0) : "—"} />
            <MiniCard title="> 24h" value={timeline?.ok ? String(timeline.buckets?.gt24 || 0) : "—"} />
          </div>
        </div>
      </div>

      {/* SKU Planning table */}
      <div className="border rounded-2xl p-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2">
          <div>
            <div className="font-semibold text-gray-800">SKU Planning (Next Month Order Suggestion)</div>
            <div className="text-xs text-gray-600">Based on Dec/Jan/Feb style (last 3 months) + company stock + committed outbound</div>
          </div>
          <div className="text-xs text-gray-600">
            Totals: Forecast <b>{plan?.ok ? plan.totals.forecast : "—"}</b> | Suggested <b>{plan?.ok ? plan.totals.suggested : "—"}</b>
          </div>
        </div>

        <div className="overflow-auto mt-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2">Product</th>
                <th className="py-2">M-2</th>
                <th className="py-2">M-1</th>
                <th className="py-2">MTD</th>
                <th className="py-2">Growth</th>
                <th className="py-2">Forecast</th>
                <th className="py-2">OnHand</th>
                <th className="py-2">Committed</th>
                <th className="py-2">Free</th>
                <th className="py-2">Suggested Order</th>
              </tr>
            </thead>
            <tbody>
              {topSku.map((r) => (
                <tr key={r.productName} className="border-t">
                  <td className="py-2 font-medium">{r.productName}</td>
                  <td className="py-2">{r.m2Qty}</td>
                  <td className="py-2">{r.m1Qty}</td>
                  <td className="py-2">{r.m0Qty}</td>
                  <td className="py-2">{pct(r.growthPct)}</td>
                  <td className="py-2">{r.forecastNextMonthQty}</td>
                  <td className="py-2">{r.onHandPcs}</td>
                  <td className="py-2">{r.committedPcs}</td>
                  <td className="py-2">{r.freeStock}</td>
                  <td className="py-2">
                    <span className={"px-2 py-1 rounded-lg " + (r.suggestedOrderQty > 0 ? "bg-rose-100 text-rose-800" : "bg-green-100 text-green-800")}>
                      {r.suggestedOrderQty}
                    </span>
                  </td>
                </tr>
              ))}
              {!topSku.length && (
                <tr><td className="py-6 text-gray-500" colSpan={10}>No data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Districts */}
      <div className="border rounded-2xl p-4">
        <div className="font-semibold text-gray-800">Highest Orders / Sales by District</div>
        <div className="text-xs text-gray-600 mb-3">Invoice.totalAmount grouped by Distributor.district</div>

        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-600">
                <th className="py-2">District</th>
                <th className="py-2">This Month</th>
                <th className="py-2">Last Month</th>
                <th className="py-2">Growth</th>
              </tr>
            </thead>
            <tbody>
              {topDistricts.map((r) => (
                <tr key={r.district} className="border-t">
                  <td className="py-2 font-medium">{r.district}</td>
                  <td className="py-2">{inr(r.m0Amt)}</td>
                  <td className="py-2">{inr(r.m1Amt)}</td>
                  <td className="py-2">{pct(r.growthPct)}</td>
                </tr>
              ))}
              {!topDistricts.length && (
                <tr><td className="py-6 text-gray-500" colSpan={4}>No district data yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Card({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="border rounded-2xl p-4 bg-white">
      <div className="text-xs text-gray-600">{title}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
      {sub ? <div className="text-xs text-gray-600 mt-1">{sub}</div> : null}
    </div>
  );
}
function MiniCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="border rounded-2xl p-3 bg-white">
      <div className="text-xs text-gray-600">{title}</div>
      <div className="text-lg font-bold text-gray-900 mt-1">{value}</div>
    </div>
  );
}
