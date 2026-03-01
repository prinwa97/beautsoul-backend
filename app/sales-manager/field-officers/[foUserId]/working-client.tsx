// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/sales-manager/field-officers/[foUserId]/retailers/assign-panel.tsx
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
  distributorId?: string | null;
  distributorName?: string | null;
};

type RetailerLite = { id: string; name: string; phone: string | null; city: string | null; status: string | null };

type FoLite = { id: string; name: string | null; phone: string | null };

type TransferHistoryRow = {
  id: string; // batchId
  status: "DONE" | "ROLLED_BACK" | string;
  mode: "ALL" | "SELECTED" | string;
  transferred: number;
  createdAt: string | null;
  reason: string | null;
  note: string | null;
  fromFo: { id: string; name: string | null; phone: string | null } | null;
  toFo: { id: string; name: string | null; phone: string | null } | null;
};

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
function fmtDateTime(iso: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("en-IN");
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
  const [tab, setTab] = useState<"ASSIGNED" | "UNASSIGNED" | "TRANSFER">("ASSIGNED");
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

  // ---------------------------
  // TRANSFER state (PRO)
  // ---------------------------
  const [foList, setFoList] = useState<FoLite[]>([]);
  const [fromFoUserId, setFromFoUserId] = useState("");
  const [transferMode, setTransferMode] = useState<"ALL" | "SELECTED">("ALL");
  const [sourceLoading, setSourceLoading] = useState(false);

  const [sq, setSq] = useState("");
  const [sourceAssigned, setSourceAssigned] = useState<AssignedRow[]>([]);
  const [pick, setPick] = useState<Record<string, boolean>>({});
  const pickedIds = useMemo(() => Object.keys(pick).filter((id) => pick[id]), [pick]);
  const pickedCount = pickedIds.length;

  const [transferReason, setTransferReason] = useState("Urgent reassignment (FO left / absent)");
  const [transferNote, setTransferNote] = useState("");

  const [history, setHistory] = useState<TransferHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  function resetTransferUI() {
    setFromFoUserId("");
    setTransferMode("ALL");
    setSq("");
    setSourceAssigned([]);
    setPick({});
    setTransferReason("Urgent reassignment (FO left / absent)");
    setTransferNote("");
  }

  // ---------------------------
  // Loaders
  // ---------------------------
  async function loadAssigned() {
    setLoading(true);
    setToast("");
    try {
      const url = `/api/sales-manager/field-officers/retailers/assigned?foUserId=${encodeURIComponent(
        foUserId
      )}&q=${encodeURIComponent(aq)}&take=500`;
      const res = await fetch(url, { cache: "no-store", credentials: "include" });
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
      const res = await fetch(url, { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed");

      const rows: RetailerLite[] = Array.isArray(data.rows) ? data.rows : [];
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

  async function loadFoList() {
    if (!distributorId) return setFoList([]);
    try {
      const url = `/api/sales-manager/field-officers/retailers/list?distributorId=${encodeURIComponent(distributorId)}`;
      const res = await fetch(url, { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed");
      const list: FoLite[] = Array.isArray(data.fieldOfficers) ? data.fieldOfficers : [];
      // remove current target FO from source list (cannot transfer from itself)
      setFoList(list.filter((x) => x.id !== foUserId));
    } catch (e: any) {
      setFoList([]);
      setToast(e?.message || "Failed to load FOs");
    }
  }

  async function loadSourceAssigned() {
    if (!fromFoUserId) {
      setSourceAssigned([]);
      setPick({});
      return;
    }
    setSourceLoading(true);
    setToast("");
    try {
      const url = `/api/sales-manager/field-officers/retailers/assigned?foUserId=${encodeURIComponent(
        fromFoUserId
      )}&q=${encodeURIComponent(sq)}&take=500`;
      const res = await fetch(url, { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed");
      const rows: AssignedRow[] = Array.isArray(data.rows) ? data.rows : [];
      setSourceAssigned(rows);

      setPick((prev) => {
        const keep: Record<string, boolean> = {};
        const set = new Set(rows.map((r) => r.retailerId));
        for (const k of Object.keys(prev)) if (set.has(k)) keep[k] = prev[k];
        return keep;
      });
    } catch (e: any) {
      setSourceAssigned([]);
      setPick({});
      setToast(e?.message || "Failed");
    } finally {
      setSourceLoading(false);
    }
  }

  async function loadTransferHistory() {
    if (!distributorId) return setHistory([]);
    setHistoryLoading(true);
    try {
      const url = `/api/sales-manager/field-officers/retailers/transfer/list?distributorId=${encodeURIComponent(
        distributorId
      )}&take=20`;
      const res = await fetch(url, { cache: "no-store", credentials: "include" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed");
      setHistory(Array.isArray(data.rows) ? data.rows : []);
    } catch (e: any) {
      setHistory([]);
      setToast(e?.message || "Failed to load transfer history");
    } finally {
      setHistoryLoading(false);
    }
  }

  // ---------------------------
  // Actions (Assign/Unassign)
  // ---------------------------
  async function doUnassign(mapId: string) {
    if (!mapId) return;
    setLoading(true);
    setToast("");
    try {
      const res = await fetch("/api/sales-manager/field-officers/retailers/unassign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mapId }),
        credentials: "include",
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
        credentials: "include",
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

  // ---------------------------
  // Actions (Transfer PRO)
  // ---------------------------
  function togglePickAll(on: boolean) {
    const next: Record<string, boolean> = {};
    for (const row of sourceAssigned) next[row.retailerId] = on;
    setPick(next);
  }

  async function doTransfer() {
    if (!fromFoUserId) return setToast("Select source FO first");

    // mode logic
    const mode: "ALL" | "SELECTED" = transferMode;
    if (mode === "SELECTED" && pickedIds.length === 0) return setToast("Select retailers to transfer");

    // safety confirm
    const src = foList.find((x) => x.id === fromFoUserId);
    const srcName = src?.name || src?.phone || src?.id || "Source FO";
    const targetName = "This FO (Target)";

    const msg =
      mode === "ALL"
        ? `Transfer ALL retailers from ${srcName} to ${targetName}?\n\nDistributor will remain SAME.`
        : `Transfer ${pickedIds.length} selected retailers from ${srcName} to ${targetName}?\n\nDistributor will remain SAME.`;

    if (!confirm(msg)) return;

    setLoading(true);
    setToast("");
    try {
      const payload: any = {
        fromFoUserId,
        toFoUserId: foUserId,
        mode,
        retailerIds: mode === "SELECTED" ? pickedIds : undefined,
        reason: transferReason || null,
        note: transferNote || null,
      };

      const res = await fetch("/api/sales-manager/field-officers/retailers/transfer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Transfer failed");

      setToast(`✅ Transfer done • Batch: ${data.batchId} • Transferred: ${data.transferred || 0}`);
      await loadAssigned(); // target FO assigned list refresh
      await loadSourceAssigned(); // source list refresh
      await loadTransferHistory(); // history refresh

      // keep selection if selected-mode; or clear
      setPick({});
    } catch (e: any) {
      setToast(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function rollback(batchId: string) {
    if (!batchId) return;
    if (!confirm("Rollback this transfer?\nOnly retailers still assigned to TO FO will be reverted.")) return;

    setLoading(true);
    setToast("");
    try {
      const res = await fetch("/api/sales-manager/field-officers/retailers/transfer/rollback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ batchId, reason: "FO returned - rollback transfer" }),
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Rollback failed");

      setToast(`✅ Rollback done • Reverted: ${data.rolledBack || 0}`);
      await loadAssigned();
      await loadTransferHistory();
      // if currently viewing transfer tab, refresh source list too
      await loadSourceAssigned();
    } catch (e: any) {
      setToast(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------
  // Effects
  // ---------------------------
  useEffect(() => {
    loadAssigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foUserId]);

  useEffect(() => {
    if (tab === "ASSIGNED") loadAssigned();
    else if (tab === "UNASSIGNED") loadUnassigned();
    else {
      // TRANSFER
      loadFoList();
      loadTransferHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, distributorId]);

  useEffect(() => {
    if (tab !== "TRANSFER") return;
    loadSourceAssigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromFoUserId]);

  // ---------------------------
  // UI
  // ---------------------------
  const targetFoName = useMemo(() => {
    // UI doesn't know name; if needed pass it as prop. We'll show foUserId.
    return foUserId;
  }, [foUserId]);

  return (
    <div className="mt-3 rounded-2xl border border-black/10 bg-white shadow-sm">
      <div className="border-b border-black/10 p-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="text-sm font-black">Retailers</div>
          <div className="text-xs font-bold text-black/60">Distributor: {distributorName || distributorId || "—"}</div>
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
          <button
            onClick={() => {
              setTab("TRANSFER");
              // keep transfer state, but ensure list loaded
            }}
            className={clsx(
              "rounded-xl border px-4 py-2 text-sm font-black",
              tab === "TRANSFER" ? "border-black bg-black text-white" : "border-black/10 bg-white hover:bg-gray-50"
            )}
          >
            Transfer (PRO)
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black">Due: ₹ {inr(totalDueAssignedList)}</div>
            <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black">Selected: {selectedCount}</div>
          </div>
        </div>

        {/* search bar (Assigned / Unassigned) */}
        {tab !== "TRANSFER" ? (
          <div className="mt-3 flex gap-2">
            {tab === "ASSIGNED" ? (
              <>
                <input
                  value={aq}
                  onChange={(e) => setAq(e.target.value)}
                  placeholder="Search assigned..."
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
                  placeholder="Search unassigned..."
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
        ) : null}
      </div>

      <div className="max-h-[72vh] overflow-y-auto p-3">
        {loading ? (
          <div className="rounded-xl border border-black/10 bg-gray-50 p-4 text-sm font-bold">Loading...</div>
        ) : tab === "ASSIGNED" ? (
          assigned.length ? (
            <div className="space-y-2">
              {assigned.map((row) => {
                const r = row.retailer;
                return (
                  <div key={row.mapId} className="rounded-2xl border border-black/10 bg-white p-3 hover:bg-gray-50">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="truncate text-base font-extrabold">{r?.name || "-"}</div>
                          <Badge text={r?.status || "-"} />
                        </div>

                        <div className="mt-1 flex flex-wrap gap-2">
                          <InfoChip>{r?.phone ? `📞 ${r.phone}` : "📞 -"}</InfoChip>
                          <InfoChip>{r?.city ? `📍 ${r.city}` : "📍 -"}</InfoChip>
                          <InfoChip>{distributorName ? `🏷️ ${distributorName}` : "🏷️ -"}</InfoChip>
                          <InfoChip>🗓️ Assigned: {fmtDate(row.assignedAt)}</InfoChip>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 md:justify-end">
                        <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black">Due: ₹ {inr(n(row.due))}</div>
                        <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black">
                          Inactive: {row.inactiveDays ?? "-"} days
                        </div>
                        <button
                          onClick={() => doUnassign(row.mapId)}
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
            <div className="rounded-xl border border-black/10 bg-gray-50 p-4 text-sm font-bold">No assigned retailers</div>
          )
        ) : tab === "UNASSIGNED" ? (
          unassigned.length ? (
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
                  <div
                    key={r.id}
                    className={clsx("rounded-2xl border p-3", checked ? "border-black bg-gray-50" : "border-black/10 bg-white hover:bg-gray-50")}
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
            <div className="rounded-xl border border-black/10 bg-gray-50 p-4 text-sm font-bold">No unassigned retailers</div>
          )
        ) : (
          // ---------------------------
          // TRANSFER (PRO)
          // ---------------------------
          <div className="space-y-3">
            <div className="rounded-2xl border border-black/10 bg-white p-3">
              <div className="text-sm font-black">Transfer Retailers (One-click + Return/Rollback)</div>
              <div className="mt-1 text-[11px] font-bold text-black/60">
                ✅ Transfer changes ONLY FO assignment. Distributor mapping + sales/invoices remain SAME.
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="text-xs font-black text-black/70">Target FO (to)</label>
                  <div className="mt-1 rounded-xl border border-black/10 bg-gray-50 px-3 py-2 text-sm font-black">
                    {targetFoName}
                  </div>
                  <div className="mt-1 text-[11px] font-bold text-black/50">This is the FO from URL (current page).</div>
                </div>

                <div>
                  <label className="text-xs font-black text-black/70">Source FO (from)</label>
                  <select
                    value={fromFoUserId}
                    onChange={(e) => setFromFoUserId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-black outline-none focus:border-black"
                  >
                    <option value="">Select FO (source)</option>
                    {foList.map((fo) => (
                      <option key={fo.id} value={fo.id}>
                        {(fo.name && fo.name.trim()) ? fo.name : fo.phone ? `FO ${fo.phone}` : fo.id}
                      </option>
                    ))}
                  </select>
                  <div className="mt-1 text-[11px] font-bold text-black/50">
                    Only FOs of same distributor shown. (Distributor: {distributorName || distributorId})
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-black/10 bg-gray-50 p-3">
                  <div className="text-[11px] font-black text-black/60">Mode</div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setTransferMode("ALL")}
                      className={clsx(
                        "rounded-xl border px-3 py-2 text-xs font-black",
                        transferMode === "ALL" ? "border-black bg-black text-white" : "border-black/10 bg-white hover:bg-gray-50"
                      )}
                    >
                      Transfer ALL
                    </button>
                    <button
                      onClick={() => setTransferMode("SELECTED")}
                      className={clsx(
                        "rounded-xl border px-3 py-2 text-xs font-black",
                        transferMode === "SELECTED" ? "border-black bg-black text-white" : "border-black/10 bg-white hover:bg-gray-50"
                      )}
                    >
                      Select Retailers
                    </button>
                  </div>
                  <div className="mt-2 text-[11px] font-bold text-black/50">
                    {transferMode === "ALL"
                      ? "One click: move all retailers from source FO to target FO."
                      : "Choose specific retailers to transfer."}
                  </div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-gray-50 p-3">
                  <div className="text-[11px] font-black text-black/60">Reason</div>
                  <input
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-black"
                    placeholder="Reason (e.g. FO left / absent)"
                  />
                  <div className="mt-2 text-[11px] font-bold text-black/50">Saved in history for future rollback.</div>
                </div>

                <div className="rounded-2xl border border-black/10 bg-gray-50 p-3">
                  <div className="text-[11px] font-black text-black/60">Note (optional)</div>
                  <input
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    className="mt-2 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-black"
                    placeholder="Any note"
                  />
                  <div className="mt-2 text-[11px] font-bold text-black/50">Useful to identify batch later.</div>
                </div>
              </div>

              {/* Source list (only if selected mode or to preview source) */}
              <div className="mt-3 rounded-2xl border border-black/10 bg-white p-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm font-black">Source FO Assigned Retailers</div>
                  <div className="flex items-center gap-2">
                    <input
                      value={sq}
                      onChange={(e) => setSq(e.target.value)}
                      placeholder="Search source retailers..."
                      className="w-full md:w-72 rounded-xl border border-black/10 px-3 py-2 text-sm font-bold outline-none focus:border-black"
                      disabled={!fromFoUserId}
                    />
                    <button
                      onClick={loadSourceAssigned}
                      className="rounded-xl border border-black bg-black px-3 py-2 text-sm font-black text-white hover:opacity-90"
                      disabled={!fromFoUserId || sourceLoading}
                    >
                      {sourceLoading ? "Loading..." : "Load"}
                    </button>
                    <button
                      onClick={() => {
                        resetTransferUI();
                        setToast("Transfer reset");
                      }}
                      className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-black hover:bg-gray-50"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {!fromFoUserId ? (
                  <div className="mt-2 rounded-xl border border-black/10 bg-gray-50 p-3 text-sm font-bold">
                    Select a source FO to load its assigned retailers.
                  </div>
                ) : sourceLoading ? (
                  <div className="mt-2 rounded-xl border border-black/10 bg-gray-50 p-3 text-sm font-bold">Loading...</div>
                ) : sourceAssigned.length ? (
                  <>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <div className="rounded-xl border border-black/10 bg-gray-50 px-3 py-2 text-xs font-black">
                        Source retailers: {sourceAssigned.length}
                      </div>
                      <div className="rounded-xl border border-black/10 bg-gray-50 px-3 py-2 text-xs font-black">
                        Picked: {pickedCount}
                      </div>

                      {transferMode === "SELECTED" ? (
                        <>
                          <button
                            onClick={() => togglePickAll(true)}
                            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black hover:bg-gray-50"
                          >
                            Pick All
                          </button>
                          <button
                            onClick={() => togglePickAll(false)}
                            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black hover:bg-gray-50"
                          >
                            Clear
                          </button>
                        </>
                      ) : null}

                      <button
                        onClick={doTransfer}
                        disabled={!fromFoUserId || (transferMode === "SELECTED" && pickedCount === 0)}
                        className={clsx(
                          "ml-auto rounded-xl border px-4 py-2 text-sm font-black",
                          !fromFoUserId || (transferMode === "SELECTED" && pickedCount === 0)
                            ? "border-black/10 bg-gray-100 text-black/40"
                            : "border-black bg-black text-white hover:opacity-90"
                        )}
                      >
                        {transferMode === "ALL" ? "Transfer ALL to this FO" : `Transfer Selected (${pickedCount})`}
                      </button>
                    </div>

                    <div className="mt-2 space-y-2">
                      {sourceAssigned.map((row) => {
                        const r = row.retailer;
                        const checked = !!pick[row.retailerId];

                        return (
                          <div
                            key={row.mapId}
                            className={clsx(
                              "rounded-2xl border p-3",
                              transferMode === "SELECTED" && checked ? "border-black bg-gray-50" : "border-black/10 bg-white hover:bg-gray-50"
                            )}
                          >
                            <div className="flex items-start gap-3">
                              {transferMode === "SELECTED" ? (
                                <input
                                  type="checkbox"
                                  className="mt-1 h-4 w-4"
                                  checked={checked}
                                  onChange={(e) => setPick((p) => ({ ...p, [row.retailerId]: e.target.checked }))}
                                />
                              ) : (
                                <div className="mt-1 h-4 w-4" />
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="truncate text-base font-extrabold">{r?.name || "-"}</div>
                                  <Badge text={r?.status || "-"} />
                                </div>

                                <div className="mt-1 flex flex-wrap gap-2">
                                  <InfoChip>{r?.phone ? `📞 ${r.phone}` : "📞 -"}</InfoChip>
                                  <InfoChip>{r?.city ? `📍 ${r.city}` : "📍 -"}</InfoChip>
                                  <InfoChip>🗓️ Assigned: {fmtDate(row.assignedAt)}</InfoChip>
                                  <InfoChip>Due: ₹ {inr(n(row.due))}</InfoChip>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="mt-2 rounded-xl border border-black/10 bg-gray-50 p-3 text-sm font-bold">
                    No assigned retailers found for source FO.
                  </div>
                )}
              </div>

              {/* Recent transfer history + rollback */}
              <div className="mt-3 rounded-2xl border border-black/10 bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-black">Recent Transfers (Return / Rollback)</div>
                  <button
                    onClick={loadTransferHistory}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black hover:bg-gray-50"
                    disabled={historyLoading}
                  >
                    {historyLoading ? "Loading..." : "Refresh"}
                  </button>
                </div>

                {history.length ? (
                  <div className="mt-2 space-y-2">
                    {history.map((h) => (
                      <div key={h.id} className="rounded-2xl border border-black/10 bg-white p-3">
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <div className="text-sm font-black truncate">
                              {(h.fromFo?.name || h.fromFo?.phone || h.fromFo?.id || "—") + " → " + (h.toFo?.name || h.toFo?.phone || h.toFo?.id || "—")}
                            </div>
                            <div className="mt-0.5 text-[11px] font-bold text-black/60">
                              Batch: {h.id} • {h.status} • Mode: {h.mode} • Transferred: {h.transferred} • {fmtDateTime(h.createdAt)}
                            </div>
                            {h.reason ? <div className="mt-1 text-[11px] font-bold text-black/50">Reason: {h.reason}</div> : null}
                            {h.note ? <div className="mt-0.5 text-[11px] font-bold text-black/50">Note: {h.note}</div> : null}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => rollback(h.id)}
                              disabled={h.status === "ROLLED_BACK"}
                              className={clsx(
                                "rounded-xl border px-3 py-2 text-xs font-black",
                                h.status === "ROLLED_BACK"
                                  ? "border-black/10 bg-gray-100 text-black/40"
                                  : "border-black bg-black text-white hover:opacity-90"
                              )}
                              title="If FO returns, rollback this batch"
                            >
                              Return (Rollback)
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 rounded-xl border border-black/10 bg-gray-50 p-3 text-sm font-bold">No transfer history</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}