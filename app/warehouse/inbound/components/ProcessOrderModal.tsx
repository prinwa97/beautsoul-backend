"use client";

import React, { useMemo } from "react";

type InboundRow = {
  id: string;
  orderNo: string;
  status: string;
  createdAt: string;
  distributor?: { name: string } | null;
};

type InventoryBatch = {
  id: string;
  productName: string;
  batchNo: string;
  mfgDate?: string | null;
  expiryDate: string;
  qty: number;
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

function StatusPill({ value, cx }: { value: string; cx: (...c: any[]) => string }) {
  const v = String(value || "").toUpperCase();
  const cls =
    v === "PAYMENT_VERIFIED"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : v === "PACKED"
      ? "bg-violet-50 text-violet-700 ring-violet-200"
      : v === "DISPATCHED"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : v === "IN_TRANSIT"
      ? "bg-orange-50 text-orange-800 ring-orange-200"
      : v === "DELIVERED"
      ? "bg-green-50 text-green-700 ring-green-200"
      : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1", cls)}>
      {v}
    </span>
  );
}

export default function ProcessOrderModal(props: {
  open: boolean;
  order: InboundRow | null;

  loading: boolean;
  saving: boolean;

  allBatches: InventoryBatch[];
  allocations: AllocationLine[];
  productBatches: Map<string, InventoryBatch[]>;
  getBatchLabel: (b: InventoryBatch) => string;

  setAllocationBatch: (idx: number, batchId: string) => void;
  setAllocationQty: (idx: number, qty: number) => void;

  validation: { ok: boolean; errors: string[]; missing: string[] };
  totals: { totalQty: number; totalAmount: number };

  confirmChecked: boolean;
  onConfirmCheckedChange: (v: boolean) => void;

  onClose: () => void;
  onSave: () => void;

  // ✅ NEW: after packed, go dispatch page
  onGoDispatch: (orderId: string) => void;

  cx: (...c: any[]) => string;
  fmtDate: (iso?: string | null) => string;
  fmtDateOnly: (iso?: string | null) => string;
  inr: (n: any) => string;
  calcLineAmount: (qty: number, rate?: number | null) => number;
}) {
  const {
    open,
    order,
    loading,
    saving,
    allocations,
    productBatches,
    getBatchLabel,
    setAllocationBatch,
    setAllocationQty,
    validation,
    totals,
    confirmChecked,
    onConfirmCheckedChange,
    onClose,
    onSave,
    onGoDispatch,
    cx,
    fmtDate,
    fmtDateOnly,
    inr,
    calcLineAmount,
  } = props;

  const statusUpper = useMemo(() => String(order?.status || "").toUpperCase(), [order?.status]);
  const isPacked = statusUpper === "PACKED";
  const isDispatched = statusUpper === "DISPATCHED" || statusUpper === "IN_TRANSIT";
  const isDelivered = statusUpper === "DELIVERED";

  // ✅ Footer CTA mode:
  // - Not packed => show Save & Process
  // - Packed/dispatched => show Go to Dispatch (update details)
  const footerMode: "PROCESS" | "DISPATCH" = isPacked || isDispatched ? "DISPATCH" : "PROCESS";

  if (!open || !order) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mt-8 w-full max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#fff1f5] via-white to-[#fffaf6] px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xl font-extrabold text-slate-900">Process • Batch Allocation</div>
              <div className="mt-1 text-xs text-slate-500">
                Order <span className="font-semibold text-slate-900">{order.orderNo}</span> •{" "}
                {order.distributor?.name || "-"} • {fmtDate(order.createdAt)}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusPill value={order.status} cx={cx} />
                <span className="text-[11px] text-slate-500">Nearest expiry batches priority</span>

                {(isPacked || isDispatched) ? (
                  <span className="ml-1 inline-flex items-center rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200">
                    Next: Dispatch details fill karein
                  </span>
                ) : null}
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={saving}
              className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
            >
              Close
            </button>
          </div>

          {/* Summary chips */}
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="rounded-2xl border border-rose-100 bg-white/70 p-4">
              <div className="text-[11px] font-bold text-slate-500">Allocated Qty</div>
              <div className="mt-1 text-xl font-extrabold text-slate-900">{totals.totalQty}</div>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-white/70 p-4">
              <div className="text-[11px] font-bold text-slate-500">Allocated Amount</div>
              <div className="mt-1 text-xl font-extrabold text-slate-900">₹{inr(totals.totalAmount)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 md:col-span-2">
              <div className="text-[11px] font-bold text-slate-500">Rule</div>
              <div className="mt-1 text-sm font-bold text-slate-800">
                Stock short lines highlighted. Batch choose karo aur qty fix karke hi save karo.
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-slate-600">Loading batches...</div>
        ) : (
          <div className="px-6 py-6">
            {!validation.ok ? (
              <div className="mb-5 rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900">
                <div className="text-sm font-extrabold">Allocation issue</div>
                <ul className="mt-2 list-disc pl-5 text-sm">
                  {validation.errors.slice(0, 5).map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                  {validation.missing.slice(0, 5).map((x, i) => (
                    <li key={`m-${i}`}>{x}</li>
                  ))}
                </ul>
                <div className="mt-2 text-xs text-rose-900/80">
                  Tip: red rows = stock short. Batch choose karo aur qty adjust karo.
                </div>
              </div>
            ) : null}

            {/* Allocation Table */}
            <div className="overflow-hidden rounded-3xl border border-slate-200">
              <div className="flex items-center justify-between bg-white px-5 py-4">
                <div className="text-sm font-extrabold text-slate-900">Allocation Table</div>
                <div className="text-xs text-slate-500">Auto sorted by expiry date</div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-[1200px] w-full">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3">Product</th>
                      <th className="px-5 py-3 text-right">Order</th>
                      <th className="px-5 py-3 text-right">Rate</th>
                      <th className="px-5 py-3">Batch</th>
                      <th className="px-5 py-3">MFG</th>
                      <th className="px-5 py-3">EXP</th>
                      <th className="px-5 py-3 text-right">Available</th>
                      <th className="px-5 py-3 text-right">Allocate</th>
                      <th className="px-5 py-3 text-right">Amount</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {allocations.map((a, idx) => {
                      const isMissingLine = !a.batchId && a.allocQty > 0;
                      const batchesForProduct = productBatches.get(a.productName) || [];
                      const amount = a.batchId ? calcLineAmount(a.allocQty, a.rate) : 0;

                      return (
                        <tr
                          key={`${a.productName}-${idx}`}
                          className={cx("hover:bg-slate-50", isMissingLine && "bg-rose-50/70")}
                        >
                          <td className="px-5 py-3 text-sm font-extrabold text-slate-900">{a.productName}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-700">{a.orderQty}</td>
                          <td className="px-5 py-3 text-right text-sm text-slate-700">₹{inr(a.rate)}</td>

                          <td className="px-5 py-3">
                            <select
                              disabled={saving || footerMode === "DISPATCH"} // ✅ lock table once packed/dispatched
                              className={cx(
                                "h-11 w-full rounded-2xl border px-3 text-sm outline-none focus:ring-4 disabled:opacity-60",
                                isMissingLine
                                  ? "border-rose-200 bg-white focus:ring-rose-100"
                                  : "border-slate-200 bg-white focus:border-[#f1a9b8] focus:ring-[#fde2e8]"
                              )}
                              value={a.batchId || ""}
                              onChange={(e) => setAllocationBatch(idx, e.target.value)}
                            >
                              <option value="">{isMissingLine ? "Select batch (stock short!)" : "Select batch"}</option>
                              {batchesForProduct.map((b) => (
                                <option key={b.id} value={b.id}>
                                  {getBatchLabel(b)}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-5 py-3 text-sm text-slate-700">{a.batchId ? fmtDateOnly(a.mfgDate || null) : "-"}</td>
                          <td className="px-5 py-3 text-sm text-slate-700">{a.batchId ? fmtDateOnly(a.expiryDate || null) : "-"}</td>

                          <td className="px-5 py-3 text-right text-sm font-bold text-slate-700">{a.batchId ? a.availableAtPick : 0}</td>

                          <td className="px-5 py-3 text-right">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              disabled={saving || footerMode === "DISPATCH"} // ✅ lock table once packed/dispatched
                              className={cx(
                                "h-11 w-28 rounded-2xl border px-3 text-sm text-right outline-none focus:ring-4 disabled:opacity-60",
                                isMissingLine
                                  ? "border-rose-200 bg-white focus:ring-rose-100"
                                  : "border-slate-200 bg-white focus:border-[#f1a9b8] focus:ring-[#fde2e8]"
                              )}
                              value={Number.isFinite(a.allocQty) ? a.allocQty : 0}
                              onChange={(e) => setAllocationQty(idx, Number(e.target.value))}
                            />
                          </td>

                          <td className="px-5 py-3 text-right text-sm font-extrabold text-slate-900">
                            {a.batchId ? `₹${inr(amount)}` : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Confirm */}
            <div className="mt-5 rounded-3xl border border-rose-100 bg-[#fffaf6] p-5">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1 h-5 w-5 accent-[#f1a9b8]"
                  checked={confirmChecked}
                  onChange={(e) => onConfirmCheckedChange(e.target.checked)}
                  disabled={saving || footerMode === "DISPATCH"} // ✅ once packed, no need to re-confirm
                />
                <div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {footerMode === "DISPATCH" ? "Allocation locked (Packed)" : "Confirm allocation & stock"}
                  </div>
                  <div className="text-xs text-slate-600">
                    {footerMode === "DISPATCH"
                      ? "Order Packed ho chuka hai. Ab Dispatch details fill karein."
                      : "Nearest expiry follow hua hai. Stock short lines fix karke hi process karein."}
                  </div>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-white px-6 py-4">
          <div className="text-xs text-slate-500">
            {footerMode === "DISPATCH"
              ? "✅ Packed done. Next step: Dispatch details (courier/transport, LR, tracking...)"
              : "Step: Verify → Process (batch allocation) → Packed"}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Close
            </button>

            {footerMode === "PROCESS" ? (
              <button
                onClick={onSave}
                disabled={loading || saving || !confirmChecked || !validation.ok}
                className={cx(
                  "h-11 rounded-2xl px-6 text-sm font-extrabold text-white shadow-sm",
                  loading || saving || !confirmChecked || !validation.ok
                    ? "cursor-not-allowed bg-slate-300"
                    : "bg-gradient-to-r from-slate-900 to-slate-800 hover:opacity-95"
                )}
              >
                {saving ? "Processing..." : "Save & Process"}
              </button>
            ) : (
              <button
                onClick={() => onGoDispatch(order.id)}
                disabled={saving || isDelivered}
                className={cx(
                  "h-11 rounded-2xl px-6 text-sm font-extrabold text-white shadow-sm",
                  saving || isDelivered
                    ? "cursor-not-allowed bg-slate-300"
                    : isDispatched
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95"
                    : "bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-95"
                )}
                title={isDelivered ? "Already delivered" : "Open Dispatch page"}
              >
                {isDelivered ? "Delivered" : isDispatched ? "Update Dispatch" : "Go to Dispatch"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
