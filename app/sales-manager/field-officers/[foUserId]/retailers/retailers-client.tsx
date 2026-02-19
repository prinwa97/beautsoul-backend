"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type AssignedRow = {
  mapId: string;
  retailerId: string;
  assignedAt: string;
  due: number;
  lastOrderAt: string | null;
  lastCollectionAt: string | null;
  lastAuditAt: string | null;
  inactiveDays: number | null;
  retailer: {
    id: string;
    name: string;
    phone: string | null;
    city: string | null;
    status: string | null;
    distributorId: string | null;
  };
};

type RetailerLite = {
  id: string;
  name: string;
  phone: string | null;
  city: string | null;
  status: string | null;
  distributorId: string | null;
};

function clsx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}
function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function inr(v: number) {
  try { return v.toLocaleString("en-IN"); } catch { return String(v); }
}
function fmtDate(iso: string | null) {
  if (!iso) return "-";
  try { return new Date(iso).toLocaleString("en-IN", { year: "numeric", month: "short", day: "2-digit" }); } catch { return iso; }
}

function Badge({ text }: { text?: string | null }) {
  const t = String(text || "").toUpperCase();
  const cls =
    t === "ACTIVE"
      ? "bg-green-50 text-green-700 border-green-200"
      : t === "PENDING"
      ? "bg-yellow-50 text-yellow-800 border-yellow-200"
      : "bg-gray-100 text-gray-700 border-gray-200";
  return <span className={clsx("px-2 py-0.5 rounded-full border text-[11px] font-black", cls)}>{text || "-"}</span>;
}

function Kpi({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-2xl border border-black/10 bg-gray-50 p-3">
      <div className="text-[11px] font-black text-black/60">{title}</div>
      <div className="mt-1 text-lg font-extrabold">{value ?? "-"}</div>
    </div>
  );
}

export default function FieldOfficerRetailersClient({ foUserId }: { foUserId: string }) {
  const router = useRouter();

  const [foName, setFoName] = useState<string>("");

  // ✅ distributor step (locked to FO)
  const [foDistributorId, setFoDistributorId] = useState<string>("");
  const [foDistributorName, setFoDistributorName] = useState<string>("");

  // ✅ Summary (working)
  const [sumLoading, setSumLoading] = useState(true);
  const [sumErr, setSumErr] = useState("");
  const [summary, setSummary] = useState<any>(null);

  // last 30 days
  const period = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { from: iso(from), to: iso(to) };
  }, []);

  const [tab, setTab] = useState<"ASSIGNED" | "UNASSIGNED">("ASSIGNED");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  // assigned
  const [aq, setAq] = useState("");
  const [assigned, setAssigned] = useState<AssignedRow[]>([]);

  // unassigned
  const [uq, setUq] = useState("");
  const [unassigned, setUnassigned] = useState<RetailerLite[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);
  const selectedCount = selectedIds.length;

  const totalDueAssignedList = useMemo(() => assigned.reduce((s, r) => s + n(r.due), 0), [assigned]);

  async function loadSummary() {
    setSumLoading(true);
    setSumErr("");
    try {
      const qs = new URLSearchParams({ foUserId, from: period.from, to: period.to });
      const res = await fetch(`/api/sales-manager/field-officers/work/summary?${qs.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed summary");

      setSummary(data?.summary || null);
      setFoName(String(data?.fo?.name || "-"));

      const did = String(data?.fo?.distributor?.id || "");
      const dname = String(data?.fo?.distributor?.name || "");
      setFoDistributorId(did);
      setFoDistributorName(dname);
    } catch (e: any) {
      setSummary(null);
      setFoName("-");
      setFoDistributorId("");
      setFoDistributorName("");
      setSumErr(e?.message || "Failed summary");
    } finally {
      setSumLoading(false);
    }
  }

  async function loadAssigned() {
    setLoading(true);
    setToast("");
    try {
      const url = `/api/sales-manager/field-officers/retailers/assigned?foUserId=${encodeURIComponent(
        foUserId
      )}&q=${encodeURIComponent(aq)}&take=500`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to load assigned");
      setAssigned(Array.isArray(data.rows) ? data.rows : []);
    } catch (e: any) {
      setToast(e?.message || "Failed");
      setAssigned([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadUnassigned() {
    if (!foDistributorId) {
      setUnassigned([]);
      setToast("FO distributor loading...");
      return;
    }

    setLoading(true);
    setToast("");
    try {
      const url =
        `/api/sales-manager/field-officers/retailers/unassigned?distributorId=${encodeURIComponent(
          foDistributorId
        )}&q=${encodeURIComponent(uq)}&take=300`;

      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to load unassigned");

      const rows: RetailerLite[] = Array.isArray(data.retailers) ? data.retailers : [];
      setUnassigned(rows);

      // keep only visible selections
      setSelected((prev) => {
        const keep: Record<string, boolean> = {};
        const set = new Set(rows.map((r) => r.id));
        for (const k of Object.keys(prev)) if (set.has(k)) keep[k] = prev[k];
        return keep;
      });
    } catch (e: any) {
      setToast(e?.message || "Failed");
      setUnassigned([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
    loadAssigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foUserId]);

  useEffect(() => {
    if (tab === "ASSIGNED") loadAssigned();
    else loadUnassigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, foDistributorId]);

  async function doUnassign(retailerId: string) {
    if (!retailerId) return;
    setLoading(true);
    setToast("");
    try {
      const res = await fetch("/api/sales-manager/field-officers/retailers/unassign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ retailerId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Unassign failed");

      setToast("✅ Unassigned");
      await loadAssigned();
      await loadSummary();
    } catch (e: any) {
      setToast(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function doAssignSelected() {
    if (!selectedIds.length) return setToast("Select retailers first");
    setLoading(true);
    setToast("");
    try {
      const res = await fetch("/api/sales-manager/field-officers/retailers/assign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ foUserId, retailerIds: selectedIds }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Assign failed");

      setToast("✅ Assigned successfully");
      setSelected({});
      setTab("ASSIGNED");
      await loadAssigned();
      await loadSummary();
    } catch (e: any) {
      setToast(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  function toggleAll(on: boolean) {
    const next: Record<string, boolean> = {};
    for (const r of unassigned) next[r.id] = on;
    setSelected(next);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none px-2 md:px-4 py-4">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xl font-extrabold">FO Working + Retailer Assignment</div>
            <div className="mt-1 text-sm font-bold text-black/70 truncate">Field Officer: {foName || "-"}</div>
            <div className="mt-0.5 text-xs font-bold text-black/50">Period: {period.from} → {period.to} (last 30 days)</div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => router.back()} className="shrink-0 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-black hover:bg-gray-50">
              ← Back
            </button>
            <button onClick={() => loadSummary()} className="shrink-0 rounded-xl border border-black bg-black px-3 py-2 text-sm font-black text-white hover:opacity-90">
              Refresh
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          {sumLoading ? (
            <div className="text-sm font-bold text-black/60">Loading summary...</div>
          ) : sumErr ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{sumErr}</div>
          ) : !summary ? (
            <div className="text-sm font-bold text-black/40">No summary</div>
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

        {/* Toast */}
        {toast ? (
          <div className="mt-3 rounded-xl border border-black/10 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-bold text-black/80">{toast}</div>
              <button onClick={() => setToast("")} className="rounded-lg border border-black/10 px-2 py-1 text-xs font-black hover:bg-gray-50">
                X
              </button>
            </div>
          </div>
        ) : null}

        {/* Tabs + stats */}
        <div className="mt-3 mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setTab("ASSIGNED")}
              className={clsx("rounded-xl border px-4 py-2 text-sm font-black",
                tab === "ASSIGNED" ? "border-black bg-black text-white" : "border-black/10 bg-white hover:bg-gray-50"
              )}
            >
              Assigned ({assigned.length})
            </button>

            <button
              onClick={() => setTab("UNASSIGNED")}
              className={clsx("rounded-xl border px-4 py-2 text-sm font-black",
                tab === "UNASSIGNED" ? "border-black bg-black text-white" : "border-black/10 bg-white hover:bg-gray-50"
              )}
            >
              Unassigned ({unassigned.length})
            </button>
          </div>

          <div className="flex items-center gap-2 md:ml-auto">
            <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black">
              Due (Assigned List): ₹ {inr(totalDueAssignedList)}
            </div>
            <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black">
              Selected: {selectedCount}
            </div>
          </div>
        </div>

        {/* Assignment box */}
        <div className="rounded-2xl border border-black/10 bg-white shadow-sm">
          <div className="border-b border-black/10 p-3">
            <div className="text-sm font-black">{tab === "ASSIGNED" ? "Assigned Retailers" : "Assign Retailers"}</div>

            {/* ✅ STEP 1: Distributor (locked) */}
            {tab === "UNASSIGNED" ? (
              <div className="mt-2 rounded-2xl border border-black/10 bg-gray-50 p-3">
                <div className="text-[11px] font-black text-black/60">Step 1: Distributor (FO)</div>
                <div className="mt-1 text-sm font-extrabold">
                  {foDistributorName ? foDistributorName : foDistributorId ? `Distributor: ${foDistributorId}` : "Loading..."}
                </div>
                <div className="mt-0.5 text-xs font-bold text-black/50">
                  Retailers list below is from this distributor only.
                </div>
              </div>
            ) : null}

            {/* Search */}
            <div className="mt-3 flex w-full gap-2">
              {tab === "ASSIGNED" ? (
                <>
                  <input
                    value={aq}
                    onChange={(e) => setAq(e.target.value)}
                    placeholder="Search name / phone / city..."
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold outline-none focus:border-black"
                  />
                  <button onClick={loadAssigned} className="shrink-0 rounded-xl border border-black bg-black px-4 py-2 text-sm font-black text-white hover:opacity-90">
                    Search
                  </button>
                </>
              ) : (
                <>
                  <input
                    value={uq}
                    onChange={(e) => setUq(e.target.value)}
                    placeholder="Search name / phone / city..."
                    className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold outline-none focus:border-black"
                  />
                  <button onClick={loadUnassigned} className="shrink-0 rounded-xl border border-black bg-black px-4 py-2 text-sm font-black text-white hover:opacity-90">
                    Search
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-3">
            {loading ? (
              <div className="rounded-xl border border-black/10 bg-gray-50 p-4 text-sm font-bold">Loading...</div>
            ) : tab === "ASSIGNED" ? (
              assigned.length ? (
                <div className="space-y-2">
                  {assigned.map((row) => {
                    const r = row.retailer;
                    return (
                      <div key={row.mapId} className="rounded-2xl border border-black/10 bg-white p-3 hover:bg-gray-50">
                        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-base font-extrabold">{r?.name || "-"}</div>
                              <Badge text={r?.status || "-"} />
                            </div>
                            <div className="mt-0.5 text-xs font-bold text-black/60">
                              {r?.phone ? `📞 ${r.phone}` : ""} {r?.city ? ` • ${r.city}` : ""} • Assigned: {fmtDate(row.assignedAt)}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black">
                              Due: ₹ {inr(n(row.due))}
                            </div>
                            <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black">
                              Inactive: {row.inactiveDays ?? "-"} days
                            </div>
                            <button
                              onClick={() => doUnassign(row.retailerId)}
                              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:opacity-90"
                            >
                              Unassign
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 w-full grid grid-cols-1 gap-2 md:grid-cols-3">
                          <div className="w-full rounded-xl border border-black/10 bg-gray-50 px-3 py-2 flex flex-col justify-between min-h-[72px]">
                            <div className="text-[10px] font-black text-black/60">Last Order</div>
                            <div className="text-sm font-extrabold">{fmtDate(row.lastOrderAt)}</div>
                          </div>
                          <div className="w-full rounded-xl border border-black/10 bg-gray-50 px-3 py-2 flex flex-col justify-between min-h-[72px]">
                            <div className="text-[10px] font-black text-black/60">Last Collection</div>
                            <div className="text-sm font-extrabold">{fmtDate(row.lastCollectionAt)}</div>
                          </div>
                          <div className="w-full rounded-xl border border-black/10 bg-gray-50 px-3 py-2 flex flex-col justify-between min-h-[72px]">
                            <div className="text-[10px] font-black text-black/60">Last Audit</div>
                            <div className="text-sm font-extrabold">{fmtDate(row.lastAuditAt)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-black/10 bg-gray-50 p-4 text-sm font-bold">No assigned retailers yet.</div>
              )
            ) : !foDistributorId ? (
              <div className="rounded-xl border border-black/10 bg-gray-50 p-4 text-sm font-bold">
                Loading FO distributor...
              </div>
            ) : unassigned.length ? (
              <div className="space-y-2">
                <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-2xl border border-black/10 bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between">
                  <div className="text-sm font-black">Step 2: Select retailers (from this distributor)</div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => toggleAll(true)} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black hover:bg-gray-50">
                      Select All
                    </button>
                    <button onClick={() => toggleAll(false)} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black hover:bg-gray-50">
                      Clear
                    </button>
                    <button
                      disabled={!selectedCount}
                      onClick={doAssignSelected}
                      className={clsx(
                        "rounded-xl border px-4 py-2 text-xs font-black",
                        selectedCount ? "border-black bg-black text-white hover:opacity-90" : "border-black/10 bg-gray-100 text-black/40"
                      )}
                    >
                      Assign Now ({selectedCount})
                    </button>
                  </div>
                </div>

                {unassigned.map((r) => {
                  const checked = !!selected[r.id];
                  return (
                    <div key={r.id} className={clsx("rounded-2xl border p-3", checked ? "border-black bg-gray-50" : "border-black/10 bg-white hover:bg-gray-50")}>
                      <label className="flex min-w-0 cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setSelected((p) => ({ ...p, [r.id]: e.target.checked }))}
                          className="mt-1 h-4 w-4"
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-base font-extrabold">{r.name || "-"}</div>
                            <Badge text={r.status || "-"} />
                          </div>
                          <div className="mt-0.5 text-xs font-bold text-black/60">
                            {r.phone ? `📞 ${r.phone}` : ""} {r.city ? ` • ${r.city}` : ""}
                          </div>
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-black/10 bg-gray-50 p-4 text-sm font-bold">No unassigned retailers found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
