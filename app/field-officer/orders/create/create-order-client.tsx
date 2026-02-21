"use client";

import React, { useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function Icon({ name }: { name: "back" }) {
  const c = "h-5 w-5";
  if (name === "back")
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none">
        <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return null;
}

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

type Item = { productId: string; qty: number };

function validateItems(items: Item[]) {
  if (!Array.isArray(items) || items.length === 0) return "Please add at least 1 item";
  for (const it of items) {
    const pid = String(it.productId || "").trim();
    const qty = Math.floor(n(it.qty));
    if (!pid) return "ProductId missing";
    if (!Number.isFinite(qty) || qty <= 0) return "Qty must be > 0";
  }
  return "";
}

export default function CreateOrderClient() {
  const sp = useSearchParams();
  const router = useRouter();

  const retailerId = useMemo(() => {
    const v = sp.get("retailerId");
    return (v || "").trim();
  }, [sp]);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  // ✅ mobile simple form: one item (you can expand later)
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState<number>(1);

  const inflightRef = useRef<AbortController | null>(null);

  async function submitOrder() {
    if (!retailerId) return;
    if (saving) return;

    const items: Item[] = [{ productId: productId.trim(), qty: Math.floor(n(qty)) }];
    const vErr = validateItems(items);
    if (vErr) {
      setMsg(`❌ ${vErr}`);
      return;
    }

    setSaving(true);
    setMsg("");

    try {
      inflightRef.current?.abort();
    } catch {}
    const ac = new AbortController();
    inflightRef.current = ac;

    try {
      const res = await fetch("/api/field-officer/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        signal: ac.signal,
        body: JSON.stringify({
          retailerId,
          items,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setMsg(`❌ ${String(data?.error || `HTTP ${res.status}`)}`);
        return;
      }

      setMsg(`✅ Order created: ${data?.order?.orderNo || data?.order?.id || ""}`);

      // ✅ go back to retailer history (so FO sees it instantly)
      router.replace(`/field-officer/orders/history?retailerId=${encodeURIComponent(retailerId)}`);
    } catch (e: any) {
      if (e?.name === "AbortError") setMsg("⏳ Request updated, please wait...");
      else setMsg(`❌ ${e?.message || "Network error"}`);
    } finally {
      setSaving(false);
      inflightRef.current = null;
    }
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-center gap-2">
        <button onClick={() => router.back()} className="rounded-xl bg-black/5 px-3 py-2 text-gray-800" title="Back">
          <Icon name="back" />
        </button>
        <div>
          <div className="text-xs text-gray-500">Field Officer</div>
          <div className="text-lg font-extrabold">Create Order</div>
        </div>
      </div>

      {!retailerId ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="text-sm font-extrabold text-red-700">Retailer not selected</div>
          <div className="mt-1 text-xs text-red-700">Orders page se retailer select karke “Create Order” dabao.</div>
        </div>
      ) : (
        <div className="rounded-2xl border border-black/10 bg-white p-4 shadow-sm space-y-3">
          <div>
            <div className="text-xs text-gray-500">Retailer ID</div>
            <div className="font-mono text-sm font-semibold text-gray-900 break-all">{retailerId}</div>
          </div>

          <div className="rounded-xl bg-black/5 p-3 space-y-2">
            <div className="text-sm font-extrabold">Add Item</div>

            <div>
              <div className="text-[11px] font-semibold text-gray-600">Product ID</div>
              <input
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                placeholder="Paste productId (from ProductCatalog)"
                className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold outline-none"
              />
              <div className="mt-1 text-[11px] text-gray-500">
                Tip: admin/products list se productId copy karke yahan paste karo.
              </div>
            </div>

            <div>
              <div className="text-[11px] font-semibold text-gray-600">Qty</div>
              <input
                type="number"
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold outline-none"
                placeholder="1"
                min={1}
              />
            </div>
          </div>

          {msg ? <div className="text-sm font-semibold">{msg}</div> : null}

          <button
            onClick={submitOrder}
            disabled={saving}
            className="w-full rounded-2xl bg-black px-4 py-3 text-white font-extrabold disabled:opacity-60"
          >
            {saving ? "Submitting..." : "Submit Order"}
          </button>
        </div>
      )}
    </div>
  );
}