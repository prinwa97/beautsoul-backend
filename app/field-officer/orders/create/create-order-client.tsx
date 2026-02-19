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

function uuid() {
  // modern browsers (iPhone/Android) support this
  return crypto.randomUUID();
}

function safeGetLS(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSetLS(key: string, val: string) {
  try {
    localStorage.setItem(key, val);
  } catch {}
}
function safeRemoveLS(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

function getOrCreateDeviceId() {
  const k = "bs_device_id";
  const v = safeGetLS(k);
  if (v) return v;
  const id = uuid();
  safeSetLS(k, id);
  return id;
}

/**
 * ✅ Offline-safe pattern:
 * - create a "pending" idempotencyKey per retailer until success
 * - if user taps multiple times / network retries, same key used => server dedupes
 */
function pendingKeyStorageKey(retailerId: string) {
  return `bs_pending_order_key:${retailerId}`;
}

type Item = { productName: string; qty: number; rate: number };

function validateItems(items: Item[]) {
  if (!Array.isArray(items) || items.length === 0) return "Please add at least 1 item";
  for (const it of items) {
    const name = String(it.productName || "").trim();
    const qty = Number(it.qty);
    const rate = Number(it.rate);
    if (!name) return "Item name missing";
    if (!Number.isFinite(qty) || qty <= 0) return "Qty must be > 0";
    if (!Number.isFinite(rate) || rate < 0) return "Rate invalid";
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

  // ✅ demo items (abhi aap products UI banaoge; for now sample)
  const [items] = useState<Item[]>([{ productName: "BeautSoul Sunscreen Gel", qty: 1, rate: 299 }]);

  const inflightRef = useRef<AbortController | null>(null);

  async function submitOrder() {
    if (!retailerId) return;
    if (saving) return; // ✅ hard guard

    const vErr = validateItems(items);
    if (vErr) {
      setMsg(`❌ ${vErr}`);
      return;
    }

    setSaving(true);
    setMsg("");

    // abort previous (extra safety)
    try {
      inflightRef.current?.abort();
    } catch {}
    const ac = new AbortController();
    inflightRef.current = ac;

    try {
      const deviceId = getOrCreateDeviceId();

      // ✅ stable idempotency key until success
      const keyStore = pendingKeyStorageKey(retailerId);
      const idempotencyKey = safeGetLS(keyStore) || uuid();
      safeSetLS(keyStore, idempotencyKey);

      const res = await fetch("/api/field-officer/create-order/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        keepalive: true,
        signal: ac.signal,
        body: JSON.stringify({
          retailerId,
          idempotencyKey,
          deviceId,
          appVersion: "web",
          items,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        const err = String(data?.error || `HTTP ${res.status}`);
        setMsg(`❌ ${err} (offline/slow net ho to dobara try kar sakte ho; duplicate nahi banega)`);
        return;
      }

      // ✅ success -> clear pending key so next order will be new
      safeRemoveLS(keyStore);

      setMsg(data.deduped ? "✅ Order already created earlier (deduped)" : "✅ Order created");

      // ✅ optional: go back to list so user doesn't tap again
      // router.replace("/field-officer/orders");
      // or: router.push(`/field-officer/orders/${data.orderId}`);
    } catch (e: any) {
      // Abort is not an error for user
      if (e?.name === "AbortError") {
        setMsg("⏳ Request updated, please wait...");
      } else {
        setMsg(`❌ ${e?.message || "Network error"} (offline ho to later try; duplicate nahi banega)`);
      }
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

          <div className="rounded-xl bg-black/5 p-3">
            <div className="text-sm font-extrabold">Items (demo)</div>
            <div className="mt-2 space-y-2">
              {items.map((it, idx) => (
                <div key={idx} className="rounded-lg bg-white p-2 border border-black/10">
                  <div className="text-sm font-semibold">{it.productName}</div>
                  <div className="text-xs text-gray-600">
                    Qty: {it.qty} • Rate: ₹{it.rate}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-gray-600">
              Note: Abhi product picker/qty inputs next step me add karenge. Duplicate order issue fix yahan se ho jayega.
            </div>
          </div>

          {msg ? <div className="text-sm font-semibold">{msg}</div> : null}

          <button
            onClick={submitOrder}
            disabled={saving}
            className="w-full rounded-2xl bg-black px-4 py-3 text-white font-extrabold disabled:opacity-60"
          >
            {saving ? "Submitting..." : "Submit Order (Offline Safe)"}
          </button>
        </div>
      )}
    </div>
  );
}
