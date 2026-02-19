"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function inr(v: number) {
  try {
    return v.toLocaleString("en-IN");
  } catch {
    return String(v);
  }
}
function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export default function FieldOfficerWorkingClient({ foUserId }: { foUserId: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [debug, setDebug] = useState<string>("");

  const [foName, setFoName] = useState<string>("-");
  const [summary, setSummary] = useState<any>(null);

  const period = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { from: iso(from), to: iso(to) };
  }, []);

  async function load() {
    setLoading(true);
    setErr("");
    setDebug("");
    try {
      const qs = new URLSearchParams({ foUserId, from: period.from, to: period.to });
      const url = `/api/sales-manager/field-officers/work/summary?${qs.toString()}`;

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => null);

      setDebug(`GET ${url} → ${res.status} ${res.statusText}`);

      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed");

      setFoName(String(data?.fo?.name || "-"));
      setSummary(data?.summary || null);
    } catch (e: any) {
      setErr(e?.message || "Failed");
      setFoName("-");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [foUserId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 md:px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xl font-extrabold">FO Working Summary</div>
            <div className="mt-1 text-sm font-bold text-black/70 truncate">
              Field Officer: {foName} <span className="text-black/40">({foUserId})</span>
            </div>
            <div className="mt-0.5 text-xs font-bold text-black/50">
              Period: {period.from} → {period.to} (last 30 days)
            </div>
            {debug ? <div className="mt-1 text-[11px] font-bold text-black/40">{debug}</div> : null}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.back()}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-black hover:bg-gray-50"
            >
              ← Back
            </button>

            <button
              onClick={load}
              className="rounded-xl border border-black bg-black px-3 py-2 text-sm font-black text-white hover:opacity-90"
            >
              Refresh
            </button>

            <button
              onClick={() => router.push(`/sales-manager/field-officers/${foUserId}/retailers`)}
              className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-black hover:bg-gray-50"
              title="Assign / Unassign Retailers"
            >
              Assign Retailers
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4">
          {loading ? (
            <div className="text-sm font-bold text-black/60">Loading...</div>
          ) : err ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
              {err}
            </div>
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
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-gray-50 p-3">
      <div className="text-[11px] font-black text-black/60">{title}</div>
      <div className="mt-1 text-lg font-extrabold">{value ?? "-"}</div>
    </div>
  );
}
