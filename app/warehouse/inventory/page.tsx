"use client";

import React, { useEffect, useMemo, useState } from "react";

type StockRow = {
  id: string;
  productName: string;
  batchNo: string | null;
  mfgDate: string | null;
  expDate: string | null;
  qtyOnHandPcs: number | null;
};

type ExpiryBucket = "EXPIRED" | "CRITICAL" | "WARNING" | "OK" | "NA";

function clsx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function safeNum(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function fmtDate(v: string | null | undefined) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
}

function daysLeft(expDate: string | null | undefined) {
  if (!expDate) return null;
  const d = new Date(expDate);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const ms = d.getTime() - now.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function bucketFromDaysLeft(dl: number | null): ExpiryBucket {
  if (dl === null) return "NA";
  if (dl < 0) return "EXPIRED";
  if (dl <= 30) return "CRITICAL";
  if (dl <= 60) return "WARNING";
  return "OK";
}

function badgeTone(b: ExpiryBucket) {
  switch (b) {
    case "EXPIRED":
      return "bg-red-50 text-red-700 ring-red-200";
    case "CRITICAL":
      return "bg-orange-50 text-orange-700 ring-orange-200";
    case "WARNING":
      return "bg-yellow-50 text-yellow-800 ring-yellow-200";
    case "OK":
      return "bg-green-50 text-green-700 ring-green-200";
    default:
      return "bg-gray-50 text-gray-700 ring-gray-200";
  }
}

function Badge({ label, bucket }: { label: string; bucket?: ExpiryBucket }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1",
        bucket ? badgeTone(bucket) : "bg-gray-50 text-gray-700 ring-gray-200"
      )}
    >
      {label}
    </span>
  );
}

function downloadTextFile(filename: string, content: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function toCSV(rows: any[], cols: { key: string; label: string }[]) {
  const esc = (v: any) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(",") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const header = cols.map((c) => esc(c.label)).join(",");
  const body = rows
    .map((r) => cols.map((c) => esc((r as any)[c.key])).join(","))
    .join("\n");
  return header + "\n" + body;
}

export default function WarehouseInventorySuperAdvanced() {
  const [view, setView] = useState<"BATCHES" | "PRODUCTS">("BATCHES");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [rows, setRows] = useState<StockRow[]>([]);

  // Filters
  const [q, setQ] = useState("");
  const [bucket, setBucket] = useState<ExpiryBucket | "ALL">("ALL");
  const [minQty, setMinQty] = useState<number | "">("");
  const [maxQty, setMaxQty] = useState<number | "">("");
  const [expiryMaxDays, setExpiryMaxDays] = useState<number | "">(""); // show items expiring within N days
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [lowStockThreshold, setLowStockThreshold] = useState(20);

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await fetch("/api/warehouse/inventory", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to load inventory");
      setRows(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setErr(e?.message || "Server error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const enriched = useMemo(() => {
    return rows.map((r) => {
      const qty = safeNum(r.qtyOnHandPcs);
      const dl = daysLeft(r.expDate);
      const b = bucketFromDaysLeft(dl);
      return {
        ...r,
        qty,
        daysLeft: dl,
        bucket: b,
      };
    });
  }, [rows]);

  const filteredBatches = useMemo(() => {
    const s = q.trim().toLowerCase();

    return enriched
      .filter((r) => {
        if (s) {
          const a = String(r.productName || "").toLowerCase();
          const b = String(r.batchNo || "").toLowerCase();
          if (!a.includes(s) && !b.includes(s)) return false;
        }
        if (bucket !== "ALL" && r.bucket !== bucket) return false;

        if (minQty !== "" && r.qty < Number(minQty)) return false;
        if (maxQty !== "" && r.qty > Number(maxQty)) return false;

        if (expiryMaxDays !== "") {
          // if no expiry date => exclude when filter is active
          if (r.daysLeft === null) return false;
          if (r.daysLeft > Number(expiryMaxDays)) return false;
        }

        if (lowStockOnly && r.qty > lowStockThreshold) return false;

        return true;
      })
      .sort((a, b) => {
        // Sort: expired first, then daysLeft asc, then qty desc
        const ad = a.daysLeft ?? 999999;
        const bd = b.daysLeft ?? 999999;
        if (a.bucket !== b.bucket) {
          const order: Record<ExpiryBucket, number> = { EXPIRED: 0, CRITICAL: 1, WARNING: 2, OK: 3, NA: 4 };
          return order[a.bucket] - order[b.bucket];
        }
        if (ad !== bd) return ad - bd;
        return b.qty - a.qty;
      });
  }, [enriched, q, bucket, minQty, maxQty, expiryMaxDays, lowStockOnly, lowStockThreshold]);

  const productGroups = useMemo(() => {
    // Group filtered batches by product
    const map = new Map<string, { productName: string; totalQty: number; worstBucket: ExpiryBucket; soonestDaysLeft: number | null; batches: any[] }>();

    const worstRank: Record<ExpiryBucket, number> = {
      EXPIRED: 0,
      CRITICAL: 1,
      WARNING: 2,
      OK: 3,
      NA: 4,
    };

    for (const r of filteredBatches) {
      const key = String(r.productName || "—").trim() || "—";
      const curr = map.get(key) || {
        productName: key,
        totalQty: 0,
        worstBucket: "NA" as ExpiryBucket,
        soonestDaysLeft: null as number | null,
        batches: [] as any[],
      };

      curr.totalQty += r.qty;

      // worst bucket (more risky)
      if (worstRank[r.bucket] < worstRank[curr.worstBucket]) curr.worstBucket = r.bucket;

      // soonest expiry
      if (r.daysLeft !== null) {
        if (curr.soonestDaysLeft === null || r.daysLeft < curr.soonestDaysLeft) curr.soonestDaysLeft = r.daysLeft;
      }

      curr.batches.push(r);
      map.set(key, curr);
    }

    return Array.from(map.values()).sort((a, b) => {
      // risk first, then soonest, then qty desc
      const rank = (x: ExpiryBucket) => ({ EXPIRED: 0, CRITICAL: 1, WARNING: 2, OK: 3, NA: 4 }[x]);
      const ra = rank(a.worstBucket);
      const rb = rank(b.worstBucket);
      if (ra !== rb) return ra - rb;
      const ad = a.soonestDaysLeft ?? 999999;
      const bd = b.soonestDaysLeft ?? 999999;
      if (ad !== bd) return ad - bd;
      return b.totalQty - a.totalQty;
    });
  }, [filteredBatches]);

  const kpis = useMemo(() => {
    const allProducts = new Set(enriched.map((r) => r.productName));
    const totalQty = enriched.reduce((s, r) => s + r.qty, 0);

    const expiredQty = enriched.filter((r) => r.bucket === "EXPIRED").reduce((s, r) => s + r.qty, 0);
    const criticalQty = enriched.filter((r) => r.bucket === "CRITICAL").reduce((s, r) => s + r.qty, 0);
    const warningQty = enriched.filter((r) => r.bucket === "WARNING").reduce((s, r) => s + r.qty, 0);

    const expSoonQty = criticalQty + warningQty;
    const lowStockProducts = (() => {
      const pmap = new Map<string, number>();
      for (const r of enriched) pmap.set(r.productName, (pmap.get(r.productName) || 0) + r.qty);
      return Array.from(pmap.entries()).filter(([, qty]) => qty <= lowStockThreshold).length;
    })();

    return {
      totalProducts: allProducts.size,
      totalQty,
      expSoonQty,
      expiredQty,
      lowStockProducts,
    };
  }, [enriched, lowStockThreshold]);

  const topAlerts = useMemo(() => {
    // Next expiry alerts: take first 8 from risky list with expiry date
    const risky = enriched
      .filter((r) => r.daysLeft !== null)
      .sort((a, b) => (a.daysLeft ?? 999999) - (b.daysLeft ?? 999999))
      .slice(0, 8);

    // low stock product alerts (top 8 lowest qty)
    const pmap = new Map<string, number>();
    for (const r of enriched) pmap.set(r.productName, (pmap.get(r.productName) || 0) + r.qty);
    const low = Array.from(pmap.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, 8)
      .map(([productName, qty]) => ({ productName, qty }));

    return { risky, low };
  }, [enriched]);

  function exportCSV() {
    const data = filteredBatches.map((r) => ({
      productName: r.productName,
      batchNo: r.batchNo || "",
      mfgDate: r.mfgDate ? fmtDate(r.mfgDate) : "",
      expDate: r.expDate ? fmtDate(r.expDate) : "",
      daysLeft: r.daysLeft ?? "",
      qty: r.qty,
      bucket: r.bucket,
    }));

    const csv = toCSV(data, [
      { key: "productName", label: "Product" },
      { key: "batchNo", label: "Batch" },
      { key: "mfgDate", label: "MFG" },
      { key: "expDate", label: "EXP" },
      { key: "daysLeft", label: "DaysLeft" },
      { key: "qty", label: "Qty" },
      { key: "bucket", label: "Status" },
    ]);

    downloadTextFile(`warehouse_inventory_${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv");
  }

  return (
    <div className="p-3 sm:p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Warehouse Inventory</h1>
            <p className="text-sm text-gray-600">Super Advanced • Stock + Expiry Intelligence • No Dispatch UI</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>

            <button
              onClick={exportCSV}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium ring-1 ring-gray-200 hover:bg-gray-50"
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-2xl bg-white p-3 ring-1 ring-gray-200">
            <div className="text-xs text-gray-600">Total Products</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{kpis.totalProducts}</div>
          </div>

          <div className="rounded-2xl bg-white p-3 ring-1 ring-gray-200">
            <div className="text-xs text-gray-600">Total Qty</div>
            <div className="mt-1 text-lg font-semibold tabular-nums">{kpis.totalQty}</div>
          </div>

          <div className="rounded-2xl bg-white p-3 ring-1 ring-gray-200">
            <div className="text-xs text-gray-600">Expiring Soon</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="text-lg font-semibold tabular-nums">{kpis.expSoonQty}</div>
              <Badge label="CRITICAL+WARNING" bucket="WARNING" />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-3 ring-1 ring-gray-200">
            <div className="text-xs text-gray-600">Expired Qty</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="text-lg font-semibold tabular-nums">{kpis.expiredQty}</div>
              <Badge label="EXPIRED" bucket="EXPIRED" />
            </div>
          </div>

          <div className="rounded-2xl bg-white p-3 ring-1 ring-gray-200">
            <div className="text-xs text-gray-600">Low Stock Products</div>
            <div className="mt-1 flex items-center gap-2">
              <div className="text-lg font-semibold tabular-nums">{kpis.lowStockProducts}</div>
              <span className="text-xs text-gray-500">≤ {lowStockThreshold}</span>
            </div>
          </div>
        </div>

        {err ? (
          <div className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{err}</div>
        ) : null}

        {/* Intelligence Panels */}
        <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-12">
          <div className="lg:col-span-8 rounded-2xl bg-white ring-1 ring-gray-200">
            <div className="border-b border-gray-100 p-3 sm:p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setView("BATCHES")}
                    className={clsx(
                      "rounded-xl px-3 py-2 text-sm font-medium ring-1",
                      view === "BATCHES" ? "bg-black text-white ring-black" : "bg-white ring-gray-200"
                    )}
                  >
                    Batches View
                  </button>
                  <button
                    onClick={() => setView("PRODUCTS")}
                    className={clsx(
                      "rounded-xl px-3 py-2 text-sm font-medium ring-1",
                      view === "PRODUCTS" ? "bg-black text-white ring-black" : "bg-white ring-gray-200"
                    )}
                  >
                    Products View
                  </button>
                </div>

                <div className="text-xs text-gray-600">
                  Showing <b>{view === "BATCHES" ? filteredBatches.length : productGroups.length}</b>{" "}
                  {view === "BATCHES" ? "batches" : "products"} (filtered)
                </div>
              </div>

              {/* Filters */}
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-12 sm:gap-3">
                <div className="sm:col-span-4">
                  <label className="text-xs text-gray-600">Search</label>
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search product / batch..."
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-600">Status</label>
                  <select
                    value={bucket}
                    onChange={(e) => setBucket(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  >
                    <option value="ALL">ALL</option>
                    <option value="EXPIRED">EXPIRED</option>
                    <option value="CRITICAL">CRITICAL</option>
                    <option value="WARNING">WARNING</option>
                    <option value="OK">OK</option>
                    <option value="NA">NO EXPIRY</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-600">Min Qty</label>
                  <input
                    type="number"
                    value={minQty}
                    onChange={(e) => setMinQty(e.target.value === "" ? "" : Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-600">Max Qty</label>
                  <input
                    type="number"
                    value={maxQty}
                    onChange={(e) => setMaxQty(e.target.value === "" ? "" : Number(e.target.value))}
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs text-gray-600">Expiry ≤ Days</label>
                  <input
                    type="number"
                    value={expiryMaxDays}
                    onChange={(e) => setExpiryMaxDays(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="e.g. 30"
                    className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                  />
                </div>

                <div className="sm:col-span-6 flex flex-col gap-2 sm:flex-row sm:items-end">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={lowStockOnly}
                      onChange={(e) => setLowStockOnly(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Low stock only
                  </label>

                  <div className="flex-1">
                    <label className="text-xs text-gray-600">Low stock threshold</label>
                    <input
                      type="number"
                      value={lowStockThreshold}
                      min={1}
                      onChange={(e) => setLowStockThreshold(Math.max(1, Number(e.target.value || 20)))}
                      className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/10"
                    />
                  </div>

                  <button
                    onClick={() => {
                      setQ("");
                      setBucket("ALL");
                      setMinQty("");
                      setMaxQty("");
                      setExpiryMaxDays("");
                      setLowStockOnly(false);
                    }}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-medium ring-1 ring-gray-200 hover:bg-gray-50"
                  >
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="p-3 sm:p-4">
              {view === "BATCHES" ? (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-gray-600">
                        <tr className="border-b border-gray-100">
                          <th className="py-2 pr-3">Product</th>
                          <th className="py-2 pr-3">Batch</th>
                          <th className="py-2 pr-3">MFG</th>
                          <th className="py-2 pr-3">EXP</th>
                          <th className="py-2 pr-3 text-right">Days</th>
                          <th className="py-2 pr-3 text-right">Qty</th>
                          <th className="py-2 pr-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBatches.map((r) => (
                          <tr key={r.id} className="border-b border-gray-50">
                            <td className="py-3 pr-3 font-medium">{r.productName}</td>
                            <td className="py-3 pr-3">{r.batchNo || "—"}</td>
                            <td className="py-3 pr-3">{fmtDate(r.mfgDate)}</td>
                            <td className="py-3 pr-3">{fmtDate(r.expDate)}</td>
                            <td className="py-3 pr-3 text-right tabular-nums">{r.daysLeft ?? "—"}</td>
                            <td className="py-3 pr-3 text-right tabular-nums">{r.qty}</td>
                            <td className="py-3 pr-3">
                              <Badge label={r.bucket} bucket={r.bucket} />
                            </td>
                          </tr>
                        ))}
                        {!filteredBatches.length && !loading ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-gray-500">
                              No batches found.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden grid grid-cols-1 gap-2">
                    {filteredBatches.map((r) => (
                      <div key={r.id} className="rounded-2xl bg-white ring-1 ring-gray-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold">{r.productName}</div>
                            <div className="text-xs text-gray-500">Batch: {r.batchNo || "—"}</div>
                          </div>
                          <Badge label={r.bucket} bucket={r.bucket} />
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <div className="text-xs text-gray-600">MFG</div>
                            <div>{fmtDate(r.mfgDate)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600">EXP</div>
                            <div>{fmtDate(r.expDate)}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600">Days Left</div>
                            <div className="tabular-nums">{r.daysLeft ?? "—"}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-600">Qty</div>
                            <div className="tabular-nums font-semibold">{r.qty}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!filteredBatches.length && !loading ? (
                      <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 ring-1 ring-gray-200">
                        No batches found.
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  {/* Products View (Grouped) */}
                  <div className="space-y-2">
                    {productGroups.map((p) => (
                      <details key={p.productName} className="rounded-2xl bg-white ring-1 ring-gray-200">
                        <summary className="cursor-pointer list-none p-3 sm:p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="font-semibold">{p.productName}</div>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <Badge label={`Total Qty: ${p.totalQty}`} />
                                <Badge label={`Worst: ${p.worstBucket}`} bucket={p.worstBucket} />
                                <Badge
                                  label={`Soonest: ${p.soonestDaysLeft === null ? "—" : p.soonestDaysLeft + "d"}`}
                                  bucket={p.worstBucket}
                                />
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">Batches: {p.batches.length}</div>
                          </div>
                        </summary>

                        <div className="border-t border-gray-100 p-3 sm:p-4">
                          <div className="overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead className="text-left text-gray-600">
                                <tr className="border-b border-gray-100">
                                  <th className="py-2 pr-3">Batch</th>
                                  <th className="py-2 pr-3">MFG</th>
                                  <th className="py-2 pr-3">EXP</th>
                                  <th className="py-2 pr-3 text-right">Days</th>
                                  <th className="py-2 pr-3 text-right">Qty</th>
                                  <th className="py-2 pr-3">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {p.batches
                                  .slice()
                                  .sort((a, b) => (a.daysLeft ?? 999999) - (b.daysLeft ?? 999999))
                                  .map((r) => (
                                    <tr key={r.id} className="border-b border-gray-50">
                                      <td className="py-3 pr-3">{r.batchNo || "—"}</td>
                                      <td className="py-3 pr-3">{fmtDate(r.mfgDate)}</td>
                                      <td className="py-3 pr-3">{fmtDate(r.expDate)}</td>
                                      <td className="py-3 pr-3 text-right tabular-nums">{r.daysLeft ?? "—"}</td>
                                      <td className="py-3 pr-3 text-right tabular-nums">{r.qty}</td>
                                      <td className="py-3 pr-3">
                                        <Badge label={r.bucket} bucket={r.bucket} />
                                      </td>
                                    </tr>
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </details>
                    ))}

                    {!productGroups.length && !loading ? (
                      <div className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 ring-1 ring-gray-200">
                        No products found.
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right side intelligence */}
          <div className="lg:col-span-4 space-y-3">
            <div className="rounded-2xl bg-white ring-1 ring-gray-200">
              <div className="border-b border-gray-100 p-3 sm:p-4">
                <div className="font-semibold">Expiry Intelligence</div>
                <div className="text-xs text-gray-600">Next expiry (soonest batches)</div>
              </div>
              <div className="p-3 sm:p-4 space-y-2">
                {topAlerts.risky.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-2 rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
                    <div>
                      <div className="text-sm font-medium">{r.productName}</div>
                      <div className="text-xs text-gray-600">
                        Batch: {r.batchNo || "—"} • EXP: {fmtDate(r.expDate)}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge label={(r.daysLeft ?? "—") + "d"} bucket={r.bucket} />
                      <span className="text-xs text-gray-500 tabular-nums">Qty: {r.qty}</span>
                    </div>
                  </div>
                ))}
                {!topAlerts.risky.length ? (
                  <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600 ring-1 ring-gray-200">
                    No expiry data found.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl bg-white ring-1 ring-gray-200">
              <div className="border-b border-gray-100 p-3 sm:p-4">
                <div className="font-semibold">Low Stock Alerts</div>
                <div className="text-xs text-gray-600">Product totals (lowest first)</div>
              </div>
              <div className="p-3 sm:p-4 space-y-2">
                {topAlerts.low.map((x) => (
                  <div key={x.productName} className="flex items-center justify-between rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
                    <div className="text-sm font-medium">{x.productName}</div>
                    <Badge label={`${x.qty}`} />
                  </div>
                ))}
                {!topAlerts.low.length ? (
                  <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-600 ring-1 ring-gray-200">
                    No data.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl bg-white ring-1 ring-gray-200">
              <div className="border-b border-gray-100 p-3 sm:p-4">
                <div className="font-semibold">Operational Notes</div>
                <div className="text-xs text-gray-600">Warehouse-level guidance</div>
              </div>
              <div className="p-3 sm:p-4 text-sm text-gray-700 space-y-2">
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-orange-500" />
                  <div>
                    <b>CRITICAL</b> stock ko priority pe move karein (≤30 days).
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-yellow-500" />
                  <div>
                    <b>WARNING</b> ko planning me rakhein (≤60 days).
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 h-2 w-2 rounded-full bg-red-500" />
                  <div>
                    <b>EXPIRED</b> items ko separate process follow karein.
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  (Dispatch UI intentionally removed as per your requirement.)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 text-xs text-gray-500">
          Super Advanced Inventory: KPI + Filters + Product grouping + Expiry Intelligence + CSV Export.
        </div>
      </div>
    </div>
  );
}
