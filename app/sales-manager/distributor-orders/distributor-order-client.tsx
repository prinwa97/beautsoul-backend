"use client";

import React, { useEffect, useMemo, useState } from "react";

type Props = {
  onCreated?: (orderNo: string) => void;
};

type Distributor = { id: string; name: string };
type Product = { id: string; name: string; salePrice: number | null; isActive: boolean };

type Row = {
  key: string;
  productName: string; // schema uses productName
  qtyPcs: string; // ✅ keep as string while typing
  rate: number; // locked
};

function num(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function inr(v: number) {
  try {
    return v.toLocaleString("en-IN");
  } catch {
    return String(v);
  }
}

export default function DistributorOrderClient({ onCreated }: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [forDistributorId, setForDistributorId] = useState("");
  const [rows, setRows] = useState<Row[]>([
    { key: String(Date.now()), productName: "", qtyPcs: "1", rate: 0 },
  ]);

  const activeProducts = useMemo(() => products.filter((p) => p.isActive !== false), [products]);

  const totalAmount = useMemo(() => {
    return rows.reduce((s, r) => s + num(r.qtyPcs) * num(r.rate), 0);
  }, [rows]);

  // Load meta (distributors + products)
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const [dRes, pRes] = await Promise.all([
          fetch("/api/sales-manager/distributor-orders/meta?type=distributors", { cache: "no-store" }),
          fetch("/api/sales-manager/distributor-orders/meta?type=products", { cache: "no-store" }),
        ]);

        const d = await dRes.json().catch(() => null);
        const p = await pRes.json().catch(() => null);

        if (!alive) return;

        setDistributors(Array.isArray(d?.distributors) ? d.distributors : []);
        setProducts(Array.isArray(p?.products) ? p.products : []);
      } catch (e) {
        console.error("meta load error", e);
        if (!alive) return;
        setDistributors([]);
        setProducts([]);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  function addRow() {
    setRows((prev) => [
      ...prev,
      { key: String(Date.now() + Math.random()), productName: "", qtyPcs: "1", rate: 0 },
    ]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.key !== key)));
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  // Product select -> rate auto from salePrice (locked)
  function onSelectProduct(key: string, productName: string) {
    const prod = products.find((x) => x.name === productName);
    const rate = num(prod?.salePrice ?? 0);
    updateRow(key, { productName, rate });
  }

  async function createOrder() {
    if (!forDistributorId) {
      alert("Select distributor first");
      return;
    }

    const items = rows
      .filter((r) => r.productName && num(r.qtyPcs) > 0)
      .map((r) => ({
        productName: r.productName,
        orderedQtyPcs: Math.max(1, Math.floor(num(r.qtyPcs))), // ✅ convert here
        rate: num(r.rate), // server will also auto-apply
      }));

    if (items.length === 0) {
      alert("Add at least 1 item");
      return;
    }

    const names = items.map((x) => x.productName.toLowerCase());
    if (new Set(names).size !== names.length) {
      alert("Same product multiple times. Keep one row per product.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sales-manager/distributor-orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          distributorId: forDistributorId,
          items,
        }),
      });

      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        alert(data?.error || "Create failed");
        return;
      }

      const createdOrderNo = String(data?.orderNo || data?.order?.orderNo || "").trim();

      alert(`Order Created: ${createdOrderNo || ""}`);

      // ✅ notify parent => auto switch tab in page.tsx
      if (createdOrderNo) onCreated?.(createdOrderNo);

      setForDistributorId("");
      setRows([{ key: String(Date.now()), productName: "", qtyPcs: "1", rate: 0 }]);
    } catch (e: any) {
      alert(e?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fff7f6]">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="rounded-2xl bg-white border border-pink-100 shadow-sm p-4 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">Create Distributor Order</h1>
              <p className="text-sm text-gray-600 mt-1">
                Retailer data is not used. Rate auto from Product Catalog (locked).
              </p>
            </div>
            <div className="text-right">
              <div className="text-xs text-gray-500">Total</div>
              <div className="text-lg font-semibold text-gray-900">₹ {inr(totalAmount)}</div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Select Distributor</label>
              <select
                value={forDistributorId}
                onChange={(e) => setForDistributorId(e.target.value)}
                disabled={loading}
                className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-200"
              >
                <option value="">{loading ? "Loading..." : "Select distributor"}</option>
                {distributors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>

              {!loading && distributors.length === 0 && (
                <div className="mt-2 text-xs text-red-600">No distributors found (or meta unauthorized).</div>
              )}
            </div>

            <div className="rounded-xl bg-[#fff0f0] border border-pink-100 p-3">
              <div className="text-sm font-medium text-gray-800">Rules</div>
              <ul className="mt-1 text-xs text-gray-700 list-disc pl-5 space-y-1">
                <li>Retailer is removed from this flow.</li>
                <li>Rate is auto & locked from ProductCatalog.salePrice.</li>
                <li>Quantity must be 1+.</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">Items</div>
            <button
              type="button"
              onClick={addRow}
              className="rounded-xl bg-pink-600 text-white text-sm px-4 py-2 hover:bg-pink-700"
            >
              + Add Item
            </button>
          </div>

          <div className="mt-3 overflow-x-auto rounded-2xl border border-pink-100">
            <table className="min-w-full text-sm bg-white">
              <thead className="bg-[#fff0f0] text-gray-700">
                <tr>
                  <th className="text-left px-3 py-2">Product</th>
                  <th className="text-left px-3 py-2 w-[140px]">Qty (PCS)</th>
                  <th className="text-left px-3 py-2 w-[160px]">Rate (Locked)</th>
                  <th className="text-left px-3 py-2 w-[160px]">Amount</th>
                  <th className="px-3 py-2 w-[90px]"></th>
                </tr>
              </thead>

              <tbody>
                {rows.map((r) => {
                  const amount = num(r.qtyPcs) * num(r.rate);

                  return (
                    <tr key={r.key} className="border-t border-pink-100">
                      <td className="px-3 py-2">
                        <select
                          value={r.productName}
                          onChange={(e) => onSelectProduct(r.key, e.target.value)}
                          disabled={loading}
                          className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-200"
                        >
                          <option value="">{loading ? "Loading..." : "Select product"}</option>
                          {activeProducts.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        </select>

                        {!loading && activeProducts.length === 0 && (
                          <div className="mt-1 text-xs text-red-600">No products found (or meta unauthorized).</div>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={r.qtyPcs}
                          onChange={(e) => {
                            const v = e.target.value.replace(/\D/g, "");
                            updateRow(r.key, { qtyPcs: v });
                          }}
                          onBlur={() => {
                            const q = Math.max(1, Math.floor(num(r.qtyPcs)));
                            updateRow(r.key, { qtyPcs: String(q) });
                          }}
                          className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-200"
                        />
                      </td>

                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={r.rate}
                          readOnly
                          disabled
                          className="w-full rounded-xl border border-pink-100 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                        />
                      </td>

                      <td className="px-3 py-2 font-semibold">₹ {inr(amount)}</td>

                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeRow(r.key)}
                          className="rounded-xl border border-pink-200 px-3 py-2 text-xs hover:bg-[#fff0f0]"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className="border-t border-pink-100">
                  <td className="px-3 py-3" colSpan={3}>
                    <div className="text-sm font-medium text-gray-800">Grand Total</div>
                  </td>
                  <td className="px-3 py-3 font-semibold text-gray-900">₹ {inr(totalAmount)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={createOrder}
              disabled={loading || submitting}
              className="rounded-xl bg-gray-900 text-white text-sm px-5 py-2.5 hover:bg-black disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
