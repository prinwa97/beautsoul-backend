"use client";

import React, { useEffect, useMemo, useState } from "react";

type Props = {
  onCreated?: (orderNo: string) => void;
};

type Distributor = { id: string; name: string };
type Product = { id: string; name: string; salePrice: number | null; isActive: boolean };

type Row = {
  key: string;
  productName: string;
  qtyPcs: string;
  rate: number;
};

type CreatedOrder = {
  id: string;
  orderNo: string;
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

function makeRow(productName = "", qtyPcs = "1", rate = 0): Row {
  return {
    key: `${Date.now()}-${Math.random()}`,
    productName,
    qtyPcs,
    rate,
  };
}

export default function DistributorOrderClient({ onCreated }: Props) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const [forDistributorId, setForDistributorId] = useState("");
  const [rows, setRows] = useState<Row[]>([makeRow()]);

  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [lockedMessage, setLockedMessage] = useState("");
  const [mode, setMode] = useState<"create" | "edit">("create");

  const activeProducts = useMemo(
    () => products.filter((p) => p.isActive !== false),
    [products]
  );

  const totalAmount = useMemo(() => {
    return rows.reduce((s, r) => s + num(r.qtyPcs) * num(r.rate), 0);
  }, [rows]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/sales-manager/distributor-orders?meta=1", {
          cache: "no-store",
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || data?.ok === false) {
          throw new Error(data?.error || "Failed to load metadata");
        }

        if (!alive) return;

        setDistributors(Array.isArray(data?.distributors) ? data.distributors : []);
        setProducts(Array.isArray(data?.products) ? data.products : []);
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
    setRows((prev) => [...prev, makeRow()]);
  }

  function removeRow(key: string) {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.key !== key)));
  }

  function updateRow(key: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function onSelectProduct(key: string, productName: string) {
    const prod = products.find((x) => x.name === productName);
    const rate = num(prod?.salePrice ?? 0);
    updateRow(key, { productName, rate });
  }

  function resetForm() {
    setForDistributorId("");
    setRows([makeRow()]);
    setEditingOrderId(null);
    setLockedMessage("");
    setMode("create");
  }

  function validateItems() {
    if (!forDistributorId) {
      alert("Select distributor first");
      return null;
    }

    const items = rows
      .filter((r) => r.productName && num(r.qtyPcs) > 0)
      .map((r) => ({
        productName: r.productName,
        orderedQtyPcs: Math.max(1, Math.floor(num(r.qtyPcs))),
        rate: num(r.rate),
      }));

    if (items.length === 0) {
      alert("Add at least 1 item");
      return null;
    }

    const names = items.map((x) => x.productName.toLowerCase());
    if (new Set(names).size !== names.length) {
      alert("Same product multiple times. Keep one row per product.");
      return null;
    }

    return items;
  }

  async function createOrder() {
    const items = validateItems();
    if (!items) return;

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

      const createdOrderId = String(data?.orderId || data?.order?.id || "").trim();
      const createdOrderNo = String(data?.orderNo || data?.order?.orderNo || "").trim();

      if (createdOrderId && createdOrderNo) {
        setCreatedOrder({ id: createdOrderId, orderNo: createdOrderNo });
      }

      alert(`Order Created: ${createdOrderNo || ""}`);

      if (createdOrderNo) onCreated?.(createdOrderNo);

      resetForm();
    } catch (e: any) {
      alert(e?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function loadOrderForEdit(orderId: string) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sales-manager/distributor-orders/${orderId}`, {
        cache: "no-store",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        alert(data?.error || "Failed to load order");
        return;
      }

      const order = data?.order;
      if (!order) {
        alert("Order data not found");
        return;
      }

      if (!order.canEdit) {
        setLockedMessage(
          order?.paymentEntered
            ? "This order is locked because payment has already been entered."
            : "This order cannot be edited now."
        );
      } else {
        setLockedMessage("");
      }

      setEditingOrderId(String(order.id || ""));
      setMode("edit");
      setForDistributorId(String(order.forDistributorId || ""));
      setRows(
        Array.isArray(order.items) && order.items.length > 0
          ? order.items.map((it: any) =>
              makeRow(
                String(it?.productName || ""),
                String(Math.max(1, Math.floor(num(it?.orderedQtyPcs || 1)))),
                num(it?.rate || 0)
              )
            )
          : [makeRow()]
      );
    } catch (e: any) {
      alert(e?.message || "Failed to load order");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateOrder() {
    if (!editingOrderId) {
      alert("No order selected for edit");
      return;
    }

    const items = validateItems();
    if (!items) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sales-manager/distributor-orders/${editingOrderId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          distributorId: forDistributorId,
          items,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        alert(data?.error || "Update failed");
        return;
      }

      alert("Order updated successfully");

      const orderNo = String(
        createdOrder?.orderNo || data?.order?.orderNo || ""
      ).trim();

      if (editingOrderId) {
        setCreatedOrder((prev) =>
          prev ? prev : orderNo ? { id: editingOrderId, orderNo } : null
        );
      }

      resetForm();
    } catch (e: any) {
      alert(e?.message || "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteOrder(orderId: string) {
    const ok = window.confirm("Are you sure you want to delete this order?");
    if (!ok) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/sales-manager/distributor-orders/${orderId}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        alert(data?.error || "Delete failed");
        return;
      }

      alert("Order deleted successfully");

      if (editingOrderId === orderId) {
        resetForm();
      }
      if (createdOrder?.id === orderId) {
        setCreatedOrder(null);
      }
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    } finally {
      setSubmitting(false);
    }
  }

  const primaryDisabled =
    loading || submitting || (!!lockedMessage && mode === "edit");

  return (
    <div className="min-h-screen bg-[#fff7f6]">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="rounded-2xl bg-white border border-pink-100 shadow-sm p-4 md:p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl md:text-2xl font-semibold text-gray-900">
                {mode === "edit" ? "Edit Distributor Order" : "Create Distributor Order"}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Retailer data is not used. Rate auto from Product Catalog (locked).
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs text-gray-500">Total</div>
              <div className="text-lg font-semibold text-gray-900">₹ {inr(totalAmount)}</div>
            </div>
          </div>

          {createdOrder && (
            <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-green-800">
                    Last Created Order: {createdOrder.orderNo}
                  </div>
                  <div className="text-xs text-green-700 mt-1">
                    Payment se pehle aap is order ko edit ya delete kar sakte ho.
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => loadOrderForEdit(createdOrder.id)}
                    disabled={submitting}
                    className="rounded-xl border border-green-300 bg-white px-4 py-2 text-sm text-green-800 hover:bg-green-100 disabled:opacity-60"
                  >
                    Edit Last Order
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteOrder(createdOrder.id)}
                    disabled={submitting}
                    className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Delete Last Order
                  </button>
                </div>
              </div>
            </div>
          )}

          {lockedMessage && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {lockedMessage}
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Select Distributor</label>
              <select
                value={forDistributorId}
                onChange={(e) => setForDistributorId(e.target.value)}
                disabled={loading || (mode === "edit" && !!lockedMessage)}
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
                <div className="mt-2 text-xs text-red-600">
                  No distributors found (or metadata unauthorized).
                </div>
              )}
            </div>

            <div className="rounded-xl bg-[#fff0f0] border border-pink-100 p-3">
              <div className="text-sm font-medium text-gray-800">Rules</div>
              <ul className="mt-1 text-xs text-gray-700 list-disc pl-5 space-y-1">
                <li>Retailer is removed from this flow.</li>
                <li>Rate is auto & locked from ProductCatalog.salePrice.</li>
                <li>Quantity must be 1+.</li>
                <li>Payment enter hone ke baad order locked ho jayega.</li>
              </ul>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-900">Items</div>
            <button
              type="button"
              onClick={addRow}
              disabled={mode === "edit" && !!lockedMessage}
              className="rounded-xl bg-pink-600 text-white text-sm px-4 py-2 hover:bg-pink-700 disabled:opacity-60"
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
                          disabled={loading || (mode === "edit" && !!lockedMessage)}
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
                          <div className="mt-1 text-xs text-red-600">
                            No products found (or metadata unauthorized).
                          </div>
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
                          disabled={mode === "edit" && !!lockedMessage}
                          className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-200 disabled:bg-gray-50"
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
                          disabled={mode === "edit" && !!lockedMessage}
                          className="rounded-xl border border-pink-200 px-3 py-2 text-xs hover:bg-[#fff0f0] disabled:opacity-60"
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

          <div className="mt-5 flex flex-wrap justify-end gap-2">
            {mode === "edit" && (
              <button
                type="button"
                onClick={resetForm}
                disabled={submitting}
                className="rounded-xl border border-gray-300 bg-white text-sm px-5 py-2.5 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel Edit
              </button>
            )}

            <button
              type="button"
              onClick={mode === "edit" ? updateOrder : createOrder}
              disabled={primaryDisabled}
              className="rounded-xl bg-gray-900 text-white text-sm px-5 py-2.5 hover:bg-black disabled:opacity-60"
            >
              {submitting
                ? mode === "edit"
                  ? "Updating..."
                  : "Creating..."
                : mode === "edit"
                ? "Update Order"
                : "Create Order"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}