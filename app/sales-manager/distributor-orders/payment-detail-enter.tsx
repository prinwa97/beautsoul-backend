"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  refreshKey?: number;
  autoOpenOrderNo?: string;
};

type Item = {
  productName: string;
  orderedQtyPcs: number;
  rate?: number | null;
  batchNo?: string | null;
  expiryDate?: string | null;
};

type Order = {
  id: string;
  orderNo: string;
  createdAt: string;
  status: string;

  paymentStatus: "UNPAID" | "PARTIAL" | "PAID";
  paymentMode?: string | null;
  paidAmount?: number | null;
  utrNo?: string | null;
  paidAt?: string | null;
  paymentRemarks?: string | null;

  paymentVerified?: boolean;

  distributor?: { id: string; name: string };
  items?: Item[];

  totalAmount?: number;
  paymentEntered?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
};

type Product = {
  id: string;
  name: string;
  salePrice: number | null;
  isActive: boolean;
};

type Distributor = {
  id: string;
  name: string;
};

type EditRow = {
  key: string;
  productName: string;
  qtyPcs: string;
  rate: number;
};

function n(v: any) {
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

function fmtDate(s?: string | null) {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleString("en-IN");
  } catch {
    return String(s);
  }
}

function makeEditRow(productName = "", qtyPcs = "1", rate = 0): EditRow {
  return {
    key: `${Date.now()}-${Math.random()}`,
    productName,
    qtyPcs,
    rate,
  };
}

export default function PaymentDetailEnter({
  refreshKey = 0,
  autoOpenOrderNo = "",
}: Props) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [err, setErr] = useState("");

  const [products, setProducts] = useState<Product[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [metaLoading, setMetaLoading] = useState(true);

  const [showDetails, setShowDetails] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);

  const [showPay, setShowPay] = useState(false);
  const [payOrder, setPayOrder] = useState<Order | null>(null);
  const [payMode, setPayMode] = useState<"UPI" | "BANK_TRANSFER" | "CHEQUE">("UPI");
  const [utr, setUtr] = useState("");
  const [remarks, setRemarks] = useState("");
  const [savingPay, setSavingPay] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [editOrder, setEditOrder] = useState<Order | null>(null);
  const [editDistributorId, setEditDistributorId] = useState("");
  const [editRows, setEditRows] = useState<EditRow[]>([makeEditRow()]);
  const [savingEdit, setSavingEdit] = useState(false);

  const pendingAutoOpen = useRef<string>("");

  const activeProducts = useMemo(
    () => products.filter((p) => p.isActive !== false),
    [products]
  );

  async function loadMeta() {
    setMetaLoading(true);
    try {
      const res = await fetch("/api/sales-manager/distributor-orders?meta=1", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Failed to load metadata");
      }

      setProducts(Array.isArray(data?.products) ? data.products : []);
      setDistributors(Array.isArray(data?.distributors) ? data.distributors : []);
    } catch (e: any) {
      console.error("meta load error", e);
      setProducts([]);
      setDistributors([]);
    } finally {
      setMetaLoading(false);
    }
  }

  async function load(): Promise<Order[]> {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/sales-manager/distributor-orders?take=100", {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "Failed to load orders");
      }

      const list = Array.isArray(data?.orders) ? (data.orders as Order[]) : [];
      setOrders(list);
      return list;
    } catch (e: any) {
      setErr(e?.message || "Error");
      setOrders([]);
      return [];
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    pendingAutoOpen.current = (autoOpenOrderNo || "").trim();

    (async () => {
      const list = await load();

      const want = pendingAutoOpen.current;
      if (!want) return;

      const found = list.find((o) => String(o.orderNo || "").trim() === want);

      if (found) {
        openPayment(found);
      }

      pendingAutoOpen.current = "";
    })();
  }, [refreshKey, autoOpenOrderNo]);

  const rows = useMemo(() => {
    return orders.map((o) => {
      const items = o.items || [];
      const computedTotal = items.reduce(
        (s, it) => s + n(it.orderedQtyPcs) * n(it.rate || 0),
        0
      );
      return {
        ...o,
        totalAmount:
          typeof o.totalAmount === "number" ? o.totalAmount : computedTotal,
      };
    });
  }, [orders]);

  const editTotalAmount = useMemo(() => {
    return editRows.reduce((s, r) => s + n(r.qtyPcs) * n(r.rate), 0);
  }, [editRows]);

  function openDetails(o: Order) {
    setDetailsOrder(o);
    setShowDetails(true);
  }

  function openPayment(o: Order) {
    if (o.paymentStatus === "PAID" || o.paymentEntered) {
      alert("Payment already entered. Order is locked.");
      return;
    }

    setPayOrder(o);
    setPayMode("UPI");
    setUtr("");
    setRemarks("");
    setShowPay(true);
  }

  function addEditRow() {
    setEditRows((prev) => [...prev, makeEditRow()]);
  }

  function removeEditRow(key: string) {
    setEditRows((prev) => (prev.length <= 1 ? prev : prev.filter((x) => x.key !== key)));
  }

  function updateEditRow(key: string, patch: Partial<EditRow>) {
    setEditRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function onSelectEditProduct(key: string, productName: string) {
    const prod = products.find((x) => x.name === productName);
    const rate = n(prod?.salePrice ?? 0);
    updateEditRow(key, { productName, rate });
  }

  async function openEdit(o: Order) {
    if (!o.canEdit) {
      alert("Payment ke baad ya dispatch/receive ke baad order edit nahi ho sakta.");
      return;
    }

    try {
      const res = await fetch(`/api/sales-manager/distributor-orders/${o.id}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        alert(data?.error || "Failed to load order");
        return;
      }

      const order = data?.order as Order | undefined;
      if (!order) {
        alert("Order details not found");
        return;
      }

      if (!order.canEdit) {
        alert("Payment ke baad ya dispatch/receive ke baad order edit nahi ho sakta.");
        return;
      }

      setEditOrder(order);
      setEditDistributorId(String(order.distributor?.id || (order as any).forDistributorId || ""));
      setEditRows(
        Array.isArray(order.items) && order.items.length > 0
          ? order.items.map((it) =>
              makeEditRow(
                String(it.productName || ""),
                String(Math.max(1, Math.floor(n(it.orderedQtyPcs || 1)))),
                n(it.rate || 0)
              )
            )
          : [makeEditRow()]
      );
      setShowEdit(true);
    } catch (e: any) {
      alert(e?.message || "Failed to open edit");
    }
  }

  async function saveEdit() {
    if (!editOrder) return;

    if (!editDistributorId) {
      alert("Select distributor");
      return;
    }

    const items = editRows
      .filter((r) => r.productName && n(r.qtyPcs) > 0)
      .map((r) => ({
        productName: r.productName,
        orderedQtyPcs: Math.max(1, Math.floor(n(r.qtyPcs))),
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

    setSavingEdit(true);
    try {
      const res = await fetch(`/api/sales-manager/distributor-orders/${editOrder.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          distributorId: editDistributorId,
          items,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        alert(data?.error || "Update failed");
        return;
      }

      alert("Order updated successfully");
      setShowEdit(false);
      setEditOrder(null);
      await load();
    } catch (e: any) {
      alert(e?.message || "Update failed");
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteOrder(o: Order) {
    if (!o.canDelete) {
      alert("Payment ke baad ya dispatch/receive ke baad order delete nahi ho sakta.");
      return;
    }

    const ok = window.confirm(`Delete order ${o.orderNo}?`);
    if (!ok) return;

    try {
      const res = await fetch(`/api/sales-manager/distributor-orders/${o.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        alert(data?.error || "Delete failed");
        return;
      }

      alert("Order deleted successfully");
      if (detailsOrder?.id === o.id) {
        setShowDetails(false);
        setDetailsOrder(null);
      }
      await load();
    } catch (e: any) {
      alert(e?.message || "Delete failed");
    }
  }

  async function savePayment() {
    if (!payOrder) return;

    if (!utr.trim()) {
      alert("UTR required");
      return;
    }

    setSavingPay(true);
    try {
      const res = await fetch(`/api/sales-manager/distributor-orders/${payOrder.id}/payment`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          paymentMode: payMode,
          utrNo: utr.trim(),
          paymentRemarks: remarks.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || data?.ok === false) {
        alert(data?.error || "Payment save failed");
        return;
      }

      alert("Payment Saved ✅ (PAID)");
      setShowPay(false);
      setPayOrder(null);
      await load();
    } catch (e: any) {
      alert(e?.message || "Network error");
    } finally {
      setSavingPay(false);
    }
  }

  function printOrder(o: Order) {
    const items = o.items || [];
    const total =
      typeof o.totalAmount === "number"
        ? o.totalAmount
        : items.reduce((s, it) => s + n(it.orderedQtyPcs) * n(it.rate || 0), 0);

    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${o.orderNo}</title>
  <style>
    body{font-family:Arial, sans-serif; padding:24px;}
    h1{font-size:18px;margin:0 0 8px}
    .muted{color:#666;font-size:12px;line-height:1.5}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th,td{border:1px solid #ddd;padding:8px;font-size:12px}
    th{background:#f7f7f7;text-align:left}
    .right{text-align:right}
    .mt{margin-top:10px}
  </style>
</head>
<body>
  <h1>Distributor Order: ${o.orderNo}</h1>
  <div class="muted">
    Distributor: ${o.distributor?.name || "-"}<br/>
    Created: ${fmtDate(o.createdAt)}<br/>
    Payment: ${o.paymentStatus || "-"} ${o.paymentMode ? `| Mode: ${o.paymentMode}` : ""} ${
      o.utrNo ? `| UTR: ${o.utrNo}` : ""
    }
  </div>

  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th class="right">Qty</th>
        <th class="right">Rate</th>
        <th class="right">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${items
        .map((it) => {
          const amt = n(it.orderedQtyPcs) * n(it.rate || 0);
          return `<tr>
            <td>${it.productName}</td>
            <td class="right">${n(it.orderedQtyPcs)}</td>
            <td class="right">${inr(n(it.rate || 0))}</td>
            <td class="right">${inr(amt)}</td>
          </tr>`;
        })
        .join("")}
    </tbody>
    <tfoot>
      <tr>
        <th colspan="3" class="right">Total</th>
        <th class="right">${inr(total)}</th>
      </tr>
    </tfoot>
  </table>

  <div class="muted mt">Printed on: ${new Date().toLocaleString("en-IN")}</div>
</body>
</html>`;

    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return alert("Popup blocked");
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <div className="min-h-screen bg-[#fff7f6]">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="rounded-2xl bg-white border border-pink-100 shadow-sm p-4 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xl font-semibold text-gray-900">Distributor Orders</div>
              <div className="text-sm text-gray-600 mt-1">
                Actions: Detail • Print • Edit • Delete • Payment (No Cash)
              </div>
            </div>
            <button
              type="button"
              onClick={() => load()}
              className="rounded-xl border border-pink-200 px-4 py-2 text-sm hover:bg-[#fff0f0]"
            >
              Refresh
            </button>
          </div>

          {err && <div className="mt-3 text-sm text-red-600">{err}</div>}

          <div className="mt-4 overflow-x-auto rounded-2xl border border-pink-100">
            <table className="min-w-full text-sm bg-white">
              <thead className="bg-[#fff0f0] text-gray-700">
                <tr>
                  <th className="text-left px-3 py-2">Order No</th>
                  <th className="text-left px-3 py-2">Distributor</th>
                  <th className="text-left px-3 py-2">Items</th>
                  <th className="text-left px-3 py-2">Total</th>
                  <th className="text-left px-3 py-2">Payment</th>
                  <th className="text-left px-3 py-2 w-[420px]">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-3 py-3" colSpan={6}>
                      Loading...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3" colSpan={6}>
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  rows.map((o) => (
                    <tr key={o.id} className="border-t border-pink-100">
                      <td className="px-3 py-2 font-medium">{o.orderNo}</td>
                      <td className="px-3 py-2">{o.distributor?.name || "-"}</td>
                      <td className="px-3 py-2">{(o.items || []).length}</td>
                      <td className="px-3 py-2 font-semibold">₹ {inr(n(o.totalAmount))}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{o.paymentStatus || "-"}</div>
                        <div className="text-xs text-gray-600">
                          {o.paymentMode ? `${o.paymentMode}` : ""} {o.utrNo ? `• ${o.utrNo}` : ""}
                        </div>
                        {(o.paymentEntered || o.paymentStatus === "PAID") && (
                          <div className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                            Locked
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openDetails(o)}
                            className="rounded-xl border border-pink-200 px-3 py-2 text-xs hover:bg-[#fff0f0]"
                          >
                            Detail
                          </button>

                          <button
                            type="button"
                            onClick={() => printOrder(o)}
                            className="rounded-xl border border-pink-200 px-3 py-2 text-xs hover:bg-[#fff0f0]"
                          >
                            Print
                          </button>

                          <button
                            type="button"
                            onClick={() => openEdit(o)}
                            disabled={!o.canEdit}
                            className={`rounded-xl px-3 py-2 text-xs border ${
                              o.canEdit
                                ? "border-green-300 text-green-700 hover:bg-green-50"
                                : "border-gray-200 text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteOrder(o)}
                            disabled={!o.canDelete}
                            className={`rounded-xl px-3 py-2 text-xs border ${
                              o.canDelete
                                ? "border-red-300 text-red-700 hover:bg-red-50"
                                : "border-gray-200 text-gray-400 cursor-not-allowed"
                            }`}
                          >
                            Delete
                          </button>

                          <button
                            type="button"
                            onClick={() => openPayment(o)}
                            disabled={!!o.paymentEntered || o.paymentStatus === "PAID"}
                            className={`rounded-xl px-3 py-2 text-xs ${
                              !!o.paymentEntered || o.paymentStatus === "PAID"
                                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                                : "bg-gray-900 text-white hover:bg-black"
                            }`}
                          >
                            Payment
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {showDetails && detailsOrder && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-3 z-50">
            <div className="w-full max-w-3xl rounded-2xl bg-white border border-pink-100 shadow-lg p-4 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-gray-900">Order Details</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {detailsOrder.orderNo} • {detailsOrder.distributor?.name || "-"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetails(false)}
                  className="rounded-xl border border-pink-200 px-3 py-2 text-xs hover:bg-[#fff0f0]"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#fff7f6] border border-pink-100 p-3">
                  <div className="text-xs text-gray-600">Created</div>
                  <div className="text-sm font-medium">{fmtDate(detailsOrder.createdAt)}</div>
                </div>

                <div className="rounded-xl bg-[#fff7f6] border border-pink-100 p-3">
                  <div className="text-xs text-gray-600">Payment</div>
                  <div className="text-sm font-medium">
                    {detailsOrder.paymentStatus}{" "}
                    {detailsOrder.paymentMode ? `• ${detailsOrder.paymentMode}` : ""}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    UTR: {detailsOrder.utrNo || "-"} • Paid At: {fmtDate(detailsOrder.paidAt)}
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-2xl border border-pink-100">
                <table className="min-w-full text-sm bg-white">
                  <thead className="bg-[#fff0f0] text-gray-700">
                    <tr>
                      <th className="text-left px-3 py-2">Product</th>
                      <th className="text-left px-3 py-2 w-[120px]">Qty</th>
                      <th className="text-left px-3 py-2 w-[140px]">Rate</th>
                      <th className="text-left px-3 py-2 w-[160px]">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detailsOrder.items || []).map((it, idx) => {
                      const amt = n(it.orderedQtyPcs) * n(it.rate || 0);
                      return (
                        <tr key={idx} className="border-t border-pink-100">
                          <td className="px-3 py-2">{it.productName}</td>
                          <td className="px-3 py-2">{n(it.orderedQtyPcs)}</td>
                          <td className="px-3 py-2">{inr(n(it.rate || 0))}</td>
                          <td className="px-3 py-2 font-semibold">₹ {inr(amt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => openEdit(detailsOrder)}
                  disabled={!detailsOrder.canEdit}
                  className={`rounded-xl px-4 py-2 text-sm border ${
                    detailsOrder.canEdit
                      ? "border-green-300 text-green-700 hover:bg-green-50"
                      : "border-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Edit Order
                </button>

                <button
                  type="button"
                  onClick={() => deleteOrder(detailsOrder)}
                  disabled={!detailsOrder.canDelete}
                  className={`rounded-xl px-4 py-2 text-sm border ${
                    detailsOrder.canDelete
                      ? "border-red-300 text-red-700 hover:bg-red-50"
                      : "border-gray-200 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  Delete Order
                </button>
              </div>
            </div>
          </div>
        )}

        {showEdit && editOrder && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-3 z-50">
            <div className="w-full max-w-5xl rounded-2xl bg-white border border-pink-100 shadow-lg p-4 md:p-6 max-h-[90vh] overflow-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-gray-900">Edit Order</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {editOrder.orderNo} • Payment se pehle hi edit allowed hai
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEdit(false)}
                  className="rounded-xl border border-pink-200 px-3 py-2 text-xs hover:bg-[#fff0f0]"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Select Distributor</label>
                  <select
                    value={editDistributorId}
                    onChange={(e) => setEditDistributorId(e.target.value)}
                    disabled={metaLoading}
                    className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-200"
                  >
                    <option value="">{metaLoading ? "Loading..." : "Select distributor"}</option>
                    {distributors.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-xl bg-[#fff7f6] border border-pink-100 p-3">
                  <div className="text-xs text-gray-600">Total</div>
                  <div className="text-lg font-semibold text-gray-900">₹ {inr(editTotalAmount)}</div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm font-semibold text-gray-900">Items</div>
                <button
                  type="button"
                  onClick={addEditRow}
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
                      <th className="text-left px-3 py-2 w-[160px]">Rate</th>
                      <th className="text-left px-3 py-2 w-[160px]">Amount</th>
                      <th className="px-3 py-2 w-[90px]"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {editRows.map((r) => {
                      const amount = n(r.qtyPcs) * n(r.rate);

                      return (
                        <tr key={r.key} className="border-t border-pink-100">
                          <td className="px-3 py-2">
                            <select
                              value={r.productName}
                              onChange={(e) => onSelectEditProduct(r.key, e.target.value)}
                              disabled={metaLoading}
                              className="w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-200"
                            >
                              <option value="">{metaLoading ? "Loading..." : "Select product"}</option>
                              {activeProducts.map((p) => (
                                <option key={p.id} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="px-3 py-2">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={r.qtyPcs}
                              onChange={(e) => {
                                const v = e.target.value.replace(/\D/g, "");
                                updateEditRow(r.key, { qtyPcs: v });
                              }}
                              onBlur={() => {
                                const q = Math.max(1, Math.floor(n(r.qtyPcs)));
                                updateEditRow(r.key, { qtyPcs: String(q) });
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
                              onClick={() => removeEditRow(r.key)}
                              className="rounded-xl border border-pink-200 px-3 py-2 text-xs hover:bg-[#fff0f0]"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-5 flex justify-end">
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={savingEdit}
                  className="rounded-xl bg-gray-900 text-white text-sm px-5 py-2.5 hover:bg-black disabled:opacity-60"
                >
                  {savingEdit ? "Updating..." : "Update Order"}
                </button>
              </div>
            </div>
          </div>
        )}

        {showPay && payOrder && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center p-3 z-50">
            <div className="w-full max-w-xl rounded-2xl bg-white border border-pink-100 shadow-lg p-4 md:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-gray-900">Payment</div>
                  <div className="text-sm text-gray-600 mt-1">
                    {payOrder.orderNo} • {payOrder.distributor?.name || "-"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPay(false)}
                  className="rounded-xl border border-pink-200 px-3 py-2 text-xs hover:bg-[#fff0f0]"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3">
                <div className="rounded-xl bg-[#fff7f6] border border-pink-100 p-3">
                  <div className="text-xs text-gray-600">Paid Amount (Locked)</div>
                  <div className="text-base font-semibold text-gray-900">
                    ₹ {inr(n(payOrder.totalAmount || 0))}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    No partial / no cash. Full payment only.
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Payment Mode (No Cash)</label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-200"
                  >
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">BANK TRANSFER</option>
                    <option value="CHEQUE">CHEQUE</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">UTR No (Required)</label>
                  <input
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                    placeholder="Enter UTR / Transaction No"
                    className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-200"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Remarks (Optional)</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-pink-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-pink-200"
                  />
                </div>

                <button
                  type="button"
                  onClick={savePayment}
                  disabled={savingPay}
                  className="mt-2 rounded-xl bg-gray-900 text-white px-5 py-2.5 text-sm hover:bg-black disabled:opacity-60"
                >
                  {savingPay ? "Saving..." : "Save Payment (Mark PAID)"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}