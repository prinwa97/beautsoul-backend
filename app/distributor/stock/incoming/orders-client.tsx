"use client";

import React, { useEffect, useMemo, useState } from "react";

type OrderItem = {
  id: string;
  productName: string;
  orderedQtyPcs: number;
};

type IncomingOrder = {
  id: string;
  orderNo: string;
  status: string;
  createdAt: string;
  dispatchDate?: string | null;

  shippingMode?: string | null;
  courierName?: string | null;
  transportName?: string | null;

  lrNo?: string | null;
  trackingNo?: string | null;
  trackingCarrier?: string | null;

  items: OrderItem[];
};

function fmtDateTime(s?: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString("en-IN");
}

function st(s: any) {
  return String(s ?? "").trim().toUpperCase();
}

function badgeClass(status: string) {
  const x = st(status);
  if (x === "CREATED") return "bg-blue-50 text-blue-700 border-blue-200";
  if (x === "PAYMENT_DONE") return "bg-purple-50 text-purple-700 border-purple-200";
  if (x === "DISPATCHED") return "bg-yellow-50 text-yellow-700 border-yellow-200";
  if (x === "IN_TRANSIT") return "bg-orange-50 text-orange-700 border-orange-200";
  if (x === "RECEIVED" || x === "DELIVERED") return "bg-green-50 text-green-700 border-green-200";
  return "bg-gray-50 text-gray-700 border-gray-200";
}

export default function OrdersClient() {
  const [orders, setOrders] = useState<IncomingOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<IncomingOrder | null>(null);

  const [receivedMap, setReceivedMap] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/distributor/stock/inbound-orders?take=200", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to load");

      setOrders(Array.isArray(data?.orders) ? data.orders : []);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Load failed");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openReceive(o: IncomingOrder) {
    setActive(o);

    const init: Record<string, number> = {};
    for (const it of o.items) init[it.id] = Number(it.orderedQtyPcs || 0);
    setReceivedMap(init);

    setOpen(true);
  }

  function close() {
    setOpen(false);
    setActive(null);
    setReceivedMap({});
  }

  const lines = useMemo(() => {
    if (!active) return [];
    return active.items.map((it) => {
      const ordered = Number(it.orderedQtyPcs || 0);
      const receivedRaw = receivedMap[it.id];
      const received = Number.isFinite(receivedRaw) ? Number(receivedRaw) : 0;

      const safeReceived = Math.max(0, Math.min(ordered, received));
      const short = Math.max(0, ordered - safeReceived);

      return { ...it, received: safeReceived, short };
    });
  }, [active, receivedMap]);

  async function submitReceived() {
    if (!active) return;
    setSaving(true);

    try {
      const payload = {
        items: lines.map((x: any) => ({
          itemId: x.id,
          receivedQtyPcs: Number(x.received),
        })),
      };

      const res = await fetch(`/api/distributor/stock/inbound-orders/${active.id}/receive`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Receive failed");

      close();
      await load();
      alert("Received saved ✅");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Receive failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fff7f6]">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl font-semibold">Incoming Orders</div>
            <div className="text-sm text-gray-600">
              CREATED → PAYMENT_DONE → DISPATCHED/IN_TRANSIT → RECEIVED
            </div>
          </div>
          <button
            className="px-4 py-2 rounded-xl bg-black text-white"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        <div className="mt-4 bg-white rounded-2xl shadow overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-gray-600">
              <tr>
                <th className="p-3">Order No</th>
                <th className="p-3">Status</th>
                <th className="p-3">Dispatch Date</th>
                <th className="p-3">Carrier</th>
                <th className="p-3">LR/Tracking</th>
                <th className="p-3">Items</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>

            <tbody>
              {orders.map((o) => {
                const status = st(o.status);

                const carrier =
                  o.shippingMode === "COURIER"
                    ? o.courierName || "-"
                    : o.transportName || "-";
                const lr = o.trackingNo || o.lrNo || "-";

                // ✅ receive only when DISPATCHED / IN_TRANSIT
                const canReceive = status === "DISPATCHED" || status === "IN_TRANSIT";

                const help =
                  status === "CREATED"
                    ? "Dispatch pending"
                    : status === "PAYMENT_DONE"
                    ? "Payment done, waiting dispatch"
                    : canReceive
                    ? "Ready to receive"
                    : "Completed";

                return (
                  <tr key={o.id} className="border-t">
                    <td className="p-3 font-medium">{o.orderNo}</td>

                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full border text-xs ${badgeClass(status)}`}>
                          {status}
                        </span>
                        <span className="text-xs text-gray-500">{help}</span>
                      </div>
                    </td>

                    <td className="p-3">
                      {status === "CREATED" || status === "PAYMENT_DONE" ? "-" : fmtDateTime(o.dispatchDate)}
                    </td>

                    <td className="p-3">{carrier}</td>
                    <td className="p-3">{lr}</td>
                    <td className="p-3">{o.items?.length || 0}</td>

                    <td className="p-3 text-right">
                      <button
                        type="button"
                        disabled={!canReceive}
                        onClick={() => {
                          if (!canReceive) return;
                          openReceive(o);
                        }}
                        className={`px-4 py-2 rounded-xl text-white ${
                          canReceive
                            ? "bg-green-600"
                            : "bg-gray-400 cursor-not-allowed pointer-events-none"
                        }`}
                      >
                        Receive
                      </button>
                    </td>
                  </tr>
                );
              })}

              {orders.length === 0 && !loading && (
                <tr>
                  <td className="p-6 text-center text-gray-500" colSpan={7}>
                    No orders
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* RECEIVE MODAL */}
        {open && active && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4">
            <div className="w-full max-w-3xl bg-white rounded-2xl shadow-lg">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">Receive Stock</div>
                  <div className="text-xs text-gray-600">Order: {active.orderNo}</div>
                </div>
                <button className="px-3 py-1 rounded-lg bg-gray-100" onClick={close}>
                  Close
                </button>
              </div>

              <div className="p-4 max-h-[60vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-600">
                    <tr>
                      <th className="p-2">Product</th>
                      <th className="p-2">Ordered</th>
                      <th className="p-2">Received</th>
                      <th className="p-2">Short</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((it: any) => (
                      <tr key={it.id} className="border-t">
                        <td className="p-2">{it.productName}</td>
                        <td className="p-2">{it.orderedQtyPcs}</td>
                        <td className="p-2">
                          <input
                            type="number"
                            min={0}
                            max={it.orderedQtyPcs}
                            value={it.received}
                            onChange={(e) => {
                              const v = Number(e.target.value || 0);
                              setReceivedMap((prev) => ({ ...prev, [it.id]: v }));
                            }}
                            className="w-28 px-2 py-1 border rounded-lg"
                          />
                        </td>
                        <td className="p-2">{it.short}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-4 border-t flex items-center justify-end gap-2">
                <button className="px-4 py-2 rounded-xl bg-gray-100" onClick={close} disabled={saving}>
                  Cancel
                </button>
                <button className="px-4 py-2 rounded-xl bg-black text-white" onClick={submitReceived} disabled={saving}>
                  {saving ? "Saving..." : "Submit Receive"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
