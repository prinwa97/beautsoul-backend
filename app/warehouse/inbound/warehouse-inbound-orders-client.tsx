"use client";

import React, { useEffect, useMemo, useState } from "react";
import ProcessOrderModal from "./components/ProcessOrderModal";
import DispatchDetailsModal from "./components/DispatchDetailsModal";
import OrdersTable from "./components/OrdersTable";
import OrdersMobile from "./components/OrdersMobile";

/** ===================== Types ===================== */

type InboundItem = {
  id: string;
  productName: string;
  orderedQtyPcs: number;
  rate?: number | null;
};

type InboundRow = {
  id: string;
  orderNo: string;
  status: string;
  createdAt: string;
  dispatchDate?: string | null;

  paymentStatus: "UNPAID" | "PAID";
  paymentVerified: boolean;
  paidAmount: number;
  utrNo?: string | null;

  shippingMode?: string | null;
  courierName?: string | null;
  transportName?: string | null;
  lrNo?: string | null;
  trackingNo?: string | null;
  trackingCarrier?: string | null;

  dispatchDateTime?: string | null; // optional (if you use other name ignore)
 

  forDistributorId: string;

  distributor?: {
    id: string;
    name: string;
    city?: string | null;
    state?: string | null;
  } | null;

  items: InboundItem[];
};

type InventoryBatch = {
  id: string;
  distributorId: string;
  productName: string;
  batchNo: string;
  mfgDate?: string | null;
  expiryDate: string;
  qty: number;
};

type ListResp = {
  ok: boolean;
  orders?: InboundRow[];
  error?: string;
};

type BatchesResp = {
  ok: boolean;
  order?: InboundRow;
  batches?: InventoryBatch[];
  error?: string;
};

type AllocationLine = {
  productName: string;
  orderQty: number;
  rate: number;
  batchId: string;
  batchNo: string;
  mfgDate?: string | null;
  expiryDate: string;
  allocQty: number;
  availableAtPick: number;
};

/** ===================== Utils ===================== */

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function fmtDate(iso?: string | null) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function fmtDateOnly(iso?: string | null) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN");
  } catch {
    return iso;
  }
}

function inr(n: any) {
  const x = Number(n || 0);
  return x.toLocaleString("en-IN");
}

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const data = (await res.json().catch(() => null)) as T | null;
  if (!res.ok) {
    const msg = (data as any)?.error || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

function calcLineAmount(qty: number, rate?: number | null) {
  const r = Number(rate || 0);
  return Math.round(Number(qty || 0) * r * 100) / 100;
}

function sortBatchesNearestExpiryFirst(b: InventoryBatch[]) {
  return [...b].sort((a, c) => {
    const da = new Date(a.expiryDate).getTime();
    const dc = new Date(c.expiryDate).getTime();
    if (da !== dc) return da - dc;
    const bn = String(a.batchNo).localeCompare(String(c.batchNo));
    if (bn !== 0) return bn;
    return Number(c.qty || 0) - Number(a.qty || 0);
  });
}

/** Auto allocate by nearest expiry */
function autoAllocateForOrderItems(orderItems: InboundItem[], batches: InventoryBatch[]) {
  const allocations: AllocationLine[] = [];

  const byProduct = new Map<string, InventoryBatch[]>();
  for (const b of sortBatchesNearestExpiryFirst(batches || [])) {
    const pn = String(b.productName || "");
    if (!byProduct.has(pn)) byProduct.set(pn, []);
    byProduct.get(pn)!.push(b);
  }

  for (const it of orderItems || []) {
    const pn = String(it.productName || "");
    let need = Math.max(0, Number(it.orderedQtyPcs || 0));
    const rate = Number(it.rate || 0);

    const list = byProduct.get(pn) || [];
    for (const b of list) {
      if (need <= 0) break;
      const avail = Math.max(0, Number(b.qty || 0));
      if (avail <= 0) continue;

      const take = Math.min(need, avail);

      allocations.push({
        productName: pn,
        orderQty: Number(it.orderedQtyPcs || 0),
        rate,
        batchId: b.id,
        batchNo: b.batchNo,
        mfgDate: b.mfgDate ?? null,
        expiryDate: b.expiryDate,
        allocQty: take,
        availableAtPick: avail,
      });

      need -= take;
    }

    if (need > 0) {
      allocations.push({
        productName: pn,
        orderQty: Number(it.orderedQtyPcs || 0),
        rate,
        batchId: "",
        batchNo: "",
        mfgDate: null,
        expiryDate: "",
        allocQty: need,
        availableAtPick: 0,
      });
    }
  }

  return allocations;
}

/** ===================== Component ===================== */

export default function WarehouseInboundOrdersClient() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [orders, setOrders] = useState<InboundRow[]>([]);

  const [take] = useState(200);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [q, setQ] = useState<string>("");

  /** ---------- Verify popup state ---------- */
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyOrder, setVerifyOrder] = useState<InboundRow | null>(null);
  const [verifyChecked, setVerifyChecked] = useState(false);
  const [verifySaving, setVerifySaving] = useState(false);

  /** ---------- Process modal state ---------- */
  const [processOpen, setProcessOpen] = useState(false);
  const [processOrder, setProcessOrder] = useState<InboundRow | null>(null);
  const [processLoading, setProcessLoading] = useState(false);
  const [processSaving, setProcessSaving] = useState(false);

  const [allBatches, setAllBatches] = useState<InventoryBatch[]>([]);
  const [allocations, setAllocations] = useState<AllocationLine[]>([]);
  const [confirmProcessChecked, setConfirmProcessChecked] = useState(false);

  /** ---------- Dispatch modal state ---------- */
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchOrder, setDispatchOrder] = useState<InboundRow | null>(null);
  const [dispatchSaving, setDispatchSaving] = useState(false);

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const qs = new URLSearchParams();
      qs.set("take", String(take));
      if (statusFilter) qs.set("status", statusFilter);

      const data = await fetchJSON<ListResp>(`/api/warehouse/inbound?${qs.toString()}`);
      if (!data.ok) throw new Error(data.error || "Failed");
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (e: any) {
      setMsg(String(e?.message || e || "Error"));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  /** ---------- Search filter ---------- */
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return orders;
    return orders.filter((r) => {
      const dist = (r.distributor?.name || "").toLowerCase();
      const city = (r.distributor?.city || "").toLowerCase();
      const orderNo = (r.orderNo || "").toLowerCase();
      const utr = (r.utrNo || "").toLowerCase();
      return dist.includes(s) || city.includes(s) || orderNo.includes(s) || utr.includes(s);
    });
  }, [orders, q]);

  const summary = useMemo(() => {
    const total = orders.length;
    const paid = orders.filter((r) => r.paymentStatus === "PAID").length;
    const verified = orders.filter((r) => r.paymentVerified).length;
    const pendingVerify = orders.filter((r) => r.paymentStatus === "PAID" && !r.paymentVerified).length;
    return { total, paid, verified, pendingVerify };
  }, [orders]);

  /** ===================== Verify Popup handlers ===================== */

  function openVerifyPopup(o: InboundRow) {
    setVerifyOrder(o);
    setVerifyChecked(false);
    setVerifyOpen(true);
  }
  function closeVerifyPopup() {
    if (verifySaving) return;
    setVerifyOpen(false);
    setVerifyOrder(null);
    setVerifyChecked(false);
  }

  async function saveVerify() {
    if (!verifyOrder) return;
    if (!verifyChecked) return;

    setVerifySaving(true);
    setMsg("");
    try {
      const data = await fetchJSON<{ ok: boolean; error?: string }>(
        `/api/warehouse/inbound/${verifyOrder.id}/verify-payment`,
        { method: "POST" }
      );
      if (!data.ok) throw new Error(data.error || "Verify failed");
      closeVerifyPopup();
      await load();
    } catch (e: any) {
      setMsg(String(e?.message || e || "Error"));
    } finally {
      setVerifySaving(false);
    }
  }

  /** ===================== Process Modal handlers ===================== */

  async function openProcessPopup(o: InboundRow) {
    setProcessOpen(true);
    setProcessOrder(o);
    setConfirmProcessChecked(false);
    setAllBatches([]);
    setAllocations([]);
    setProcessLoading(true);

    try {
      const data = await fetchJSON<BatchesResp>(`/api/warehouse/inbound/${o.id}/batches`);
      if (!data.ok) throw new Error(data.error || "Failed to load batches");
      const batches = Array.isArray(data.batches) ? data.batches : [];
      setAllBatches(sortBatchesNearestExpiryFirst(batches));

      const auto = autoAllocateForOrderItems(o.items || [], batches);
      setAllocations(auto);
    } catch (e: any) {
      setMsg(String(e?.message || e || "Error"));
      setProcessOpen(false);
      setProcessOrder(null);
    } finally {
      setProcessLoading(false);
    }
  }

  function closeProcessPopup() {
    if (processSaving) return;
    setProcessOpen(false);
    setProcessOrder(null);
    setAllBatches([]);
    setAllocations([]);
    setConfirmProcessChecked(false);
    setProcessLoading(false);
  }

  /** Helper: get batches for a product */
  const productBatches = useMemo(() => {
    const map = new Map<string, InventoryBatch[]>();
    for (const b of allBatches) {
      const pn = String(b.productName || "");
      if (!map.has(pn)) map.set(pn, []);
      map.get(pn)!.push(b);
    }
    return map;
  }, [allBatches]);

  function getBatchLabel(b: InventoryBatch) {
    return `${b.batchNo} • Avl ${b.qty} • Exp ${fmtDateOnly(b.expiryDate)}`;
  }

  function setAllocationBatch(idx: number, batchId: string) {
    setAllocations((prev) => {
      const next = [...prev];
      const row = next[idx];
      if (!row) return prev;

      const b = allBatches.find((x) => x.id === batchId);
      if (!b) {
        next[idx] = { ...row, batchId: "", batchNo: "", mfgDate: null, expiryDate: "", availableAtPick: 0 };
        return next;
      }

      const clamped = Math.min(Math.max(0, Number(row.allocQty || 0)), Math.max(0, Number(b.qty || 0)));

      next[idx] = {
        ...row,
        batchId: b.id,
        batchNo: b.batchNo,
        mfgDate: b.mfgDate ?? null,
        expiryDate: b.expiryDate,
        availableAtPick: Math.max(0, Number(b.qty || 0)),
        allocQty: clamped,
      };
      return next;
    });
  }

  function setAllocationQty(idx: number, qty: number) {
    setAllocations((prev) => {
      const next = [...prev];
      const row = next[idx];
      if (!row) return prev;

      const qn = Math.max(0, Math.floor(Number(qty || 0)));
      const max = row.batchId ? Math.max(0, Number(row.availableAtPick || 0)) : qn;
      next[idx] = { ...row, allocQty: row.batchId ? Math.min(qn, max) : qn };
      return next;
    });
  }

  /** Validate allocations before save */
  const processValidation = useMemo(() => {
    const o = processOrder;
    if (!o) return { ok: false, errors: ["No order"], missing: [] as string[] };

    const errors: string[] = [];
    const missing: string[] = [];

    const needByProduct = new Map<string, number>();
    for (const it of o.items || []) {
      needByProduct.set(String(it.productName || ""), Math.max(0, Number(it.orderedQtyPcs || 0)));
    }

    const gotByProduct = new Map<string, number>();
    const usedByBatch = new Map<string, number>();

    for (const a of allocations) {
      const pn = String(a.productName || "");
      if (!pn) continue;

      if (!a.batchId) {
        if (a.allocQty > 0) missing.push(`${pn}: short by ${a.allocQty}`);
        continue;
      }

      if (a.allocQty <= 0) continue;

      gotByProduct.set(pn, (gotByProduct.get(pn) || 0) + a.allocQty);
      usedByBatch.set(a.batchId, (usedByBatch.get(a.batchId) || 0) + a.allocQty);
    }

    for (const [pn, need] of needByProduct.entries()) {
      const got = gotByProduct.get(pn) || 0;
      if (got !== need) errors.push(`${pn}: allocated ${got} but required ${need}`);
    }

    for (const [batchId, used] of usedByBatch.entries()) {
      const b = allBatches.find((x) => x.id === batchId);
      const avail = Math.max(0, Number(b?.qty || 0));
      if (used > avail) errors.push(`Batch ${b?.batchNo || batchId} overused: ${used} > ${avail}`);
    }

    return { ok: errors.length === 0 && missing.length === 0, errors, missing };
  }, [processOrder, allocations, allBatches]);

  async function saveProcess() {
    if (!processOrder) return;
    if (!confirmProcessChecked) return;

    if (!processValidation.ok) {
      setMsg(processValidation.errors[0] || processValidation.missing[0] || "Allocation invalid");
      return;
    }

    setProcessSaving(true);
    setMsg("");
    try {
      const payload = allocations
        .filter((a) => a.batchId && a.allocQty > 0)
        .map((a) => ({
          productName: a.productName,
          batchId: a.batchId,
          batchNo: a.batchNo,
          mfgDate: a.mfgDate,
          expiryDate: a.expiryDate,
          qty: a.allocQty,
          rate: a.rate,
        }));

      const data = await fetchJSON<{ ok: boolean; error?: string }>(
        `/api/warehouse/inbound/${processOrder.id}/process`,
        {
          method: "POST",
          body: JSON.stringify({ allocations: payload }),
        }
      );
      if (!data.ok) throw new Error(data.error || "Process failed");

      closeProcessPopup();
      await load();
      setMsg("✅ Packed done. Ab Dispatch button se dispatch karein.");
    } catch (e: any) {
      setMsg(String(e?.message || e || "Error"));
    } finally {
      setProcessSaving(false);
    }
  }

  /** ===================== Dispatch modal handlers ===================== */

  function openDispatchPopup(o: InboundRow) {
    setDispatchOrder(o);
    setDispatchOpen(true);
  }

  function closeDispatchPopup() {
    if (dispatchSaving) return;
    setDispatchOpen(false);
    setDispatchOrder(null);
  }

  async function saveDispatch(payload: {
    shippingMode: "COURIER" | "TRANSPORT" | "SELF";
    courierName?: string;
    transportName?: string;
    lrNo?: string;
    trackingNo?: string;
    trackingCarrier?: string;
    dispatchDate?: string; // ISO
  }) {
    if (!dispatchOrder) return;

    setDispatchSaving(true);
    setMsg("");
    try {
      const data = await fetchJSON<{ ok: boolean; error?: string }>(
        `/api/warehouse/inbound/${dispatchOrder.id}/dispatch`,
        {
          method: "POST",
          body: JSON.stringify(payload),
        }
      );
      if (!data.ok) throw new Error(data.error || "Dispatch save failed");

      closeDispatchPopup();
      await load();
      setMsg("✅ Dispatch details saved. Status updated to DISPATCHED.");
    } catch (e: any) {
      setMsg(String(e?.message || e || "Error"));
    } finally {
      setDispatchSaving(false);
    }
  }

  const verifyTotals = useMemo(() => {
    const o = verifyOrder;
    if (!o) return { items: 0, qty: 0, computedAmount: 0 };
    const items = o.items?.length || 0;
    const qty = (o.items || []).reduce((a, it) => a + Number(it.orderedQtyPcs || 0), 0);
    const computedAmount = (o.items || []).reduce((a, it) => a + calcLineAmount(it.orderedQtyPcs, it.rate), 0);
    return { items, qty, computedAmount };
  }, [verifyOrder]);

  const processTotals = useMemo(() => {
    let totalQty = 0;
    let totalAmount = 0;
    for (const a of allocations) {
      if (!a.batchId) continue;
      totalQty += Number(a.allocQty || 0);
      totalAmount += calcLineAmount(a.allocQty, a.rate);
    }
    return { totalQty, totalAmount };
  }, [allocations]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff7f9] via-white to-[#fffaf6]">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-30 border-b border-[#f6d7df] bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[220px]">
              <div className="text-lg font-bold text-slate-900">Warehouse Inbound</div>
              <div className="text-xs text-slate-500">Verify → Process → Dispatch (only PACKED)</div>
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search: order / distributor / UTR"
                className="h-10 w-[260px] rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#f1a9b8] focus:ring-4 focus:ring-[#fde2e8]"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={loading}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#f1a9b8] focus:ring-4 focus:ring-[#fde2e8]"
              >
                <option value="">All Status</option>
                <option value="CREATED">CREATED</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="PAYMENT_VERIFIED">PAYMENT_VERIFIED</option>
                <option value="PACKED">PACKED</option>
                <option value="DISPATCHED">DISPATCHED</option>
                <option value="IN_TRANSIT">IN_TRANSIT</option>
                <option value="DELIVERED">DELIVERED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>

              <button
                onClick={load}
                disabled={loading}
                className={cx(
                  "h-10 rounded-xl px-4 text-sm font-semibold shadow-sm ring-1 transition",
                  loading
                    ? "cursor-not-allowed bg-slate-100 text-slate-500 ring-slate-200"
                    : "bg-slate-900 text-white ring-slate-900/10 hover:bg-slate-800"
                )}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {msg ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {msg}
          </div>
        ) : null}

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">Total Orders</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{summary.total}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">Paid</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{summary.paid}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">Verified</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{summary.verified}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">Pending Verify</div>
            <div className="mt-1 text-2xl font-bold text-amber-700">{summary.pendingVerify}</div>
          </div>
        </div>

        {/* ✅ Use your separate components (no duplicate UI) */}
        <OrdersTable
          rows={filtered as any}
          loading={loading}
          onVerify={openVerifyPopup as any}
          onProcess={openProcessPopup as any}
          onDispatch={(id) => {
            const found = orders.find((x) => x.id === id) || null;
            if (found) openDispatchPopup(found);
          }}
          cx={cx}
          fmtDate={fmtDate}
          inr={inr}
        />

        <OrdersMobile
          rows={filtered as any}
          loading={loading}
          onVerify={openVerifyPopup as any}
          onProcess={openProcessPopup as any}
          onDispatch={(id) => {
            const found = orders.find((x) => x.id === id) || null;
            if (found) openDispatchPopup(found);
          }}
          cx={cx}
          fmtDate={fmtDate}
          inr={inr}
        />
      </div>

      {/* ===================== Verify Popup ===================== */}
      {verifyOpen && verifyOrder ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeVerifyPopup();
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl ring-1 ring-slate-200 mt-6">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
              <div>
                <div className="text-lg font-bold text-slate-900">Verify Payment</div>
                <div className="text-xs text-slate-500">
                  Order: <span className="font-semibold text-slate-900">{verifyOrder.orderNo}</span> •{" "}
                  {verifyOrder.distributor?.name || "-"}
                </div>
              </div>
              <button
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                onClick={closeVerifyPopup}
                disabled={verifySaving}
              >
                Close
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-900">Payment Details</div>
                  <div className="text-xs text-slate-500">Confirm Paid Amount + UTR</div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-xl bg-[#fffaf6] p-3 border border-[#f6d7df]">
                    <div className="text-xs font-semibold text-slate-500">Paid Amount</div>
                    <div className="mt-1 text-base font-bold text-slate-900">₹{inr(verifyOrder.paidAmount)}</div>
                  </div>
                  <div className="rounded-xl bg-[#fffaf6] p-3 border border-[#f6d7df] md:col-span-2">
                    <div className="text-xs font-semibold text-slate-500">UTR No</div>
                    <div className="mt-1 break-all text-sm font-semibold text-slate-900">{verifyOrder.utrNo || "-"}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between bg-[#fff1f5] px-4 py-3">
                  <div className="text-sm font-bold text-slate-900">Order Items</div>
                  <div className="text-xs text-slate-600">
                    Items: <b>{verifyTotals.items}</b> • Qty: <b>{verifyTotals.qty}</b> • Calc Amount:{" "}
                    <b>₹{inr(verifyTotals.computedAmount)}</b>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3 text-right">Qty</th>
                        <th className="px-4 py-3 text-right">Rate</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(verifyOrder.items || []).map((it) => {
                        const amt = calcLineAmount(it.orderedQtyPcs, it.rate);
                        return (
                          <tr key={it.id}>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900">{it.productName}</td>
                            <td className="px-4 py-3 text-right text-sm text-slate-700">{it.orderedQtyPcs}</td>
                            <td className="px-4 py-3 text-right text-sm text-slate-700">₹{inr(Number(it.rate || 0))}</td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">₹{inr(amt)}</td>
                          </tr>
                        );
                      })}
                      {!verifyOrder.items || verifyOrder.items.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-sm text-slate-500">
                            No items
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-[#f6d7df] bg-[#fffaf6] p-4">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 accent-[#f1a9b8]"
                    checked={verifyChecked}
                    onChange={(e) => setVerifyChecked(e.target.checked)}
                    disabled={verifySaving}
                  />
                  <div>
                    <div className="text-sm font-bold text-slate-900">I have verified this payment</div>
                    <div className="text-xs text-slate-600">UTR aur amount confirm karke hi verify karein.</div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                onClick={closeVerifyPopup}
                disabled={verifySaving}
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                onClick={saveVerify}
                disabled={!verifyChecked || verifySaving}
                className={cx(
                  "h-10 rounded-xl px-4 text-sm font-semibold text-white shadow-sm",
                  !verifyChecked || verifySaving ? "cursor-not-allowed bg-slate-300" : "bg-[#e11d48] hover:bg-[#be123c]"
                )}
              >
                {verifySaving ? "Saving..." : "Save & Verify"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ===================== Process Modal ===================== */}
      <ProcessOrderModal
        open={processOpen}
        order={
          processOrder
            ? {
                id: processOrder.id,
                orderNo: processOrder.orderNo,
                status: processOrder.status,
                createdAt: processOrder.createdAt,
                distributor: processOrder.distributor ? { name: processOrder.distributor.name } : null,
              }
            : null
        }
        loading={processLoading}
        saving={processSaving}
        allBatches={allBatches.map((b) => ({
          id: b.id,
          productName: b.productName,
          batchNo: b.batchNo,
          mfgDate: b.mfgDate,
          expiryDate: b.expiryDate,
          qty: b.qty,
        }))}
        allocations={allocations}
        productBatches={productBatches as any}
        getBatchLabel={(b) =>
          getBatchLabel({
            id: b.id,
            distributorId: "",
            productName: b.productName,
            batchNo: b.batchNo,
            mfgDate: b.mfgDate,
            expiryDate: b.expiryDate,
            qty: b.qty,
          } as any)
        }
        setAllocationBatch={setAllocationBatch}
        setAllocationQty={setAllocationQty}
        validation={processValidation}
        totals={processTotals}
        confirmChecked={confirmProcessChecked}
        onConfirmCheckedChange={setConfirmProcessChecked}
        onClose={closeProcessPopup}
        onSave={saveProcess}
        onGoDispatch={(id) => {
          const found = orders.find((x) => x.id === id) || null;
          if (found) openDispatchPopup(found);
        }}
        cx={cx}
        fmtDate={fmtDate}
        fmtDateOnly={fmtDateOnly}
        inr={inr}
        calcLineAmount={calcLineAmount}
      />

      {/* ===================== Dispatch Details Modal ===================== */}
      <DispatchDetailsModal
        open={dispatchOpen}
        loading={loading}
        saving={dispatchSaving}
        order={
          dispatchOrder
            ? {
                id: dispatchOrder.id,
                orderNo: dispatchOrder.orderNo,
                distributorName: dispatchOrder.distributor?.name || null,
                createdAt: dispatchOrder.createdAt,
                shippingMode: dispatchOrder.shippingMode,
                courierName: dispatchOrder.courierName,
                transportName: dispatchOrder.transportName,
                lrNo: dispatchOrder.lrNo,
                trackingNo: dispatchOrder.trackingNo,
                trackingCarrier: dispatchOrder.trackingCarrier,
                dispatchDate: dispatchOrder.dispatchDate,
              }
            : null
        }
        onClose={closeDispatchPopup}
        onSave={saveDispatch}
        fmtDate={fmtDate}
      />
    </div>
  );
}
