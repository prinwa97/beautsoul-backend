// /app/sales-manager/retailers/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "TODAY" | "MONTH" | "YEAR" | "CUSTOM";
type Sort = "SALES" | "ORDERS" | "GROWTH";

type AnalyticsResp = {
  ok: boolean;
  error?: string;
  message?: string;

  mode?: string;
  sort?: string;

  range?: { from: string; to: string };
  prevRange?: { from: string; to: string };

  pivot?: { months: number; monthKeys: string[]; pivotStart: string };

  filters?: {
    distId: string | null;
    city: string | null;
    distributors: Array<{ id: string; name: string }>;
    cities: string[];
  };

  summary?: {
    totalRetailers: number;
    totalDistributors: number;
    newRetailers: number;
    newDistributors: number;
    active30: number;
    inactive31_60: number;
    dormant61_90: number;
    dead90: number;
  };

  top10?: any[];
  nonPerf10?: any[];
  visitTop20?: any[];
  distributorSummary?: any[];
  monthPivot?: any[];
};

function isoDate(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

function money(n: any) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}
function fmtDateTime(s: any) {
  if (!s) return "—";
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString();
}
function badgeForHealth(score: number) {
  if (score >= 80) return { text: "Healthy", cls: "bg-green-50 text-green-700 border-green-200" };
  if (score >= 50) return { text: "Watch", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" };
  return { text: "At Risk", cls: "bg-red-50 text-red-700 border-red-200" };
}
function trendBadge(tr: string) {
  if (tr === "UP") return { text: "↑ Up", cls: "bg-green-50 text-green-700 border-green-200" };
  if (tr === "DOWN") return { text: "↓ Down", cls: "bg-red-50 text-red-700 border-red-200" };
  if (tr === "VOLATILE") return { text: "⚠ Volatile", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" };
  if (tr === "STABLE") return { text: "↔ Stable", cls: "bg-gray-50 text-gray-700 border-gray-200" };
  return { text: "—", cls: "bg-gray-50 text-gray-700 border-gray-200" };
}

export default function SMRetailersAnalyticsPage() {
  const router = useRouter();

  function openRetailer(retailerId: string) {
    if (!retailerId) return;
    router.push(`/sales-manager/retailers/${retailerId}`);
  }

  const [mode, setMode] = useState<Mode>("MONTH");
  const [sort, setSort] = useState<Sort>("SALES");

  const [from, setFrom] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return isoDate(d);
  });
  const [to, setTo] = useState<string>(() => isoDate(new Date()));

  const [distId, setDistId] = useState<string>("");
  const [city, setCity] = useState<string>("");

  const [q, setQ] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AnalyticsResp | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    p.set("mode", mode);
    p.set("sort", sort);
    p.set("months", "4");
    if (mode === "CUSTOM") {
      p.set("from", from);
      p.set("to", to);
    }
    if (distId) p.set("distId", distId);
    if (city) p.set("city", city);
    return p.toString();
  }, [mode, sort, from, to, distId, city]);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales-manager/retailers/analytics?${qs}`, { cache: "no-store" });
      const j = (await res.json().catch(() => null)) as AnalyticsResp | null;
      if (!res.ok) {
        setData(j || { ok: false, error: "FAILED" });
        return;
      }
      setData(j);
    } catch (e: any) {
      setData({ ok: false, error: "NETWORK_ERROR", message: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs]);

  const s = data?.summary;
  const months = data?.pivot?.monthKeys || [];
  const pivotRowsAll = (data?.monthPivot || []) as any[];

  const pivotRows = pivotRowsAll.filter((r) => {
    if (!q.trim()) return true;
    const needle = q.trim().toLowerCase();
    const a = String(r.retailerName || "").toLowerCase();
    const b = String(r.distributorName || "").toLowerCase();
    const c = String(r.city || "").toLowerCase();
    return a.includes(needle) || b.includes(needle) || c.includes(needle);
  });

  return (
    <div className="py-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Retailer Analytics</h1>
          <p className="text-sm text-gray-600 mt-1">
            Super advanced performance monitoring (Orders + Sales + Trend + Visit Priority).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ModeBtn active={mode === "TODAY"} onClick={() => setMode("TODAY")}>
            Today
          </ModeBtn>
          <ModeBtn active={mode === "MONTH"} onClick={() => setMode("MONTH")}>
            This Month
          </ModeBtn>
          <ModeBtn active={mode === "YEAR"} onClick={() => setMode("YEAR")}>
            This Year
          </ModeBtn>
          <ModeBtn active={mode === "CUSTOM"} onClick={() => setMode("CUSTOM")}>
            Custom
          </ModeBtn>

          <div className="hidden md:block w-px h-8 bg-gray-200 mx-1" />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="border rounded-2xl px-3 py-2 text-sm font-bold bg-white"
          >
            <option value="SALES">Sort: Sales</option>
            <option value="ORDERS">Sort: Orders</option>
            <option value="GROWTH">Sort: Growth%</option>
          </select>

          {mode === "CUSTOM" ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">From</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="border rounded-lg px-2 py-1 text-sm bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">To</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="border rounded-lg px-2 py-1 text-sm bg-white"
                />
              </div>
              <button onClick={load} className="px-3 py-2 rounded-2xl bg-gray-900 text-white text-sm font-black">
                Apply
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Filters */}
      <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={distId}
            onChange={(e) => setDistId(e.target.value)}
            className="border rounded-2xl px-3 py-2 text-sm font-bold bg-white"
          >
            <option value="">All Distributors</option>
            {(data?.filters?.distributors || []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="border rounded-2xl px-3 py-2 text-sm font-bold bg-white"
          >
            <option value="">All Cities</option>
            {(data?.filters?.cities || []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="text-xs text-gray-500">
            Range: {data?.range?.from ? new Date(data.range.from).toLocaleDateString() : "—"} →{" "}
            {data?.range?.to ? new Date(data.range.to).toLocaleDateString() : "—"}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search retailer / distributor / city…"
            className="border rounded-2xl px-3 py-2 text-sm bg-white w-full md:w-80"
          />
        </div>
      </div>

      {/* Loading / error */}
      <div className="mt-4">
        {loading ? <div className="text-sm text-gray-600">Loading analytics…</div> : null}
        {!loading && data && !data.ok ? (
          <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            Error: {data.error || "UNKNOWN"} {data.message ? `— ${data.message}` : ""}
          </div>
        ) : null}
      </div>

      {/* ✅ SINGLE ROW COMPACT METRICS */}
      <div className="mt-5 p-3 rounded-2xl border bg-white">
        <div className="flex flex-wrap items-center gap-2">
          <MiniStat label="Retailers" value={s?.totalRetailers ?? 0} cls="bg-gray-50 border-gray-200" />
          <MiniStat label="Active ≤30d" value={s?.active30 ?? 0} cls="bg-green-50 border-green-200" />
          <MiniStat label="Inactive 31–60d" value={s?.inactive31_60 ?? 0} cls="bg-yellow-50 border-yellow-200" />
          <MiniStat label="Dormant 61–90d" value={s?.dormant61_90 ?? 0} cls="bg-orange-50 border-orange-200" />
          <MiniStat label="Dead 90+d" value={s?.dead90 ?? 0} cls="bg-red-50 border-red-200" />
          <div className="w-px h-6 bg-gray-200 mx-1" />
          <MiniStat label="Distributors" value={s?.totalDistributors ?? 0} cls="bg-gray-50 border-gray-200" />
          <MiniStat label="New Retailers" value={s?.newRetailers ?? 0} cls="bg-gray-50 border-gray-200" />
          <MiniStat label="New Distributors" value={s?.newDistributors ?? 0} cls="bg-gray-50 border-gray-200" />
        </div>
      </div>

      {/* Top 10 */}
      <Section title="Top 10 Retailers (Click to open)">
        <Table>
          <thead>
            <tr className="text-left">
              <TH>#</TH>
              <TH>Retailer</TH>
              <TH>Distributor</TH>
              <TH>City</TH>
              <TH className="text-right">Orders</TH>
              <TH className="text-right">Sales</TH>
              <TH className="text-right">AOV</TH>
              <TH className="text-right">Growth%</TH>
              <TH>Last Order</TH>
            </tr>
          </thead>
          <tbody>
            {(data?.top10 || []).map((r: any, idx: number) => (
              <tr
                key={r.retailerId}
                className="border-t cursor-pointer hover:bg-gray-50"
                onClick={() => openRetailer(r.retailerId)}
                title="Open retailer details"
              >
                <TD>{idx + 1}</TD>
                <TD className="font-bold underline underline-offset-2">{r.retailerName}</TD>
                <TD>{r.distributorName}</TD>
                <TD>{r.city || "—"}</TD>
                <TD className="text-right">{Number(r.orders || 0)}</TD>
                <TD className="text-right">₹{money(r.sales)}</TD>
                <TD className="text-right">₹{money(r.aov)}</TD>
                <TD className="text-right">{Number(r.growthPct || 0).toFixed(2)}%</TD>
                <TD>{fmtDateTime(r.lastOrderAt)}</TD>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      {/* Visit Planner */}
      <Section title="Visit Priority (Top 20) (Click to open)">
        <Table>
          <thead>
            <tr className="text-left">
              <TH>Retailer</TH>
              <TH>Distributor</TH>
              <TH>City</TH>
              <TH className="text-right">Visit Score</TH>
              <TH className="text-right">Orders (30d)</TH>
              <TH className="text-right">Sales (30d)</TH>
              <TH className="text-right">Drop%</TH>
              <TH>Reasons</TH>
              <TH>Last Order</TH>
            </tr>
          </thead>
          <tbody>
            {(data?.visitTop20 || []).map((r: any) => (
              <tr
                key={r.retailerId}
                className="border-t cursor-pointer hover:bg-gray-50"
                onClick={() => openRetailer(r.retailerId)}
                title="Open retailer details"
              >
                <TD className="font-bold underline underline-offset-2">{r.retailerName}</TD>
                <TD>{r.distributorName}</TD>
                <TD>{r.city || "—"}</TD>
                <TD className="text-right font-black">{Number(r.visitScore || 0).toFixed(1)}</TD>
                <TD className="text-right">{Number(r.orders30 || 0)}</TD>
                <TD className="text-right">₹{money(r.sales30)}</TD>
                <TD className="text-right">{Number(r.dropPct || 0).toFixed(2)}%</TD>
                <TD>
                  <div className="flex flex-wrap gap-1">
                    {(r.reasons || []).map((x: string) => (
                      <span key={x} className="text-[11px] px-2 py-0.5 rounded-full border bg-gray-50">
                        {x}
                      </span>
                    ))}
                  </div>
                </TD>
                <TD>{r.lastOrderAt ? new Date(r.lastOrderAt).toLocaleDateString("en-IN") : "—"}</TD>
              </tr>
            ))}
          </tbody>
        </Table>
      </Section>

      {/* Month pivot */}
      <Section title="All Retailers Month-wise (Orders + Sales) + Health Score (Click to open)">
        <div className="text-xs text-gray-600 mb-2">
          Months: {(months || []).join(", ")} (showing last {months.length} months)
        </div>

        <div className="overflow-x-auto border rounded-2xl bg-white">
          <table className="min-w-[1200px] w-full text-[13px]">
            <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
              <tr className="text-left">
                <TH>Retailer</TH>
                <TH>Distributor</TH>
                <TH>City</TH>
                <TH className="text-right">Health</TH>
                <TH>Trend</TH>
                {months.map((m) => (
                  <TH key={m} className="text-right">
                    {m}
                  </TH>
                ))}
                <TH>Last Order</TH>
              </tr>
            </thead>
            <tbody>
              {pivotRows.map((r: any) => {
                const b = badgeForHealth(Number(r.healthScore || 0));
                const t = trendBadge(String(r.trend || "NONE"));

                return (
                  <tr
                    key={r.retailerId}
                    className="border-t cursor-pointer hover:bg-gray-50"
                    onClick={() => openRetailer(r.retailerId)}
                    title="Open retailer details"
                  >
                    <TD className="font-bold underline underline-offset-2">{r.retailerName}</TD>
                    <TD>{r.distributorName}</TD>
                    <TD>{r.city || "—"}</TD>
                    <TD className="text-right">
                      <span className={["text-[11px] px-2 py-0.5 rounded-full border font-bold", b.cls].join(" ")}>
                        {Number(r.healthScore || 0)} {b.text}
                      </span>
                    </TD>
                    <TD>
                      <span className={["text-[11px] px-2 py-0.5 rounded-full border font-bold", t.cls].join(" ")}>
                        {t.text}
                      </span>
                    </TD>

                    {months.map((m) => {
                      const cell = r.byMonth?.[m];
                      const ord = Number(cell?.orders || 0);
                      const sal = Number(cell?.sales || 0);
                      return (
                        <TD key={m} className="text-right">
                          <div className="font-bold">{ord}</div>
                          <div className="text-[11px] text-gray-500">₹{money(sal)}</div>
                        </TD>
                      );
                    })}

                    <TD>{fmtDateTime(r.lastOrderAt)}</TD>
                  </tr>
                );
              })}

              {!pivotRows.length ? (
                <tr className="border-t">
                  <TD colSpan={5 + months.length + 1} className="text-center text-gray-600 py-6">
                    No retailers found.
                  </TD>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Section>
    </div>
  );
}

function ModeBtn({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-2 rounded-2xl border text-sm font-black transition whitespace-nowrap",
        active
          ? "bg-gray-900 border-gray-900 text-white"
          : "bg-white border-pink-200 text-gray-900 hover:bg-[#fff0f0] hover:shadow-sm",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 p-4 rounded-2xl border bg-white">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-black text-gray-900">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function MiniStat({ label, value, cls }: { label: string; value: any; cls: string }) {
  return (
    <div className={["px-3 py-2 rounded-2xl border", cls].join(" ")}>
      <div className="text-[10px] font-extrabold text-gray-600">{label}</div>
      <div className="text-sm font-black text-gray-900">{value}</div>
    </div>
  );
}

function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border rounded-2xl bg-white">
      <table className="min-w-[900px] w-full text-[13px]">{children}</table>
    </div>
  );
}

function TH({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={["px-4 py-3 font-black", className].join(" ")}>{children}</th>;
}

function TD({
  children,
  className = "",
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={["px-4 py-3 align-top", className].join(" ")}>
      {children}
    </td>
  );
}
