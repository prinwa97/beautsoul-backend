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

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function ymd(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function Icon({ name }: { name: "close" | "plus" | "back" }) {
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

  // list
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("RECENT");
  const [rows, setRows] = useState<RetailerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState("");

  // retailer drawer
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<RetailerRow | null>(null);

  // create order modal
  const [createOpen, setCreateOpen] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [pLoading, setPLoading] = useState(false);
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});

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
      setRows(j?.rows || []);
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
    const t = setTimeout(() => load(q, sort), 250);
    return () => clearTimeout(t);
  }, [q, sort]);

  const list = useMemo(() => rows, [rows]);

  function openDrawer(r: RetailerRow) {
    setActive(r);
    setOpen(true);
  }

  function closeDrawer() {
    setOpen(false);
  }

  async function loadProducts() {
    setPLoading(true);
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
    setCreateOpen(false);
  }

  function setQty(productId: string, qty: number) {
    setQtyMap((prev) => {
      const next = { ...prev };
      const q = Math.floor(Number(qty || 0));
      if (!Number.isFinite(q) || q <= 0) delete next[productId];
      else next[productId] = q;
      return next;
    });
  }

  // ✅ FIX: View Orders navigation
  function goViewOrders() {
    if (!active?.retailerId) {
      setToast("Select retailer first");
      return;
    }

    // Drawer close first (clean UI)
    setOpen(false);

    // ✅ Navigate to history page (create this page)
    router.push(`/field-officer/orders/history?retailerId=${active.retailerId}`);
  }

  return (
    <div className="p- space-y- pb-24">
      <div className="flex items-end justify-center">
        <div>
          <div className="text-2xl font-extrabold">Orders</div>
        </div>
      </div>

      <div className="rounded-2xl border border-black/10 bg-white p-3 shadow-sm space-y-2">
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
                    {r.lastOrderStatus ? (
                      <span> • {r.lastOrderStatus}</span>
                    ) : null}
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

      {/* Drawer */}
      {open && active && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40">
          <div className="w-full rounded-t-3xl bg-white p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-base font-extrabold">
                  {active.name}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {(active.city || "—") +
                    (active.phone ? ` • ${active.phone}` : "")}
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

            <div className="mt-4 pb-20 grid grid-cols-2 gap-3">
              {/* ✅ FIXED */}
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
                className="rounded-2xl bg-gray-900 px-4 py-3 text-sm font-extrabold text-white shadow-sm flex items-center justify-center gap-2"
              >
                <Icon name="plus" />
                Create Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
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

            <div className="max-h-[45vh] overflow-y-auto mt-3 space-y-2">
              {products.map((p) => {
                const qty = qtyMap[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    className="flex justify-between items-center border-b py-2"
                  >
                    <div>
                      <div className="font-semibold text-sm">{p.name}</div>
                      <div className="text-xs text-gray-500">
                        {p.mrp ? inr(p.mrp) : ""}
                      </div>
                    </div>

                    <input
                      type="number"
                      value={qty || ""}
                      onChange={(e) => setQty(p.id, Number(e.target.value))}
                      className="w-16 border rounded text-center"
                    />
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pb-20 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeCreateOrder}
                className="rounded-2xl border px-4 py-3 font-bold"
              >
                Cancel
              </button>

              <button
                type="button"
                className="rounded-2xl bg-gray-900 text-white px-4 py-3 font-bold"
                onClick={async () => {
                  if (!active) return;

                  const items = Object.entries(qtyMap)
                    .filter(([_, q]) => Number(q) > 0)
                    .map(([productId, qty]) => ({ productId, qty }));

                  if (!items.length) {
                    setToast("Select at least one product");
                    return;
                  }

                  const res = await fetch("/api/field-officer/orders/create", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      retailerId: active.retailerId,
                      items,
                    }),
                  });

                  const j = await res.json().catch(() => ({}));

                  if (!res.ok || !j.ok) {
                    setToast(j.error || "Failed to create order");
                    return;
                  }

                  setToast("✅ Order created");
                  setCreateOpen(false);
                  setOpen(false);
                  load(q, sort);
                }}
              >
                Save Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}