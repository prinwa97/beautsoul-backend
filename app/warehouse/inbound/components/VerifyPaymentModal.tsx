"use client";

import React from "react";

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

  paymentStatus: "UNPAID" | "PAID";
  paymentVerified: boolean;
  paidAmount: number;
  utrNo?: string | null;

  distributor?: { name: string } | null;
  items: InboundItem[];
};

function StatusPill({ value, cx }: { value: string; cx: (...c: any[]) => string }) {
  const v = String(value || "").toUpperCase();
  const cls =
    v === "PAYMENT_VERIFIED"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : v === "PACKED"
      ? "bg-violet-50 text-violet-700 ring-violet-200"
      : v === "CANCELLED"
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1", cls)}>
      {v}
    </span>
  );
}

function PaymentPill({ status, verified }: { status: "UNPAID" | "PAID"; verified: boolean }) {
  if (status === "UNPAID") {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
        UNPAID
      </span>
    );
  }
  return verified ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      PAID • VERIFIED
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      PAID • NOT VERIFIED
    </span>
  );
}

export default function VerifyPaymentModal(props: {
  open: boolean;
  order: InboundRow | null;
  saving: boolean;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  onClose: () => void;
  onSave: () => void;

  cx: (...c: any[]) => string;
  fmtDate: (iso?: string | null) => string;
  inr: (n: any) => string;
  calcLineAmount: (qty: number, rate?: number | null) => number;

  totals: { items: number; qty: number; computedAmount: number };
}) {
  const { open, order, saving, checked, onCheckedChange, onClose, onSave, cx, fmtDate, inr, calcLineAmount, totals } =
    props;

  if (!open || !order) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mt-8 w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#fff1f5] via-white to-[#fffaf6] px-6 py-5 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xl font-extrabold text-slate-900">Verify Payment</div>
              <div className="mt-1 text-xs text-slate-500">
                Order <span className="font-semibold text-slate-900">{order.orderNo}</span> • {order.distributor?.name || "-"}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusPill value={order.status} cx={cx} />
                <PaymentPill status={order.paymentStatus} verified={order.paymentVerified} />
                <span className="text-[11px] text-slate-500">Created: {fmtDate(order.createdAt)}</span>
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
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-rose-100 bg-[#fff1f5]/60 p-4">
              <div className="text-[11px] font-bold text-slate-600">Paid Amount</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900">₹{inr(order.paidAmount)}</div>
              <div className="mt-2 text-[11px] text-slate-500">Match with bank/UPI statement.</div>
            </div>

            <div className="rounded-2xl border border-rose-100 bg-[#fffaf6] p-4 md:col-span-2">
              <div className="text-[11px] font-bold text-slate-600">UTR No</div>
              <div className="mt-2 break-all text-sm font-extrabold text-slate-900">{order.utrNo || "-"}</div>
              <div className="mt-2 text-[11px] text-slate-500">UTR correct ho tabhi verify karein.</div>
            </div>
          </div>

          {/* Items */}
          <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-gradient-to-r from-[#fff1f5] to-white px-5 py-4">
              <div className="text-sm font-extrabold text-slate-900">Order Items</div>
              <div className="text-xs text-slate-600">
                Items <b>{totals.items}</b> • Qty <b>{totals.qty}</b> • Calc <b>₹{inr(totals.computedAmount)}</b>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-white">
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
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
                      <tr key={it.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 text-sm font-bold text-slate-900">{it.productName}</td>
                        <td className="px-5 py-3 text-right text-sm text-slate-700">{it.orderedQtyPcs}</td>
                        <td className="px-5 py-3 text-right text-sm text-slate-700">₹{inr(Number(it.rate || 0))}</td>
                        <td className="px-5 py-3 text-right text-sm font-extrabold text-slate-900">₹{inr(amt)}</td>
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
                checked={checked}
                onChange={(e) => onCheckedChange(e.target.checked)}
                disabled={saving}
              />
              <div>
                <div className="text-sm font-extrabold text-slate-900">I confirm payment is correct</div>
                <div className="text-xs text-slate-600">Amount + UTR confirm karke hi “Verify” karein.</div>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            onClick={onSave}
            disabled={!checked || saving}
            className={cx(
              "h-11 rounded-2xl px-5 text-sm font-extrabold text-white shadow-sm",
              !checked || saving ? "cursor-not-allowed bg-slate-300" : "bg-gradient-to-r from-rose-600 to-pink-600 hover:opacity-95"
            )}
          >
            {saving ? "Saving..." : "Save & Verify"}
          </button>
        </div>
      </div>
    </div>
  );
}
