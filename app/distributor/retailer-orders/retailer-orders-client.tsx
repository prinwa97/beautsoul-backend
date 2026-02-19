// app/distributor/retailer-orders/retailer-orders-client.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Retailer = {
  id: string;
  name: string;
  phone?: string | null;
  status?: string;
  city?: string | null;
  state?: string | null;
};

type RetailersResp = {
  ok: boolean;
  retailers?: Retailer[];
  error?: string;
};

type OrderItemRow = {
  id: string;
  productName: string;
  qty: number;
  rate: number;
  amount: number;
};

type OrderRow = {
  id: string;
  orderNo?: string | null;
  createdAt: string;
  status?: string | null;
  retailer?: { id: string; name: string; phone?: string | null; city?: string | null } | null;
  items?: OrderItemRow[];
  itemsCount?: number;
  totalAmount?: number | null;
  invoice?: { id: string; invoiceNo: string; totalAmount: number; createdAt: string } | null;
  billed?: boolean;
};

type OrdersResp = {
  ok: boolean;
  orders?: OrderRow[];
  nextCursor?: string | null;
  error?: string;
};

type BatchRow = {
  id?: string;
  productName: string;
  batchNo: string;
  expiryDate?: string | null;
  qty?: number | null;
};

function inr(n: number) {
  const x = Number(n || 0);
  return x.toLocaleString("en-IN");
}
function fmtDate(s?: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  return isNaN(+d) ? "-" : d.toLocaleDateString("en-IN");
}
function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function keyOf(s: string) {
  return String(s || "").trim().toLowerCase();
}

// ✅ invoice generate ho gaya => processed
function isProcessed(o: OrderRow) {
  return Boolean(o?.invoice?.id || o?.invoice?.invoiceNo || o?.billed);
}

export default function RetailerOrdersClient() {
  const router = useRouter();

  // Retailers
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [loadingRetailers, setLoadingRetailers] = useState(false);
  const [retailerId, setRetailerId] = useState("");

  // Search retailers
  const [retailerSearch, setRetailerSearch] = useState("");

  // Orders
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Range filters
  const [range, setRange] = useState<"today" | "week" | "month" | "all" | "custom">("month");
  const [from, setFrom] = useState<string>(() => ymd(new Date()));
  const [to, setTo] = useState<string>(() => ymd(new Date()));

  // UI
  const [error, setError] = useState("");

  // ---- Process Modal ----
  const [processOpen, setProcessOpen] = useState(false);
  const [processOrder, setProcessOrder] = useState<OrderRow | null>(null);

  const [batchesLoading, setBatchesLoading] = useState(false);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [batchPick, setBatchPick] = useState<Record<string, string>>({}); // key(product) -> batchNo

  const [processing, setProcessing] = useState(false);
  const [processMsg, setProcessMsg] = useState<string>("");

  async function loadRetailers() {
    setLoadingRetailers(true);
    setError("");
    try {
      const res = await fetch("/api/distributor/retailers?take=200", { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as RetailersResp | null;

      if (!res.ok || !data?.ok) {
        setRetailers([]);
        setError(data?.error || `Retailers API failed (${res.status})`);
        return;
      }
      setRetailers(Array.isArray(data.retailers) ? data.retailers : []);
    } catch (e: any) {
      setRetailers([]);
      setError(e?.message || "Retailers load failed");
    } finally {
      setLoadingRetailers(false);
    }
  }

  async function loadOrders() {
    setLoadingOrders(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("take", "200");
      params.set("range", range);
      if (retailerId) params.set("retailerId", retailerId);

      if (range === "custom") {
        if (from) params.set("from", from);
        if (to) params.set("to", to);
      }

      const url = `/api/distributor/retailer-orders?${params.toString()}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json().catch(() => null)) as OrdersResp | null;

      if (!res.ok || !data?.ok) {
        setOrders([]);
        setError(data?.error || `Orders API failed (${res.status})`);
        return;
      }
      setOrders(Array.isArray(data.orders) ? data.orders : []);
    } catch (e: any) {
      setOrders([]);
      setError(e?.message || "Orders load failed");
    } finally {
      setLoadingOrders(false);
    }
  }

  useEffect(() => {
    loadRetailers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range, retailerId, from, to]);

  const filteredRetailers = useMemo(() => {
    const q = retailerSearch.trim().toLowerCase();
    const rank = (s?: string) => (s === "ACTIVE" ? 0 : s === "PENDING" ? 1 : 2);

    const base = [...retailers].sort((a, b) => {
      const r = rank(a.status) - rank(b.status);
      if (r !== 0) return r;
      return (a.name || "").localeCompare(b.name || "");
    });

    if (!q) return base;
    return base.filter((r) => {
      const hay = `${r.name || ""} ${r.city || ""} ${r.state || ""} ${r.phone || ""} ${r.status || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [retailers, retailerSearch]);

  async function loadBatchesForModal(productNames: string[]) {
    setBatchesLoading(true);
    setProcessMsg("");
    try {
      const uniq = Array.from(
        new Set(
          (productNames || [])
            .map((x) => String(x || "").trim())
            .filter(Boolean)
        )
      );

      if (!uniq.length) {
        setBatches([]);
        return;
      }

      const results = await Promise.all(
        uniq.map(async (pn) => {
          const url = "/api/distributor/stock/batches?take=200&productName=" + encodeURIComponent(pn);

          const res = await fetch(url, { cache: "no-store" });
          const data = await res.json().catch(() => null);

          if (!res.ok) {
            throw new Error(data?.error || `Batches failed for ${pn} (${res.status})`);
          }

          const raw =
            Array.isArray(data?.batches) ? data.batches :
            Array.isArray(data?.rows) ? data.rows :
            Array.isArray(data?.data) ? data.data :
            Array.isArray(data) ? data :
            [];

          const list: BatchRow[] = raw
            .map((x: any) => ({
              id: x.id ? String(x.id) : undefined,
              productName: String(x.productName || x.name || pn),
              batchNo: String(x.batchNo || x.batch || ""),
              expiryDate: x.expiryDate ? String(x.expiryDate) : (x.expDate ? String(x.expDate) : null),
              qty:
                x.qty != null ? Number(x.qty) :
                x.qtyPcs != null ? Number(x.qtyPcs) :
                x.qtyOnHandPcs != null ? Number(x.qtyOnHandPcs) : null,
            }))
            .filter((b: BatchRow) => b.productName && b.batchNo);

          return list;
        })
      );

      const all: BatchRow[] = [];
      for (const list of results) all.push(...list);

      setBatches(all);
    } catch (e: any) {
      setBatches([]);
      setProcessMsg(e?.message || "Batches load failed");
    } finally {
      setBatchesLoading(false);
    }
  }

  function openProcess(o: OrderRow) {
    // ✅ already processed to modal open nahi hoga
    if (isProcessed(o)) return;

    setProcessOrder(o);
    setProcessOpen(true);
    setProcessMsg("");

    const init: Record<string, string> = {};
    (o.items || []).forEach((it) => {
      const k = keyOf(it.productName);
      if (!init[k]) init[k] = "";
    });
    setBatchPick(init);

    const productNames = (o.items || []).map((it) => it.productName);
    loadBatchesForModal(productNames);
  }

  function closeProcess() {
    setProcessOpen(false);
    setProcessOrder(null);
    setBatches([]);
    setBatchPick({});
    setProcessMsg("");
    setProcessing(false);
  }

  const batchesByProduct = useMemo(() => {
    const map = new Map<string, BatchRow[]>();
    for (const b of batches) {
      const k = keyOf(b.productName);
      if (!k) continue;
      const arr = map.get(k) || [];
      arr.push(b);
      map.set(k, arr);
    }

    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => {
        const ea = a.expiryDate ? new Date(a.expiryDate).getTime() : 0;
        const eb = b.expiryDate ? new Date(b.expiryDate).getTime() : 0;
        return ea - eb;
      });
      map.set(k, arr);
    }
    return map;
  }, [batches]);

  async function submitProcessGenerateInvoice() {
    if (!processOrder?.id) return;

    setProcessing(true);
    setProcessMsg("");
    try {
      const items = processOrder.items || [];
      if (!items.length) {
        setProcessMsg("No items found in this order.");
        return;
      }

      for (const it of items) {
        const k = keyOf(it.productName);
        const pick = (batchPick[k] || "").trim();
        if (!pick) {
          setProcessMsg(`Batch select karo: ${it.productName}`);
          return;
        }
      }

      const payload = {
        items: items.map((it) => {
          const k = keyOf(it.productName);
          return {
            productName: it.productName,
            rate: Number(it.rate || 0),
            batchNo: batchPick[k],
          };
        }),
      };

      const res = await fetch(
        `/api/distributor/retailer-orders/${encodeURIComponent(processOrder.id)}/generate-invoice`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setProcessMsg(data?.error || `Generate invoice failed (${res.status})`);
        return;
      }

      // ✅ invoice info nikal lo
      const invoiceId = String(data?.invoiceId || data?.invoice?.id || "");
      const invoiceNo = String(data?.invoiceNo || data?.invoice?.invoiceNo || "");
      const totalAmount = Number(data?.totalAmount || data?.invoice?.totalAmount || processOrder.totalAmount || 0);
      const createdAt = String(data?.createdAt || data?.invoice?.createdAt || new Date().toISOString());

      // ✅ instantly UI update so "Process" button disable immediately
      setOrders((prev) =>
        prev.map((x) =>
          x.id === processOrder.id
            ? {
                ...x,
                billed: true,
                invoice: {
                  id: invoiceId || (x.invoice?.id ?? "unknown"),
                  invoiceNo: invoiceNo || (x.invoice?.invoiceNo ?? "INVOICE"),
                  totalAmount,
                  createdAt,
                },
              }
            : x
        )
      );

      closeProcess();

      // ✅ also refresh from server (keep data consistent)
      await loadOrders();

      // ✅ OPEN PDF DIRECTLY after invoice generated
      if (invoiceId && invoiceId !== "undefined" && invoiceId !== "null") {
        window.open(
          `/api/distributor/retailer-orders/invoices/${encodeURIComponent(invoiceId)}/pdf`,
          "_blank"
        );
        return;
      }

      alert(`Invoice generated ✅ (${invoiceNo || "OK"})`);
    } catch (e: any) {
      setProcessMsg(e?.message || "Process failed");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fff7f6] p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        {/* Header */}
        <div className="rounded-2xl border bg-white shadow-sm p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold">Retailer Orders</h1>
              <p className="text-sm text-gray-600 mt-1 font-semibold">
                Process → Batch select (per product) → Generate Invoice
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={async () => {
                  await loadRetailers();
                  await loadOrders();
                }}
                className="rounded-xl border px-4 py-2 text-sm font-extrabold hover:bg-gray-50"
                disabled={loadingRetailers || loadingOrders}
              >
                {loadingRetailers || loadingOrders ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>

          {/* Error */}
          {error ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 font-bold">
              {error}
            </div>
          ) : null}

          {/* Filters */}
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Retailer search */}
            <div className="rounded-2xl border p-3">
              <div className="text-sm font-extrabold mb-2">Search retailer</div>
              <input
                className="w-full rounded-xl border px-3 py-2 text-sm font-semibold"
                placeholder="Name / city / phone..."
                value={retailerSearch}
                onChange={(e) => setRetailerSearch(e.target.value)}
              />
              <div className="mt-2 text-xs text-gray-600 font-semibold">
                Total retailers: <b>{retailers.length}</b>
                {loadingRetailers ? " • Loading..." : ""}
              </div>
            </div>

            {/* Retailer select */}
            <div className="rounded-2xl border p-3">
              <div className="text-sm font-extrabold mb-2">Retailer filter</div>
              <select
                className="w-full rounded-xl border px-3 py-2 text-sm bg-white font-semibold"
                value={retailerId}
                onChange={(e) => setRetailerId(e.target.value)}
              >
                <option value="">All Retailers</option>
                {filteredRetailers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.city ? ` • ${r.city}` : ""}
                    {r.status ? ` • ${r.status}` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Range */}
            <div className="rounded-2xl border p-3">
              <div className="text-sm font-extrabold mb-2">Date Range</div>
              <select
                className="w-full rounded-xl border px-3 py-2 text-sm bg-white font-semibold"
                value={range}
                onChange={(e) => setRange(e.target.value as any)}
              >
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month (Recommended)</option>
                <option value="all">All (No date filter)</option>
                <option value="custom">Custom</option>
              </select>

              {range === "custom" ? (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-gray-600 font-extrabold mb-1">From</div>
                    <input
                      type="date"
                      value={from}
                      onChange={(e) => setFrom(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 font-extrabold mb-1">To</div>
                    <input
                      type="date"
                      value={to}
                      onChange={(e) => setTo(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2 text-sm font-semibold"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Orders */}
        <div className="rounded-2xl border bg-white shadow-sm p-4 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold">Recent Orders</h2>
              <p className="text-sm text-gray-600 font-semibold">
                Count: <b>{orders.length}</b> {loadingOrders ? " • Loading..." : ""}
              </p>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="mt-4 grid grid-cols-1 gap-3 md:hidden">
            {orders.length === 0 ? (
              <div className="p-4 rounded-xl border text-gray-600 font-bold">No orders to show.</div>
            ) : (
              orders.map((o) => {
                const processed = isProcessed(o);

                return (
                  <div key={o.id} className="rounded-2xl border p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-extrabold">{o.orderNo || o.id.slice(-8)}</div>
                        <div className="text-xs text-gray-600 font-semibold">
                          {o.retailer?.name || "Retailer"}
                          {o.retailer?.city ? ` • ${o.retailer.city}` : ""}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-600 font-extrabold">Total</div>
                        <div className="font-extrabold">₹ {inr(Number(o.totalAmount || 0))}</div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-gray-600 font-semibold">
                      <div>{o.createdAt ? new Date(o.createdAt).toLocaleString("en-IN") : "-"}</div>
                      <div className="font-extrabold">{o.status || "-"}</div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs">
                      <div className="font-bold">
                        Items: <b>{o.itemsCount ?? o.items?.length ?? 0}</b>
                      </div>
                      <div className="font-bold">
                        Invoice:{" "}
                        {o.invoice?.id && o.invoice?.invoiceNo ? (
                          <a
                            href={`/api/distributor/retailer-orders/invoices/${encodeURIComponent(o.invoice.id)}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-rose-700 underline font-extrabold"
                            title="Open invoice PDF"
                          >
                            {o.invoice.invoiceNo}
                          </a>
                        ) : (
                          <b>{o.billed ? "Yes" : "No"}</b>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          if (processed) return;
                          openProcess(o);
                        }}
                        disabled={processed}
                        className={`flex-1 px-4 py-2 rounded-xl font-extrabold text-sm ${
                          processed
                            ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                            : "bg-black text-white hover:opacity-90"
                        }`}
                      >
                        {processed ? "Processed" : "Process"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block mt-4 overflow-auto rounded-xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="p-3">Order No</th>
                  <th className="p-3">Retailer</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Items</th>
                  <th className="p-3 text-right">Total</th>
                  <th className="p-3">Invoice</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td className="p-3 text-gray-600 font-bold" colSpan={8}>
                      No orders to show.
                    </td>
                  </tr>
                ) : (
                  orders.map((o) => {
                    const processed = isProcessed(o);

                    return (
                      <tr key={o.id} className="border-t">
                        <td className="p-3 font-mono font-bold">{o.orderNo || o.id.slice(-8)}</td>
                        <td className="p-3 font-semibold">
                          {o.retailer?.name || "Retailer"}
                          {o.retailer?.city ? <span className="text-gray-500"> • {o.retailer.city}</span> : null}
                        </td>
                        <td className="p-3">{o.createdAt ? new Date(o.createdAt).toLocaleString("en-IN") : "-"}</td>
                        <td className="p-3 font-bold">{o.status || "-"}</td>
                        <td className="p-3 text-right font-bold">{o.itemsCount ?? o.items?.length ?? 0}</td>
                        <td className="p-3 text-right font-extrabold">₹ {inr(Number(o.totalAmount || 0))}</td>

                        <td className="p-3 font-semibold">
                          {o.invoice?.id && o.invoice?.invoiceNo ? (
                            <a
                              href={`/api/distributor/retailer-orders/invoices/${encodeURIComponent(o.invoice.id)}/pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-rose-700 hover:underline font-extrabold"
                              title="Open invoice PDF"
                            >
                              {o.invoice.invoiceNo}
                            </a>
                          ) : (
                            <span className="text-gray-500">{o.billed ? "Yes" : "No"}</span>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              if (processed) return;
                              openProcess(o);
                            }}
                            disabled={processed}
                            className={`px-4 py-2 rounded-xl font-bold text-xs ${
                              processed
                                ? "bg-gray-200 text-gray-600 cursor-not-allowed"
                                : "bg-black text-white hover:opacity-90"
                            }`}
                          >
                            {processed ? "Processed" : "Process"}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-gray-500 font-semibold">
            Process → Batch select (per product) → Generate Invoice
          </div>
        </div>

        {/* PROCESS MODAL */}
        {processOpen && processOrder && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <div>
                  <div className="text-lg font-extrabold">Process Order</div>
                  <div className="text-xs text-gray-600 font-semibold">
                    Order: <b>{processOrder.orderNo || processOrder.id.slice(-8)}</b> • Status:{" "}
                    <b>{processOrder.status || "-"}</b>
                  </div>
                </div>
                <button onClick={closeProcess} className="px-4 py-2 rounded-xl bg-gray-100 font-bold">
                  Close
                </button>
              </div>

              <div className="p-4 space-y-3">
                {processMsg ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 font-bold">
                    {processMsg}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-600 font-bold">Retailer</div>
                    <div className="font-extrabold">{processOrder.retailer?.name || "-"}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-600 font-bold">Total</div>
                    <div className="font-extrabold">₹ {inr(Number(processOrder.totalAmount || 0))}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-3">
                    <div className="text-xs text-gray-600 font-bold">Invoice</div>
                    <div className="font-extrabold">
                      {processOrder.invoice?.invoiceNo || (processOrder.billed ? "Yes" : "No")}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left">
                        <th className="p-3">Product</th>
                        <th className="p-3 text-right">Qty</th>
                        <th className="p-3 text-right">Rate</th>
                        <th className="p-3 text-right">Amount</th>
                        <th className="p-3">Batch No</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(processOrder.items || []).length === 0 ? (
                        <tr>
                          <td className="p-3 text-gray-600 font-semibold" colSpan={5}>
                            No items found
                          </td>
                        </tr>
                      ) : (
                        (processOrder.items || []).map((it) => {
                          const k = keyOf(it.productName);
                          const options = batchesByProduct.get(k) || [];
                          const chosen = batchPick[k] || "";

                          return (
                            <tr key={it.id} className="border-t">
                              <td className="p-3 font-semibold">{it.productName}</td>
                              <td className="p-3 text-right font-bold">{it.qty}</td>
                              <td className="p-3 text-right">₹ {inr(Number(it.rate || 0))}</td>
                              <td className="p-3 text-right font-extrabold">₹ {inr(Number(it.amount || 0))}</td>

                              <td className="p-3 min-w-[260px]">
                                <select
                                  className="w-full rounded-xl border px-3 py-2 text-sm bg-white font-semibold"
                                  value={chosen}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    setBatchPick((prev) => ({ ...prev, [k]: v }));
                                  }}
                                  disabled={batchesLoading}
                                >
                                  <option value="">
                                    {batchesLoading ? "Loading batches..." : "Select batch"}
                                  </option>
                                  {options.map((b, idx) => {
                                    const avail = b.qty == null ? null : Number(b.qty);
                                    const ok = avail == null ? true : avail >= it.qty;
                                    const label = `${b.batchNo} • Exp ${fmtDate(b.expiryDate)}${
                                      avail == null ? "" : ` • Avl ${avail}`
                                    }`;
                                    return (
                                      <option key={`${b.batchNo}-${idx}`} value={b.batchNo} disabled={!ok}>
                                        {label}
                                      </option>
                                    );
                                  })}
                                </select>

                                <div className="mt-1 text-[11px] text-gray-500 font-semibold">
                                  Qty/Rate fixed. Batch select compulsory.
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    onClick={() => loadBatchesForModal((processOrder.items || []).map((x) => x.productName))}
                    className="px-4 py-2 rounded-xl border font-bold text-sm"
                    disabled={batchesLoading}
                  >
                    {batchesLoading ? "Loading..." : "Reload Batches"}
                  </button>

                  <button
                    onClick={submitProcessGenerateInvoice}
                    className="px-5 py-2 rounded-xl bg-black text-white font-extrabold text-sm disabled:opacity-50"
                    disabled={processing || batchesLoading}
                  >
                    {processing ? "Processing..." : "Generate Invoice"}
                  </button>
                </div>

                <div className="text-xs text-gray-500 font-semibold">
                  In the dropdown, the batch will be disabled if the available quantity is less than the order quantity.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}