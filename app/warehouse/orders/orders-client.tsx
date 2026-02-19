"use client";

import React, { useEffect, useMemo, useState } from "react";

type Pipeline = {
  submitted: number;
  confirmed: number;
  dispatched: number;
  delivered: number;
  rejected: number;
  cancelled: number;
};

type DistributorLoadRow = { id: string; name: string; pending: number; value: number };

type Stats = {
  total: number;
  pipeline: Pipeline;
  backlog: number;
  delay: { warn12hPlus: number; critical24hPlus: number };
  dispatchedToday: number;
  revenue: { pendingDispatchValue: number; stuck12hPlusValue: number };
  distributorLoad: DistributorLoadRow[];
};

type Row = {
  id: string;
  orderNo: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  totalAmount: number;
  paidAmount: number;
  distributor: { id: string; name: string; city: string; state: string };
  retailer: { id: string; name: string; city?: string | null; state?: string | null };
  items: { id: string; productName: string; qty: number; rate: number; amount: number }[];
  invoice?: {
    id: string;
    invoiceNo: string;
    paymentStatus: string;
    paymentMode?: string | null;
    paidAmount: number;
    utrNo?: string | null;
    paidAt?: string | null;
  } | null;
};

type ApiResp =
  | { ok: true; take: number; stats: Stats; rows: Row[] }
  | { ok: false; error: string };

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(
    Number(n || 0)
  );
}

function fmtDT(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function ageHours(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return ms / 36e5;
}

function pillClass(kind: "ok" | "warn" | "bad") {
  if (kind === "bad") return "bg-rose-100 text-rose-800 border-rose-200";
  if (kind === "warn") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-emerald-100 text-emerald-800 border-emerald-200";
}

function riskFromRow(r: Row) {
  const st = String(r.status || "").toUpperCase();
  if (st === "DELIVERED" || st === "CANCELLED" || st === "REJECTED") return { label: "Closed", kind: "ok" as const };

  const h = ageHours(r.createdAt);
  if (h > 24) return { label: "Critical 24h+", kind: "bad" as const };
  if (h > 12) return { label: "Delay 12h+", kind: "warn" as const };
  return { label: "On-time", kind: "ok" as const };
}

const STATUS_OPTS = ["ALL", "SUBMITTED", "CONFIRMED", "DISPATCHED", "DELIVERED", "REJECTED", "CANCELLED"] as const;

export default function WarehouseOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string>("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTS)[number]>("ALL");

  const [stats, setStats] = useState<Stats | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  async function load() {
    setLoading(true);
    setErr("");

    try {
      const sp = new URLSearchParams();
      sp.set("take", "200");
      if (q.trim()) sp.set("q", q.trim());
      if (status !== "ALL") sp.set("status", status);

      const res = await fetch(`/api/warehouse/orders?${sp.toString()}`, { cache: "no-store" });
      const data = (await res.json()) as ApiResp;

      if (!data.ok) throw new Error(data.error || "Failed");
      setStats(data.stats);
      setRows(data.rows);
    } catch (e: any) {
      setErr(String(e?.message || e || "Error"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const quickAlerts = useMemo(() => {
    if (!stats) return [];
    const a: { text: string; kind: "ok" | "warn" | "bad" }[] = [];
    if (stats.delay.critical24hPlus > 0) a.push({ text: `${stats.delay.critical24hPlus} orders SLA breach (24h+)`, kind: "bad" });
    if (stats.delay.warn12hPlus > 0) a.push({ text: `${stats.delay.warn12hPlus} orders delayed (12h+)`, kind: "warn" });
    if (stats.revenue.stuck12hPlusValue > 0) a.push({ text: `Revenue stuck (12h+): ${inr(stats.revenue.stuck12hPlusValue)}`, kind: "warn" });
    if (!a.length) a.push({ text: "No critical alerts ✅", kind: "ok" });
    return a;
  }, [stats]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xl font-bold text-gray-900">Orders Control Tower</div>
          <div className="text-xs text-gray-600">Distributor Orders monitoring (schema-safe)</div>
        </div>

        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search orderNo / distributor / retailer..."
            className="w-full md:w-80 rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-200"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="rounded-xl border border-pink-100 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-200"
          >
            {STATUS_OPTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <button
            onClick={load}
            className="rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-95"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        {quickAlerts.map((a, i) => (
          <div
            key={i}
            className={`rounded-2xl border px-3 py-2 text-sm ${pillClass(a.kind)}`}
          >
            {a.text}
          </div>
        ))}
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card title="Total" value={stats ? String(stats.total) : "-"} sub="Loaded in table" />
        <Card title="Backlog" value={stats ? String(stats.backlog) : "-"} sub="Active orders" />
        <Card title="SLA 24h+" value={stats ? String(stats.delay.critical24hPlus) : "-"} sub="Critical" danger />
        <Card title="Delayed 12h+" value={stats ? String(stats.delay.warn12hPlus) : "-"} sub="Warning" warn />
        <Card title="Dispatched Today" value={stats ? String(stats.dispatchedToday) : "-"} sub="Heuristic" />
      </div>

      {/* Pipeline */}
      {stats && (
        <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-gray-900">Pipeline</div>
            <div className="text-xs text-gray-600">SUBMITTED → CONFIRMED → DISPATCHED → DELIVERED</div>
          </div>

          <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-2">
            <MiniPill label="SUBMITTED" value={stats.pipeline.submitted} />
            <MiniPill label="CONFIRMED" value={stats.pipeline.confirmed} />
            <MiniPill label="DISPATCHED" value={stats.pipeline.dispatched} />
            <MiniPill label="DELIVERED" value={stats.pipeline.delivered} />
            <MiniPill label="REJECTED" value={stats.pipeline.rejected} />
            <MiniPill label="CANCELLED" value={stats.pipeline.cancelled} />
          </div>
        </div>
      )}

      {/* Revenue + Distributor load */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
            <div className="font-semibold text-gray-900">Revenue Impact</div>
            <div className="mt-2 text-sm text-gray-700">
              Pending dispatch value: <span className="font-semibold">{inr(stats.revenue.pendingDispatchValue)}</span>
            </div>
            <div className="mt-1 text-sm text-gray-700">
              Stuck (12h+ & not dispatched): <span className="font-semibold">{inr(stats.revenue.stuck12hPlusValue)}</span>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              Note: Order model me dispatch fields nahi hain, isliye stuck logic age+status se calculate ho raha hai.
            </div>
          </div>

          <div className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
            <div className="font-semibold text-gray-900">Distributor Load (Top)</div>
            <div className="mt-3 space-y-2">
              {stats.distributorLoad.length ? (
                stats.distributorLoad.map((d) => (
                  <div key={d.id} className="flex items-center justify-between rounded-xl border border-pink-100 px-3 py-2">
                    <div className="text-sm">
                      <div className="font-semibold text-gray-900">{d.name}</div>
                      <div className="text-xs text-gray-600">{inr(d.value)} pending value</div>
                    </div>
                    <div className="text-sm font-bold text-gray-900">{d.pending}</div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-600">No backlog</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-pink-100 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-pink-100 flex items-center justify-between">
          <div className="font-semibold text-gray-900">Orders</div>
          {loading ? <div className="text-xs text-gray-600">Loading…</div> : null}
        </div>

        {err ? <div className="p-4 text-sm text-rose-700">{err}</div> : null}

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-pink-50 text-gray-700">
              <tr>
                <th className="text-left px-3 py-2">Order</th>
                <th className="text-left px-3 py-2">Distributor</th>
                <th className="text-left px-3 py-2">Retailer</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Risk</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-right px-3 py-2">Paid</th>
                <th className="text-left px-3 py-2">Created</th>
                <th className="text-left px-3 py-2">Updated</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => {
                const risk = riskFromRow(r);
                return (
                  <tr key={r.id} className="border-t border-pink-100 hover:bg-pink-50/40">
                    <td className="px-3 py-2">
                      <div className="font-semibold text-gray-900">{r.orderNo}</div>
                      <div className="text-xs text-gray-600">{r.items.length} items</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-gray-900">{r.distributor?.name}</div>
                      <div className="text-xs text-gray-600">{r.distributor?.city}, {r.distributor?.state}</div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-gray-900">{r.retailer?.name}</div>
                      <div className="text-xs text-gray-600">{r.retailer?.city || "-"}, {r.retailer?.state || "-"}</div>
                    </td>
                    <td className="px-3 py-2">
                      <span className="rounded-xl border border-pink-100 bg-white px-2 py-1 text-xs font-semibold text-gray-800">
                        {String(r.status)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`rounded-xl border px-2 py-1 text-xs font-semibold ${pillClass(risk.kind)}`}>
                        {risk.label}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">{inr(r.totalAmount)}</td>
                    <td className="px-3 py-2 text-right">{inr(r.paidAmount)}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{fmtDT(r.createdAt)}</td>
                    <td className="px-3 py-2 text-xs text-gray-700">{fmtDT(r.updatedAt)}</td>
                  </tr>
                );
              })}

              {!loading && !rows.length ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-gray-600">
                    No orders found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
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
  sub: string;
  warn?: boolean;
  danger?: boolean;
}) {
  const border = danger ? "border-rose-200" : warn ? "border-amber-200" : "border-pink-100";
  const bg = danger ? "bg-rose-50" : warn ? "bg-amber-50" : "bg-white";
  const txt = danger ? "text-rose-700" : warn ? "text-amber-700" : "text-gray-900";

  return (
    <div className={`rounded-2xl border ${border} ${bg} p-3 shadow-sm`}>
      <div className="text-xs text-gray-600">{title}</div>
      <div className={`mt-1 text-2xl font-extrabold ${txt}`}>{value}</div>
      <div className="text-[11px] text-gray-500">{sub}</div>
    </div>
  );
}

function MiniPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-pink-100 bg-white px-3 py-2">
      <div className="text-[11px] text-gray-600">{label}</div>
      <div className="text-lg font-extrabold text-gray-900">{value}</div>
    </div>
  );
}
