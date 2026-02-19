"use client";

import React, { useEffect, useMemo, useState, use } from "react";

type Line = {
  id: string;
  productName: string;
  batchNo: string | null;
  mfgDate: string | null;
  expDate: string | null;
  systemQty: number;
  physicalQty: number | null;
  diffQty: number | null;
  mismatchType: "SHORT" | "EXCESS" | "MATCH";
  reason: string | null;
  rootCause: string | null;
  remarks: string | null;
  needsInvestigation: boolean;
  isRepeatIssue: boolean;
};

type Audit = {
  id: string;
  monthKey: string;
  status: string;
  snapshotAt: string;
  totalSystemQty: number;
  totalPhysicalQty: number;
  totalVarianceQty: number;
  lines: Line[];
};

function fmtDate(v: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
}

const REASONS = [
  "DAMAGE",
  "EXPIRED_DISPOSAL",
  "SPILLAGE",
  "THEFT_LOSS",
  "MIS_PICK_MIS_ISSUE",
  "SUPPLIER_SHORT",
  "RETURN_PENDING",
  "DATA_ENTRY_ERROR",
  "OTHER",
];

const ROOT = ["PROCESS", "DATA", "HANDLING", "SUPPLIER", "OTHER"];

function asNonNegInt(v: any): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const x = Math.trunc(n);
  if (x < 0) return null;
  return x;
}

export default function AuditEntryPage({
  params,
}: {
  params: Promise<{ auditId: string }>;
}) {
  const { auditId } = use(params); // ✅ Next.js 16 params Promise unwrap

  const [audit, setAudit] = useState<Audit | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const [q, setQ] = useState("");
  const [onlyMismatch, setOnlyMismatch] = useState(false);
  const [onlyPending, setOnlyPending] = useState(false);

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(`/api/warehouse/audits/${auditId}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed to load audit");
      setAudit(data.audit);
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!auditId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auditId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const rows = audit?.lines || [];
    return rows.filter((r) => {
      if (s) {
        const a = r.productName.toLowerCase();
        const b = (r.batchNo || "").toLowerCase();
        if (!a.includes(s) && !b.includes(s)) return false;
      }
      if (onlyMismatch && r.mismatchType === "MATCH") return false;
      if (onlyPending && r.physicalQty === null) return false;
      return true;
    });
  }, [audit, q, onlyMismatch, onlyPending]);

  // Local edit buffer (only changed lines go to API)
  const [edits, setEdits] = useState<
    Record<string, { physicalQty?: number | null; reason?: string | null; rootCause?: string | null; remarks?: string | null }>
  >({});

  function setLineEdit(
    lineId: string,
    patch: { physicalQty?: number | null; reason?: string | null; rootCause?: string | null; remarks?: string | null }
  ) {
    setEdits((prev) => ({ ...prev, [lineId]: { ...(prev[lineId] || {}), ...patch } }));
  }

  const changedCount = useMemo(() => Object.keys(edits).length, [edits]);

  async function saveAll() {
    if (audit?.status === "APPROVED") {
      setMsg("Approved audit locked.");
      return;
    }

    setSaving(true);
    setMsg("");
    try {
      const items = Object.entries(edits).map(([lineId, v]) => ({
        lineId,
        physicalQty: v.physicalQty,
        reason: v.reason,
        rootCause: v.rootCause,
        remarks: v.remarks,
      }));

      if (!items.length) {
        setMsg("No changes to save.");
        return;
      }

      const res = await fetch(`/api/warehouse/audits/${auditId}/lines`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Save failed");

      setEdits({});
      await load();
      setMsg("Saved ✅");
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  function exportCSV() {
    window.location.href = `/api/warehouse/audits/${auditId}/export`;
  }

  async function submitAudit() {
    if (audit?.status === "APPROVED") {
      setMsg("Approved audit locked.");
      return;
    }
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/warehouse/audits/${auditId}/submit`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Submit failed");
      await load();
      setMsg("Submitted ✅ (Admin approval pending)");
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  async function approveAudit() {
    // show button only if admin in UI? (keeping it simple; API guards ADMIN)
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch(`/api/warehouse/audits/${auditId}/approve`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Approve failed");
      await load();
      setMsg(`Approved ✅ Adjustments applied: ${data.applied ?? 0}`);
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setSaving(false);
    }
  }

  const headerInfo = useMemo(() => {
    if (!audit) return null;
    return {
      monthKey: audit.monthKey,
      status: audit.status,
      snapshotAt: fmtDate(audit.snapshotAt || null),
      sys: audit.totalSystemQty ?? 0,
      phy: audit.totalPhysicalQty ?? 0,
      var: audit.totalVarianceQty ?? 0,
    };
  }, [audit]);

  return (
    <div className="p-3 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Audit Entry</h1>
            <div className="text-sm text-gray-600">
              Audit: <b>{headerInfo?.monthKey ?? "—"}</b> • Status: <b>{headerInfo?.status ?? "—"}</b> • Snapshot:{" "}
              {headerInfo?.snapshotAt ?? "—"}
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Rule: mismatch (diff ≠ 0) → <b>Reason + Remarks mandatory</b>. Approved audit locked.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={exportCSV}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium ring-1 ring-gray-200 hover:bg-gray-50"
            >
              Export CSV (Print)
            </button>

            <button
              onClick={saveAll}
              disabled={saving || audit?.status === "APPROVED" || changedCount === 0}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Saving..." : changedCount ? `Save (${changedCount})` : "Save"}
            </button>

            <button
              onClick={submitAudit}
              disabled={saving || audit?.status === "APPROVED"}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Submit
            </button>

            <button
              onClick={approveAudit}
              disabled={saving || audit?.status !== "SUBMITTED"}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              title="Admin only (API will block non-admin)"
            >
              Approve
            </button>
          </div>
        </div>

        {msg ? (
          <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700 ring-1 ring-gray-200">{msg}</div>
        ) : null}

        {/* KPI cards */}
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-white p-3 ring-1 ring-gray-200">
            <div className="text-xs text-gray-600">System Qty</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{headerInfo?.sys ?? 0}</div>
          </div>
          <div className="rounded-2xl bg-white p-3 ring-1 ring-gray-200">
            <div className="text-xs text-gray-600">Physical Qty</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{headerInfo?.phy ?? 0}</div>
          </div>
          <div className="rounded-2xl bg-white p-3 ring-1 ring-gray-200">
            <div className="text-xs text-gray-600">Variance (Physical - System)</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{headerInfo?.var ?? 0}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 rounded-2xl bg-white ring-1 ring-gray-200">
          <div className="border-b border-gray-100 p-3 sm:p-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-12 sm:gap-3">
              <div className="sm:col-span-5">
                <label className="text-xs text-gray-600">Search</label>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Product / Batch search..."
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>

              <div className="sm:col-span-4 flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={onlyMismatch}
                    onChange={(e) => setOnlyMismatch(e.target.checked)}
                  />
                  Only mismatch
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={onlyPending}
                    onChange={(e) => setOnlyPending(e.target.checked)}
                  />
                  Only filled
                </label>
              </div>

              <div className="sm:col-span-3 flex items-end justify-end text-xs text-gray-600">
                {loading ? "Loading..." : (
                  <>
                    Showing <b>{filtered.length}</b> lines
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="p-3 sm:p-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-600">
                <tr className="border-b border-gray-100">
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">Batch</th>
                  <th className="py-2 pr-3 text-right">System</th>
                  <th className="py-2 pr-3 text-right">Physical</th>
                  <th className="py-2 pr-3 text-right">Diff</th>
                  <th className="py-2 pr-3">Reason</th>
                  <th className="py-2 pr-3">Root</th>
                  <th className="py-2 pr-3">Remarks</th>
                  <th className="py-2 pr-3">Flags</th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((l) => {
                  const e = edits[l.id] || {};

                  const physicalVal =
                    e.physicalQty !== undefined ? e.physicalQty : l.physicalQty;

                  const diff =
                    physicalVal === null || physicalVal === undefined
                      ? null
                      : Number(physicalVal) - Number(l.systemQty || 0);

                  const mismatch = diff !== null && diff !== 0;

                  const reasonVal = e.reason !== undefined ? e.reason : l.reason;
                  const rootVal = e.rootCause !== undefined ? e.rootCause : l.rootCause;
                  const remarksVal = e.remarks !== undefined ? e.remarks : l.remarks;

                  const locked = audit?.status === "APPROVED";

                  return (
                    <tr key={l.id} className="border-b border-gray-50 align-top">
                      <td className="py-3 pr-3 font-medium">{l.productName}</td>
                      <td className="py-3 pr-3">{l.batchNo || "—"}</td>
                      <td className="py-3 pr-3 text-right tabular-nums">{l.systemQty}</td>

                      <td className="py-3 pr-3 text-right">
                        <input
                          type="number"
                          min={0}
                          value={physicalVal ?? ""}
                          onChange={(ev) => {
                            const v = ev.target.value;
                            if (v === "") {
                              setLineEdit(l.id, { physicalQty: null });
                              return;
                            }
                            const n = asNonNegInt(v);
                            if (n === null) return;
                            setLineEdit(l.id, { physicalQty: n });
                          }}
                          className="w-24 rounded-lg border border-gray-200 px-2 py-1 text-right tabular-nums outline-none focus:ring-2 focus:ring-black/10"
                          disabled={locked}
                        />
                      </td>

                      <td className="py-3 pr-3 text-right tabular-nums">
                        {diff === null ? "—" : diff}
                        {diff !== null && diff !== 0 ? (
                          <div className="text-[11px] text-gray-500">
                            {diff < 0 ? "SHORT" : "EXCESS"}
                          </div>
                        ) : null}
                      </td>

                      <td className="py-3 pr-3">
                        <select
                          value={(reasonVal ?? "") as any}
                          onChange={(ev) => setLineEdit(l.id, { reason: ev.target.value || null })}
                          className="w-48 rounded-lg border border-gray-200 px-2 py-1 outline-none focus:ring-2 focus:ring-black/10"
                          disabled={locked}
                        >
                          <option value="">—</option>
                          {REASONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        {mismatch ? (
                          <div className="text-[11px] text-gray-500">Required</div>
                        ) : null}
                      </td>

                      <td className="py-3 pr-3">
                        <select
                          value={(rootVal ?? "") as any}
                          onChange={(ev) => setLineEdit(l.id, { rootCause: ev.target.value || null })}
                          className="w-32 rounded-lg border border-gray-200 px-2 py-1 outline-none focus:ring-2 focus:ring-black/10"
                          disabled={locked}
                        >
                          <option value="">—</option>
                          {ROOT.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>

                      <td className="py-3 pr-3">
                        <input
                          value={(remarksVal ?? "") as any}
                          onChange={(ev) => setLineEdit(l.id, { remarks: ev.target.value })}
                          className="w-64 rounded-lg border border-gray-200 px-2 py-1 outline-none focus:ring-2 focus:ring-black/10"
                          placeholder={mismatch ? "Mandatory remarks..." : "Optional"}
                          disabled={locked}
                        />
                      </td>

                      <td className="py-3 pr-3">
                        <div className="flex flex-col gap-1">
                          {l.needsInvestigation ? (
                            <span className="inline-flex w-fit rounded-full bg-orange-50 px-2 py-0.5 text-xs text-orange-700 ring-1 ring-orange-200">
                              INVESTIGATE
                            </span>
                          ) : null}
                          {l.isRepeatIssue ? (
                            <span className="inline-flex w-fit rounded-full bg-purple-50 px-2 py-0.5 text-xs text-purple-700 ring-1 ring-purple-200">
                              REPEAT
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!filtered.length && !loading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-gray-500">
                      No lines found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            <div className="mt-3 text-xs text-gray-500">
              Tip: Excel print ke baad count karke yahan physical qty fill karein. Mismatch par reason + remarks zaroor likhein.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
