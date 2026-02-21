"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

type Item = {
  id: string;
  productName: string;
  qty: number;
  rate: number;
  amount: number;
};

type Order = {
  id: string;
  orderNo: string;
  createdAt: string;
  status: string;
  totalAmount: number;
  paidAmount?: number | null;
  items?: Item[];
  retailer?: { id: string; name: string; phone?: string | null; city?: string | null };
};

function inr(n: number) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(n || 0));
  } catch {
    return String(n);
  }
}

function fmt(iso: string) {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function isEditable(status?: string | null) {
  return String(status || "").toUpperCase() === "SUBMITTED";
}

export default function HistoryClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const retailerId = sp.get("retailerId") || "";

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);

  // modal
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({}); // itemId -> qty

  async function load() {
    if (!retailerId) {
      setToast("retailerId missing");
      setLoading(false);
      return;
    }
    setLoading(true);
    setToast("");
    try {
      const r = await fetch(
        `/api/field-officer/orders/list?retailerId=${encodeURIComponent(retailerId)}&take=100`,
        { cache: "no-store" }
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) {
        setOrders([]);
        setToast(j?.error || "Failed to load orders");
        return;
      }
      setOrders(Array.isArray(j?.orders) ? j.orders : []);
    } catch (e: any) {
      setOrders([]);
      setToast(e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retailerId]);

  const retailerName = useMemo(() => orders?.[0]?.retailer?.name || "", [orders]);

  function openOrder(o: Order) {
    setActive(o);
    setToast("");
    const next: Record<string, number> = {};
    (o.items || []).forEach((it) => (next[it.id] = n(it.qty)));
    setQtyMap(next);
    setOpen(true);
  }

  function close() {
    setOpen(false);
    setActive(null);
    setQtyMap({});
    setSaving(false);
  }

  function setQty(itemId: string, qty: number) {
    setQtyMap((prev) => {
      const next = { ...prev };
      const q = Math.floor(n(qty));
      if (!Number.isFinite(q)) return next;
      next[itemId] = q;
      return next;
    });
  }

  async function saveEdit() {
    if (!active) return;

    if (!isEditable(active.status)) {
      setToast(`Order locked (status: ${active.status})`);
      return;
    }

    const items = Object.entries(qtyMap).map(([itemId, qty]) => ({ itemId, qty }));

    setSaving(true);
    setToast("");
    try {
      const r = await fetch(`/api/field-officer/orders/${active.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) {
        setToast(j?.error || "Failed to update order");
        return;
      }
      setToast("✅ Order updated");
      close();
      load();
    } catch (e: any) {
      setToast(e?.message || "Failed to update order");
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder() {
    if (!active) return;

    if (!isEditable(active.status)) {
      setToast(`Order locked (status: ${active.status})`);
      return;
    }

    const ok = window.confirm("Delete this order? This cannot be undone.");
    if (!ok) return;

    setSaving(true);
    setToast("");
    try {
      const r = await fetch(`/api/field-officer/orders/${active.id}`, { method: "DELETE" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) {
        setToast(j?.error || "Failed to delete order");
        return;
      }
      setToast("✅ Order deleted");
      close();
      load();
    } catch (e: any) {
      setToast(e?.message || "Failed to delete order");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 pb-24 space-y-3">
      <div className="flex items-center justify-between">
        <button className="rounded-xl border px-3 py-2 text-sm font-bold" onClick={() => router.back()} type="button">
          Back
        </button>

        <button className="rounded-xl border px-3 py-2 text-sm font-bold" onClick={load} type="button">
          Refresh
        </button>
      </div>

      <div>
        <div className="text-xs text-gray-500">Field Officer</div>
        <div className="text-lg font-extrabold">Orders</div>
        <div className="text-xs text-gray-500">
          Retailer: <span className="font-semibold text-gray-800">{retailerName || retailerId || "-"}</span>
        </div>
        <div className="mt-1 text-[11px] text-gray-500">
          ✅ Edit/Delete allowed only till distributor processes (status = SUBMITTED)
        </div>
      </div>

      {toast ? <div className="rounded-2xl bg-black/5 px-4 py-3 text-sm font-semibold text-gray-800">{toast}</div> : null}

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : orders.length ? (
        <div className="space-y-2">
          {orders.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => openOrder(o)}
              className="w-full rounded-2xl border border-black/10 bg-white p-3 shadow-sm text-left active:scale-[0.99]"
            >
              {/* ✅ gap fix: no justify-between */}
              <div className="flex items-start gap-2">
                {/* LEFT */}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-extrabold truncate">{o.orderNo || o.id}</div>
                  <div className="text-[11px] text-gray-500 truncate">{fmt(o.createdAt)}</div>
                  <div className="mt-1 text-[11px] text-gray-600">
                    Status:{" "}
                    <span className="font-semibold">
                      {o.status}
                      {isEditable(o.status) ? " (editable)" : " (locked)"}
                    </span>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="shrink-0 text-right whitespace-nowrap">
                  <div className="text-sm font-extrabold">{inr(o.totalAmount || 0)}</div>
                </div>
              </div>

              {o.items?.length ? (
                <div className="mt-2 border-t pt-2 space-y-1">
                  {o.items.slice(0, 6).map((it) => (
                    <div key={it.id} className="flex justify-between text-xs">
                      <div className="truncate pr-2">
                        {it.productName} × {it.qty}
                      </div>
                      <div className="font-semibold">{inr(it.amount || 0)}</div>
                    </div>
                  ))}
                  {o.items.length > 6 ? (
                    <div className="text-[11px] text-gray-500">+{o.items.length - 6} more items</div>
                  ) : null}
                  <div className="pt-1 text-[11px] text-gray-500">Tap to open</div>
                </div>
              ) : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500">No orders found</div>
      )}

      {/* Modal: Order Detail + Edit/Delete */}
      {open && active ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="w-full rounded-t-3xl bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-base font-extrabold">{active.orderNo || active.id}</div>
                <div className="mt-1 text-xs text-gray-500">{fmt(active.createdAt)}</div>
                <div className="mt-1 text-xs">
                  Status:{" "}
                  <span className="font-bold">
                    {active.status} {isEditable(active.status) ? "(editable)" : "(locked)"}
                  </span>
                </div>
              </div>

              <button type="button" onClick={close} className="rounded-xl bg-black/5 px-3 py-2 text-sm font-bold">
                Close
              </button>
            </div>

            <div className="mt-3 max-h-[45vh] overflow-y-auto space-y-2">
              {(active.items || []).map((it) => {
                const editable = isEditable(active.status);
                const qty = qtyMap[it.id] ?? it.qty;
                return (
                  <div key={it.id} className="rounded-2xl border border-black/10 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-extrabold truncate">{it.productName}</div>
                        <div className="text-[11px] text-gray-500">
                          Rate: {inr(it.rate || 0)} • Amount: {inr((n(qty) || 0) * n(it.rate))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          value={qty <= 0 ? "" : qty}
                          disabled={!editable || saving}
                          onChange={(e) => setQty(it.id, Number(e.target.value))}
                          className="w-20 rounded-xl border border-black/10 bg-black/5 px-3 py-2 text-center text-sm font-bold outline-none disabled:opacity-60"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    {isEditable(active.status) ? (
                      <div className="mt-2 text-[11px] text-gray-500">Qty 0/blank = remove item</div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pb-16 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={deleteOrder}
                disabled={!isEditable(active.status) || saving}
                className="rounded-2xl border border-red-200 bg-red-50 px-3 py-3 text-sm font-extrabold text-red-700 disabled:opacity-50"
              >
                Delete
              </button>

              <button
                type="button"
                onClick={close}
                disabled={saving}
                className="rounded-2xl border px-3 py-3 text-sm font-extrabold disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveEdit}
                disabled={!isEditable(active.status) || saving}
                className="rounded-2xl bg-gray-900 px-3 py-3 text-sm font-extrabold text-white disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>

            {!isEditable(active.status) ? (
              <div className="text-[11px] text-gray-500">
                This order is locked because distributor already processed it (status not SUBMITTED).
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}