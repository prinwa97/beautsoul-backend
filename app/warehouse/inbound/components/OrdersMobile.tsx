"use client";

import React from "react";

type InboundItem = {
  id: string;
  productName: string;
  orderedQtyPcs: number;
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

  distributor?: { name: string; city?: string | null; state?: string | null } | null;
  items: InboundItem[];
};

function StatusPill({ value, cx }: { value: string; cx: (...c: any[]) => string }) {
  const v = String(value || "").toUpperCase();
  const cls =
    v === "CREATED"
      ? "bg-slate-100 text-slate-700 ring-slate-200"
      : v === "CONFIRMED"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : v === "PAYMENT_VERIFIED"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : v === "PACKED"
      ? "bg-violet-50 text-violet-700 ring-violet-200"
      : v === "DISPATCHED"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : v === "IN_TRANSIT"
      ? "bg-orange-50 text-orange-800 ring-orange-200"
      : v === "DELIVERED"
      ? "bg-green-50 text-green-700 ring-green-200"
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

export default function OrdersMobile(props: {
  rows: InboundRow[];
  loading: boolean;
  onVerify: (o: InboundRow) => void;
  onProcess: (o: InboundRow) => void;

  // Dispatch only for PACKED
  onDispatch?: (orderId: string) => void;

  cx: (...c: any[]) => string;
  fmtDate: (iso?: string | null) => string;
  inr: (n: any) => string;
}) {
  const { rows, loading, onVerify, onProcess, onDispatch, cx, fmtDate, inr } = props;

  return (
    <div className="mt-6 grid gap-4 md:hidden">
      {rows.map((r) => {
        const status = String(r.status || "").toUpperCase();

        const canVerify = r.paymentStatus === "PAID" && !r.paymentVerified;

        const canProcess =
          r.paymentVerified &&
          status !== "PACKED" &&
          status !== "DISPATCHED" &&
          status !== "IN_TRANSIT" &&
          status !== "DELIVERED";

        // ✅ Option A: Dispatch ONLY on PACKED
        const canDispatch = r.paymentVerified && status === "PACKED";

        // ✅ Completed view (no Update Dispatch)
        const isCompleted = status === "DISPATCHED" || status === "IN_TRANSIT" || status === "DELIVERED";

        const processLabel = isCompleted ? "Completed ✅" : status === "PACKED" ? "Packed ✅" : "Process";

        return (
          <div
            key={r.id}
            className="rounded-3xl border border-slate-200/70 bg-white/80 shadow-[0_12px_30px_-22px_rgba(0,0,0,0.35)] backdrop-blur"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-[#fff1f5] via-white to-[#fffaf6] px-4 py-4">
              <div>
                <div className="text-base font-extrabold text-slate-900">{r.orderNo}</div>
                <div className="text-xs text-slate-500">{fmtDate(r.createdAt)}</div>
              </div>
              <StatusPill value={r.status} cx={cx} />
            </div>

            <div className="px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">{r.distributor?.name || "-"}</div>
                  <div className="text-xs text-slate-500">
                    {(r.distributor?.city || "-") + (r.distributor?.state ? `, ${r.distributor.state}` : "")}
                  </div>
                </div>

                <div className="text-right">
                  <PaymentPill status={r.paymentStatus} verified={r.paymentVerified} />
                  <div className="mt-1 text-[11px] text-slate-600">
                    ₹<span className="font-bold text-slate-900">{inr(r.paidAmount)}</span> • UTR{" "}
                    <span className="font-semibold text-slate-900">{r.utrNo || "-"}</span>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="mt-4 rounded-2xl bg-[#fff1f5]/60 ring-1 ring-rose-100 px-3 py-3">
                <div className="text-[11px] font-bold text-slate-700">Items</div>
                <div className="mt-2 space-y-1 text-sm">
                  {(r.items || []).slice(0, 4).map((it) => (
                    <div key={it.id} className="flex justify-between gap-3">
                      <span className="max-w-[220px] truncate text-slate-700">{it.productName}</span>
                      <span className="font-extrabold text-slate-900">{it.orderedQtyPcs}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {canVerify ? (
                  <button
                    onClick={() => onVerify(r)}
                    disabled={loading}
                    className="col-span-2 w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-sm font-extrabold text-white shadow-sm disabled:opacity-60"
                  >
                    Verify Payment
                  </button>
                ) : !r.paymentVerified ? (
                  <div className="col-span-2 rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
                    Waiting for payment
                  </div>
                ) : isCompleted ? (
                  <div className="col-span-2 rounded-2xl bg-emerald-50 px-4 py-3 text-center text-sm font-extrabold text-emerald-700 ring-1 ring-emerald-200">
                    Completed ✅
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => onProcess(r)}
                      disabled={loading || !canProcess}
                      className={cx(
                        "w-full rounded-2xl px-4 py-3 text-sm font-extrabold shadow-sm",
                        loading || !canProcess ? "bg-slate-200 text-slate-500" : "bg-slate-900 text-white hover:bg-slate-800"
                      )}
                      title="Process this order"
                    >
                      {processLabel}
                    </button>

                    {canDispatch ? (
                      <button
                        onClick={() => onDispatch?.(r.id)}
                        disabled={loading || !onDispatch}
                        className={cx(
                          "w-full rounded-2xl px-4 py-3 text-sm font-extrabold shadow-sm",
                          loading || !onDispatch
                            ? "bg-slate-200 text-slate-500"
                            : "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:opacity-95"
                        )}
                        title={!onDispatch ? "onDispatch not passed from parent" : "Open dispatch form"}
                      >
                        Dispatch
                      </button>
                    ) : (
                      <div className="rounded-2xl bg-slate-50 px-4 py-3 text-center text-xs font-semibold text-slate-500 ring-1 ring-slate-100">
                        Dispatch only after PACKED
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {!rows.length ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center">
          <div className="text-sm font-extrabold text-slate-900">No inbound orders</div>
          <div className="mt-1 text-xs text-slate-500">{loading ? "Loading..." : "Try refresh or filters."}</div>
        </div>
      ) : null}
    </div>
  );
}
