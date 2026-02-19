"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Row = {
  retailerId: string;
  name: string;
  city: string;
  phone: string;
  status?: string | null;
  totalSale: number; // DEBIT
  totalPaid: number; // CREDIT
  pending: number;   // debit - credit
  createdAt?: string | Date | null;
  lastActivityAt?: string | Date | null;
};

type OverviewRes = {
  ok: boolean;
  rows: Row[];
  grand?: { totalSale: number; totalPaid: number; pending: number };
  error?: string;
};

type SortMode = "recent" | "oldest" | "high" | "low" | "name";

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function asTime(v: any) {
  const d = v ? new Date(v) : null;
  const t = d && !Number.isNaN(d.getTime()) ? d.getTime() : 0;
  return t;
}

export default function LedgerHomePage() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");

  const [rows, setRows] = useState<Row[]>([]);
  const [grand, setGrand] = useState<{ totalSale: number; totalPaid: number; pending: number } | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/distributor/retailer-ledger/overview?take=500", { cache: "no-store" });
      const j = (await res.json().catch(() => null)) as OverviewRes | null;

      if (!res.ok || !j?.ok) {
        setErr(j?.error || "Failed to load ledger overview");
        setRows([]);
        setGrand(null);
        return;
      }

      setRows(Array.isArray(j.rows) ? j.rows : []);
      setGrand(j.grand || null);
    } catch (e: any) {
      setErr(e?.message || "Network error");
      setRows([]);
      setGrand(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filteredSorted = useMemo(() => {
    const s = q.trim().toLowerCase();

    let list = !s
      ? rows
      : rows.filter((r) => {
          return (
            (r.name || "").toLowerCase().includes(s) ||
            (r.city || "").toLowerCase().includes(s) ||
            (r.phone || "").toLowerCase().includes(s)
          );
        });

    // ✅ sort rules
    list = [...list].sort((a, b) => {
      if (sort === "name") {
        return (a.name || "").localeCompare(b.name || "");
      }
      if (sort === "high") {
        // Highest Pending
        return (b.pending || 0) - (a.pending || 0);
      }
      if (sort === "low") {
        // Least Pending
        return (a.pending || 0) - (b.pending || 0);
      }
      if (sort === "oldest") {
        // Oldest by lastActivityAt
        return asTime(a.lastActivityAt) - asTime(b.lastActivityAt);
      }
      // recent default
      return asTime(b.lastActivityAt) - asTime(a.lastActivityAt);
    });

    return list;
  }, [rows, q, sort]);

  return (
    <div className="space-y-4">
      {/* Header + Controls */}
      <div className="bg-white rounded-2xl border p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-xl font-bold text-gray-900">Ledger</div>
            <div className="text-sm text-gray-500">
              Retailer-wise summary (Sale / Paid / Pending) — click any row for details
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search retailer / city / phone..."
              className="w-full sm:w-80 rounded-xl border px-3 py-2 text-sm bg-white"
            />

            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="w-full sm:w-56 rounded-xl border px-3 py-2 text-sm bg-white"
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest</option>
              <option value="high">Highest Amount</option>
              <option value="low">Least Amount</option>
              <option value="name">By Name A–Z</option>
            </select>

            <button
              onClick={load}
              className="rounded-xl border px-3 py-2 text-sm bg-white hover:bg-gray-50"
              disabled={loading}
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Grand */}
        {grand && !err ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Kpi title="Total Sale" value={inr(grand.totalSale)} />
            <Kpi title="Total Paid" value={inr(grand.totalPaid)} />
            <Kpi
              title="Total Pending"
              value={inr(grand.pending)}
              valueClass={grand.pending > 0 ? "text-red-700" : "text-gray-900"}
            />
          </div>
        ) : null}

        {loading ? <div className="mt-3 text-sm text-gray-500">Loading…</div> : null}
        {err ? <div className="mt-3 text-sm text-red-600">{err}</div> : null}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left text-gray-600">
                <th className="px-4 py-3 w-16">#</th>
                <th className="px-4 py-3">Retailer</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Sale</th>
                <th className="px-4 py-3">Paid</th>
                <th className="px-4 py-3">Pending</th>
                <th className="px-4 py-3">Last Activity</th>
              </tr>
            </thead>

            <tbody>
              {filteredSorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-6 text-center text-gray-500">
                    No retailers found.
                  </td>
                </tr>
              ) : (
                filteredSorted.map((r, idx) => (
                  <tr key={r.retailerId} className="border-t hover:bg-pink-50/60">
                    <td className="px-4 py-3 font-semibold text-gray-700">{idx + 1}</td>

                    <td className="px-4 py-3">
                      <Link
                        className="font-semibold text-gray-900 hover:underline"
                        href={`/distributor/ledger/${r.retailerId}`}
                      >
                        {r.name}
                      </Link>
                    </td>

                    <td className="px-4 py-3 text-gray-700">{r.city || "—"}</td>
                    <td className="px-4 py-3 text-gray-700">{r.phone || "—"}</td>

                    <td className="px-4 py-3">
                      <span
                        className={[
                          "text-xs px-2 py-1 rounded-full border",
                          r.status === "ACTIVE"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-yellow-50 text-yellow-700 border-yellow-200",
                        ].join(" ")}
                      >
                        {r.status || "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-medium text-gray-900">{inr(r.totalSale || 0)}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{inr(r.totalPaid || 0)}</td>

                    <td className="px-4 py-3 font-extrabold">
                      <span className={r.pending > 0 ? "text-red-700" : "text-gray-900"}>
                        {inr(r.pending || 0)}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-gray-600">
                      {r.lastActivityAt ? new Date(r.lastActivityAt as any).toLocaleDateString("en-IN") : "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 text-xs text-gray-500 border-t">
          Sort Note: “Highest/Least Amount” = Pending (Receivable)
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value, valueClass }: { title: string; value: string; valueClass?: string }) {
  return (
    <div className="rounded-2xl border bg-white p-3 shadow-sm">
      <div className="text-xs text-gray-500">{title}</div>
      <div className={["mt-1 text-lg font-extrabold", valueClass || "text-gray-900"].join(" ")}>
        {value}
      </div>
    </div>
  );
}
