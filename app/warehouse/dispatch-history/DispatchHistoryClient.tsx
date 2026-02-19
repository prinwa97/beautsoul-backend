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
  dispatchedAt?: string | null;
  dispatchDate?: string | null;

  shippingMode?: string | null;
  trackingCarrier?: string | null;
  trackingNo?: string | null;
  lrNo?: string | null;

  courierName?: string | null;
  transportName?: string | null;

  notes?: string | null;
  meta?: any;

  distributor: { id: string; name: string; city?: string | null; state?: string | null };
  items: Item[];
};

type Msg = { type: "ok" | "err"; text: string } | null;

function d(iso?: string | null) {
  if (!iso) return "-";
  const x = new Date(iso);
  return isNaN(+x) ? String(iso) : x.toLocaleString("en-IN");
}
function safe(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

export default function DispatchHistoryClient() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Order | null>(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch("/api/warehouse/dispatch-history?take=200", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "Load failed");
      setOrders(j.orders || []);
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Load failed" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const summary = useMemo(() => {
    const total = orders.length;
    const today = new Date().toISOString().slice(0, 10);
    const todayCount = orders.filter((o) => (o.dispatchDate || "").slice(0, 10) === today).length;
    return { total, todayCount };
  }, [orders]);

  function openDetails(o: Order) {
    setSelected(o);
    setOpen(true);
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xl md:text-2xl font-semibold text-gray-800">Dispatch History</div>
          <div className="text-xs text-gray-600 mt-1">
            Dispatched orders with tracking, transport, batch, MFG & expiry details.
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
            className="px-4 py-2 rounded-xl text-sm text-white shadow bg-gradient-to-r from-pink-400 to-rose-400 hover:opacity-90 disabled:opacity-60"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-white p-3">
          <div className="text-xs text-gray-500">Total Dispatched</div>
          <div className="text-lg font-semibold text-gray-800 mt-1">{summary.total}</div>
        </div>
        <div className="rounded-2xl border bg-white p-3">
          <div className="text-xs text-gray-500">Today Dispatched</div>
          <div className="text-lg font-semibold text-gray-800 mt-1">{summary.todayCount}</div>
        </div>
      </div>

      {msg && (
        <div className={`mt-4 p-3 rounded-xl text-sm ${msg.type === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <div className="mt-4 border rounded-2xl overflow-hidden bg-white">
        <div className="p-3 bg-gradient-to-r from-pink-50 to-rose-50 border-b flex items-center justify-between">
          <div className="font-medium text-gray-800">Orders</div>
          <div className="text-xs text-gray-600">{loading ? "Loading..." : `${orders.length} orders`}</div>
        </div>

        <div className="overflow-auto">
          <table className="min-w-[1250px] w-full text-sm">
            <thead className="bg-white text-gray-700">
              <tr className="border-b">
                <th className="text-left p-3">Order</th>
                <th className="text-left p-3">Distributor</th>
                <th className="text-left p-3">Dispatch</th>
                <th className="text-left p-3">Tracking / LR</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((o) => {
                const carrier = o.trackingCarrier || o.courierName || o.transportName || "-";
                const track = o.trackingNo || "-";
                const lr = o.lrNo || "-";
                return (
                  <tr key={o.id} className="border-b hover:bg-pink-50/40">
                    <td className="p-3">
                      <div className="font-medium">{o.orderNo}</div>
                      <div className="text-xs text-gray-500">Dispatched: {d(o.dispatchedAt)}</div>
                    </td>

                    <td className="p-3">
                      <div className="font-medium">{o.distributor?.name}</div>
                      <div className="text-xs text-gray-500">
                        {(o.distributor?.city || "-")}{o.distributor?.state ? `, ${o.distributor.state}` : ""}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="text-xs text-gray-600">
                        Date: <b className="text-gray-800">{d(o.dispatchDate)}</b>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Mode: <b className="text-gray-800">{o.shippingMode || "-"}</b>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Parcels: <b className="text-gray-800">{o.meta?.parcels ?? "-"}</b>
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="text-xs text-gray-600">
                        Carrier: <b className="text-gray-800">{carrier}</b>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        Tracking: <b className="font-mono text-gray-800">{track}</b>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">
                        LR: <b className="font-mono text-gray-800">{lr}</b>
                      </div>
                    </td>

                    <td className="p-3">
                      <button
                        className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
                        onClick={() => openDetails(o)}
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}

              {orders.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-600">No dispatched orders found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {open && selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl border overflow-hidden">
            <div className="p-4 border-b bg-gradient-to-r from-pink-50 to-rose-50 flex items-center justify-between">
              <div className="font-semibold text-gray-800">Dispatch Details • {selected.orderNo}</div>
              <button className="text-sm px-2" onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="p-4 space-y-4 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-gray-500">Distributor</div>
                  <div className="font-semibold text-gray-800 mt-1">{selected.distributor?.name}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {(selected.distributor?.city || "-")}{selected.distributor?.state ? `, ${selected.distributor.state}` : ""}
                  </div>
                </div>

                <div className="rounded-xl border p-3">
                  <div className="text-xs text-gray-500">Transport</div>
                  <div className="text-gray-800 mt-1">Mode: <b>{selected.shippingMode || "-"}</b></div>
                  <div className="text-gray-800 mt-1">Carrier: <b>{selected.trackingCarrier || selected.courierName || selected.transportName || "-"}</b></div>
                  <div className="text-gray-800 mt-1">Tracking: <b className="font-mono">{selected.trackingNo || "-"}</b></div>
                  <div className="text-gray-800 mt-1">LR: <b className="font-mono">{selected.lrNo || "-"}</b></div>
                  <div className="text-gray-800 mt-1">Parcels: <b>{selected.meta?.parcels ?? "-"}</b></div>
                </div>

                <div className="rounded-xl border p-3">
                  <div className="text-xs text-gray-500">Driver / Notes</div>
                  <div className="text-gray-800 mt-1">Driver: <b>{selected.meta?.driverName || "-"}</b></div>
                  <div className="text-gray-800 mt-1">Phone: <b>{selected.meta?.driverPhone || "-"}</b></div>
                  <div className="text-gray-800 mt-1">Notes: <b>{selected.meta?.notes || "-"}</b></div>
                </div>
              </div>

              <div className="rounded-2xl border overflow-hidden">
                <div className="p-3 border-b bg-gray-50 flex justify-between">
                  <div className="font-medium text-gray-800">Items</div>
                  <div className="text-xs text-gray-600">{(selected.items || []).length} items</div>
                </div>

                <div className="overflow-auto">
                  <table className="min-w-[1000px] w-full text-sm">
                    <thead className="bg-white">
                      <tr className="border-b text-gray-700">
                        <th className="text-left p-3">Product</th>
                        <th className="text-left p-3">Ordered</th>
                        <th className="text-left p-3">Dispatch Qty</th>
                        <th className="text-left p-3">Batch</th>
                        <th className="text-left p-3">MFG</th>
                        <th className="text-left p-3">EXP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selected.items || []).map((it) => {
                        const dq =
                          selected.meta?.items?.find((x: any) => x.itemId === it.id)?.dispatchQtyPcs ?? it.orderedQtyPcs;
                        return (
                          <tr key={it.id} className="border-b">
                            <td className="p-3">{it.productName}</td>
                            <td className="p-3">{it.orderedQtyPcs}</td>
                            <td className="p-3"><b>{dq}</b></td>
                            <td className="p-3">{it.batchNo || "-"}</td>
                            <td className="p-3">{d(it.mfgDate || null)}</td>
                            <td className="p-3">{d(it.expiryDate || null)}</td>
                          </tr>
                        );
                      })}

                      {(selected.items || []).length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-5 text-center text-gray-600">No items found.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 border-t flex justify-end">
              <button className="px-3 py-2 rounded-xl border bg-white" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
