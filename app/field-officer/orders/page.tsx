"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SortKey = "RECENT" | "OLDEST" | "AMOUNT_HIGH" | "AMOUNT_LOW" | "NAME_AZ";

type RetailerRow = {
  retailerId: string;
  name: string;
  city?: string | null;
  phone?: string | null;
  lastOrderAt?: string | null;
  lastOrderAmount: number;
  lastOrderStatus?: string | null;
  pendingOrders: number;
};

type ProductRow = {
  id: string;
  name: string;
  sku?: string | null;
  mrp?: number | null;
};

type CreatedOrder = {
  id?: string;
  orderNo?: string;
};

type CreatedItem = {
  productId: string;
  qty: number;
};

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function ymd(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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

function Icon({
  name,
}: {
  name: "close" | "plus" | "back" | "whatsapp" | "sms";
}) {
  const c = "h-5 w-5";

  if (name === "close")
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none">
        <path
          d="M6 6l12 12M18 6 6 18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );

  if (name === "back")
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none">
        <path
          d="M15 18l-6-6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );

  if (name === "whatsapp")
    return (
      <svg className={c} viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.52 3.48A11.86 11.86 0 0 0 12.07 0C5.5 0 .15 5.35.15 11.93c0 2.1.55 4.15 1.6 5.97L0 24l6.27-1.64a11.9 11.9 0 0 0 5.8 1.48h.01c6.57 0 11.92-5.35 11.92-11.93 0-3.18-1.24-6.17-3.48-8.43ZM12.08 21.8h-.01a9.8 9.8 0 0 1-4.99-1.37l-.36-.21-3.72.97 1-3.62-.23-.37a9.83 9.83 0 0 1-1.51-5.26c0-5.44 4.42-9.87 9.86-9.87 2.63 0 5.1 1.03 6.96 2.9a9.8 9.8 0 0 1 2.88 6.98c0 5.44-4.43 9.86-9.88 9.86Zm5.41-7.38c-.3-.15-1.78-.88-2.06-.98-.28-.1-.48-.15-.68.15-.2.3-.78.98-.95 1.18-.18.2-.35.23-.65.08-.3-.15-1.27-.47-2.42-1.5-.9-.8-1.5-1.78-1.67-2.08-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.93-2.25-.25-.6-.5-.52-.68-.53h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.5s1.08 2.9 1.23 3.1c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.71.64.72.23 1.37.2 1.88.12.57-.08 1.78-.73 2.03-1.43.25-.7.25-1.3.18-1.43-.08-.13-.28-.2-.58-.35Z" />
      </svg>
    );

  if (name === "sms")
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none">
        <path
          d="M4 6h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H8l-4 3V8a2 2 0 0 1 2-2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );

  return (
    <svg className={c} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function FieldOfficerOrdersPage() {
  const router = useRouter();

  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("RECENT");
  const [rows, setRows] = useState<RetailerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<RetailerRow | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [pLoading, setPLoading] = useState(false);
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});
  const [savingOrder, setSavingOrder] = useState(false);

  const [shareOpen, setShareOpen] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [createdItems, setCreatedItems] = useState<CreatedItem[]>([]);
  const [sharePhone, setSharePhone] = useState("");

  async function load(nextQ: string, nextSort: SortKey) {
    setLoading(true);
    setToast("");
    try {
      const r = await fetch(
        `/api/field-officer/create-order/retailers?q=${encodeURIComponent(
          nextQ
        )}&take=200&sort=${encodeURIComponent(nextSort)}`,
        { cache: "no-store" }
      );
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) {
        setRows([]);
        setToast(j?.error || "Failed to load retailers");
        return;
      }
      setRows(Array.isArray(j?.rows) ? j.rows : []);
    } catch (e: any) {
      setRows([]);
      setToast(e?.message || "Failed to load retailers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load("", sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      load(q, sort);
    }, 250);
    return () => clearTimeout(t);
  }, [q, sort]);

  const list = useMemo(() => rows, [rows]);

  function openDrawer(r: RetailerRow) {
    setActive(r);
    setSharePhone(cleanStr(r.phone));
    setOpen(true);
  }

  function closeDrawer() {
    setOpen(false);
  }

  async function loadProducts() {
    setPLoading(true);
    setToast("");
    try {
      const r = await fetch(`/api/field-officer/products?take=500`, {
        cache: "no-store",
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || j?.ok === false) {
        setProducts([]);
        setToast(j?.error || "Failed to load products");
        return;
      }

      const arr = Array.isArray(j) ? j : j?.rows || j?.products || [];
      const mapped: ProductRow[] = (arr || []).map((p: any) => ({
        id: String(p.id),
        name: String(p.name || p.productName || "Unnamed"),
        sku: p.sku ?? null,
        mrp: p.mrp != null ? Number(p.mrp) : null,
      }));

      setProducts(mapped);
    } catch (e: any) {
      setProducts([]);
      setToast(e?.message || "Failed to load products");
    } finally {
      setPLoading(false);
    }
  }

  async function openCreateOrder() {
    if (!active) {
      setToast("Select retailer first");
      return;
    }
    setCreateOpen(true);
    setQtyMap({});
    setToast("");
    if (!products.length) {
      await loadProducts();
    }
  }

  function closeCreateOrder() {
    if (savingOrder) return;
    setCreateOpen(false);
  }

  function setQty(productId: string, qty: number) {
    setQtyMap((prev) => {
      const next = { ...prev };
      const qn = Math.floor(Number(qty || 0));
      if (!Number.isFinite(qn) || qn <= 0) delete next[productId];
      else next[productId] = qn;
      return next;
    });
  }

  function goViewOrders() {
    if (!active?.retailerId) {
      setToast("Select retailer first");
      return;
    }
    setOpen(false);
    router.push(`/field-officer/orders/history?retailerId=${active.retailerId}`);
  }

  function getProductById(productId: string) {
    return products.find((p) => p.id === productId) || null;
  }

  function getCreatedGrandTotal() {
    return createdItems.reduce((sum, it) => {
      const product = getProductById(it.productId);
      const rate = Number(product?.mrp || 0);
      return sum + rate * Math.max(0, Math.floor(Number(it.qty || 0)));
    }, 0);
  }

  function buildOrderLines(mode: "WHATSAPP" | "SMS") {
    return createdItems
      .map((it, idx) => {
        const product = getProductById(it.productId);
        const productName = cleanStr(product?.name || it.productId);
        const qty = Math.max(0, Math.floor(Number(it.qty || 0)));
        const rate = Number(product?.mrp || 0);
        const lineTotal = rate * qty;

        if (mode === "WHATSAPP") {
          return [
            `${idx + 1}. ${productName}`,
            `   Qty: ${qty} | Rate: ${inr(rate)} | Total: ${inr(lineTotal)}`,
          ].join("\n");
        }

        return `${idx + 1}. ${productName} | Qty: ${qty} | Rate: ${inr(
          rate
        )} | Total: ${inr(lineTotal)}`;
      })
      .join(mode === "WHATSAPP" ? "\n\n" : "\n");
  }

  function buildWhatsAppMessage() {
    const orderRef = cleanStr(createdOrder?.orderNo || createdOrder?.id || "N/A");
    const retailerName = cleanStr(active?.name || "Retailer");
    const retailerId = cleanStr(active?.retailerId || "");
    const city = cleanStr(active?.city || "");
    const lines = buildOrderLines("WHATSAPP");
    const grandTotal = getCreatedGrandTotal();

    return [
      "🧾 BeautSoul – Order Confirmation",
      "",
      `Hi ${retailerName},`,
      "",
      "Thank you for your order with BeautSoul. Your order has been successfully placed through our Field Officer.",
      "",
      `Order No: ${orderRef}`,
      retailerId ? `Retailer ID: ${retailerId}` : "",
      city ? `City: ${city}` : "",
      "",
      "Ordered Items:",
      lines || "No items",
      "",
      `Grand Total: ${inr(grandTotal)}`,
      "",
      "Your order is now being processed and will be dispatched soon.",
      "",
      "Thank you for choosing BeautSoul. ✨",
      "BeautSoul Team",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function buildSMSMessage() {
    const orderRef = cleanStr(createdOrder?.orderNo || createdOrder?.id || "N/A");
    const retailerName = cleanStr(active?.name || "Retailer");
    const lines = buildOrderLines("SMS");
    const grandTotal = getCreatedGrandTotal();

    return [
      "BeautSoul - Order Confirmation",
      "",
      `Hi ${retailerName},`,
      "",
      `Your order has been placed successfully.`,
      `Order No: ${orderRef}`,
      "",
      "Ordered Items:",
      lines || "No items",
      "",
      `Grand Total: ${inr(grandTotal)}`,
      "",
      "Your order is being processed and will be dispatched soon.",
      "",
      "Thank you for choosing BeautSoul.",
      "BeautSoul Team",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function shareWhatsApp() {
    const phone = normalizeIndianPhone(sharePhone);
    if (!phone) {
      setToast("Retailer phone missing");
      return;
    }
    const text = buildWhatsAppMessage();
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function shareSMS() {
    const phone = normalizeIndianPhone(sharePhone);
    if (!phone) {
      setToast("Retailer phone missing");
      return;
    }
    const text = buildSMSMessage();
    const url = `sms:${phone}?body=${encodeURIComponent(text)}`;
    window.location.href = url;
  }

  async function saveOrder() {
    if (!active) return;
    if (savingOrder) return;

    const items: CreatedItem[] = Object.entries(qtyMap)
      .filter(([_, qv]) => Number(qv) > 0)
      .map(([productId, qty]) => ({
        productId,
        qty: Math.floor(Number(qty)),
      }));

    if (!items.length) {
      setToast("Select at least one product");
      return;
    }

    setSavingOrder(true);
    setToast("");

    try {
      const res = await fetch("/api/field-officer/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retailerId: active.retailerId,
          items,
        }),
      });

      const j = await res.json().catch(() => ({}));

      if (!res.ok || !j?.ok) {
        setToast(j?.error || "Failed to create order");
        return;
      }

      const order: CreatedOrder = {
        id: j?.order?.id,
        orderNo: j?.order?.orderNo,
      };

      setCreatedOrder(order);
      setCreatedItems(items);
      setCreateOpen(false);
      setOpen(false);
      setShareOpen(true);
      setToast(`✅ Order created: ${order.orderNo || order.id || ""}`);
      load(q, sort);
    } catch (e: any) {
      setToast(e?.message || "Failed to create order");
    } finally {
      setSavingOrder(false);
    }
  }

  function closeShareModal() {
    setShareOpen(false);
  }

  return (
    <div className="space-y-4 pb-24">
      <div className="flex items-end justify-center">
        <div>
          <div className="text-2xl font-extrabold">Orders</div>
        </div>
      </div>

      <div className="space-y-2 rounded-2xl border border-black/10 bg-white p-3 shadow-sm">
        <input
          placeholder="Search retailer / city / phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-xl border border-black/10 bg-black/5 px-3 py-3 text-sm outline-none"
        />
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold outline-none"
        >
          <option value="RECENT">Most recent</option>
          <option value="OLDEST">Oldest</option>
          <option value="AMOUNT_HIGH">Highest last order</option>
          <option value="AMOUNT_LOW">Lowest last order</option>
          <option value="NAME_AZ">Name A to Z</option>
        </select>
      </div>

      {toast ? (
        <div className="rounded-2xl bg-black/5 px-4 py-3 text-sm font-semibold text-gray-800">
          {toast}
        </div>
      ) : null}

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : list.length ? (
        <div className="space-y-2">
          {list.map((r) => (
            <button
              key={r.retailerId}
              type="button"
              onClick={() => openDrawer(r)}
              className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-left shadow-sm active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gray-900">
                    {r.name}
                  </div>
                  <div className="truncate text-[11px] text-gray-500">
                    {(r.city || "—") + (r.phone ? ` • ${r.phone}` : "")}
                  </div>

                  <div className="mt-1 text-[11px] text-gray-500">
                    Last order:{" "}
                    {r.lastOrderAt ? (
                      <span className="font-semibold text-gray-800">
                        {ymd(r.lastOrderAt)}
                      </span>
                    ) : (
                      <span className="font-semibold text-gray-800">—</span>
                    )}
                    {r.lastOrderStatus ? <span> • {r.lastOrderStatus}</span> : null}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-extrabold text-gray-900">
                    {inr(r.lastOrderAmount || 0)}
                  </div>
                  <div
                    className={[
                      "text-[10px] font-semibold",
                      r.pendingOrders ? "text-red-600" : "text-gray-500",
                    ].join(" ")}
                  >
                    Pending: {r.pendingOrders || 0}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-sm text-gray-500">No retailers found</div>
      )}

      {open && active && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40">
          <div className="w-full rounded-t-3xl bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-base font-extrabold">{active.name}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {(active.city || "—") + (active.phone ? ` • ${active.phone}` : "")}
                </div>
              </div>

              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-xl bg-black/5 px-3 py-2"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 pb-20">
              <button
                type="button"
                onClick={goViewOrders}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-extrabold shadow-sm"
              >
                View Orders
              </button>

              <button
                type="button"
                onClick={openCreateOrder}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-extrabold text-white shadow-sm"
              >
                <Icon name="plus" />
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && active && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50">
          <div className="w-full rounded-t-3xl bg-white p-4 shadow-2xl">
            <div className="flex justify-between">
              <div className="font-extrabold">Create Order</div>
              <button type="button" onClick={closeCreateOrder}>
                <Icon name="close" />
              </button>
            </div>

            {pLoading ? (
              <div className="mt-3 text-sm text-gray-500">Loading products…</div>
            ) : null}

            <div className="mt-3 max-h-[45vh] space-y-2 overflow-y-auto">
              {products.map((p) => {
                const qty = qtyMap[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    className="flex items-center justify-between border-b py-2"
                  >
                    <div className="min-w-0 pr-3">
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className="text-xs text-gray-500">
                        Rate: {inr(Number(p.mrp || 0))}
                      </div>
                    </div>

                    <input
                      type="number"
                      min={0}
                      value={qty || ""}
                      onChange={(e) => setQty(p.id, Number(e.target.value))}
                      className="w-16 rounded border text-center"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 pb-20">
              <button
                type="button"
                onClick={closeCreateOrder}
                className="rounded-2xl border px-4 py-3 font-bold"
                disabled={savingOrder}
              >
                Cancel
              </button>

              <button
                type="button"
                className="rounded-2xl bg-gray-900 px-4 py-3 font-bold text-white disabled:opacity-60"
                onClick={saveOrder}
                disabled={savingOrder}
              >
                {savingOrder ? "Saving..." : "Save Order"}
              </button>
            </div>
          </div>
        </div>
      )}

      {shareOpen && active && createdOrder && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/50">
          <div className="w-full rounded-t-3xl bg-white p-4 shadow-2xl">
            <div className="flex justify-between gap-3">
              <div>
                <div className="text-base font-extrabold">Order Created</div>
                <div className="mt-1 text-xs text-gray-500">
                  {createdOrder.orderNo || createdOrder.id || "Order saved successfully"}
                </div>
              </div>

              <button
                type="button"
                onClick={closeShareModal}
                className="rounded-xl bg-black/5 px-3 py-2"
              >
                <Icon name="close" />
              </button>
            </div>

            <div className="mt-4 rounded-2xl border border-black/10 bg-black/5 p-3">
              <div className="text-xs text-gray-500">Retailer</div>
              <div className="text-sm font-bold text-gray-900">{active.name}</div>

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
                <div className="text-xs font-semibold text-gray-500">
                  Bill Summary
                </div>
                <div className="mt-1 text-sm font-extrabold text-gray-900">
                  Total Bill Amount: {inr(getCreatedGrandTotal())}
                </div>
              </div>
            </div>

            <div className="mt-4 max-h-[28vh] overflow-y-auto rounded-2xl border border-black/10 bg-white p-3">
              <div className="text-xs font-semibold text-gray-500">
                Ordered Items
              </div>

              <div className="mt-2 space-y-2">
                {createdItems.map((it) => {
                  const product = getProductById(it.productId);
                  const name = cleanStr(product?.name || it.productId);
                  const qty = Math.max(0, Math.floor(Number(it.qty || 0)));
                  const rate = Number(product?.mrp || 0);
                  const total = qty * rate;

                  return (
                    <div
                      key={it.productId}
                      className="rounded-xl border border-black/10 bg-black/[0.02] p-3"
                    >
                      <div className="text-sm font-bold text-gray-900">{name}</div>
                      <div className="mt-1 text-xs text-gray-600">
                        Qty: {qty} | Rate: {inr(rate)} | Total: {inr(total)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 space-y-3 pb-20">
              <button
                type="button"
                onClick={shareWhatsApp}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm"
              >
                <Icon name="whatsapp" />
                Share on WhatsApp
              </button>

              <button
                type="button"
                onClick={shareSMS}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm"
              >
                <Icon name="sms" />
                Send Text SMS
              </button>

              <button
                type="button"
                onClick={closeShareModal}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-extrabold text-black shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}