"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cx } from "./ui";

type ShippingModeUI = "COURIER" | "TRANSPORT" | "SELF";

function clean(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

export default function DispatchDetailsModal(props: {
  open: boolean;
  loading: boolean;
  saving: boolean;

  order: {
    id: string;
    orderNo: string;
    distributorName?: string | null;
    createdAt?: string | null;

    shippingMode?: string | null;
    courierName?: string | null;
    transportName?: string | null;
    lrNo?: string | null;
    trackingNo?: string | null;
    trackingCarrier?: string | null;
    dispatchDate?: string | null;
  } | null;

  onClose: () => void;
  onSave: (payload: {
    shippingMode: ShippingModeUI;
    courierName?: string;
    transportName?: string;
    lrNo?: string;
    trackingNo?: string;
    trackingCarrier?: string;
    dispatchDate?: string; // ISO
  }) => void;

  fmtDate: (iso?: string | null) => string;
}) {
  const { open, loading, saving, order, onClose, onSave, fmtDate } = props;

  const [mode, setMode] = useState<ShippingModeUI>("COURIER");
  const [courierName, setCourierName] = useState("");
  const [transportName, setTransportName] = useState("");
  const [lrNo, setLrNo] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [trackingCarrier, setTrackingCarrier] = useState("");
  const [dispatchDate, setDispatchDate] = useState(""); // datetime-local string
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    if (!open || !order) return;

    const m = String(order.shippingMode || "").toUpperCase();
    const initialMode: ShippingModeUI = m === "TRANSPORT" ? "TRANSPORT" : m === "SELF" ? "SELF" : "COURIER";

    setMode(initialMode);
    setCourierName(clean(order.courierName));
    setTransportName(clean(order.transportName));
    setLrNo(clean(order.lrNo));
    setTrackingNo(clean(order.trackingNo));
    setTrackingCarrier(clean(order.trackingCarrier));

    if (order.dispatchDate) {
      try {
        const d = new Date(order.dispatchDate);
        const pad = (n: number) => String(n).padStart(2, "0");
        const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        setDispatchDate(local);
      } catch {
        setDispatchDate("");
      }
    } else {
      setDispatchDate("");
    }

    setErr("");
  }, [open, order]);

  const validation = useMemo(() => {
    const e: string[] = [];
    if (!mode) e.push("Mode required");

    if (mode === "COURIER") {
      if (!clean(courierName)) e.push("Courier name required");
    }
    if (mode === "TRANSPORT") {
      if (!clean(transportName)) e.push("Transport name required");
      if (!clean(lrNo)) e.push("LR No required");
    }
    return { ok: e.length === 0, first: e[0] || "" };
  }, [mode, courierName, transportName, lrNo]);

  function submit() {
    if (!order) return;
    if (!validation.ok) {
      setErr(validation.first);
      return;
    }

    let iso: string | undefined = undefined;
    if (dispatchDate) {
      try {
        iso = new Date(dispatchDate).toISOString();
      } catch {
        iso = undefined;
      }
    }

    onSave({
      shippingMode: mode,
      courierName: mode === "COURIER" ? clean(courierName) : undefined,
      transportName: mode === "TRANSPORT" ? clean(transportName) : undefined,
      lrNo: mode === "TRANSPORT" ? clean(lrNo) : undefined,
      trackingNo: clean(trackingNo) || undefined,
      trackingCarrier: clean(trackingCarrier) || undefined,
      dispatchDate: iso,
    });
  }

  if (!open || !order) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mt-6 w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 bg-gradient-to-r from-[#fff1f5] via-white to-[#fffaf6] px-6 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xl font-extrabold text-slate-900">Dispatch Details</div>
              <div className="mt-1 text-xs text-slate-600">
                Order <span className="font-semibold text-slate-900">{order.orderNo}</span>
                {order.distributorName ? (
                  <>
                    {" "}
                    • <span className="font-semibold text-slate-900">{order.distributorName}</span>
                  </>
                ) : null}
              </div>
              <div className="mt-1 text-[11px] text-slate-500">Created: {fmtDate(order.createdAt || null)}</div>
            </div>

            <button
              onClick={onClose}
              disabled={saving}
              className="rounded-2xl bg-white px-4 py-2 text-sm font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-60"
            >
              Close
            </button>
          </div>

          {err ? (
            <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-900">
              {err}
            </div>
          ) : null}
        </div>

        <div className="px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-extrabold text-slate-600">Mode of Transport</div>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as ShippingModeUI)}
                disabled={saving || loading}
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#f1a9b8] focus:ring-4 focus:ring-[#fde2e8]"
              >
                <option value="COURIER">COURIER</option>
                <option value="TRANSPORT">TRANSPORT</option>
                <option value="SELF">SELF</option>
              </select>
              <div className="mt-2 text-[11px] text-slate-500">Courier = Tracking, Transport = LR, Self = manual delivery.</div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4">
              <div className="text-[11px] font-extrabold text-slate-600">Dispatch Date/Time (optional)</div>
              <input
                type="datetime-local"
                value={dispatchDate}
                onChange={(e) => setDispatchDate(e.target.value)}
                disabled={saving || loading}
                className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#f1a9b8] focus:ring-4 focus:ring-[#fde2e8]"
              />
              <div className="mt-2 text-[11px] text-slate-500">Blank chhodo to server current time use karega (optional).</div>
            </div>
          </div>

          <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-5">
            {mode === "COURIER" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Courier Name *</div>
                  <input
                    value={courierName}
                    onChange={(e) => setCourierName(e.target.value)}
                    disabled={saving || loading}
                    placeholder="e.g., DTDC / BlueDart"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#f1a9b8] focus:ring-4 focus:ring-[#fde2e8]"
                  />
                </div>

                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Tracking No (optional)</div>
                  <input
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value)}
                    disabled={saving || loading}
                    placeholder="AWB / Tracking number"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#f1a9b8] focus:ring-4 focus:ring-[#fde2e8]"
                  />
                </div>

                <div className="md:col-span-2">
                  <div className="text-[11px] font-extrabold text-slate-600">Tracking Carrier (optional)</div>
                  <input
                    value={trackingCarrier}
                    onChange={(e) => setTrackingCarrier(e.target.value)}
                    disabled={saving || loading}
                    placeholder="Carrier / Partner"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#f1a9b8] focus:ring-4 focus:ring-[#fde2e8]"
                  />
                </div>
              </div>
            ) : mode === "TRANSPORT" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Transport Name *</div>
                  <input
                    value={transportName}
                    onChange={(e) => setTransportName(e.target.value)}
                    disabled={saving || loading}
                    placeholder="e.g., XYZ Transport"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#f1a9b8] focus:ring-4 focus:ring-[#fde2e8]"
                  />
                </div>

                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">LR No *</div>
                  <input
                    value={lrNo}
                    onChange={(e) => setLrNo(e.target.value)}
                    disabled={saving || loading}
                    placeholder="LR number"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#f1a9b8] focus:ring-4 focus:ring-[#fde2e8]"
                  />
                </div>

                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Tracking No (optional)</div>
                  <input
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value)}
                    disabled={saving || loading}
                    placeholder="If available"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#f1a9b8] focus:ring-4 focus:ring-[#fde2e8]"
                  />
                </div>

                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Tracking Carrier (optional)</div>
                  <input
                    value={trackingCarrier}
                    onChange={(e) => setTrackingCarrier(e.target.value)}
                    disabled={saving || loading}
                    placeholder="If available"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#f1a9b8] focus:ring-4 focus:ring-[#fde2e8]"
                  />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Tracking No (optional)</div>
                  <input
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value)}
                    disabled={saving || loading}
                    placeholder="Optional"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#f1a9b8] focus:ring-4 focus:ring-[#fde2e8]"
                  />
                </div>

                <div>
                  <div className="text-[11px] font-extrabold text-slate-600">Carrier/Notes (optional)</div>
                  <input
                    value={trackingCarrier}
                    onChange={(e) => setTrackingCarrier(e.target.value)}
                    disabled={saving || loading}
                    placeholder="Optional"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none focus:border-[#f1a9b8] focus:ring-4 focus:ring-[#fde2e8]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-white px-6 py-4">
          <div className="text-xs text-slate-500">
            Save karte hi status <b className="text-slate-900">DISPATCHED</b> ho jayega.
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              onClick={submit}
              disabled={saving || loading || !validation.ok}
              className={cx(
                "h-11 rounded-2xl px-6 text-sm font-extrabold text-white shadow-sm",
                saving || loading || !validation.ok ? "cursor-not-allowed bg-slate-300" : "bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-95"
              )}
            >
              {saving ? "Saving..." : "Save Dispatch"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
