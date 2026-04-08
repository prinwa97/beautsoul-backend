"use client";

import React, { useEffect, useMemo, useState } from "react";
import ProcessOrderModal from "./components/ProcessOrderModal";
import DispatchDetailsModal from "./components/DispatchDetailsModal";

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

  dispatchDateTime?: string | null;

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
    return d.toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
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

function totalQty(items?: InboundItem[]) {
  return (items || []).reduce((sum, it) => sum + Number(it.orderedQtyPcs || 0), 0);
}

function totalValue(items?: InboundItem[]) {
  return (items || []).reduce(
    (sum, it) => sum + calcLineAmount(it.orderedQtyPcs, it.rate),
    0
  );
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

function shippingSummary(row: InboundRow) {
  if (row.shippingMode === "COURIER") {
    return row.courierName ? `Courier • ${row.courierName}` : "Courier";
  }
  if (row.shippingMode === "TRANSPORT") {
    return row.transportName ? `Transport • ${row.transportName}` : "Transport";
  }
  if (row.shippingMode === "SELF") return "Self";
  return row.dispatchDate || row.dispatchDateTime ? "Dispatched" : "-";
}

function actionLabel(row: InboundRow) {
  const status = String(row.status || "").toUpperCase();
  if (row.paymentStatus === "PAID" && !row.paymentVerified) return "Verify";
  if (row.paymentVerified && ["PAYMENT_VERIFIED", "CONFIRMED"].includes(status)) return "Process";
  if (status === "PACKED") return "Dispatch";
  return "Completed";
}

function actionTone(row: InboundRow) {
  const label = actionLabel(row);
  if (label === "Verify") return "border-amber-200 bg-amber-50 text-amber-700";
  if (label === "Process") return "border-blue-200 bg-blue-50 text-blue-700";
  if (label === "Dispatch") return "border-orange-200 bg-orange-50 text-orange-700";
  return "border-emerald-200 bg-emerald-50 text-emerald-700";
}

function paymentTone(row: InboundRow) {
  if (row.paymentStatus === "PAID" && row.paymentVerified) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (row.paymentStatus === "PAID") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-rose-200 bg-rose-50 text-rose-700";
}

/** ===================== Small UI ===================== */

function StatCard({
  title,
  value,
}: {
  title: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-[#f1e5e9] bg-white px-5 py-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {title}
      </div>
      <div className="mt-2 text-3xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: Array<number | string> = [];

  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page === 1}
        className="rounded-2xl border border-[#eddce1] bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Previous
      </button>

      {pages.map((p, idx) =>
        typeof p === "string" ? (
          <span key={`${p}-${idx}`} className="px-2 text-sm text-slate-400">
            ...
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={cx(
              "h-11 min-w-[44px] rounded-2xl border px-3 text-sm font-semibold",
              p === page
                ? "border-[#e11d48] bg-[#e11d48] text-white"
                : "border-[#eddce1] bg-white text-slate-700 hover:bg-slate-50"
            )}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page === totalPages}
        className="rounded-2xl border border-[#eddce1] bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}

/** ===================== Detail Modal ===================== */

function OrderDetailModal({
  open,
  order,
  onClose,
  onVerify,
  onProcess,
  onDispatch,
}: {
  open: boolean;
  order: InboundRow | null;
  onClose: () => void;
  onVerify: (o: InboundRow) => void;
  onProcess: (o: InboundRow) => void;
  onDispatch: (o: InboundRow) => void;
}) {
  if (!open || !order) return null;

  const label = actionLabel(order);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-[28px] border border-[#f1e5e9] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#f4e8ec] px-6 py-5">
          <div>
            <div className="text-2xl font-bold text-slate-900">Order Details</div>
            <div className="mt-1 text-sm text-slate-500">
              {order.orderNo} • {order.distributor?.name || "-"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(90vh-88px)] overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order</div>
              <div className="mt-1 text-sm font-bold text-slate-900">{order.orderNo}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Distributor</div>
              <div className="mt-1 text-sm font-bold text-slate-900">{order.distributor?.name || "-"}</div>
              <div className="mt-1 text-xs text-slate-500">
                {[order.distributor?.city, order.distributor?.state].filter(Boolean).join(", ") || "-"}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</div>
              <div className="mt-1 text-sm font-bold text-slate-900">{fmtDate(order.createdAt)}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dispatch</div>
              <div className="mt-1 text-sm font-bold text-slate-900">
                {fmtDate(order.dispatchDate || order.dispatchDateTime)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Status</div>
              <div className="mt-2 text-sm font-bold text-slate-900">{order.status || "-"}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment</div>
              <div className="mt-2">
                <span className={cx("inline-flex rounded-full border px-3 py-1 text-xs font-bold", paymentTone(order))}>
                  {order.paymentStatus === "PAID"
                    ? order.paymentVerified
                      ? "PAID • VERIFIED"
                      : "PAID • PENDING VERIFY"
                    : "UNPAID"}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paid Amount</div>
              <div className="mt-2 text-sm font-bold text-slate-900">₹{inr(order.paidAmount)}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">UTR</div>
              <div className="mt-2 break-all text-sm font-bold text-slate-900">{order.utrNo || "-"}</div>
            </div>
          </div>

          <div className="mt-5 rounded-[24px] border border-[#f1e5e9] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f5ecef] px-5 py-4">
              <div className="text-base font-bold text-slate-900">Items</div>
              <div className="text-sm text-slate-500">
                Total Items: <b>{order.items?.length || 0}</b> • Qty: <b>{totalQty(order.items)}</b> • Value: <b>₹{inr(totalValue(order.items))}</b>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3 text-right">Qty</th>
                    <th className="px-5 py-3 text-right">Rate</th>
                    <th className="px-5 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(order.items || []).map((it) => {
                    const amt = calcLineAmount(it.orderedQtyPcs, it.rate);
                    return (
                      <tr key={it.id}>
                        <td className="px-5 py-3 text-sm font-medium text-slate-900">{it.productName}</td>
                        <td className="px-5 py-3 text-right text-sm text-slate-700">{it.orderedQtyPcs}</td>
                        <td className="px-5 py-3 text-right text-sm text-slate-700">₹{inr(Number(it.rate || 0))}</td>
                        <td className="px-5 py-3 text-right text-sm font-bold text-slate-900">₹{inr(amt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            {label === "Verify" ? (
              <button
                type="button"
                onClick={() => onVerify(order)}
                className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-bold text-amber-700 hover:bg-amber-100"
              >
                Verify Payment
              </button>
            ) : label === "Process" ? (
              <button
                type="button"
                onClick={() => onProcess(order)}
                className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-sm font-bold text-blue-700 hover:bg-blue-100"
              >
                Process Order
              </button>
            ) : label === "Dispatch" ? (
              <button
                type="button"
                onClick={() => onDispatch(order)}
                className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-3 text-sm font-bold text-orange-700 hover:bg-orange-100"
              >
                Dispatch Order
              </button>
            ) : (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3 text-sm font-bold text-emerald-700">
                Completed
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** ===================== Component ===================== */

export default function WarehouseInboundOrdersClient() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [orders, setOrders] = useState<InboundRow[]>([]);

  const [take] = useState(200);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailOrder, setDetailOrder] = useState<InboundRow | null>(null);

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
      const state = (r.distributor?.state || "").toLowerCase();
      const orderNo = (r.orderNo || "").toLowerCase();
      const utr = (r.utrNo || "").toLowerCase();
      return (
        dist.includes(s) ||
        city.includes(s) ||
        state.includes(s) ||
        orderNo.includes(s) ||
        utr.includes(s)
      );
    });
  }, [orders, q]);

  useEffect(() => {
    setPage(1);
  }, [q, statusFilter]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const paid = filtered.filter((r) => r.paymentStatus === "PAID").length;
    const verified = filtered.filter((r) => r.paymentVerified).length;
    const pendingVerify = filtered.filter((r) => r.paymentStatus === "PAID" && !r.paymentVerified).length;
    return { total, paid, verified, pendingVerify };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

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
      setDetailOpen(false);
      setDetailOrder(null);
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
        next[idx] = {
          ...row,
          batchId: "",
          batchNo: "",
          mfgDate: null,
          expiryDate: "",
          availableAtPick: 0,
        };
        return next;
      }

      const clamped = Math.min(
        Math.max(0, Number(row.allocQty || 0)),
        Math.max(0, Number(b.qty || 0))
      );

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
      setDetailOpen(false);
      setDetailOrder(null);
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
    dispatchDate?: string;
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
      setDetailOpen(false);
      setDetailOrder(null);
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
    const computedAmount = (o.items || []).reduce(
      (a, it) => a + calcLineAmount(it.orderedQtyPcs, it.rate),
      0
    );

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

  const isAnyModalOpen = verifyOpen || processOpen || dispatchOpen || detailOpen;

  return (
    <div className="min-h-screen bg-[#faf6f7] text-slate-900">
      <div
        className={cx(
          "mx-auto max-w-7xl px-4 py-6 md:px-6",
          isAnyModalOpen && "select-none"
        )}
      >
        {/* Top Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[25px] font-bold leading-none text-slate-900">
              Orders
            </div>
            <div className="mt-2 text-sm text-slate-500">
              Warehouse inbound pending orders
            </div>
          </div>
        </div>

        {msg ? (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {msg}
          </div>
        ) : null}

        {/* KPI */}
        <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <StatCard title="Total Orders" value={summary.total} />
          <StatCard title="Paid" value={summary.paid} />
          <StatCard title="Verified" value={summary.verified} />
          <StatCard title="Pending Verify" value={summary.pendingVerify} />
        </div>

        {/* Table Section */}
        <div className="overflow-hidden rounded-[28px] border border-[#eee1e6] bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-[#f3e9ed] px-5 py-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-[25px] font-bold leading-none text-slate-900">
                Order Summary
              </div>
              <div className="mt-2 text-sm text-slate-500">
                Overview of pending inbound orders.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search..."
               className="h-10 w-[200px] rounded-xl border border-[#ecdbe1] bg-white px-3 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#e7b9c7] focus:ring-2 focus:ring-[#fde8ee]"
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                disabled={loading}
                className="h-12 rounded-2xl border border-[#ecdbe1] bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#e7b9c7] focus:ring-4 focus:ring-[#fde8ee]"
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
                type="button"
                className={cx(
                  "h-12 rounded-2xl px-5 text-sm font-bold",
                  loading
                    ? "cursor-not-allowed bg-slate-200 text-slate-500"
                    : "bg-[#e11d48] text-white hover:bg-[#be123c]"
                )}
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[1.3fr_1.2fr_1fr_0.7fr_1fr_0.8fr] gap-4 border-b border-[#f4eaee] bg-[#fcf7f9] px-5 py-4 text-sm font-semibold text-slate-600">
              <div>Order No</div>
              <div>Distributor</div>
              <div>Dispatch</div>
              <div>Item Qty</div>
              <div>Date</div>
              <div className="text-right">Action</div>
            </div>

            {loading ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">Loading orders...</div>
            ) : pageRows.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-500">No orders found</div>
            ) : (
              <div className="divide-y divide-[#f5ecef]">
                {pageRows.map((row) => {
                  const label = actionLabel(row);

                  return (
                    <div
                      key={row.id}
                      className="grid cursor-pointer grid-cols-[1.3fr_1.2fr_1fr_0.7fr_1fr_0.8fr] items-center gap-4 px-5 py-3 hover:bg-[#fffafc]"
                      onClick={() => {
                        setDetailOrder(row);
                        setDetailOpen(true);
                      }}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900">{row.orderNo}</div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-800">
                          {row.distributor?.name || "-"}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="truncate text-sm text-slate-700">
                          {shippingSummary(row)}
                        </div>
                      </div>

                      <div>
                        <div className="text-sm font-semibold text-slate-800">{totalQty(row.items)}</div>
                      </div>

                      <div>
                        <div className="text-sm text-slate-700">{fmtDateOnly(row.createdAt)}</div>
                      </div>

                      <div
                        className="flex justify-end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (label === "Verify") return openVerifyPopup(row);
                            if (label === "Process") return openProcessPopup(row);
                            if (label === "Dispatch") return openDispatchPopup(row);
                            setDetailOrder(row);
                            setDetailOpen(true);
                          }}
                          className={cx(
                            "rounded-2xl border px-4 py-2 text-xs font-bold",
                            actionTone(row)
                          )}
                        >
                          {label}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mobile Cards */}
          <div className="grid gap-3 p-4 md:hidden">
            {loading ? (
              <div className="rounded-3xl border border-[#f1e5e9] bg-white px-4 py-8 text-center text-sm text-slate-500">
                Loading orders...
              </div>
            ) : pageRows.length === 0 ? (
              <div className="rounded-3xl border border-[#f1e5e9] bg-white px-4 py-8 text-center text-sm text-slate-500">
                No orders found
              </div>
            ) : (
              pageRows.map((row) => {
                const label = actionLabel(row);

                return (
                  <div
                    key={row.id}
                    className="rounded-[24px] border border-[#f1e5e9] bg-white p-4"
                    onClick={() => {
                      setDetailOrder(row);
                      setDetailOpen(true);
                    }}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Order
                        </div>
                        <div className="mt-1 text-sm font-bold text-slate-900">{row.orderNo}</div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Distributor
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">
                          {row.distributor?.name || "-"}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Dispatch
                        </div>
                        <div className="mt-1 text-sm text-slate-700">{shippingSummary(row)}</div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Item Qty
                        </div>
                        <div className="mt-1 text-sm font-semibold text-slate-900">{totalQty(row.items)}</div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          Date
                        </div>
                        <div className="mt-1 text-sm text-slate-700">{fmtDateOnly(row.createdAt)}</div>
                      </div>

                      <div
                        className="flex items-end justify-start"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (label === "Verify") return openVerifyPopup(row);
                            if (label === "Process") return openProcessPopup(row);
                            if (label === "Dispatch") return openDispatchPopup(row);
                            setDetailOrder(row);
                            setDetailOpen(true);
                          }}
                          className={cx(
                            "rounded-2xl border px-4 py-2 text-xs font-bold",
                            actionTone(row)
                          )}
                        >
                          {label}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer / Pagination */}
          <div className="flex flex-col gap-4 border-t border-[#f4eaee] px-5 py-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600">Items per page</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value || 10));
                  setPage(1);
                }}
                className="h-12 rounded-2xl border border-[#ecdbe1] bg-white px-4 text-sm text-slate-700 outline-none"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
              </select>
            </div>

            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>

      {/* ===================== Order Detail Popup ===================== */}
      <OrderDetailModal
        open={detailOpen}
        order={detailOrder}
        onClose={() => {
          setDetailOpen(false);
          setDetailOrder(null);
        }}
        onVerify={(o) => {
          setDetailOpen(false);
          setDetailOrder(null);
          openVerifyPopup(o);
        }}
        onProcess={(o) => {
          setDetailOpen(false);
          setDetailOrder(null);
          openProcessPopup(o);
        }}
        onDispatch={(o) => {
          setDetailOpen(false);
          setDetailOrder(null);
          openDispatchPopup(o);
        }}
      />

      {/* ===================== Verify Popup ===================== */}
      {verifyOpen && verifyOrder ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/20 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeVerifyPopup();
          }}
        >
          <div className="mt-6 w-full max-w-2xl rounded-2xl bg-white shadow-xl ring-1 ring-slate-200">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
              <div>
                <div className="text-lg font-bold text-slate-900">Verify Payment</div>
                <div className="text-xs text-slate-600">
                  Order: <span className="font-semibold text-slate-900">{verifyOrder.orderNo}</span> •{" "}
                  {verifyOrder.distributor?.name || "-"}
                </div>
              </div>

              <button
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                onClick={closeVerifyPopup}
                disabled={verifySaving}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="px-5 py-4">
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm font-bold text-slate-900">Payment Details</div>
                  <div className="text-xs text-slate-600">Confirm Paid Amount + UTR</div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-[#f6d7df] bg-[#fffaf6] p-3">
                    <div className="text-xs font-semibold text-slate-500">Paid Amount</div>
                    <div className="mt-1 text-base font-bold text-slate-900">
                      ₹{inr(verifyOrder.paidAmount)}
                    </div>
                  </div>

                  <div className="rounded-xl border border-[#f6d7df] bg-[#fffaf6] p-3 md:col-span-2">
                    <div className="text-xs font-semibold text-slate-500">UTR No</div>
                    <div className="mt-1 break-all text-sm font-semibold text-slate-900">
                      {verifyOrder.utrNo || "-"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex items-center justify-between bg-[#fff1f5] px-4 py-3">
                  <div className="text-sm font-bold text-slate-900">Order Items</div>
                  <div className="text-xs text-slate-700">
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
                            <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                              {it.productName}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-slate-700">
                              {it.orderedQtyPcs}
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-slate-700">
                              ₹{inr(Number(it.rate || 0))}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-slate-900">
                              ₹{inr(amt)}
                            </td>
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
                    <div className="text-sm font-bold text-slate-900">
                      I have verified this payment
                    </div>
                    <div className="text-xs text-slate-600">
                      UTR aur amount confirm karke hi verify karein.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                onClick={closeVerifyPopup}
                disabled={verifySaving}
                type="button"
                className="h-10 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                onClick={saveVerify}
                disabled={!verifyChecked || verifySaving}
                type="button"
                className={cx(
                  "h-10 rounded-xl px-4 text-sm font-semibold text-white shadow-sm",
                  !verifyChecked || verifySaving
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-[#e11d48] hover:bg-[#be123c]"
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