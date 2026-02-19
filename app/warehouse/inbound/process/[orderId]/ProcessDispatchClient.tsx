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

type Row = {
  itemId: string;
  productName: string;
  orderedQty: number;
  dispatchQty: number;

  batchNo: string;
  mfgDate: string; // yyyy-mm-dd
  expiryDate: string; // yyyy-mm-dd
};

type TransportMode = "TRANSPORT" | "COURIER" | "BUS" | "SELF";

export default function ProcessDispatchClient({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const [order, setOrder] = useState<Order | null>(null);
  const [rows, setRows] = useState<Row[]>([]);

  // transport details
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

    // ✅ Professional rule: carrier name + tracking required
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
    if (err) return setMsg({ type: "err", text: err });

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

      // ✅ IMPORTANT: dispatch has separate endpoint to avoid payload clash with allocation
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
    <div className="p-1">
      {/* Top bar */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl md:text-2xl font-semibold text-gray-800">Process / Dispatch</div>
          <div className="text-xs text-gray-600 mt-1">
            Fill batch + MFG + expiry for each item, then submit dispatch with transport details.
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => (window.location.href = "/warehouse/inbound")}
            className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm"
          >
            Back
          </button>
          <button
            onClick={load}
            disabled={loading}
            className="px-3 py-2 rounded-xl text-sm text-white shadow bg-gradient-to-r from-pink-400 to-rose-400 hover:opacity-90 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`mt-4 p-3 rounded-xl text-sm ${
            msg.type === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Order summary */}
      <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-gray-500">Order</div>
          <div className="text-lg font-semibold text-gray-800 mt-1">{order?.orderNo || "-"}</div>
          <div className="text-xs text-gray-500 mt-1">Created: {d(order?.createdAt)}</div>
          <div className="text-xs text-gray-500 mt-1">
            Status: <b className="text-gray-800">{order?.status || "-"}</b>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-gray-500">Distributor</div>
          <div className="text-lg font-semibold text-gray-800 mt-1">{order?.distributor?.name || "-"}</div>
          <div className="text-xs text-gray-500 mt-1">
            {(order?.distributor?.city || "-")}
            {order?.distributor?.state ? `, ${order.distributor.state}` : ""}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="text-xs text-gray-500">Payment Lock</div>
          <div className="text-sm mt-2">
            Status: <b className="text-gray-800">{order?.paymentStatus || "-"}</b>
          </div>
          <div className="text-sm mt-1">
            Verified: <b className="text-gray-800">{order?.paymentVerified ? "YES" : "NO"}</b>
          </div>
          <div className="text-sm mt-1">
            Paid Amount: <b className="text-gray-800">₹{inr(safe(order?.paidAmount))}</b>
          </div>

          {!canDispatch && <div className="mt-2 text-xs text-red-700">Dispatch blocked until payment is PAID and verified.</div>}
        </div>
      </div>

      {/* KPI strip */}
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border bg-white p-3">
          <div className="text-xs text-gray-500">Ordered Qty (pcs)</div>
          <div className="text-lg font-semibold text-gray-800 mt-1">{inr(totals.ordered)}</div>
        </div>
        <div className="rounded-2xl border bg-white p-3">
          <div className="text-xs text-gray-500">Dispatch Qty (pcs)</div>
          <div className="text-lg font-semibold text-gray-800 mt-1">{inr(totals.dispatch)}</div>
          {totals.dispatch !== totals.ordered && <div className="text-[11px] text-amber-700 mt-1">Short dispatch detected</div>}
        </div>
        <div className="rounded-2xl border bg-white p-3">
          <div className="text-xs text-gray-500">Paid Amount</div>
          <div className="text-lg font-semibold text-gray-800 mt-1">₹{inr(totals.amount)}</div>
        </div>
      </div>

      {/* Items table */}
      <div className="mt-4 border rounded-2xl overflow-hidden bg-white">
        <div className="p-3 border-b bg-gradient-to-r from-pink-50 to-rose-50 flex justify-between items-center">
          <div className="font-medium text-gray-800">Dispatch Items</div>
          <div className="text-xs text-gray-600">{rows.length} items</div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[1200px] w-full text-sm">
            <thead className="bg-white text-gray-700">
              <tr className="border-b">
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">Ordered (pcs)</th>
                <th className="text-left p-3">Dispatch (pcs)</th>
                <th className="text-left p-3">Batch No</th>
                <th className="text-left p-3">MFG</th>
                <th className="text-left p-3">Expiry</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.itemId} className="border-b hover:bg-pink-50/30">
                  <td className="p-3">
                    <div className="font-medium text-gray-800">{r.productName}</div>
                  </td>

                  <td className="p-3">{inr(r.orderedQty)}</td>

                  <td className="p-3">
                    <input
                      type="number"
                      min={0}
                      max={r.orderedQty}
                      value={r.dispatchQty}
                      onChange={(e) => updateRow(r.itemId, { dispatchQty: safe(e.target.value) })}
                      className="border rounded-xl px-3 py-2 text-sm w-[140px]"
                      disabled={!canDispatch || loading}
                    />
                  </td>

                  <td className="p-3">
                    <input
                      value={r.batchNo}
                      onChange={(e) => updateRow(r.itemId, { batchNo: e.target.value })}
                      placeholder="Batch no"
                      className="border rounded-xl px-3 py-2 text-sm w-[180px]"
                      disabled={!canDispatch || loading || r.dispatchQty === 0}
                    />
                  </td>

                  <td className="p-3">
                    <input
                      type="date"
                      value={r.mfgDate}
                      onChange={(e) => updateRow(r.itemId, { mfgDate: e.target.value })}
                      className="border rounded-xl px-3 py-2 text-sm w-[160px]"
                      disabled={!canDispatch || loading || r.dispatchQty === 0}
                    />
                  </td>

                  <td className="p-3">
                    <input
                      type="date"
                      value={r.expiryDate}
                      onChange={(e) => updateRow(r.itemId, { expiryDate: e.target.value })}
                      className="border rounded-xl px-3 py-2 text-sm w-[160px]"
                      disabled={!canDispatch || loading || r.dispatchQty === 0}
                    />
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-gray-600">
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 text-[11px] text-gray-500">
          Tip: If any item is not dispatching today, set Dispatch Qty to 0. Batch/MFG/Expiry will become optional for that row.
        </div>
      </div>

      {/* Transport section */}
      <div className="mt-4 rounded-2xl border bg-white overflow-hidden">
        <div className="p-3 border-b bg-gradient-to-r from-pink-50 to-rose-50">
          <div className="font-medium text-gray-800">Transport / Parcel Details</div>
          <div className="text-xs text-gray-600 mt-1">This information will be stored with the dispatch record.</div>
        </div>

        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-[11px] text-gray-500 mb-1">Dispatch Date</div>
            <input
              type="date"
              value={dispatchDate}
              readOnly
              className="border rounded-xl px-3 py-2 text-sm bg-gray-100 w-full cursor-not-allowed"
            />
          </div>

          <div>
            <div className="text-[11px] text-gray-500 mb-1">Mode</div>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as TransportMode)}
              className="border rounded-xl px-3 py-2 text-sm bg-white w-full"
              disabled={!canDispatch || loading}
            >
              <option value="TRANSPORT">Transport</option>
              <option value="COURIER">Courier</option>
              <option value="BUS">Bus</option>
              <option value="SELF">Self</option>
            </select>
          </div>

          <div>
            <div className="text-[11px] text-gray-500 mb-1">Transport / Courier Name</div>
            <input
              value={transportName}
              onChange={(e) => setTransportName(e.target.value)}
              placeholder="e.g. Delhivery / VRL / Local Transport"
              className="border rounded-xl px-3 py-2 text-sm bg-white w-full"
              disabled={!canDispatch || loading}
            />
          </div>

          <div>
            <div className="text-[11px] text-gray-500 mb-1">LR / Tracking No</div>
            <input
              value={trackingNo}
              onChange={(e) => setTrackingNo(e.target.value)}
              placeholder="LR / Tracking"
              className="border rounded-xl px-3 py-2 text-sm bg-white w-full"
              disabled={!canDispatch || loading}
            />
          </div>

          <div>
            <div className="text-[11px] text-gray-500 mb-1">No. of Parcels</div>
            <input
              type="number"
              min={1}
              value={parcels}
              onChange={(e) => setParcels(safe(e.target.value))}
              className="border rounded-xl px-3 py-2 text-sm bg-white w-full"
              disabled={!canDispatch || loading}
            />
          </div>

          <div>
            <div className="text-[11px] text-gray-500 mb-1">Driver/Person (optional)</div>
            <input
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              placeholder="Driver / Person name"
              className="border rounded-xl px-3 py-2 text-sm bg-white w-full"
              disabled={!canDispatch || loading}
            />
          </div>

          <div>
            <div className="text-[11px] text-gray-500 mb-1">Phone (optional)</div>
            <input
              value={driverPhone}
              onChange={(e) => setDriverPhone(e.target.value)}
              placeholder="Mobile"
              className="border rounded-xl px-3 py-2 text-sm bg-white w-full"
              disabled={!canDispatch || loading}
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-[11px] text-gray-500 mb-1">Notes (optional)</div>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any special handling / remarks"
              className="border rounded-xl px-3 py-2 text-sm bg-white w-full"
              disabled={!canDispatch || loading}
            />
          </div>
        </div>

        <div className="p-4 border-t flex items-center justify-end gap-2">
          <button className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50" onClick={() => load()} disabled={loading}>
            Reset Form
          </button>

          <button
            className={`px-4 py-2 rounded-xl text-white shadow ${
              canDispatch
                ? "bg-gradient-to-r from-pink-400 to-rose-400 hover:opacity-90"
                : "bg-gray-200 text-gray-500 shadow-none cursor-not-allowed"
            }`}
            disabled={!canDispatch || loading}
            onClick={submitDispatch}
            title={canDispatch ? "Submit dispatch" : "Payment must be PAID & verified"}
          >
            Submit Dispatch
          </button>
        </div>
      </div>
    </div>
  );
}
