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

function cleanStr(v: any) {
  return String(v ?? "").trim();
}

function onlyDigits(v: string) {
  return String(v || "").replace(/\D/g, "");
}

function normalizeIndianPhone(v: string) {
  const d = onlyDigits(v);
  if (!d) return "";
  if (d.length === 10) return `91${d}`;
  if (d.length === 12 && d.startsWith("91")) return d;
  if (d.length > 10) return `91${d.slice(-10)}`;
  return d;
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

  // order edit modal
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({}); // itemId -> qty

  // share modal
  const [shareOpen, setShareOpen] = useState(false);
  const [shareOrder, setShareOrder] = useState<Order | null>(null);
  const [sharePhone, setSharePhone] = useState("");

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

  function openShare(o: Order) {
    setShareOrder(o);
    setSharePhone(cleanStr(o.retailer?.phone || ""));
    setToast("");
    setShareOpen(true);
  }

  function closeShare() {
    setShareOpen(false);
    setShareOrder(null);
  }

  function buildShareMessage(order: Order, mode: "WHATSAPP" | "SMS") {
    const retailerName = cleanStr(order.retailer?.name || "Retailer");
    const retailerCity = cleanStr(order.retailer?.city || "");
    const orderRef = cleanStr(order.orderNo || order.id || "N/A");
    const createdAt = cleanStr(fmt(order.createdAt));
    const status = cleanStr(order.status || "");
    const totalAmount = inr(order.totalAmount || 0);

    const itemLines = (order.items || [])
      .map((it, idx) => {
        const name = cleanStr(it.productName || "Product");
        const qty = Math.max(0, Math.floor(n(it.qty)));
        const rate = n(it.rate);
        const amount = n(it.amount || qty * rate);

        if (mode === "WHATSAPP") {
          return [
            `${idx + 1}. ${name}`,
            `   Qty: ${qty} | Rate: ${inr(rate)} | Total: ${inr(amount)}`,
          ].join("\n");
        }

        return `${idx + 1}. ${name} | Qty: ${qty} | Rate: ${inr(rate)} | Total: ${inr(amount)}`;
      })
      .join(mode === "WHATSAPP" ? "\n\n" : "\n");

    if (mode === "WHATSAPP") {
      return [
        "🧾 BeautSoul – Order Details",
        "",
        `Hi ${retailerName},`,
        "",
        "Here are your order details from BeautSoul.",
        "",
        `Order No: ${orderRef}`,
        `Order Date: ${createdAt}`,
        status ? `Status: ${status}` : "",
        retailerCity ? `City: ${retailerCity}` : "",
        "",
        "Ordered Items:",
        itemLines || "No items",
        "",
        `Grand Total: ${totalAmount}`,
        "",
        "Thank you for choosing BeautSoul. ✨",
        "BeautSoul Team",
      ]
        .filter(Boolean)
        .join("\n");
    }

    return [
      "BeautSoul - Order Details",
      "",
      `Hi ${retailerName},`,
      "",
      `Order No: ${orderRef}`,
      `Order Date: ${createdAt}`,
      status ? `Status: ${status}` : "",
      retailerCity ? `City: ${retailerCity}` : "",
      "",
      "Ordered Items:",
      itemLines || "No items",
      "",
      `Grand Total: ${totalAmount}`,
      "",
      "Thank you for choosing BeautSoul.",
      "BeautSoul Team",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function shareWhatsApp() {
    if (!shareOrder) return;

    const phone = normalizeIndianPhone(sharePhone);
    if (!phone) {
      setToast("Retailer phone missing");
      return;
    }

    const text = buildShareMessage(shareOrder, "WHATSAPP");
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function shareSMS() {
    if (!shareOrder) return;

    const phone = normalizeIndianPhone(sharePhone);
    if (!phone) {
      setToast("Retailer phone missing");
      return;
    }

    const text = buildShareMessage(shareOrder, "SMS");
    const url = `sms:${phone}?body=${encodeURIComponent(text)}`;
    window.location.href = url;
  }

  return (
    <div className="p-4 pb-24 space-y-3">
      <div className="flex items-center justify-between">
        <button
          className="rounded-xl border px-3 py-2 text-sm font-bold"
          onClick={() => router.back()}
          type="button"
        >
          Back
        </button>

        <button
          className="rounded-xl border px-3 py-2 text-sm font-bold"
          onClick={load}
          type="button"
        >
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

      {toast ? (
        <div className="rounded-2xl bg-black/5 px-4 py-3 text-sm font-semibold text-gray-800">
          {toast}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : orders.length ? (
        <div className="space-y-2">
          {orders.map((o) => (
            <div
              key={o.id}
              className="w-full rounded-2xl border border-black/10 bg-white p-3 shadow-sm"
            >
              <button
                type="button"
                onClick={() => openOrder(o)}
                className="w-full text-left active:scale-[0.99]"
              >
                <div className="flex items-start gap-2">
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

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => openShare(o)}
                  className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-extrabold shadow-sm"
                >
                  Share Order
                </button>
              </div>
            </div>
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

              <button
                type="button"
                onClick={close}
                className="rounded-xl bg-black/5 px-3 py-2 text-sm font-bold"
              >
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

      {/* Share Modal */}
      {shareOpen && shareOrder ? (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/50">
          <div className="w-full rounded-t-3xl bg-white p-4 shadow-2xl">
            <div className="flex justify-between gap-3">
              <div>
                <div className="text-base font-extrabold">Share Order</div>
                <div className="mt-1 text-xs text-gray-500">
                  {shareOrder.orderNo || shareOrder.id}
                </div>
              </div>

              <button
                type="button"
                onClick={closeShare}
                className="rounded-xl bg-black/5 px-3 py-2 text-sm font-bold"
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-black/10 bg-black/5 p-3">
              <div className="text-xs text-gray-500">Retailer</div>
              <div className="text-sm font-bold text-gray-900">
                {shareOrder.retailer?.name || retailerName || "Retailer"}
              </div>

              <div className="mt-3 text-xs text-gray-500">Phone</div>
              <input
                value={sharePhone}
                onChange={(e) => setSharePhone(e.target.value)}
                placeholder="Enter retailer phone"
                className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold outline-none"
              />
              <div className="mt-1 text-[11px] text-gray-500">
                10 digit number likho. Auto 91 lag jayega.
              </div>

              <div className="mt-4 rounded-xl bg-white p-3">
                <div className="text-xs font-semibold text-gray-500">Bill Summary</div>
                <div className="mt-1 text-sm font-extrabold text-gray-900">
                  Total Bill Amount: {inr(shareOrder.totalAmount || 0)}
                </div>
              </div>
            </div>

            <div className="mt-4 max-h-[28vh] overflow-y-auto rounded-2xl border border-black/10 bg-white p-3">
              <div className="text-xs font-semibold text-gray-500">Ordered Items</div>

              <div className="mt-2 space-y-2">
                {(shareOrder.items || []).map((it) => (
                  <div
                    key={it.id}
                    className="rounded-xl border border-black/10 bg-black/[0.02] p-3"
                  >
                    <div className="text-sm font-bold text-gray-900">{it.productName}</div>
                    <div className="mt-1 text-xs text-gray-600">
                      Qty: {it.qty} | Rate: {inr(it.rate)} | Total: {inr(it.amount || 0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-3 pb-20">
              <button
                type="button"
                onClick={shareWhatsApp}
                className="w-full rounded-2xl bg-green-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm"
              >
                Share on WhatsApp
              </button>

              <button
                type="button"
                onClick={shareSMS}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm"
              >
                Send Text SMS
              </button>

              <button
                type="button"
                onClick={closeShare}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-extrabold text-black shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}