"use client";

import React, { useEffect, useMemo, useState } from "react";

type Item = {
  id: string;
  productName: string;
  orderedQtyPcs: number;
  rate?: number | null;

  batchNo?: string | null;
  mfgDate?: string | null;
  expiryDate?: string | null;
};

type Order = {
  id: string;
  orderNo: string;
  status: string;
  createdAt: string;
  expectedAt?: string | null;

  paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
  paymentVerified: boolean;
  paymentMode?: string | null;
  paidAmount: number;
  utrNo?: string | null;
  paidAt?: string | null;

  distributor: { id: string; name: string; city?: string | null; state?: string | null };
  items: Item[];
};

type Msg = { type: "ok" | "err"; text: string } | null;

function inr(n: number) {
  try {
    return n.toLocaleString("en-IN");
  } catch {
    return String(n);
  }
}

function safe(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function d(iso?: string | null) {
  if (!iso) return "-";
  const x = new Date(iso);
  return isNaN(+x) ? String(iso) : x.toLocaleString("en-IN");
}

function onlyDate(iso?: string | null) {
  if (!iso) return "";
  const x = new Date(iso);
  if (isNaN(+x)) return "";
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth() + 1).padStart(2, "0");
  const dd = String(x.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type Row = {
  itemId: string;
  productName: string;
  orderedQty: number;
  dispatchQty: number;
  batchNo: string;
  mfgDate: string;
  expiryDate: string;
};

type TransportMode = "TRANSPORT" | "COURIER" | "BUS" | "SELF";

export default function ProcessDispatchClient({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const [order, setOrder] = useState<Order | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  const [mode, setMode] = useState<TransportMode>("TRANSPORT");
  const [transportName, setTransportName] = useState("");
  const [trackingNo, setTrackingNo] = useState("");
  const [parcels, setParcels] = useState<number>(1);
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [dispatchDate] = useState<string>(onlyDate(new Date().toISOString()));
  const [notes, setNotes] = useState("");

  async function load() {
    setLoading(true);
    setMsg(null);

    try {
      const r = await fetch(`/api/warehouse/inbound/${orderId}`, { cache: "no-store" });
      const j = await r.json();

      if (!r.ok) throw new Error(j?.error || "Load failed");

      const o: Order = j.order;
      setOrder(o);

      const initial: Row[] = (o.items || []).map((it) => ({
        itemId: it.id,
        productName: it.productName,
        orderedQty: safe(it.orderedQtyPcs),
        dispatchQty: safe(it.orderedQtyPcs),
        batchNo: (it.batchNo || "").trim(),
        mfgDate: it.mfgDate ? onlyDate(it.mfgDate) : "",
        expiryDate: it.expiryDate ? onlyDate(it.expiryDate) : "",
      }));

      setRows(initial);
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Load failed" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const canDispatch = useMemo(() => {
    if (!order) return false;
    return order.paymentStatus === "PAID" && order.paymentVerified;
  }, [order]);

  const totals = useMemo(() => {
    if (!order) return { ordered: 0, dispatch: 0, amount: 0 };
    const ordered = rows.reduce((s, r) => s + safe(r.orderedQty), 0);
    const dispatch = rows.reduce((s, r) => s + safe(r.dispatchQty), 0);
    const amount = safe(order.paidAmount);
    return { ordered, dispatch, amount };
  }, [rows, order]);

  function updateRow(itemId: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.itemId === itemId ? { ...r, ...patch } : r)));
  }

  function validate(): string | null {
    if (!order) return "Order not loaded";
    if (!canDispatch) return "Dispatch blocked. Payment must be PAID and verified.";

    if (!dispatchDate) return "Dispatch date required.";
    if (!mode) return "Transport mode required.";
    if (!transportName.trim()) return "Transport/Courier name required.";
    if (!trackingNo.trim()) return "LR/Tracking number required.";
    if (!parcels || parcels < 1) return "No. of parcels must be >= 1.";

    for (const r of rows) {
      const dq = safe(r.dispatchQty);
      const oq = safe(r.orderedQty);

      if (dq < 0) return `Dispatch qty negative not allowed: ${r.productName}`;
      if (dq > oq) return `Dispatch qty cannot exceed ordered: ${r.productName}`;
      if (dq === 0) continue;

      if (!r.batchNo.trim()) return `Batch No required: ${r.productName}`;
      if (!r.mfgDate) return `MFG date required: ${r.productName}`;
      if (!r.expiryDate) return `Expiry date required: ${r.productName}`;

      const m = new Date(r.mfgDate + "T00:00:00");
      const e = new Date(r.expiryDate + "T00:00:00");
      if (isNaN(+m) || isNaN(+e)) return `Invalid date (MFG/EXP): ${r.productName}`;
      if (+e <= +m) return `Expiry must be after MFG: ${r.productName}`;
    }

    return null;
  }

  async function submitDispatch() {
    const err = validate();
    if (err) {
      setMsg({ type: "err", text: err });
      return;
    }

    try {
      setLoading(true);
      setMsg(null);

      const payload = {
        dispatchDate,
        transport: {
          mode,
          name: transportName.trim(),
          trackingNo: trackingNo.trim(),
          parcels: safe(parcels),
          driverName: driverName.trim() || null,
          driverPhone: driverPhone.trim() || null,
          notes: notes.trim() || null,
        },
        items: rows.map((r) => ({
          itemId: r.itemId,
          dispatchQtyPcs: safe(r.dispatchQty),
          batchNo: r.batchNo.trim(),
          mfgDate: r.mfgDate,
          expiryDate: r.expiryDate,
        })),
      };

      const res = await fetch(`/api/warehouse/inbound/${orderId}/dispatch`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Dispatch failed");

      setMsg({ type: "ok", text: "Dispatch submitted ✅ Redirecting..." });

      setTimeout(() => {
        window.location.href = "/warehouse/dispatch-history";
      }, 600);
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Dispatch failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fff7f9] via-white to-[#fffaf6] text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-5">
        {/* Top bar */}
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-2xl font-bold text-gray-900">Process / Dispatch</div>
              <div className="mt-1 text-sm text-gray-600">
                Fill batch + MFG + expiry for each item, then submit dispatch with transport details.
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => (window.location.href = "/warehouse/inbound")}
                type="button"
                className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                Back
              </button>

              <button
                onClick={load}
                disabled={loading}
                type="button"
                className="rounded-xl bg-gradient-to-r from-pink-400 to-rose-400 px-4 py-2 text-sm font-semibold text-white shadow hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
        </div>

        {msg && (
          <div
            className={cx(
              "mt-4 rounded-2xl border px-4 py-3 text-sm font-medium",
              msg.type === "ok"
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-700"
            )}
          >
            {msg.text}
          </div>
        )}

        {/* Order summary */}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Order</div>
            <div className="mt-1 text-lg font-bold text-gray-900">{order?.orderNo || "-"}</div>
            <div className="mt-2 text-sm text-gray-600">Created: {d(order?.createdAt)}</div>
            <div className="mt-1 text-sm text-gray-600">
              Status: <span className="font-semibold text-gray-900">{order?.status || "-"}</span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Distributor</div>
            <div className="mt-1 text-lg font-bold text-gray-900">{order?.distributor?.name || "-"}</div>
            <div className="mt-2 text-sm text-gray-600">
              {order?.distributor?.city || "-"}
              {order?.distributor?.state ? `, ${order.distributor.state}` : ""}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Payment Lock</div>
            <div className="mt-2 text-sm text-gray-700">
              Status: <span className="font-semibold text-gray-900">{order?.paymentStatus || "-"}</span>
            </div>
            <div className="mt-1 text-sm text-gray-700">
              Verified: <span className="font-semibold text-gray-900">{order?.paymentVerified ? "YES" : "NO"}</span>
            </div>
            <div className="mt-1 text-sm text-gray-700">
              Paid Amount: <span className="font-semibold text-gray-900">₹{inr(safe(order?.paidAmount))}</span>
            </div>

            {!canDispatch && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                Dispatch blocked until payment is PAID and verified.
              </div>
            )}
          </div>
        </div>

        {/* KPI strip */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Ordered Qty (pcs)</div>
            <div className="mt-1 text-xl font-bold text-gray-900">{inr(totals.ordered)}</div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Dispatch Qty (pcs)</div>
            <div className="mt-1 text-xl font-bold text-gray-900">{inr(totals.dispatch)}</div>
            {totals.dispatch !== totals.ordered && (
              <div className="mt-1 text-xs font-medium text-amber-700">Short dispatch detected</div>
            )}
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Paid Amount</div>
            <div className="mt-1 text-xl font-bold text-gray-900">₹{inr(totals.amount)}</div>
          </div>
        </div>

        {/* Items table */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-pink-50 to-rose-50 px-4 py-3">
            <div className="text-base font-semibold text-gray-900">Dispatch Items</div>
            <div className="text-xs font-medium text-gray-600">{rows.length} items</div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-[1200px] w-full text-sm">
              <thead className="bg-white">
                <tr className="border-b border-gray-200 text-left text-sm font-semibold text-gray-700">
                  <th className="p-3">Product</th>
                  <th className="p-3">Ordered (pcs)</th>
                  <th className="p-3">Dispatch (pcs)</th>
                  <th className="p-3">Batch No</th>
                  <th className="p-3">MFG</th>
                  <th className="p-3">Expiry</th>
                </tr>
              </thead>

              <tbody className="text-gray-900">
                {rows.map((r) => (
                  <tr key={r.itemId} className="border-b border-gray-100 hover:bg-pink-50/30">
                    <td className="p-3">
                      <div className="font-semibold text-gray-900">{r.productName}</div>
                    </td>

                    <td className="p-3 font-medium text-gray-800">{inr(r.orderedQty)}</td>

                    <td className="p-3">
                      <input
                        type="number"
                        min={0}
                        max={r.orderedQty}
                        value={r.dispatchQty}
                        onChange={(e) => updateRow(r.itemId, { dispatchQty: safe(e.target.value) })}
                        className="w-[140px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-black"
                        disabled={!canDispatch || loading}
                      />
                    </td>

                    <td className="p-3">
                      <input
                        value={r.batchNo}
                        onChange={(e) => updateRow(r.itemId, { batchNo: e.target.value })}
                        placeholder="Batch no"
                        className="w-[180px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-500"
                        disabled={!canDispatch || loading || r.dispatchQty === 0}
                      />
                    </td>

                    <td className="p-3">
                      <input
                        type="date"
                        value={r.mfgDate}
                        onChange={(e) => updateRow(r.itemId, { mfgDate: e.target.value })}
                        className="w-[160px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-500"
                        disabled={!canDispatch || loading || r.dispatchQty === 0}
                      />
                    </td>

                    <td className="p-3">
                      <input
                        type="date"
                        value={r.expiryDate}
                        onChange={(e) => updateRow(r.itemId, { expiryDate: e.target.value })}
                        className="w-[160px] rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-500"
                        disabled={!canDispatch || loading || r.dispatchQty === 0}
                      />
                    </td>
                  </tr>
                ))}

                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-sm font-medium text-gray-500">
                      No items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
            Tip: If any item is not dispatching today, set Dispatch Qty to 0. Batch/MFG/Expiry will become optional for that row.
          </div>
        </div>

        {/* Transport section */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 bg-gradient-to-r from-pink-50 to-rose-50 px-4 py-3">
            <div className="text-base font-semibold text-gray-900">Transport / Parcel Details</div>
            <div className="mt-1 text-sm text-gray-600">
              This information will be stored with the dispatch record.
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 p-4 text-sm md:grid-cols-3">
            <div>
              <div className="mb-1 text-xs font-medium text-gray-500">Dispatch Date</div>
              <input
                type="date"
                value={dispatchDate}
                readOnly
                className="w-full cursor-not-allowed rounded-xl border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-700"
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-gray-500">Mode</div>
              <select
                value={mode}
                onChange={(e) => setMode(e.target.value as TransportMode)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!canDispatch || loading}
              >
                <option value="TRANSPORT">Transport</option>
                <option value="COURIER">Courier</option>
                <option value="BUS">Bus</option>
                <option value="SELF">Self</option>
              </select>
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-gray-500">Transport / Courier Name</div>
              <input
                value={transportName}
                onChange={(e) => setTransportName(e.target.value)}
                placeholder="e.g. Delhivery / VRL / Local Transport"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!canDispatch || loading}
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-gray-500">LR / Tracking No</div>
              <input
                value={trackingNo}
                onChange={(e) => setTrackingNo(e.target.value)}
                placeholder="LR / Tracking"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!canDispatch || loading}
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-gray-500">No. of Parcels</div>
              <input
                type="number"
                min={1}
                value={parcels}
                onChange={(e) => setParcels(safe(e.target.value))}
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!canDispatch || loading}
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-gray-500">Driver/Person (optional)</div>
              <input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Driver / Person name"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!canDispatch || loading}
              />
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-gray-500">Phone (optional)</div>
              <input
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="Mobile"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!canDispatch || loading}
              />
            </div>

            <div className="md:col-span-2">
              <div className="mb-1 text-xs font-medium text-gray-500">Notes (optional)</div>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special handling / remarks"
                className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!canDispatch || loading}
              />
            </div>
          </div>
        </div>

        {/* Sticky bottom action bar */}
        <div className="sticky bottom-0 mt-4">
          <div className="rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-lg backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">Dispatch Summary</div>
                <div className="mt-1 text-sm text-gray-600">
                  Ordered: <span className="font-semibold text-gray-900">{inr(totals.ordered)}</span> • Dispatch:{" "}
                  <span className="font-semibold text-gray-900">{inr(totals.dispatch)}</span> • Paid Amount:{" "}
                  <span className="font-semibold text-gray-900">₹{inr(totals.amount)}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-60"
                  onClick={() => load()}
                  disabled={loading}
                  type="button"
                >
                  Reset Form
                </button>

                <button
                  className={cx(
                    "rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow",
                    canDispatch
                      ? "bg-gradient-to-r from-pink-400 to-rose-400 hover:opacity-90"
                      : "cursor-not-allowed bg-gray-300 text-gray-500 shadow-none"
                  )}
                  disabled={!canDispatch || loading}
                  onClick={submitDispatch}
                  type="button"
                  title={canDispatch ? "Submit dispatch" : "Payment must be PAID & verified"}
                >
                  {loading ? "Submitting..." : "Submit Dispatch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}