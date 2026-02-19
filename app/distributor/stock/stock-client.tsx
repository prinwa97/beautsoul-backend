"use client";

import React, { useEffect, useMemo, useState } from "react";

// ✅ aapka existing current stock UI yahi file me hai
// ✅ incoming orders UI alag file me already hai:
import IncomingOrdersClient from "./incoming/orders-client";

type StockRow = { productName: string; qtyPcs: number };
type BatchRow = {
  productName: string;
  batchNo: string;
  expiryDate: string;
  qty: number;
};

function fmtDate(s?: string | null) {
  if (!s) return "-";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-IN");
}

export default function StockClient() {
  const [tab, setTab] = useState<"CURRENT" | "INCOMING">("CURRENT");
  const [loading, setLoading] = useState(false);

  // ✅ current stock state (same as your old file)
  const [summary, setSummary] = useState<StockRow[]>([]);
  const [batches, setBatches] = useState<BatchRow[]>([]);

  // ✅ rates state (same as old file)
  const [rates, setRates] = useState<Record<string, number>>({});
  const [rateSavingKey, setRateSavingKey] = useState<string | null>(null);

  async function loadCurrent() {
    const res = await fetch("/api/distributor/stock/current", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Failed to load current stock");

    const s = (data?.summary || []).map((r: any) => ({
      productName: String(r.productName || "").trim(),
      qtyPcs: Number(r.qty ?? 0),
    }));
    setSummary(s.filter((x: any) => x.productName));
  }

  async function loadBatches() {
    const res = await fetch("/api/distributor/stock/insights", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Failed to load batch details");

    const raw = Array.isArray(data?.batches)
      ? data.batches
      : Array.isArray(data?.batchDetails)
      ? data.batchDetails
      : [];

    const b = raw.map((r: any) => ({
      productName: String(r.productName || "").trim(),
      batchNo: String(r.batchNo || "").trim(),
      expiryDate: r.expiryDate ? String(r.expiryDate) : "",
      qty: Number(r.qty ?? 0),
    }));

    setBatches(b.filter((x: any) => x.productName && x.batchNo));
  }

  async function loadRates() {
    const res = await fetch("/api/distributor/stock/rates", { cache: "no-store" });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error || "Failed to load rates");

    const map: Record<string, number> = {};
    (data?.rates || []).forEach((r: any) => {
      const pn = String(r.productName || "").trim();
      const sr = Number(r.saleRate);
      if (pn && Number.isFinite(sr)) map[pn] = sr;
    });
    setRates(map);
  }

  async function refreshAll() {
    setLoading(true);
    try {
      await Promise.all([loadCurrent(), loadBatches(), loadRates()]);
    } catch (e: any) {
      alert(e?.message || "Refresh failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPcs = useMemo(
    () => summary.reduce((s, r) => s + Number(r.qtyPcs || 0), 0),
    [summary]
  );

  async function saveRate(productName: string) {
    const key = String(productName || "").trim();
    if (!key) return;

    const saleRate = Number(rates[key]);
    if (!Number.isFinite(saleRate) || saleRate <= 0) {
      alert("Sale Rate must be > 0");
      return;
    }

    setRateSavingKey(key);
    try {
      const res = await fetch("/api/distributor/stock/rates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productName: key, saleRate }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Save rate failed");

      alert("Rate saved ✅");
      await loadRates();
    } catch (e: any) {
      alert(e?.message || "Save rate failed");
    } finally {
      setRateSavingKey(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#fff7f6]">
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-2xl font-semibold">Stock</div>
            <div className="text-sm text-gray-600">
              Current stock + batch details + incoming orders
            </div>
          </div>

          <button
            className="px-4 py-2 rounded-xl bg-black text-white"
            onClick={refreshAll}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {/* ✅ Tabs (sirf yahi add/keep) */}
        <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="inline-flex bg-white rounded-2xl shadow p-1 w-fit">
            <button
              onClick={() => setTab("CURRENT")}
              className={`px-4 py-2 rounded-xl text-sm ${
                tab === "CURRENT" ? "bg-black text-white" : "text-gray-700"
              }`}
            >
              Current Stock
            </button>

            <button
              onClick={() => setTab("INCOMING")}
              className={`px-4 py-2 rounded-xl text-sm ${
                tab === "INCOMING" ? "bg-black text-white" : "text-gray-700"
              }`}
            >
              Incoming Orders
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow px-4 py-3 text-sm min-w-[160px]">
            <div className="text-gray-600">Total Stock (PCS)</div>
            <div className="text-xl font-semibold">{totalPcs}</div>
          </div>
        </div>

        {/* ✅ CURRENT tab content (same as your old stock page) */}
        {tab === "CURRENT" && (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Summary */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="p-4 border-b">
                <div className="font-semibold">Summary</div>
                <div className="text-xs text-gray-600">
                  Product-wise total (PCS) + Retailer Sale Rate (Fixed)
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-600">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3 text-right">Qty (PCS)</th>
                      <th className="p-3 text-right">Sale Rate</th>
                      <th className="p-3 text-right">Save</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((r, idx) => {
                      const key = r.productName;
                      const v = rates[key] ?? "";
                      const savingRow = rateSavingKey === key;

                      return (
                        <tr key={`${r.productName}-${idx}`} className="border-t">
                          <td className="p-3">{r.productName}</td>
                          <td className="p-3 text-right font-semibold">{r.qtyPcs}</td>

                          <td className="p-3 text-right">
                            <input
                              type="number"
                              min={0}
                              value={v as any}
                              onChange={(e) => {
                                const n = Number(e.target.value || 0);
                                setRates((prev) => ({ ...prev, [key]: n }));
                              }}
                              className="w-28 px-2 py-1 border rounded-lg text-right"
                              placeholder="0"
                            />
                          </td>

                          <td className="p-3 text-right">
                            <button
                              onClick={() => saveRate(key)}
                              disabled={savingRow}
                              className="px-3 py-1.5 rounded-xl bg-black text-white"
                            >
                              {savingRow ? "Saving..." : "Save"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {summary.length === 0 && (
                      <tr>
                        <td className="p-6 text-center text-gray-500" colSpan={4}>
                          No stock data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Batch Details */}
            <div className="bg-white rounded-2xl shadow overflow-hidden">
              <div className="p-4 border-b">
                <div className="font-semibold">Batch Details</div>
                <div className="text-xs text-gray-600">Batch No + Expiry + PCS</div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-gray-600">
                    <tr>
                      <th className="p-3">Product</th>
                      <th className="p-3">Batch</th>
                      <th className="p-3">Expiry</th>
                      <th className="p-3 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((b, idx) => (
                      <tr key={`${b.productName}-${b.batchNo}-${idx}`} className="border-t">
                        <td className="p-3">{b.productName}</td>
                        <td className="p-3">{b.batchNo}</td>
                        <td className="p-3">{fmtDate(b.expiryDate)}</td>
                        <td className="p-3 text-right font-semibold">{b.qty}</td>
                      </tr>
                    ))}
                    {batches.length === 0 && (
                      <tr>
                        <td className="p-6 text-center text-gray-500" colSpan={4}>
                          No batch data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ✅ INCOMING tab content: render your separate page/component here */}
        {tab === "INCOMING" && (
          <div className="mt-4">
            <IncomingOrdersClient />
          </div>
        )}
      </div>
    </div>
  );
}
