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
};

type RetailerLite = { id: string; name: string; phone: string | null; city: string | null; status: string | null };
type FoLite = { id: string; name: string; phone: string | null; distributorId: string | null };

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

function uniqStrings(arr: any): string[] {
  if (!Array.isArray(arr)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of arr) {
    const s = String(v ?? "").trim();
    if (!s) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
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

  // ----------------------------
  // Transfer / Pool (FO -> FO or FO -> POOL)
  // ----------------------------
  const [foOptions, setFoOptions] = useState<FoLite[]>([]);
  const [sourceFoId, setSourceFoId] = useState<string>("");
  const [transferMode, setTransferMode] = useState<"ALL" | "SELECTED">("ALL");
  const [sourceRetailers, setSourceRetailers] = useState<RetailerLite[]>([]);
  const [srq, setSrq] = useState("");
  const [sourceSelected, setSourceSelected] = useState<Record<string, boolean>>({});

  const sourceSelectedIds = useMemo(
    () => Object.keys(sourceSelected).filter((id) => sourceSelected[id]),
    [sourceSelected]
  );
  const sourceSelectedCount = sourceSelectedIds.length;

  async function safeJson(res: Response) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  async function loadFOList() {
    if (!distributorId) {
      setFoOptions([]);
      return;
    }

    try {
      const url = `/api/sales-manager/field-officers/retailers/list?distributorId=` + encodeURIComponent(distributorId);
      const res = await fetch(url, { cache: "no-store" });
      const data = await safeJson(res);

      if (!res.ok || !data?.ok) {
        setFoOptions([]);
        return;
      }

      const rows: FoLite[] = Array.isArray(data.fieldOfficers) ? data.fieldOfficers : [];
      // exclude target fo from source dropdown
      setFoOptions(rows.filter((x) => x.id !== foUserId));
    } catch {
      setFoOptions([]);
    }
  }

  async function loadSourceRetailers() {
    if (!sourceFoId) {
      setSourceRetailers([]);
      setSourceSelected({});
      return;
    }
    setLoading(true);
    setToast("");
    try {
      const url =
        `/api/sales-manager/field-officers/retailers/assigned?foUserId=` +
        encodeURIComponent(sourceFoId) +
        `&q=` +
        encodeURIComponent(srq) +
        `&take=500`;

      const res = await fetch(url, { cache: "no-store" });
      const data = await safeJson(res);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed");

      const rows = Array.isArray(data.rows) ? data.rows : [];
      const lite: RetailerLite[] = rows
        .map((r: any) => r?.retailer)
        .filter(Boolean)
        .map((r: any) => ({
          id: String(r.id),
          name: String(r.name || "-"),
          phone: r.phone ? String(r.phone) : null,
          city: r.city ? String(r.city) : null,
          status: r.status ? String(r.status) : null,
        }));

      setSourceRetailers(lite);

      // keep selections that still exist
      setSourceSelected((prev) => {
        const keep: Record<string, boolean> = {};
        const set = new Set(lite.map((r) => r.id));
        for (const k of Object.keys(prev)) if (set.has(k)) keep[k] = prev[k];
        return keep;
      });
    } catch (e: any) {
      setSourceRetailers([]);
      setSourceSelected({});
      setToast(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function doTransferToFo() {
    if (!sourceFoId) return setToast("Select Source FO first");
    if (transferMode === "SELECTED" && !sourceSelectedIds.length) return setToast("Select retailers first");
    if (sourceFoId === foUserId) return setToast("Source and Target FO cannot be same");

    setLoading(true);
    setToast("");
    try {
      const body: any = {
        fromFoUserId: sourceFoId,
        toFoUserId: foUserId,
        mode: transferMode,
      };
      if (transferMode === "SELECTED") body.retailerIds = uniqStrings(sourceSelectedIds);

      const res = await fetch("/api/sales-manager/field-officers/retailers/transfer", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await safeJson(res);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Transfer failed");

      const moved = Number(data.transferred ?? data.transferredCount ?? data.updated ?? 0) || 0;
      setToast(`✅ Transferred to FO: ${moved}`);
      setSourceSelected({});
      await loadAssigned();
      await loadSourceRetailers(); // refresh source list after transfer
    } catch (e: any) {
      setToast(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  async function doMoveToPool(mode: "ALL" | "SELECTED") {
    if (!sourceFoId) return setToast("Select Source FO first");
    if (mode === "SELECTED" && !sourceSelectedIds.length) return setToast("Select retailers first");

    setLoading(true);
    setToast("");
    try {
      const body: any = {
        fromFoUserId: sourceFoId,
        mode,
      };
      if (mode === "SELECTED") body.retailerIds = uniqStrings(sourceSelectedIds);

      const res = await fetch("/api/sales-manager/field-officers/retailers/move-to-pool", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await safeJson(res);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Move to pool failed");

      const moved = Number(data.movedCount ?? data.moved ?? data.updated ?? 0) || 0;
      setToast(`✅ Moved to POOL: ${moved}`);
      setSourceSelected({});
      await loadAssigned();
      await loadSourceRetailers();
      if (tab === "UNASSIGNED") await loadUnassigned(); // pool affects unassigned list
    } catch (e: any) {
      setToast(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  function toggleAllSource(on: boolean) {
    const next: Record<string, boolean> = {};
    for (const r of sourceRetailers) next[r.id] = on;
    setSourceSelected(next);
  }

  // ----------------------------
  // Existing assign/unassign
  // ----------------------------
  async function loadAssigned() {
    setLoading(true);
    setToast("");
    try {
      const url = `/api/sales-manager/field-officers/retailers/assigned?foUserId=${encodeURIComponent(
        foUserId
      )}&q=${encodeURIComponent(aq)}&take=500`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await safeJson(res);
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
      const data = await safeJson(res);
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

  useEffect(() => {
    loadAssigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foUserId]);

  useEffect(() => {
    if (tab === "ASSIGNED") loadAssigned();
    else loadUnassigned();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, distributorId]);

  useEffect(() => {
    loadFOList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distributorId, foUserId]);

  useEffect(() => {
    loadSourceRetailers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceFoId]);

  async function doUnassign(mapId: string) {
    if (!mapId) return;
    setLoading(true);
    setToast("");
    try {
      const res = await fetch("/api/sales-manager/field-officers/retailers/unassign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mapId }),
      });
      const data = await safeJson(res);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Unassign failed");
      setToast("✅ Unassigned");
      await loadAssigned();
      if (tab === "UNASSIGNED") await loadUnassigned();
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
        body: JSON.stringify({ foUserId, retailerIds: uniqStrings(selectedIds) }),
      });
      const data = await safeJson(res);
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
          <div className="text-xs font-bold text-black/60">Distributor: {distributorName || distributorId || "—"}</div>
        </div>

        {toast ? (
          <div className="mt-2 rounded-xl border border-black/10 bg-gray-50 p-2 text-sm font-bold">{toast}</div>
        ) : null}
      </div>

      {/* ---------------- Transfer / Pool UI ---------------- */}
      <div className="px-3 pt-3">
        <div className="rounded-2xl border border-black/10 bg-gray-50 p-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-sm font-black">Transfer / Pool Retailers (FO → FO / POOL)</div>
            <div className="text-xs font-bold text-black/60">
              Target FO: <span className="font-mono">{foUserId}</span>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <div className="text-xs font-black text-black/70">Source FO (who left)</div>
              <select
                value={sourceFoId}
                onChange={(e) => {
                  setSourceFoId(e.target.value);
                  setSourceSelected({});
                }}
                className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold"
              >
                <option value="">Select FO...</option>
                {foOptions.map((fo) => (
                  <option key={fo.id} value={fo.id}>
                    {fo.name} {fo.phone ? `(${fo.phone})` : ""}
                  </option>
                ))}
              </select>

              <div className="mt-1 text-[11px] font-bold text-black/50">
                Note: Transfer/Pool works within same distributor only.
              </div>
            </div>

            <div className="md:col-span-1">
              <div className="text-xs font-black text-black/70">Mode</div>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTransferMode("ALL")}
                  className={clsx(
                    "rounded-xl border px-3 py-2 text-sm font-black",
                    transferMode === "ALL"
                      ? "border-black bg-black text-white"
                      : "border-black/10 bg-white hover:bg-gray-100"
                  )}
                >
                  ALL
                </button>
                <button
                  onClick={() => setTransferMode("SELECTED")}
                  className={clsx(
                    "rounded-xl border px-3 py-2 text-sm font-black",
                    transferMode === "SELECTED"
                      ? "border-black bg-black text-white"
                      : "border-black/10 bg-white hover:bg-gray-100"
                  )}
                >
                  SELECTED
                </button>
              </div>

              <div className="mt-1 text-[11px] font-bold text-black/50">
                Tip: If replacement FO not ready, move to POOL (unassigned) first.
              </div>
            </div>

            <div className="md:col-span-1">
              <div className="text-xs font-black text-black/70">Actions</div>

              <div className="mt-1 grid grid-cols-1 gap-2">
                <button
                  disabled={!sourceFoId || (transferMode === "SELECTED" && !sourceSelectedCount)}
                  onClick={doTransferToFo}
                  className={clsx(
                    "w-full rounded-xl border px-4 py-2 text-sm font-black",
                    sourceFoId && (transferMode === "ALL" || sourceSelectedCount)
                      ? "border-black bg-white hover:bg-gray-100"
                      : "border-black/10 bg-gray-100 text-black/40"
                  )}
                >
                  Transfer to this FO
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={!sourceFoId}
                    onClick={() => doMoveToPool("ALL")}
                    className={clsx(
                      "rounded-xl border px-3 py-2 text-xs font-black",
                      sourceFoId ? "border-black/10 bg-white hover:bg-gray-100" : "border-black/10 bg-gray-100 text-black/40"
                    )}
                  >
                    Move ALL to POOL
                  </button>
                  <button
                    disabled={!sourceFoId || !sourceSelectedCount}
                    onClick={() => doMoveToPool("SELECTED")}
                    className={clsx(
                      "rounded-xl border px-3 py-2 text-xs font-black",
                      sourceFoId && sourceSelectedCount
                        ? "border-black/10 bg-white hover:bg-gray-100"
                        : "border-black/10 bg-gray-100 text-black/40"
                    )}
                  >
                    Move Selected to POOL
                  </button>
                </div>

                <div className="text-[11px] font-bold text-black/50">
                  POOL means unassigned under distributor (can be reassigned anytime).
                </div>
              </div>

              {transferMode === "SELECTED" ? (
                <div className="mt-1 text-[11px] font-bold text-black/50">Selected from source: {sourceSelectedCount}</div>
              ) : (
                <div className="mt-1 text-[11px] font-bold text-black/50">Uses ALL assigned retailers of source FO.</div>
              )}
            </div>
          </div>

          {transferMode === "SELECTED" ? (
            <div className="mt-3 rounded-2xl border border-black/10 bg-white p-3">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="text-sm font-black">Select retailers from Source FO</div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => toggleAllSource(true)}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black hover:bg-gray-50"
                  >
                    Select All
                  </button>
                  <button
                    onClick={() => toggleAllSource(false)}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black hover:bg-gray-50"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <div className="mt-2 flex gap-2">
                <input
                  value={srq}
                  onChange={(e) => setSrq(e.target.value)}
                  placeholder="Search source retailers..."
                  className="w-full rounded-xl border border-black/10 px-3 py-2 text-sm font-bold outline-none focus:border-black"
                />
                <button
                  onClick={loadSourceRetailers}
                  className="rounded-xl border border-black bg-black px-4 py-2 text-sm font-black text-white hover:opacity-90"
                >
                  Search
                </button>
              </div>

              <div className="mt-3 max-h-[260px] overflow-y-auto space-y-2">
                {!sourceFoId ? (
                  <div className="rounded-xl border border-black/10 bg-gray-50 p-3 text-sm font-bold text-black/60">
                    Select a Source FO to load retailers.
                  </div>
                ) : loading ? (
                  <div className="rounded-xl border border-black/10 bg-gray-50 p-3 text-sm font-bold text-black/60">
                    Loading...
                  </div>
                ) : sourceRetailers.length ? (
                  sourceRetailers.map((r) => {
                    const checked = !!sourceSelected[r.id];
                    return (
                      <label
                        key={r.id}
                        className={clsx(
                          "flex cursor-pointer items-start gap-3 rounded-2xl border p-3",
                          checked ? "border-black bg-gray-50" : "border-black/10 bg-white hover:bg-gray-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setSourceSelected((p) => ({ ...p, [r.id]: e.target.checked }))}
                          className="mt-1 h-4 w-4"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate text-sm font-extrabold">{r.name || "-"}</div>
                            <Badge text={r.status || "-"} />
                          </div>
                          <div className="mt-0.5 text-[11px] font-bold text-black/60">
                            {r.phone ? `📞 ${r.phone}` : ""}
                            {r.city ? ` • ${r.city}` : ""}
                          </div>
                        </div>
                      </label>
                    );
                  })
                ) : (
                  <div className="rounded-xl border border-black/10 bg-gray-50 p-3 text-sm font-bold text-black/60">
                    No retailers found for this Source FO.
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ---------------- Existing Assign/Unassign UI ---------------- */}
      <div className="border-b border-black/10 p-3">
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
            <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black">Selected: {selectedCount}</div>
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
                        <div className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-black">
                          Due: ₹ {inr(n(row.due))}
                        </div>
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
          <div className="rounded-xl border border-black/10 bg-gray-50 p-4 text-sm font-bold">No unassigned retailers</div>
        )}
      </div>
    </div>
  );
}