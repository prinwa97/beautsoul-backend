"use client";

import React, { useEffect, useState } from "react";

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function inr(v: number) {
  try { return v.toLocaleString("en-IN"); } catch { return String(v); }
}

function Kpi({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-gray-50 p-3">
      <div className="text-[11px] font-black text-black/60">{title}</div>
      <div className="mt-1 text-lg font-extrabold">{value ?? "-"}</div>
    </div>
  );
}

export default function SummaryPanel({ foUserId, from, to }: { foUserId: string; from: string; to: string }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [summary, setSummary] = useState<any>(null);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams({ foUserId, from, to });
      const res = await fetch(`/api/sales-manager/field-officers/work/summary?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed");
      setSummary(data?.summary || null);
    } catch (e: any) {
      setSummary(null);
      setErr(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foUserId, from, to]);

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-black">Working Summary</div>
        <button onClick={load} className="rounded-xl border border-black bg-black px-3 py-2 text-xs font-black text-white hover:opacity-90">
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-sm font-bold text-black/60">Loading...</div>
      ) : err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{err}</div>
      ) : !summary ? (
        <div className="text-sm font-bold text-black/40">No data</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Kpi title="Assigned Retailers" value={summary.assignedRetailers} />
          <Kpi title="Orders" value={summary.orders} />
          <Kpi title="Sales" value={`₹${inr(n(summary.sales))}`} />
          <Kpi title="Collections" value={`₹${inr(n(summary.collections))}`} />
          <Kpi title="Audits" value={summary.audits} />
          <Kpi title="Total Due" value={`₹${inr(n(summary.totalDue))}`} />
        </div>
      )}
    </div>
  );
}
