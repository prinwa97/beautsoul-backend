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
  dispatchDate?: string | null;

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

export default function OrdersTable(props: {
  rows: InboundRow[];
  loading: boolean;
  onVerify: (o: InboundRow) => void;
  onProcess: (o: InboundRow) => void;

  // ✅ Dispatch only for PACKED
  onDispatch?: (orderId: string) => void;

  cx: (...c: any[]) => string;
  fmtDate: (iso?: string | null) => string;
  inr: (n: any) => string;
}) {
  const { rows, loading, onVerify, onProcess, onDispatch, cx, fmtDate, inr } = props;

  return (
    <div className="mt-6 hidden md:block">
      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.25)] backdrop-blur">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-[#fff1f5] via-white to-[#fffaf6] px-5 py-4">
          <div>
            <div className="text-sm font-bold text-slate-900">Inbound Orders</div>
            <div className="text-xs text-slate-500">Verify → Process → Dispatch (only PACKED)</div>
          </div>
          <div className="text-xs text-slate-500">
            Total: <b className="text-slate-900">{rows.length}</b>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full">
            <thead className="bg-white">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3">Order</th>
                <th className="px-5 py-3">Distributor</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Payment</th>
                <th className="px-5 py-3">Items</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => {
                const status = String(r.status || "").toUpperCase();

                const canVerify = r.paymentStatus === "PAID" && !r.paymentVerified;

                const canProcess =
                  r.paymentVerified &&
                  status !== "PACKED" &&
                  status !== "DISPATCHED" &&
                  status !== "IN_TRANSIT" &&
                  status !== "DELIVERED";

                // ✅ Dispatch only on PACKED
                const canDispatch = r.paymentVerified && status === "PACKED";

                const isCompleted = status === "DISPATCHED" || status === "IN_TRANSIT" || status === "DELIVERED";

                return (
                  <tr key={r.id} className="group hover:bg-[#fff1f5]/60">
                    <td className="px-5 py-4">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{r.orderNo}</div>
                        <div className="text-xs text-slate-500">{fmtDate(r.createdAt)}</div>
                        {r.dispatchDate ? (
                          <div className="text-[11px] text-slate-400">Dispatch: {fmtDate(r.dispatchDate)}</div>
                        ) : null}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="text-sm font-semibold text-slate-900">{r.distributor?.name || "-"}</div>
                      <div className="text-xs text-slate-500">
                        {(r.distributor?.city || "-") + (r.distributor?.state ? `, ${r.distributor.state}` : "")}
                      </div>
                    </td>

                    {/* ✅ Removed stepper/journey */}
                    <td className="px-5 py-4">
                      <StatusPill value={r.status} cx={cx} />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex flex-col gap-1">
                        <PaymentPill status={r.paymentStatus} verified={r.paymentVerified} />
                        <div className="text-xs text-slate-600">
                          ₹<span className="font-bold text-slate-900">{inr(r.paidAmount)}</span>{" "}
                          <span className="text-slate-400">•</span>{" "}
                          <span className="text-slate-500">UTR:</span>{" "}
                          <span className="font-semibold text-slate-900">{r.utrNo || "-"}</span>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="rounded-2xl bg-white/80 ring-1 ring-slate-100 px-3 py-2">
                        <div className="space-y-1 text-xs">
                          {(r.items || []).slice(0, 3).map((it) => (
                            <div key={it.id} className="flex justify-between gap-3">
                              <span className="max-w-[220px] truncate text-slate-700">{it.productName}</span>
                              <span className="font-bold text-slate-900">{it.orderedQtyPcs}</span>
                            </div>
                          ))}
                          {(r.items?.length || 0) > 3 ? (
                            <div className="pt-1 text-[11px] text-slate-400">+{(r.items.length || 0) - 3} more</div>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      {canVerify ? (
                        <button
                          onClick={() => onVerify(r)}
                          disabled={loading}
                          className="rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
                        >
                          Verify
                        </button>
                      ) : !r.paymentVerified ? (
                        <span className="text-xs font-semibold text-slate-400">Waiting payment</span>
                      ) : isCompleted ? (
                        <span className="inline-flex items-center rounded-2xl bg-emerald-50 px-4 py-2 text-sm font-extrabold text-emerald-700 ring-1 ring-emerald-200">
                          Completed ✅
                        </span>
                      ) : (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => onProcess(r)}
                            disabled={loading || !canProcess}
                            className={cx(
                              "rounded-2xl px-4 py-2 text-sm font-bold shadow-sm",
                              loading || !canProcess
                                ? "bg-slate-200 text-slate-500"
                                : "bg-slate-900 text-white hover:bg-slate-800"
                            )}
                            title="Process this order"
                          >
                            Process
                          </button>

                          {canDispatch ? (
                            <button
                              onClick={() => onDispatch?.(r.id)}
                              disabled={loading || !onDispatch}
                              className={cx(
                                "rounded-2xl px-4 py-2 text-sm font-bold shadow-sm",
                                loading || !onDispatch
                                  ? "bg-slate-200 text-slate-500"
                                  : "bg-gradient-to-r from-pink-500 to-rose-500 text-white hover:opacity-95"
                              )}
                              title={!onDispatch ? "onDispatch not passed from parent" : "Open dispatch form"}
                            >
                              Dispatch
                            </button>
                          ) : (
                            <span className="text-xs font-semibold text-slate-400">Dispatch only on PACKED</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}

              {!rows.length ? (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center">
                    <div className="mx-auto max-w-md">
                      <div className="text-sm font-bold text-slate-900">No inbound orders</div>
                      <div className="mt-1 text-xs text-slate-500">{loading ? "Loading..." : "Try refresh."}</div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
