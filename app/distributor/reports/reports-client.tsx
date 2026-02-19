// app/distributor/reports/reports-client.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";

type Summary = {
  ok: boolean;
  range: { from: string; to: string };
  cards: {
    totalSalesAmount: number;
    totalInvoices: number;
    pendingAmount: number;
    totalRetailers: number;
  };
  topProducts: Array<{ productName: string; qty: number; amount: number }>;
  topRetailers: Array<{
    retailerId: string;
    retailerName: string;
    amount: number;
    invoices: number;
    pending?: number;
  }>;
};

type SalesRow = {
  id: string; // ✅ invoice id
  date: string; // YYYY-MM-DD
  invoiceNo: string;
  retailerId: string;
  retailerName: string; // ✅ show
  qty: number;
  amount: number;
};

type SalesResp = {
  ok: boolean;
  rows: SalesRow[];
  totals: { invoices: number; qty: number; amount: number };
};

function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function inr(n: number) {
  const x = Number(n || 0);
  return x.toLocaleString("en-IN");
}

const tabs = [
  { key: "dashboard", label: "Dashboard" },
  { key: "sales", label: "Sales" },
  { key: "stock", label: "Stock" },
  { key: "payments", label: "Payments" },
  { key: "retailers", label: "Retailers" },
  { key: "fieldOfficers", label: "Field Officers" },
] as const;

type TabKey = (typeof tabs)[number]["key"];

export default function ReportsClient() {
  const [tab, setTab] = useState<TabKey>("dashboard");

  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    return toISODate(d);
  });
  const [to, setTo] = useState(() => toISODate(today));

  // Summary
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [err, setErr] = useState<string>("");

  // Sales (invoice-wise)
  const [sales, setSales] = useState<SalesResp | null>(null);
  const [salesLoading, setSalesLoading] = useState(false);

  async function loadSummary() {
    setErr("");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/distributor/reports/summary?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { cache: "no-store" }
      );
      const data = (await res.json().catch(() => null)) as Summary | null;
      if (!res.ok || !data?.ok) {
        setErr((data as any)?.error || `Failed (${res.status})`);
        setSummary(null);
      } else {
        setSummary(data);
      }
    } catch (e: any) {
      setErr(e?.message || "Network error");
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }

  async function loadSales() {
    setSalesLoading(true);
    try {
      const res = await fetch(
        `/api/distributor/reports/sales?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { cache: "no-store" }
      );
      const data = (await res.json().catch(() => null)) as SalesResp | null;
      if (res.ok && data?.ok) setSales(data);
      else setSales(null);
    } catch {
      setSales(null);
    } finally {
      setSalesLoading(false);
    }
  }

  function downloadSummaryExcel() {
    const url = `/api/distributor/reports/summary/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    window.location.href = url;
  }

  function downloadSalesExcel() {
    const url = `/api/distributor/reports/sales/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    window.location.href = url;
  }

  // ✅ bulk invoices excel (date-range) — aapka export route agar bana hua hai
  function downloadInvoicesExcel() {
    const url = `/api/distributor/reports/invoices/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    window.location.href = url;
  }

  // ✅ single invoice excel
  function downloadSingleInvoice(invoiceId: string) {
  const url = `/api/distributor/report/invoices/${invoiceId}/export`;
  window.location.href = url;
}


  useEffect(() => {
    loadSummary();
    loadSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to]);

  return (
    <div className="p-3 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-xl md:text-2xl font-semibold">Reports</h1>

        <div className="flex items-end gap-2 flex-wrap">
          <div className="text-sm">
            <div className="text-gray-500">From</div>
            <input
              className="border rounded px-2 py-1"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          <div className="text-sm">
            <div className="text-gray-500">To</div>
            <input
              className="border rounded px-2 py-1"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          <button
            className="border rounded px-3 py-2 text-sm"
            onClick={() => {
              loadSummary();
              loadSales();
            }}
            disabled={loading || salesLoading}
          >
            {loading || salesLoading ? "Loading..." : "Refresh"}
          </button>

          <button
            className="border rounded px-3 py-2 text-sm bg-black text-white"
            onClick={downloadSummaryExcel}
            disabled={loading}
            title="Download Summary Excel"
          >
            Download Summary
          </button>

          <button
            className="border rounded px-3 py-2 text-sm bg-black text-white"
            onClick={downloadInvoicesExcel}
            disabled={loading || salesLoading}
            title="Download All Invoices (Excel)"
          >
            Download Invoices
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-3 flex gap-2 flex-wrap">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              "px-3 py-2 rounded text-sm border",
              tab === t.key ? "bg-black text-white" : "bg-white",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {err ? (
        <div className="mt-4 border rounded p-3 text-red-600 bg-red-50">
          {err}
        </div>
      ) : null}

      {/* Dashboard Tab */}
      {tab === "dashboard" && (
        <div className="mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card title="Total Sales" value={summary ? `₹${inr(summary.cards.totalSalesAmount)}` : "-"} />
            <Card title="Invoices" value={summary ? String(summary.cards.totalInvoices) : "-"} />
            <Card title="Pending Amount" value={summary ? `₹${inr(summary.cards.pendingAmount)}` : "-"} />
            <Card title="Retailers" value={summary ? String(summary.cards.totalRetailers) : "-"} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {/* Top Products */}
            <div className="border rounded p-3 bg-white">
              <div className="font-semibold">Top Products</div>
              <div className="text-xs text-gray-500 mt-1">By Qty & Amount</div>

              <div className="mt-2 space-y-2">
                {(summary?.topProducts || []).slice(0, 6).map((p, idx) => (
                  <div key={p.productName} className="flex items-center justify-between border rounded p-2">
                    <div className="text-sm">
                      <div className="font-medium">{idx + 1}. {p.productName}</div>
                      <div className="text-xs text-gray-500">Qty: {p.qty}</div>
                    </div>
                    <div className="text-sm font-semibold">₹{inr(p.amount)}</div>
                  </div>
                ))}
                {!summary?.topProducts?.length ? <Empty text="No data" /> : null}
              </div>
            </div>

            {/* Top Retailers */}
            <div className="border rounded p-3 bg-white">
              <div className="font-semibold">Top Retailers</div>
              <div className="text-xs text-gray-500 mt-1">By Sales Amount</div>

              <div className="mt-2 space-y-2">
                {(summary?.topRetailers || []).slice(0, 6).map((r, idx) => (
                  <div key={r.retailerId} className="flex items-center justify-between border rounded p-2">
                    <div className="text-sm">
                      <div className="font-medium">{idx + 1}. {r.retailerName}</div>
                      <div className="text-xs text-gray-500">
                        Invoices: {r.invoices}
                        {typeof r.pending === "number" ? ` • Pending: ₹${inr(r.pending)}` : ""}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">₹{inr(r.amount)}</div>
                  </div>
                ))}
                {!summary?.topRetailers?.length ? <Empty text="No data" /> : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sales Tab (Invoice-wise + Retailer Name + Download) */}
      {tab === "sales" && (
        <div className="mt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-lg font-semibold">Sales (Invoice-wise)</div>
              <div className="text-xs text-gray-500">Invoice + Retailer + Qty + Amount</div>
            </div>

            <button
              className="border rounded px-3 py-2 text-sm bg-black text-white"
              onClick={downloadSalesExcel}
              disabled={salesLoading}
              title="Download Sales Excel"
            >
              {salesLoading ? "Preparing..." : "Download Sales Excel"}
            </button>
          </div>

          <div className="mt-3 border rounded bg-white overflow-auto">
            <table className="min-w-[980px] w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-2 border-b">Date</th>
                  <th className="text-left p-2 border-b">Invoice</th>
                  <th className="text-left p-2 border-b">Retailer</th>
                  <th className="text-right p-2 border-b">Qty</th>
                  <th className="text-right p-2 border-b">Amount</th>
                  <th className="text-right p-2 border-b">Download</th>
                </tr>
              </thead>

              <tbody>
                {(sales?.rows || []).map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="p-2 border-b">{r.date}</td>
                    <td className="p-2 border-b">{r.invoiceNo}</td>
                    <td className="p-2 border-b">{r.retailerName}</td>
                    <td className="p-2 border-b text-right">{r.qty}</td>
                    <td className="p-2 border-b text-right">₹{inr(r.amount)}</td>
                    <td className="p-2 border-b text-right">
                      <button
                        className="border rounded px-2 py-1 text-xs bg-black text-white"
                        onClick={() => downloadSingleInvoice(r.id)}
                      >
                        Download
                      </button>
                    </td>
                  </tr>
                ))}

                {salesLoading ? (
                  <tr>
                    <td className="p-3 text-gray-500" colSpan={6}>
                      Loading invoices...
                    </td>
                  </tr>
                ) : !sales?.rows?.length ? (
                  <tr>
                    <td className="p-3 text-gray-500" colSpan={6}>
                      No invoices in selected range.
                    </td>
                  </tr>
                ) : null}
              </tbody>

              <tfoot className="bg-gray-50">
                <tr>
                  <td className="p-2 font-semibold" colSpan={3}>Total</td>
                  <td className="p-2 text-right font-semibold">{sales?.totals?.qty ?? 0}</td>
                  <td className="p-2 text-right font-semibold">₹{inr(sales?.totals?.amount ?? 0)}</td>
                  <td className="p-2" />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Placeholder for remaining tabs */}
      {tab !== "dashboard" && tab !== "sales" && (
        <div className="mt-4 border rounded p-3 bg-gray-50 text-sm">
          <div className="font-semibold">{tabs.find((t) => t.key === tab)?.label}</div>
          <div className="text-gray-600 mt-1">
            Is tab ka report grid + excel export next add karte hain (Stock / Payments / Retailers / Field Officers).
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="border rounded p-3 bg-white">
      <div className="text-xs text-gray-500">{title}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-sm text-gray-500 border rounded p-2 bg-gray-50">
      {text}
    </div>
  );
}
