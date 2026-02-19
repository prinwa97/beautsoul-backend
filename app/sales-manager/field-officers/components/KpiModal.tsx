// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/sales-manager/field-officers/components/KpiModal.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PeriodRange } from "./PeriodFilter";
import Trend from "./Trend";

export type MetricKey =
  | "DISTRIBUTORS"
  | "RETAILERS"
  | "ORDERS"
  | "SALES"
  | "AOV"
  | "GROWTH"
  | "AUDIT"
  | "COLLECTION"
  | "CONV"
  | "NEXT_TARGET";

function titleOf(metric: MetricKey) {
  switch (metric) {
    case "DISTRIBUTORS":
      return "Distributors";
    case "RETAILERS":
      return "Retailers";
    case "ORDERS":
      return "Orders";
    case "SALES":
      return "Sales";
    case "AOV":
      return "AOV";
    case "GROWTH":
      return "Growth";
    case "AUDIT":
      return "Audit";
    case "COLLECTION":
      return "Collection";
    case "CONV":
      return "Conversion";
    case "NEXT_TARGET":
      return "Next Month Target";
    default:
      return "Details";
  }
}

function metricToApi(metric: MetricKey) {
  // ✅ Growth ka apna dedicated API
  if (metric === "GROWTH") return "GROWTH";

  // (abhi) sales/aov/conv orders based reh sakte hain
  if (metric === "SALES" || metric === "AOV" || metric === "CONV") return "ORDERS";

  if (metric === "NEXT_TARGET") return "DISTRIBUTORS";
  return metric;
}

function fmtDate(d: any) {
  try {
    return new Date(d).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(d);
  }
}

function inr(v: any) {
  const n = Number(v || 0);
  try {
    return n.toLocaleString("en-IN");
  } catch {
    return String(n);
  }
}

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function pickFirst(obj: any, keys: string[]) {
  for (const k of keys) {
    if (obj && obj[k] != null) return obj[k];
  }
  return null;
}

function guessRetailerName(r: any): string {
  return (
    String(
      pickFirst(r, ["retailerName", "retailer_name", "shopName", "shop_name", "customerName", "customer_name"]) ??
        r?.retailer?.name ??
        r?.retailer?.user?.name ??
        r?.retailer ??
        ""
    ).trim() || "—"
  );
}

function guessStatus(r: any): string {
  const raw =
    pickFirst(r, ["status", "orderStatus", "paymentStatus", "collectionStatus", "dispatchStatus"]) ??
    r?.order?.status ??
    r?.invoice?.status ??
    "";
  return String(raw || "").trim() || "—";
}

function guessAmountForOrders(r: any): number {
  const v =
    pickFirst(r, [
      "totalAmount",
      "total_amount",
      "grandTotal",
      "grand_total",
      "netAmount",
      "net_amount",
      "amount",
      "orderAmount",
      "order_amount",
      "total",
    ]) ?? 0;
  return n(v);
}

// ✅ STRICT: only collectedAmount
function guessAmountForCollection(r: any): number {
  return n(r?.collectedAmount ?? r?.collected_amount ?? 0);
}

function isHiddenKey(k: string) {
  const key = k.toLowerCase();
  if (key.includes("orderno") || key.includes("order_no") || key.includes("order no")) return true;
  if (key.includes("invoice") && key.includes("no")) return true;
  if (key === "id" || key.endsWith("id") || key.includes("_id")) return true;
  if (key.includes("retailerid") || key.includes("distributorid") || key.includes("foid")) return true;
  return false;
}

function pillClass(active: boolean) {
  return active ? "bg-black text-white border-black" : "bg-white text-black border-black/10 hover:bg-gray-50";
}

type GrowthRow = {
  month: string; // "Jan 2026"
  salesGrowthPct: number;
  ordersGrowthPct: number;
  activeRetailersGrowthPct: number;
  aovGrowthPct: number;
  target: number | null;
  achievementPct: number | null;
};

type LiveMonthRow = {
  month: string;
  sales: number;
  orders: number;
  activeRetailers: number;
  aov: number;
};

export default function KpiModal(props: {
  open: boolean;
  onClose: () => void;
  foId: string;
  foName: string;
  metric: MetricKey;
  period: PeriodRange | null;
}) {
  const router = useRouter();
  const { open, onClose, foId, foName, metric, period } = props;

  const apiMetric = useMemo(() => metricToApi(metric), [metric]);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [rows, setRows] = useState<any[]>([]);

  // ✅ for GROWTH: show current month (live) separately
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveErr, setLiveErr] = useState("");
  const [liveRow, setLiveRow] = useState<LiveMonthRow | null>(null);

  const [retailerQuery, setRetailerQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<Record<string, boolean>>({});

  // ✅ close on Esc (only when open)
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // ✅ prevent background scroll while modal open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ✅ fetch details (only when open) - main metric
  useEffect(() => {
    if (!open) return;
    if (!period?.from || !period?.to || !foId) return;

    (async () => {
      setLoading(true);
      setErr("");
      setRows([]);
      setRetailerQuery("");
      setSelectedStatuses({});
      setLiveRow(null);
      setLiveErr("");
      setLiveLoading(false);

      try {
        const qs = new URLSearchParams({
          foUserId: foId,
          metric: apiMetric,
          from: period.from,
          to: period.to,
        });

        const res = await fetch(`/api/sales-manager/field-officers/metric?${qs.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.ok) {
          setErr(data?.error || `API error (${res.status})`);
          setRows([]);
        } else {
          const list = Array.isArray(data?.rows) ? data.rows : [];
          setRows(list);

          // init statuses for non-growth
          if (apiMetric !== "GROWTH") {
            const st = new Set<string>();
            for (const r of list) st.add(guessStatus(r).toUpperCase());
            const init: Record<string, boolean> = {};
            Array.from(st)
              .filter(Boolean)
              .forEach((s) => (init[s] = true));
            setSelectedStatuses(init);
          }
        }
      } catch (e: any) {
        setErr(e?.message || "Network error");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, foId, apiMetric, period?.from, period?.to]);

  // ✅ extra fetch for GROWTH: CURRENT_MONTH live row
  useEffect(() => {
    if (!open) return;
    if (apiMetric !== "GROWTH") return;
    if (!period?.from || !period?.to || !foId) return;

    (async () => {
      setLiveLoading(true);
      setLiveErr("");
      setLiveRow(null);

      try {
        const qs = new URLSearchParams({
          foUserId: foId,
          metric: "CURRENT_MONTH",
          from: period.from,
          to: period.to,
        });

        const res = await fetch(`/api/sales-manager/field-officers/metric?${qs.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!res.ok || !data?.ok) {
          setLiveErr(data?.error || `API error (${res.status})`);
          setLiveRow(null);
        } else {
          const r = Array.isArray(data?.rows) ? data.rows[0] : null;
          if (r) {
            setLiveRow({
              month: String(r.month || "—"),
              sales: n(r.sales),
              orders: n(r.orders),
              activeRetailers: n(r.activeRetailers),
              aov: n(r.aov),
            });
          } else {
            setLiveRow(null);
          }
        }
      } catch (e: any) {
        setLiveErr(e?.message || "Network error");
        setLiveRow(null);
      } finally {
        setLiveLoading(false);
      }
    })();
  }, [open, apiMetric, foId, period?.from, period?.to]);

  const kind: "GROWTH" | "ORDERS" | "COLLECTION" | "OTHER" =
    apiMetric === "GROWTH" ? "GROWTH" : apiMetric === "ORDERS" ? "ORDERS" : apiMetric === "COLLECTION" ? "COLLECTION" : "OTHER";

  // -------------------- GROWTH VIEW (special) --------------------
  const growthRows: GrowthRow[] = useMemo(() => {
    if (kind !== "GROWTH") return [];
    return (rows || []).map((r: any) => ({
      month: String(r.month || "—"),
      salesGrowthPct: n(r.salesGrowthPct),
      ordersGrowthPct: n(r.ordersGrowthPct),
      activeRetailersGrowthPct: n(r.activeRetailersGrowthPct),
      aovGrowthPct: n(r.aovGrowthPct),
      target: r.target == null ? null : n(r.target),
      achievementPct: r.achievementPct == null ? null : n(r.achievementPct),
    }));
  }, [rows, kind]);

  // -------------------- NORMAL (non-growth) --------------------
  const normalized = useMemo(() => {
    return rows.map((r) => {
      const retailer = guessRetailerName(r);
      const status = guessStatus(r).toUpperCase();
      const amount = kind === "COLLECTION" ? guessAmountForCollection(r) : guessAmountForOrders(r);
      return { __raw: r, __retailer: retailer, __status: status, __amount: amount };
    });
  }, [rows, kind]);

  const statuses = useMemo(() => {
    const s = Array.from(new Set(normalized.map((x) => x.__status))).filter((x) => x && x !== "—");
    s.sort();
    return s;
  }, [normalized]);

  const activeStatuses = useMemo(() => {
    const act = statuses.filter((s) => selectedStatuses[s]);
    return act.length ? act : statuses;
  }, [statuses, selectedStatuses]);

  const filtered = useMemo(() => {
    const q = retailerQuery.trim().toLowerCase();
    return normalized.filter((x) => {
      const okStatus = activeStatuses.includes(x.__status);
      const okRetailer = !q || String(x.__retailer || "").toLowerCase().includes(q);
      return okStatus && okRetailer;
    });
  }, [normalized, retailerQuery, activeStatuses]);

  const summary = useMemo(() => {
    const statusCount: Record<string, number> = {};
    const byRetailer: Record<string, { count: number; amount: number }> = {};
    let totalAmount = 0;

    for (const x of filtered) {
      const st = x.__status || "—";
      statusCount[st] = (statusCount[st] || 0) + 1;

      const rn = x.__retailer || "—";
      if (!byRetailer[rn]) byRetailer[rn] = { count: 0, amount: 0 };
      byRetailer[rn].count += 1;

      totalAmount += n(x.__amount);
      byRetailer[rn].amount += n(x.__amount);
    }

    const retailerList = Object.entries(byRetailer)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.count - a.count);

    return { totalRows: filtered.length, totalAmount, statusCount, retailerList };
  }, [filtered]);

  const headerKeys = useMemo(() => {
    if (!rows.length) return [];
    const keys = Object.keys(rows[0]).filter((k) => !isHiddenKey(k));

    const preferred = ["retailerName", "shopName", "status", "createdAt", "date", "totalAmount", "collectedAmount"];
    const pref = preferred.filter((p) => keys.includes(p));
    const rest = keys.filter((k) => !pref.includes(k));

    return [...pref, ...rest].slice(0, 7);
  }, [rows]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute left-1/2 top-1/2 w-[92vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-black/10 bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-black/10 p-4">
          <div>
            <div className="text-base font-extrabold">{titleOf(metric)} Details</div>

            <div className="mt-1 text-xs font-semibold text-black/60">
              FO:{" "}
              <button
                type="button"
                onClick={() => {
                  onClose();
                  router.push(`/sales-manager/field-officers/${foId}`);
                }}
                className="inline-flex items-center gap-1 font-extrabold text-black hover:text-blue-700 cursor-pointer"
              >
                {foName || "Field Officer"}
                <span className="text-[11px] font-black opacity-60">↗</span>
              </button>
            </div>

            {period && (
              <div className="mt-1 text-[11px] text-black/50">
                Period: <span className="font-bold">{period.label}</span> • {period.from} → {period.to}
              </div>
            )}
          </div>

          <button onClick={onClose} className="rounded-lg border border-black/10 px-3 py-1 text-xs font-extrabold hover:bg-gray-50">
            Close
          </button>
        </div>

        <div className="max-h-[72vh] overflow-y-auto p-4">
          {loading && <div className="text-sm font-bold text-black/60">Loading...</div>}

          {!!err && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{err}</div>}

          {/* ✅ GROWTH VIEW */}
          {!loading && !err && kind === "GROWTH" && (
            <div className="rounded-2xl border border-black/10 bg-white">
              <div className="border-b border-black/10 p-3">
                <div className="text-sm font-extrabold">Last 6 Completed Months Performance</div>
                <div className="text-[11px] text-black/50">
                  (Professional) Current month table se exclude hai. Live month niche alag card me show hoga.
                </div>
              </div>

              {growthRows.length === 0 ? (
                <div className="p-3 text-sm font-semibold text-black/60">No growth data</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[980px] w-full text-left">
                    <thead className="bg-gray-50">
                      <tr className="text-[12px] font-extrabold text-black/70">
                        <th className="px-3 py-3">Month</th>
                        <th className="px-3 py-3">Sales Growth %</th>
                        <th className="px-3 py-3">Orders Growth %</th>
                        <th className="px-3 py-3">Active Retailers Growth %</th>
                        <th className="px-3 py-3">AOV Growth %</th>
                        <th className="px-3 py-3">Target</th>
                        <th className="px-3 py-3">Achievement %</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-black/5">
                      {growthRows.map((r, i) => {
                        const prev = i > 0 ? growthRows[i - 1] : null;

                        return (
                          <tr key={r.month + i} className="hover:bg-gray-50 text-sm font-semibold">
                            <td className="px-3 py-3 font-extrabold">{r.month}</td>

                            <td className="px-3 py-3">
                              <Trend current={r.salesGrowthPct} previous={prev?.salesGrowthPct ?? null} decimals={0} />
                            </td>
                            <td className="px-3 py-3">
                              <Trend current={r.ordersGrowthPct} previous={prev?.ordersGrowthPct ?? null} decimals={0} />
                            </td>
                            <td className="px-3 py-3">
                              <Trend
                                current={r.activeRetailersGrowthPct}
                                previous={prev?.activeRetailersGrowthPct ?? null}
                                decimals={0}
                              />
                            </td>
                            <td className="px-3 py-3">
                              <Trend current={r.aovGrowthPct} previous={prev?.aovGrowthPct ?? null} decimals={0} />
                            </td>

                            <td className="px-3 py-3 font-extrabold">{r.target == null || r.target === 0 ? "—" : `₹${inr(r.target)}`}</td>

                            <td className="px-3 py-3">
                              {r.achievementPct == null ? (
                                <span className="text-gray-500 font-extrabold">—</span>
                              ) : (
                                <Trend current={r.achievementPct} previous={prev?.achievementPct ?? null} decimals={0} />
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ✅ LIVE MONTH (CURRENT_MONTH) */}
              <div className="border-t border-black/10 p-3">
                <div className="text-sm font-extrabold">Current Month (Live)</div>
                <div className="mt-2">
                  {liveLoading && <div className="text-sm font-bold text-black/60">Loading live month...</div>}

                  {!!liveErr && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{liveErr}</div>
                  )}

                  {!liveLoading && !liveErr && (
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                      <div className="rounded-xl border border-black/10 bg-gray-50 p-3">
                        <div className="text-[11px] font-bold text-black/50">Month</div>
                        <div className="text-sm font-extrabold">{liveRow?.month || "—"}</div>
                      </div>

                      <div className="rounded-xl border border-black/10 bg-gray-50 p-3">
                        <div className="text-[11px] font-bold text-black/50">Sales</div>
                        <div className="text-sm font-extrabold">₹{inr(liveRow?.sales ?? 0)}</div>
                      </div>

                      <div className="rounded-xl border border-black/10 bg-gray-50 p-3">
                        <div className="text-[11px] font-bold text-black/50">Orders</div>
                        <div className="text-sm font-extrabold">{liveRow?.orders ?? 0}</div>
                      </div>

                      <div className="rounded-xl border border-black/10 bg-gray-50 p-3">
                        <div className="text-[11px] font-bold text-black/50">Active Retailers</div>
                        <div className="text-sm font-extrabold">{liveRow?.activeRetailers ?? 0}</div>
                      </div>

                      <div className="rounded-xl border border-black/10 bg-gray-50 p-3">
                        <div className="text-[11px] font-bold text-black/50">AOV</div>
                        <div className="text-sm font-extrabold">₹{inr(liveRow?.aov ?? 0)}</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-2 text-[11px] text-black/50">
                  Live month is calculated from period's <b>to</b> month (so Feb selection ⇒ Feb live).
                </div>
              </div>
            </div>
          )}

          {/* ✅ Existing consolidated view for ORDERS/COLLECTION */}
          {!loading && !err && rows.length > 0 && kind !== "GROWTH" && (kind === "ORDERS" || kind === "COLLECTION") && (
            <div className="mb-4 rounded-2xl border border-black/10 bg-gray-50 p-3">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                <div className="rounded-xl border border-black/10 bg-white p-3">
                  <div className="text-[11px] font-bold text-black/50">{kind === "COLLECTION" ? "Total Entries" : "Total Orders"}</div>
                  <div className="text-lg font-extrabold">{summary.totalRows}</div>
                </div>

                <div className="rounded-xl border border-black/10 bg-white p-3">
                  <div className="text-[11px] font-bold text-black/50">
                    {metric === "COLLECTION" ? "Total Collection" : metric === "SALES" ? "Total Sales" : "Total Value"}
                  </div>
                  <div className="text-lg font-extrabold">₹{inr(summary.totalAmount)}</div>
                </div>

                <div className="rounded-xl border border-black/10 bg-white p-3">
                  <div className="text-[11px] font-bold text-black/50">Retailers</div>
                  <div className="text-lg font-extrabold">{summary.retailerList.length}</div>
                </div>

                <div className="rounded-xl border border-black/10 bg-white p-3">
                  <div className="text-[11px] font-bold text-black/50">Top Retailer</div>
                  <div className="text-sm font-extrabold">
                    {summary.retailerList[0] ? `${summary.retailerList[0].name} (${summary.retailerList[0].count})` : "—"}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <input
                  value={retailerQuery}
                  onChange={(e) => setRetailerQuery(e.target.value)}
                  placeholder="Filter by retailer name..."
                  className="w-full md:w-[320px] rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-black/30"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const all: Record<string, boolean> = {};
                      statuses.forEach((s) => (all[s] = true));
                      setSelectedStatuses(all);
                    }}
                    className={`rounded-full border px-3 py-1 text-xs font-extrabold ${pillClass(
                      statuses.every((s) => selectedStatuses[s])
                    )}`}
                  >
                    All
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedStatuses({})}
                    className={`rounded-full border px-3 py-1 text-xs font-extrabold ${pillClass(Object.keys(selectedStatuses).length === 0)}`}
                  >
                    Clear
                  </button>

                  {statuses.slice(0, 10).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedStatuses((prev) => ({ ...prev, [s]: !prev[s] }))}
                      className={`rounded-full border px-3 py-1 text-xs font-extrabold ${pillClass(!!selectedStatuses[s])}`}
                      title={`Filter ${s}`}
                    >
                      {s} ({summary.statusCount[s] || 0})
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-3 overflow-x-auto rounded-xl border border-black/10 bg-white">
                <table className="min-w-[760px] w-full text-left">
                  <thead className="bg-gray-50">
                    <tr className="text-[12px] font-extrabold text-black/70">
                      <th className="px-3 py-2">Retailer</th>
                      <th className="px-3 py-2">{kind === "COLLECTION" ? "Entries" : "Orders"}</th>
                      <th className="px-3 py-2">{metric === "COLLECTION" ? "Collected" : "Value"}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {summary.retailerList.slice(0, 12).map((x) => (
                      <tr key={x.name} className="text-sm font-semibold hover:bg-gray-50">
                        <td className="px-3 py-2 font-extrabold">{x.name}</td>
                        <td className="px-3 py-2">{x.count}</td>
                        <td className="px-3 py-2 font-extrabold">₹{inr(x.amount)}</td>
                      </tr>
                    ))}
                    {summary.retailerList.length > 12 && (
                      <tr>
                        <td colSpan={3} className="px-3 py-2 text-[11px] font-semibold text-black/50">
                          Showing top 12 retailers. Filter use karke specific retailer dekho.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-2 text-[11px] text-black/50">
                Note: Order number / IDs hidden. Collection totals strictly from <b>collectedAmount</b>.
              </div>
            </div>
          )}

          {!loading && !err && rows.length === 0 && (
            <div className="rounded-xl border border-black/10 bg-gray-50 p-3 text-sm font-semibold text-black/70">
              No data for this metric in selected period.
            </div>
          )}

          {/* raw table for non-growth */}
          {!loading && !err && rows.length > 0 && kind !== "GROWTH" && (
            <div className="overflow-x-auto rounded-xl border border-black/10">
              <table className="min-w-[980px] w-full text-left">
                <thead className="bg-gray-50">
                  <tr className="text-[12px] font-extrabold text-black/70">
                    {headerKeys.map((k) => (
                      <th key={k} className="px-3 py-2">
                        {k}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-black/5">
                  {filtered.slice(0, 300).map((x, idx) => {
                    const r = x.__raw;
                    return (
                      <tr key={r.id || idx} className="hover:bg-gray-50 text-sm font-semibold">
                        {headerKeys.map((k) => {
                          const v = r[k];
                          const key = k.toLowerCase();
                          const show =
                            key.includes("date") || key.includes("created")
                              ? fmtDate(v)
                              : key.includes("amount") || key.includes("total") || key.includes("paid") || key.includes("collected")
                              ? `₹${inr(v)}`
                              : String(v ?? "—");
                          return (
                            <td key={k} className="px-3 py-2">
                              {show}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {(metric === "SALES" || metric === "AOV" || metric === "CONV") && (
            <div className="mt-2 text-[11px] text-black/50">
              Note: abhi {metric} ke liye Orders-based data use ho raha hai (metric=ORDERS).
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
