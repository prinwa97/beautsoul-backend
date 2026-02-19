// app/field-officer/audit/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type SortKey = "RECENT_AUDIT" | "OLDEST_AUDIT" | "NAME_AZ";

type RetailerRow = {
  id: string;
  name: string;
  city?: string | null;
  phone?: string | null;
  status?: string | null;
  lastAuditDate?: string | null; // ISO
};

function ymd(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function fmtAuditChip(d?: string | null) {
  if (!d) return "Last Audit: —";
  return `Last Audit: ${ymd(d)}`;
}

function Icon({ name }: { name: "search" | "refresh" }) {
  const c = "h-5 w-5";
  if (name === "refresh")
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none">
        <path d="M20 12a8 8 0 10-2.34 5.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 12v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );

  return (
    <svg className={c} viewBox="0 0 24 24" fill="none">
      <path d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" stroke="currentColor" strokeWidth="2" />
      <path d="M16.5 16.5 21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function FOAuditRetailersPage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("RECENT_AUDIT");
  const [rows, setRows] = useState<RetailerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  async function loadList(nextQ: string, nextSort: SortKey) {
    setLoading(true);
    setToast("");
    try {
      const res = await fetch(
        `/api/field-officer/audit/retailers?q=${encodeURIComponent(nextQ)}&take=200&sort=${encodeURIComponent(nextSort)}`,
        { cache: "no-store", credentials: "include" }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setRows([]);
        setToast(data?.error || `HTTP ${res.status}`);
        return;
      }
      setRows(data.retailers || []);
    } catch (e: any) {
      setRows([]);
      setToast(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList("", sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadList(q, sort), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort]);

  const compactRows = useMemo(() => {
    const arr = [...rows];
    if (sort === "NAME_AZ") {
      arr.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
      return arr;
    }
    if (sort === "OLDEST_AUDIT") {
      arr.sort((a, b) => {
        const ta = a.lastAuditDate ? new Date(a.lastAuditDate).getTime() : 0;
        const tb = b.lastAuditDate ? new Date(b.lastAuditDate).getTime() : 0;
        return ta - tb;
      });
      return arr;
    }
    arr.sort((a, b) => {
      const ta = a.lastAuditDate ? new Date(a.lastAuditDate).getTime() : 0;
      const tb = b.lastAuditDate ? new Date(b.lastAuditDate).getTime() : 0;
      return tb - ta;
    });
    return arr;
  }, [rows, sort]);

  return (
    <div className="p-0 space-y-2">
      <div className="flex items-end justify-center">
        <div>
          <div className="text-2xl font-extrabold">Audit</div>
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-3 shadow-sm space-y-2">
        <input
          placeholder="Search retailer / city / phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-xl border border-black/10 bg-black/5 px-3 py-3 text-sm outline-none"
        />

        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold outline-none"
          >
            <option value="RECENT_AUDIT">Most recent audit</option>
            <option value="OLDEST_AUDIT">Oldest audit</option>
            <option value="NAME_AZ">Name A to Z</option>
          </select>

          <button
            type="button"
            onClick={() => loadList(q, sort)}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-gray-800 shadow-sm"
            title="Refresh"
          >
            <Icon name="refresh" />
          </button>
        </div>
      </div>

      {toast ? <div className="rounded-2xl bg-black/5 px-4 py-3 text-sm font-semibold text-gray-800">{toast}</div> : null}

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : compactRows.length ? (
        <div className="space-y-2">
          {compactRows.map((r) => (
            <Link key={r.id} href={`/field-officer/audit/${r.id}`} className="block">
              <div className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-left shadow-sm active:scale-[0.99]">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-900">{r.name}</div>
                    <div className="truncate text-[11px] text-gray-500">
                      {r.city || "—"}
                      {r.phone ? ` • ${r.phone}` : ""}
                    </div>

                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-[11px] font-semibold">
                      <span className="text-gray-700">{fmtAuditChip(r.lastAuditDate)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs px-2 py-1 rounded-full border border-black/10 bg-gray-50 text-gray-700 font-semibold">
                      Open
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500">No retailers found</div>
      )}
    </div>
  );
}
