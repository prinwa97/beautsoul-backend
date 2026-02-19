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

export default function PaymentDetailEnter({ refreshKey = 0, autoOpenOrderNo = "" }: Props) {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [err, setErr] = useState("");

  // details modal
  const [showDetails, setShowDetails] = useState(false);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);

  // payment modal
  const [showPay, setShowPay] = useState(false);
  const [payOrder, setPayOrder] = useState<Order | null>(null);
  const [payMode, setPayMode] = useState<"UPI" | "BANK_TRANSFER" | "CHEQUE">("UPI");
  const [utr, setUtr] = useState("");
  const [remarks, setRemarks] = useState("");
  const [savingPay, setSavingPay] = useState(false);

  // ✅ pending auto-open orderNo (to avoid race with load)
  const pendingAutoOpen = useRef<string>("");

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

  // ✅ initial + refreshKey reload + auto open payment
  useEffect(() => {
    // set pending only when we have an orderNo
    pendingAutoOpen.current = (autoOpenOrderNo || "").trim();

    (async () => {
      const list = await load();

      const want = pendingAutoOpen.current;
      if (!want) return;

      // find order by orderNo
      const found = list.find((o) => String(o.orderNo || "").trim() === want);

      if (found) {
        openPayment(found);
      } else {
        // if not found, just keep list loaded (no modal)
        // optional: you can alert here if you want
        // alert(`Order not found for payment: ${want}`);
      }

      // consume pending
      pendingAutoOpen.current = "";
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, autoOpenOrderNo]);

  const rows = useMemo(() => {
    return orders.map((o) => {
      const items = o.items || [];
      const computedTotal = items.reduce((s, it) => s + n(it.orderedQtyPcs) * n(it.rate || 0), 0);
      return { ...o, totalAmount: typeof o.totalAmount === "number" ? o.totalAmount : computedTotal };
    });
  }, [orders]);

  function openDetails(o: Order) {
    setDetailsOrder(o);
    setShowDetails(true);
  }

  function openPayment(o: Order) {
    setPayOrder(o);
    setPayMode("UPI");
    setUtr("");
    setRemarks("");
    setShowPay(true);
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
          paymentMode: payMode, // ✅ NO CASH
          utrNo: utr.trim(), // ✅ required
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
              <div className="text-sm text-gray-600 mt-1">Actions: Detail • Print • Payment (No Cash)</div>
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
                  <th className="text-left px-3 py-2 w-[240px]">Actions</th>
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
                            onClick={() => openPayment(o)}
                            className="rounded-xl bg-gray-900 text-white px-3 py-2 text-xs hover:bg-black"
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

        {/* DETAILS MODAL */}
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
            </div>
          </div>
        )}

        {/* PAYMENT MODAL */}
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
                  <div className="text-xs text-gray-600 mt-1">No partial / no cash. Full payment only.</div>
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