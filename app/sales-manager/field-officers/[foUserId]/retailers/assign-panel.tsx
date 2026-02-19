"use client";

import React, { useEffect, useMemo, useState } from "react";

type AssignedRow = {
  mapId: string;
  retailerId: string;
  assignedAt: string;
  due: number;
  inactiveDays: number | null;
  retailer: { id: string; name: string; phone: string | null; city: string | null; status: string | null };
  lastOrderAt: string | null;
  lastCollectionAt: string | null;
  lastAuditAt: string | null;
};

type RetailerLite = { id: string; name: string; phone: string | null; city: string | null; status: string | null };

function clsx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}
function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function inr(v: number) {
  try {
    return v.toLocaleString("en-IN");
  } catch {
    return String(v);
  }
}
function fmtDate(iso: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return iso;
  }
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

function InfoChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-black/10 bg-white px-2 py-0.5 text-[11px] font-black text-black/70">
      {children}
    </span>
  );
}

export default function AssignPanel({
  foUserId,
  distributorId,
  distributorName,
}: {
  foUserId: string;
  distributorId: string;
  distributorName?: string;
}) {
  const [tab, setTab] = useState<"ASSIGNED" | "UNASSIGNED">("ASSIGNED");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const [aq, setAq] = useState("");
  const [assigned, setAssigned] = useState<AssignedRow[]>([]);

  const [uq, setUq] = useState("");
  const [unassigned, setUnassigned] = useState<RetailerLite[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);
  const selectedCount = selectedIds.length;

  const totalDueAssignedList = useMemo(() => assigned.reduce((s, r) => s + n(r.due), 0), [assigned]);

  async function loadAssigned() {
    setLoading(true);
    setToast("");
    try {
      const url = `/api/sales-manager/field-officers/retailers/assigned?foUserId=${encodeURIComponent(
        foUserId
      )}&q=${encodeURIComponent(aq)}&take=500`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed");
      setAssigned(Array.isArray(data.rows) ? data.rows : []);
    } catch (e: any) {
      setAssigned([]);
      setToast(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function loadUnassigned() {
    if (!distributorId) {
      setUnassigned([]);
      setToast("Distributor not loaded");
      return;
    }

    setLoading(true);
    setToast("");
    try {
      const url = `/api/sales-manager/field-officers/retailers/unassigned?distributorId=${encodeURIComponent(
        distributorId
      )}&q=${encodeURIComponent(uq)}&take=300`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed");
      const rows: RetailerLite[] = Array.isArray(data.retailers) ? data.retailers : [];
      setUnassigned(rows);

      setSelected((prev) => {
        const keep: Record<string, boolean> = {};
        const set = new Set(rows.map((r) => r.id));
        for (const k of Object.keys(prev)) if (set.has(k)) keep[k] = prev[k];
        return keep;
      });
    } catch (e: any) {
      setUnassigned([]);
      setToast(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAssigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foUserId]);

  useEffect(() => {
    if (tab === "ASSIGNED") loadAssigned();
    else loadUnassigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, distributorId]);

  async function doUnassign(retailerId: string) {
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
      setToast("✅ Assigned");
      setSelected({});
      setTab("ASSIGNED");
      await loadAssigned();
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
    <div className="mt-3 rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="border-b border-black/10 p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-black">Assign / Unassign Retailers</div>
          <div className="text-xs font-bold text-black/60">
            Distributor: {distributorName || distributorId || "—"}
          </div>
        </div>

        {toast ? (
          <div className="mt-2 rounded-xl border border-black/10 bg-gray-50 p-2 text-sm font-bold">{toast}</div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setTab("ASSIGNED")}
            className={clsx(
              "rounded-xl border px-4 py-2 text-sm font-black",
              tab === "ASSIGNED" ? "border-black bg-black text-white" : "border-black/10 bg-white hover:bg-gray-50"
            )}
          >
            Assigned ({assigned.length})
          </button>
          <button
            onClick={() => setTab("UNASSIGNED")}
            className={clsx(
              "rounded-xl border px-4 py-2 text-sm font-black",
              tab === "UNASSIGNED" ? "border-black bg-black text-white" : "border-black/10 bg-white hover:bg-gray-50"
            )}
          >
            Unassigned ({unassigned.length})
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black">
              Due: ₹ {inr(totalDueAssignedList)}
            </div>
            <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black">
              Selected: {selectedCount}
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          {tab === "ASSIGNED" ? (
            <>
              <input
                value={aq}
                onChange={(e) => setAq(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold outline-none focus:border-black"
              />
              <button
                onClick={loadAssigned}
                className="rounded-xl border border-black bg-black px-4 py-2 text-sm font-black text-white hover:opacity-90"
              >
                Search
              </button>
            </>
          ) : (
            <>
              <input
                value={uq}
                onChange={(e) => setUq(e.target.value)}
                placeholder="Search..."
                className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold outline-none focus:border-black"
              />
              <button
                onClick={loadUnassigned}
                className="rounded-xl border border-black bg-black px-4 py-2 text-sm font-black text-white hover:opacity-90"
              >
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
                  <div
                    key={row.mapId}
                    className="rounded-2xl border border-black/10 bg-white p-3 hover:bg-gray-50"
                  >
                    {/* ✅ SINGLE ROW PROFESSIONAL */}
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      {/* Left: Name + chips */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="truncate text-base font-extrabold">{r?.name || "-"}</div>
                          <Badge text={r?.status || "-"} />
                        </div>

                        {/* chips row */}
                        <div className="mt-1 flex flex-wrap gap-2">
                          <InfoChip>{r?.phone ? `📞 ${r.phone}` : "📞 -"}</InfoChip>
                          <InfoChip>{r?.city ? `📍 ${r.city}` : "📍 -"}</InfoChip>
                          <InfoChip>{distributorName ? `🏷️ ${distributorName}` : "🏷️ -"}</InfoChip>
                          <InfoChip>🗓️ Assigned: {fmtDate(row.assignedAt)}</InfoChip>
                        </div>
                      </div>

                      {/* Right: stats + action */}
                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
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
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-black/10 bg-gray-50 p-4 text-sm font-bold">
              No assigned retailers
            </div>
          )
        ) : unassigned.length ? (
          <div className="space-y-2">
            <div className="sticky top-0 z-10 flex flex-col gap-2 rounded-2xl border border-black/10 bg-white p-3 shadow-sm md:flex-row md:items-center md:justify-between">
              <div className="text-sm font-black">Select retailers to assign</div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => toggleAll(true)}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black hover:bg-gray-50"
                >
                  Select All
                </button>
                <button
                  onClick={() => toggleAll(false)}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black hover:bg-gray-50"
                >
                  Clear
                </button>
                <button
                  disabled={!selectedCount}
                  onClick={doAssignSelected}
                  className={clsx(
                    "rounded-xl border px-4 py-2 text-xs font-black",
                    selectedCount
                      ? "border-black bg-black text-white hover:opacity-90"
                      : "border-black/10 bg-gray-100 text-black/40"
                  )}
                >
                  Assign Now ({selectedCount})
                </button>
              </div>
            </div>

            {unassigned.map((r) => {
              const checked = !!selected[r.id];
              return (
                <div
                  key={r.id}
                  className={clsx(
                    "rounded-2xl border p-3",
                    checked ? "border-black bg-gray-50" : "border-black/10 bg-white hover:bg-gray-50"
                  )}
                >
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
                        {r.phone ? `📞 ${r.phone}` : ""}
                        {r.city ? ` • ${r.city}` : ""}
                        {distributorName ? ` • ${distributorName}` : ""}
                      </div>
                    </div>
                  </label>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-black/10 bg-gray-50 p-4 text-sm font-bold">
            No unassigned retailers
          </div>
        )}
      </div>
    </div>
  );
}