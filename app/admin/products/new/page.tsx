"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function toNum(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : NaN;
}

export default function AdminNewProductPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [mrp, setMrp] = useState("");
  const [gstRate, setGstRate] = useState("");

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  async function save() {
    setToast("");

    const nm = name.trim();
    const rate = toNum(salePrice);

    if (!nm) return setToast("Product name required");
    if (!Number.isFinite(rate) || rate <= 0) return setToast("Valid selling rate required");

    const mrpVal = mrp.trim() ? toNum(mrp) : null;
    if (mrpVal != null && (!Number.isFinite(mrpVal) || mrpVal <= 0)) return setToast("MRP invalid");

    const gstVal = gstRate.trim() ? toNum(gstRate) : null;
    if (gstVal != null && (!Number.isFinite(gstVal) || gstVal < 0 || gstVal > 100)) return setToast("GST invalid");

    setSaving(true);
    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nm,
          salePrice: rate,
          mrp: mrpVal,
          gstRate: gstVal,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setToast(data?.error || "Failed to create product");
        return;
      }

      router.replace("/admin/products");
    } catch {
      setToast("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-xl px-3 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xl font-black">Add Product</div>
            <div className="text-xs text-gray-600">ProductCatalog me product create hoga + selling rate set hoga</div>
          </div>
          <Link href="/admin/products" className="text-sm font-bold underline">
            Back
          </Link>
        </div>

        <div className="mt-3 rounded-2xl border border-black/10 bg-white p-4 shadow-sm">
          {toast ? <div className="mb-3 text-sm font-bold text-red-600">{toast}</div> : null}

          <label className="block text-xs font-black text-gray-700">Product Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. BeautSoul Sunscreen Gel"
            className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 text-sm outline-none focus:border-black/40"
          />

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-xs font-black text-gray-700">Selling Rate to Distributor (₹)</label>
              <input
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                placeholder="e.g. 199"
                inputMode="decimal"
                className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 text-sm outline-none focus:border-black/40"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-700">MRP (optional)</label>
              <input
                value={mrp}
                onChange={(e) => setMrp(e.target.value)}
                placeholder="e.g. 299"
                inputMode="decimal"
                className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 text-sm outline-none focus:border-black/40"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-black text-gray-700">GST % (optional)</label>
              <input
                value={gstRate}
                onChange={(e) => setGstRate(e.target.value)}
                placeholder="e.g. 18"
                inputMode="decimal"
                className="mt-1 w-full rounded-xl border border-black/15 px-3 py-2 text-sm outline-none focus:border-black/40"
              />
            </div>
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="mt-4 w-full rounded-2xl bg-black px-4 py-3 text-sm font-extrabold text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Product"}
          </button>
        </div>
      </div>
    </div>
  );
}
