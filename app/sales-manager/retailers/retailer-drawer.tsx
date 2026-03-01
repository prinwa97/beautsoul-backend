// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/sales-manager/retailers/retailer-drawer.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import ModalShell from "./modal-shell";

type Mode = "TODAY" | "MONTH" | "YEAR" | "CUSTOM";

/** -------------------------
 *  TYPES
 *  ------------------------- */
type RetailerDetail = {
  id: string;
  name: string;
  ownerName?: string | null;
  address?: string | null;
  city?: string | null;
  phone?: string | null;

  distributorName?: string | null;
  foName?: string | null;
};

type RetailerDetailResp = {
  ok: boolean;
  error?: string;
  message?: string;
  retailer?: RetailerDetail | null;
};

type CombinedRow = {
  productId?: string;
  productName: string;
  purchasedQty: number;
  soldQty: number;
  physicalQty: number;
  lastPurchaseAt?: string | Date | null;
  lastSoldAt?: string | Date | null;
  lastAuditAt?: string | Date | null;
  lastBatchNo?: string | null;
  lastExpiryDate?: string | Date | null;
};

type CombinedResp = {
  ok: boolean;
  error?: string;
  message?: string;
  mode?: Mode;
  range?: { from: string; to: string };
  rows?: CombinedRow[];
};

type AuditItem = {
  id: string;
  productName: string;
  batchNo?: string | null;
  expiryDate?: string | Date | null;
  systemQty?: number;
  physicalQty?: number;
  variance?: number;
};

type AuditResp = {
  ok: boolean;
  error?: string;
  message?: string;
  detail?: string;
  audit?: { id: string; createdAt?: string | Date | null } | null;
  items?: AuditItem[];
};

/** -------------------------
 *  HELPERS
 *  ------------------------- */
function fmtDateTime(s: any) {
  if (!s) return "—";
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("en-IN");
}
function dtShort(s: any) {
  if (!s) return "—";
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN");
}
function clean(s: any) {
  const x = String(s ?? "").trim();
  return x.length ? x : "";
}
function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function pct(num: number, den: number) {
  const d = den <= 0 ? 0 : den;
  if (!d) return 0;
  return Math.round((num / d) * 100);
}

function statusForRow(r: CombinedRow) {
  const purchased = n(r.purchasedQty);
  const sold = n(r.soldQty);
  const phys = n(r.physicalQty);

  if (purchased > 0 && phys === 0 && sold > 0) return { label: "REORDER", tone: "red" as const };
  if (purchased > 0 && sold >= purchased * 0.8 && phys <= 3) return { label: "FAST", tone: "green" as const };
  if (purchased > 0 && sold <= purchased * 0.3 && phys >= Math.max(5, Math.ceil(purchased * 0.5)))
    return { label: "SLOW", tone: "amber" as const };
  if (purchased === 0 && sold === 0 && phys > 0) return { label: "AUDIT ONLY", tone: "gray" as const };
  return { label: "HEALTHY", tone: "blue" as const };
}

function toneCls(tone: "red" | "green" | "amber" | "blue" | "gray") {
  switch (tone) {
    case "red":
      return "bg-red-50 border-red-200 text-red-700";
    case "green":
      return "bg-green-50 border-green-200 text-green-700";
    case "amber":
      return "bg-amber-50 border-amber-200 text-amber-800";
    case "blue":
      return "bg-blue-50 border-blue-200 text-blue-800";
    default:
      return "bg-gray-50 border-gray-200 text-gray-700";
  }
}

/** -------------------------
 *  COMPONENT
 *  ------------------------- */
export default function RetailerDrawer({
  retailerId,
  open,
  onClose,
  mode = "TODAY",
  from,
  to,
}: {
  retailerId: string;
  open: boolean;
  onClose: () => void;
  mode?: Mode;

  /** ✅ IMPORTANT: page ka range drawer ko mile */
  from?: string;
  to?: string;
}) {
  // Retailer detail
  const [retLoading, setRetLoading] = useState(false);
  const [retErr, setRetErr] = useState("");
  const [retailer, setRetailer] = useState<RetailerDetail | null>(null);

  // Combined products
  const [rowsLoading, setRowsLoading] = useState(false);
  const [rowsErr, setRowsErr] = useState("");
  const [rowsData, setRowsData] = useState<CombinedResp | null>(null);

  // Audit modal
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditErr, setAuditErr] = useState<string>("");
  const [auditData, setAuditData] = useState<AuditResp | null>(null);
  const [auditProductName, setAuditProductName] = useState<string>("");
  const auditBodyRef = useRef<HTMLDivElement>(null);

  // Abort controllers
  const retAbortRef = useRef<AbortController | null>(null);
  const rowsAbortRef = useRef<AbortController | null>(null);
  const auditAbortRef = useRef<AbortController | null>(null);

  // Fetch when opens
  useEffect(() => {
    if (!open) return;
    if (!retailerId) return;

    setRetErr("");
    setRetailer(null);
    setRetLoading(true);

    setRowsErr("");
    setRowsData(null);
    setRowsLoading(true);

    retAbortRef.current?.abort();
    rowsAbortRef.current?.abort();

    const retCtrl = new AbortController();
    const rowsCtrl = new AbortController();
    retAbortRef.current = retCtrl;
    rowsAbortRef.current = rowsCtrl;

    (async () => {
      try {
        const url = `/api/sales-manager/retailers/${encodeURIComponent(retailerId)}/detail`;
        const res = await fetch(url, { cache: "no-store", signal: retCtrl.signal });
        const j = (await res.json().catch(() => null)) as RetailerDetailResp | null;

        if (!res.ok || !j?.ok) {
          const msg = j?.error || `HTTP_${res.status}`;
          setRetErr(msg);
          setRetailer({ id: retailerId, name: retailerId });
          return;
        }
        setRetailer(j.retailer || { id: retailerId, name: retailerId });
      } catch (e: any) {
        const msg = String(e?.name === "AbortError" ? "" : e?.message || e);
        if (msg) setRetErr(msg);
        setRetailer({ id: retailerId, name: retailerId });
      } finally {
        setRetLoading(false);
      }
    })();

    (async () => {
      try {
        // ✅ pass mode + from/to (if available)
        const p = new URLSearchParams();
        p.set("mode", mode);
        if (from) p.set("from", from);
        if (to) p.set("to", to);

        const url = `/api/sales-manager/retailers/${encodeURIComponent(retailerId)}/products/combined?${p.toString()}`;
        const res = await fetch(url, { cache: "no-store", signal: rowsCtrl.signal });
        const j = (await res.json().catch(() => null)) as CombinedResp | null;

        if (!res.ok || !j?.ok) {
          const msg = j?.error || `HTTP_${res.status}`;
          setRowsErr(msg);
          setRowsData(j || { ok: false, error: msg });
          return;
        }
        setRowsData(j);
      } catch (e: any) {
        const msg = String(e?.name === "AbortError" ? "" : e?.message || e);
        if (msg) setRowsErr(msg);
        setRowsData({ ok: false, error: msg || "NETWORK_ERROR" });
      } finally {
        setRowsLoading(false);
      }
    })();

    return () => {
      retCtrl.abort();
      rowsCtrl.abort();
    };
  }, [open, retailerId, mode, from, to]);

  async function openAudit(productName: string) {
    if (!retailerId) return;

    auditAbortRef.current?.abort();
    const ctrl = new AbortController();
    auditAbortRef.current = ctrl;

    setAuditProductName(productName || "");
    setAuditOpen(true);
    setAuditLoading(true);
    setAuditErr("");
    setAuditData(null);

    try {
      const url =
        `/api/sales-manager/retailers/${encodeURIComponent(retailerId)}/audit/latest` +
        (productName ? `?productName=${encodeURIComponent(productName)}` : "");

      const res = await fetch(url, { cache: "no-store", signal: ctrl.signal });
      const j = (await res.json().catch(() => null)) as AuditResp | null;

      if (!res.ok || !j?.ok) {
        const msg = j?.error || `HTTP_${res.status}`;
        setAuditErr(msg);
        setAuditData(j || { ok: false, error: msg });
        return;
      }

      setAuditData(j);
    } catch (e: any) {
      const msg = String(e?.name === "AbortError" ? "" : e?.message || e);
      if (msg) {
        setAuditErr(msg);
        setAuditData({ ok: false, error: "NETWORK_ERROR", message: msg });
      }
    } finally {
      setAuditLoading(false);
    }
  }

  useEffect(() => {
    if (!auditOpen) return;
    auditBodyRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [auditOpen, retailerId, auditProductName]);

  const combinedRows = useMemo(() => {
    const r = rowsData?.rows || [];
    return [...r].sort((a, b) => n(b.soldQty) - n(a.soldQty) || n(b.purchasedQty) - n(a.purchasedQty));
  }, [rowsData]);

  const totals = useMemo(() => {
    const purchased = combinedRows.reduce((s, r) => s + n(r.purchasedQty), 0);
    const sold = combinedRows.reduce((s, r) => s + n(r.soldQty), 0);
    const physical = combinedRows.reduce((s, r) => s + n(r.physicalQty), 0);
    return { purchased, sold, physical };
  }, [combinedRows]);

  if (!open) return null;

  const rName = clean(retailer?.name) || retailerId;
  const owner = clean(retailer?.ownerName);
  const phone = clean(retailer?.phone);
  const addr = clean(retailer?.address);
  const city = clean(retailer?.city);
  const dist = clean(retailer?.distributorName);
  const fo = clean(retailer?.foName);

  return (
    <>
      {/* ✅ MAIN POPUP */}
      <ModalShell
        open={open}
        onClose={onClose}
        zIndex={140}
        widthClass="max-w-6xl"
        titleTop={
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-500">Retailer Detail</div>
            <div className="text-lg font-black text-gray-900 truncate">
              {rName}
              {owner ? <span className="text-gray-500"> ( {owner} )</span> : null}
            </div>

            <div className="mt-1 text-xs text-gray-600 flex flex-wrap gap-x-3 gap-y-1">
              <span>
                Mode: <b>{mode}</b>
              </span>
              {from || to ? (
                <span>
                  Range:{" "}
                  <b>
                    {from ? new Date(from).toLocaleDateString("en-IN") : "—"} →{" "}
                    {to ? new Date(to).toLocaleDateString("en-IN") : "—"}
                  </b>
                </span>
              ) : null}
              {city ? (
                <span>
                  City: <b>{city}</b>
                </span>
              ) : null}
              {phone ? (
                <span>
                  Phone: <b>{phone}</b>
                </span>
              ) : null}
            </div>

            {addr ? <div className="mt-2 text-xs text-gray-700">{addr}</div> : null}

            {dist || fo ? (
              <div className="mt-2 text-xs text-gray-700 flex flex-wrap gap-x-4 gap-y-1">
                {dist ? (
                  <span>
                    Distributor: <b>{dist}</b>
                  </span>
                ) : null}
                {fo ? (
                  <span>
                    FO: <b>{fo}</b>
                  </span>
                ) : null}
              </div>
            ) : null}

            {retLoading ? <div className="mt-2 text-xs text-gray-500">Loading retailer…</div> : null}
            {!retLoading && retErr ? (
              <div className="mt-2 text-xs text-red-700">
                Retailer detail error: <b>{retErr}</b>
              </div>
            ) : null}
          </div>
        }
      >
        {/* Body */}
        <div className="p-4 overflow-auto max-h-[78vh]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-black text-gray-900">Products (Purchased + Sold + Physical)</div>
              <div className="text-xs text-gray-600 mt-1">One table for quick comparison & decision boosting.</div>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-600">Totals</div>
              <div className="text-xs text-gray-800 mt-1 flex flex-col gap-0.5">
                <span>
                  Purchased: <b>{totals.purchased}</b>
                </span>
                <span>
                  Sold: <b>{totals.sold}</b>
                </span>
                <span>
                  Physical: <b>{totals.physical}</b>
                </span>
              </div>
            </div>
          </div>

          {rowsLoading ? <div className="mt-3 text-sm text-gray-600">Loading product table…</div> : null}

          {!rowsLoading && (rowsErr || (rowsData && !rowsData.ok)) ? (
            <div className="mt-3 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
              Product table error: <b>{rowsErr || rowsData?.error || "FAILED"}</b>
              {rowsData?.message ? <div className="mt-1 text-xs opacity-80">{rowsData.message}</div> : null}
              <div className="mt-2 text-xs text-gray-700">
                Note: Endpoint required: <b>/api/sales-manager/retailers/[retailerId]/products/combined</b>
              </div>
            </div>
          ) : null}

          {!rowsLoading && rowsData?.ok ? (
            <div className="mt-3 overflow-x-auto border rounded-2xl bg-white">
              <table className="min-w-[980px] w-full text-[13px]">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left">
                    <TH>Product</TH>
                    <TH className="text-right">Purchased</TH>
                    <TH className="text-right">Sold</TH>
                    <TH className="text-right">Physical</TH>
                    <TH className="text-right">Movement%</TH>
                    <TH>Status</TH>
                    <TH className="text-right">Actions</TH>
                  </tr>
                </thead>

                <tbody>
                  {combinedRows.map((row, idx) => {
                    const purchased = n(row.purchasedQty);
                    const sold = n(row.soldQty);
                    const physical = n(row.physicalQty);
                    const movement = pct(sold, purchased);
                    const st = statusForRow(row);

                    return (
                      <tr key={`${row.productId || row.productName}-${idx}`} className="border-t">
                        <TD className="font-black">
                          <div className="min-w-[260px]">
                            <div className="truncate">{row.productName || "—"}</div>
                            <div className="mt-1 text-[11px] text-gray-500">
                              {row.lastAuditAt ? (
                                <>
                                  Last audit: <b>{dtShort(row.lastAuditAt)}</b>
                                </>
                              ) : (
                                <>Last audit: —</>
                              )}
                            </div>
                          </div>
                        </TD>

                        <TD className="text-right font-black">{purchased}</TD>
                        <TD className="text-right font-black">{sold}</TD>
                        <TD className="text-right font-black">{physical}</TD>

                        <TD className="text-right">
                          <span className="text-[11px] px-2 py-0.5 rounded-full border bg-gray-50 border-gray-200 font-black text-gray-800">
                            {purchased > 0 ? `${movement}%` : "—"}
                          </span>
                        </TD>

                        <TD>
                          <span
                            className={[
                              "text-[11px] px-2 py-0.5 rounded-full border font-black",
                              toneCls(st.tone),
                            ].join(" ")}
                          >
                            {st.label}
                          </span>
                        </TD>

                        <TD className="text-right">
                          <button
                            className="text-[12px] px-3 py-1.5 rounded-xl border bg-white font-black hover:bg-gray-50"
                            onClick={() => openAudit(row.productName)}
                            title="Open latest audit for this product"
                          >
                            Audit
                          </button>
                        </TD>
                      </tr>
                    );
                  })}

                  {!combinedRows.length ? (
                    <tr className="border-t">
                      <TD colSpan={7} className="text-center text-gray-600 py-8">
                        No products found for this retailer in selected mode.
                      </TD>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}

          <div className="mt-3 text-[12px] text-gray-600">
            Tip: <b>Purchased</b> = system orders, <b>Sold</b> = derived selling, <b>Physical</b> = current stock.
          </div>
        </div>
      </ModalShell>

      {/* ✅ AUDIT MODAL */}
      <ModalShell
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        zIndex={95}
        widthClass="max-w-4xl"
        titleTop={
          <div>
            <div className="text-xs font-semibold text-gray-500">Audit</div>
            <div className="text-lg font-black text-gray-900">
              {auditProductName ? `(${auditProductName})` : "Latest Audit"}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Last audit:{" "}
              <b>{auditData?.audit?.createdAt ? fmtDateTime(auditData.audit.createdAt) : auditLoading ? "Loading…" : "—"}</b>
            </div>
          </div>
        }
      >
        <div ref={auditBodyRef} className="p-4 overflow-auto max-h-[75vh]">
          {auditLoading ? <div className="text-sm text-gray-600">Loading audit…</div> : null}

          {!auditLoading && (auditErr || (auditData && !auditData.ok)) ? (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
              Error: <b>{auditErr || auditData?.error || "FAILED"}</b>
              {auditData?.detail ? <div className="mt-1 text-xs opacity-80">{auditData.detail}</div> : null}
            </div>
          ) : null}

          {!auditLoading && auditData?.ok ? (
            <>
              {!auditData.audit ? (
                <div className="p-3 rounded-xl border bg-gray-50 text-gray-700 text-sm">No audit found for this retailer.</div>
              ) : null}

              <div className="mt-3 overflow-x-auto border rounded-2xl bg-white">
                <table className="min-w-[900px] w-full text-[13px]">
                  <thead className="bg-gray-50 border-b">
                    <tr className="text-left">
                      <TH>Product</TH>
                      <TH>Batch</TH>
                      <TH>Expiry</TH>
                      <TH className="text-right">System</TH>
                      <TH className="text-right">Physical</TH>
                      <TH className="text-right">Variance</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {(auditData.items || []).map((it) => {
                      const variance = n(it.variance);
                      const vCls =
                        variance === 0
                          ? "bg-gray-50 border-gray-200 text-gray-700"
                          : variance > 0
                          ? "bg-green-50 border-green-200 text-green-700"
                          : "bg-red-50 border-red-200 text-red-700";

                      return (
                        <tr key={it.id} className="border-t">
                          <TD className="font-bold">{it.productName || "—"}</TD>
                          <TD>{it.batchNo || "—"}</TD>
                          <TD>{it.expiryDate ? dtShort(it.expiryDate) : "—"}</TD>
                          <TD className="text-right font-black">{n(it.systemQty)}</TD>
                          <TD className="text-right font-black">{n(it.physicalQty)}</TD>
                          <TD className="text-right">
                            <span className={["text-[11px] px-2 py-0.5 rounded-full border font-black", vCls].join(" ")}>
                              {variance > 0 ? `+${variance}` : `${variance}`}
                            </span>
                          </TD>
                        </tr>
                      );
                    })}

                    {!(auditData.items || []).length ? (
                      <tr className="border-t">
                        <TD colSpan={6} className="text-center text-gray-600 py-6">
                          No audit items.
                        </TD>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>
      </ModalShell>
    </>
  );
}

/** -------------------------
 *  TABLE CELLS
 *  ------------------------- */
function TH({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <th className={["px-4 py-3 font-black", className].join(" ")}>{children}</th>;
}
function TD({ children, className = "", colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={["px-4 py-3 align-top", className].join(" ")}>
      {children}
    </td>
  );
}