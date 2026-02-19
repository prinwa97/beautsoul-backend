"use client";

import React, { useEffect, useMemo, useState } from "react";

type Product = {
  id: string;
  name: string;
  barcode?: string | null;
};

type StockLot = {
  id: string;
  productName: string;
  batchNo: string;
  mfgDate: string | null;
  expDate: string | null;
  qtyOnHandPcs: number;
  createdAt: string;
  updatedAt: string;
};

type Msg = { type: "ok" | "err"; text: string } | null;

async function safeJson(res: Response) {
  const txt = await res.text().catch(() => "");
  if (!txt) return {};
  try {
    return JSON.parse(txt);
  } catch {
    return { _raw: txt };
  }
}

function fmtDate(iso?: string | null) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return "-";
  }
}

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

export default function StockInPage() {
  // products for dropdown
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // lots list
  const [lots, setLots] = useState<StockLot[]>([]);
  const [loadingLots, setLoadingLots] = useState(false);

  // form
  const [productName, setProductName] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [expDate, setExpDate] = useState("");
  const [qty, setQty] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  // filters
  const [q, setQ] = useState("");
  const [filterProduct, setFilterProduct] = useState("");

  // ✅ FIX panel state
  const [editing, setEditing] = useState<{
    id: string;
    currentName: string;
    batchNo: string;
  } | null>(null);
  const [fixProductName, setFixProductName] = useState<string>("");
  const [fixing, setFixing] = useState(false);

  async function loadProducts() {
    setLoadingProducts(true);
    try {
      const r = await fetch("/api/warehouse/products", {
        cache: "no-store",
        credentials: "include",
      });
      const j: any = await safeJson(r);
      const arr = Array.isArray(j) ? j : Array.isArray(j?.items) ? j.items : [];
      setProducts(arr);
    } catch {
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadLots() {
    setLoadingLots(true);
    try {
      const r = await fetch("/api/warehouse/stock-in?take=500", {
        cache: "no-store",
        credentials: "include",
      });
      const j: any = await safeJson(r);
      const arr: StockLot[] = Array.isArray(j?.items) ? j.items : [];
      setLots(arr);
    } catch {
      setLots([]);
    } finally {
      setLoadingLots(false);
    }
  }

  useEffect(() => {
    loadProducts();
    loadLots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setMsg(null);

    const pn = productName.trim();
    const bn = batchNo.trim();
    const qn = Number(qty || 0);

    if (!pn) return setMsg({ type: "err", text: "Product select karo" });
    if (!bn) return setMsg({ type: "err", text: "Batch No required" });
    if (!mfgDate) return setMsg({ type: "err", text: "MFG Date required" });
    if (!expDate) return setMsg({ type: "err", text: "EXP Date required" });
    if (!qty || qn <= 0) return setMsg({ type: "err", text: "Qty must be > 0" });

    const md = new Date(mfgDate);
    const ed = new Date(expDate);
    if (Number.isNaN(md.getTime())) return setMsg({ type: "err", text: "Invalid MFG date" });
    if (Number.isNaN(ed.getTime())) return setMsg({ type: "err", text: "Invalid EXP date" });
    if (ed <= md) return setMsg({ type: "err", text: "EXP date must be after MFG date" });

    setSaving(true);
    try {
      const r = await fetch("/api/warehouse/stock-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productName: pn,
          batchNo: bn,
          mfgDate,
          expDate,
          qty: qn,
        }),
      });

      const j: any = await safeJson(r);
      if (!r.ok) throw new Error(j?.error || j?._raw || `Save failed (${r.status})`);

      setMsg({ type: "ok", text: `✅ Batch added: ${pn} / ${bn}` });

      setBatchNo("");
      setMfgDate("");
      setExpDate("");
      setQty("");

      await loadLots();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  function openFix(x: StockLot) {
    setEditing({ id: x.id, currentName: x.productName, batchNo: x.batchNo });
    // default select = current value (or blank if not found)
    setFixProductName(x.productName || "");
    // move user to form area
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  }

  async function applyFix() {
    if (!editing) return;

    const pn = String(fixProductName || "").trim();
    if (!pn) return setMsg({ type: "err", text: "Correct product select karo" });

    setFixing(true);
    setMsg(null);
    try {
      const r = await fetch("/api/warehouse/stock-in", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: editing.id, productName: pn }),
      });
      const j: any = await safeJson(r);
      if (!r.ok) throw new Error(j?.error || j?._raw || `Update failed (${r.status})`);

      setMsg({ type: "ok", text: `✅ Corrected: ${editing.batchNo} → ${pn}` });
      setEditing(null);
      setFixProductName("");
      await loadLots();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Update failed" });
    } finally {
      setFixing(false);
    }
  }

  const filteredLots = useMemo(() => {
    const s = q.trim().toLowerCase();
    return lots
      .filter((x) => (filterProduct ? x.productName === filterProduct : true))
      .filter((x) => {
        if (!s) return true;
        return (
          String(x.productName || "").toLowerCase().includes(s) ||
          String(x.batchNo || "").toLowerCase().includes(s)
        );
      })
      .slice()
      .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  }, [lots, q, filterProduct]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="rounded-3xl border bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-extrabold tracking-tight">Warehouse • Stock In</div>
            <div className="text-sm text-white/80 mt-1">
              Production se aaya stock yahan add hoga — har entry me <b>new batch no</b>.
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadLots}
              className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 px-4 py-2 text-sm font-semibold"
            >
              {loadingLots ? "Refreshing..." : "Refresh List"}
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {msg && (
        <div
          className={`rounded-2xl p-3 text-sm border ${
            msg.type === "ok"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-rose-50 border-rose-200 text-rose-900"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        {/* Form card */}
        <div className="xl:col-span-2 rounded-3xl border bg-white p-5 shadow-sm">
          <div className="text-lg font-bold">Add New Batch</div>
          <div className="text-xs text-gray-500 mt-1">Product select → Batch No → MFG/EXP → Qty → Save</div>

          {/* ✅ Fix Panel */}
          {editing && (
            <div className="mt-4 rounded-3xl border bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-extrabold">Fix Product Name</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Batch: <b>{editing.batchNo}</b> • Current: <b>{editing.currentName}</b>
                  </div>
                </div>

                <button
                  className="text-xs font-bold underline text-slate-700"
                  onClick={() => {
                    setEditing(null);
                    setFixProductName("");
                  }}
                >
                  Cancel
                </button>
              </div>

              <div className="mt-3">
                <label className="text-sm font-semibold">Correct Product</label>
                <select
                  className="mt-1 w-full border rounded-2xl px-3 py-2.5 text-sm disabled:bg-gray-50"
                  value={fixProductName}
                  onChange={(e) => setFixProductName(e.target.value)}
                  disabled={loadingProducts || fixing}
                >
                  <option value="">
                    {loadingProducts ? "Loading products..." : "Select correct product"}
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={applyFix}
                disabled={fixing}
                className="mt-3 w-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 text-sm font-extrabold disabled:opacity-60"
              >
                {fixing ? "Updating..." : "Update Product Name"}
              </button>

              <div className="mt-2 text-[11px] text-gray-600">
                Note: yeh sirf <b>productName</b> update karega. Qty, dates, batchNo same rahenge.
              </div>
            </div>
          )}

          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-semibold">Product</label>
              <select
                className="mt-1 w-full border rounded-2xl px-3 py-2.5 text-sm disabled:bg-gray-50"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                disabled={loadingProducts || saving}
              >
                <option value="">{loadingProducts ? "Loading products..." : "Select product"}</option>
                {products.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>

              {products.length === 0 && !loadingProducts && (
                <div className="text-xs text-gray-600 mt-1">
                  No products found. Pehle <b>Warehouse → Products</b> me product add karo.
                </div>
              )}
            </div>

            <div>
              <label className="text-sm font-semibold">Batch No (Unique)</label>
              <input
                className="mt-1 w-full border rounded-2xl px-3 py-2.5 text-sm"
                value={batchNo}
                onChange={(e) => setBatchNo(e.target.value)}
                placeholder="e.g. sc0003"
                disabled={saving}
              />
              <div className="text-xs text-gray-500 mt-1">Har entry me new batch no use karo (same batch repeat mat karo).</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold">MFG Date</label>
                <input
                  type="date"
                  className="mt-1 w-full border rounded-2xl px-3 py-2.5 text-sm"
                  value={mfgDate}
                  onChange={(e) => setMfgDate(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="text-sm font-semibold">EXP Date</label>
                <input
                  type="date"
                  className="mt-1 w-full border rounded-2xl px-3 py-2.5 text-sm"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold">Qty received (pcs)</label>
              <input
                className="mt-1 w-full border rounded-2xl px-3 py-2.5 text-sm"
                value={qty}
                onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="e.g. 10000"
                inputMode="numeric"
                disabled={saving}
              />
            </div>

            <button
              onClick={save}
              disabled={saving}
              className="w-full rounded-2xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-3 text-sm font-extrabold disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Batch"}
            </button>
          </div>
        </div>

        {/* List card */}
        <div className="xl:col-span-3 rounded-3xl border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-bold">Current Company Stock Lots</div>
              <div className="text-xs text-gray-500 mt-1">
                Total: <b>{lots.length}</b>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2 md:items-center">
              <select
                className="border rounded-2xl px-3 py-2 text-sm"
                value={filterProduct}
                onChange={(e) => setFilterProduct(e.target.value)}
              >
                <option value="">All products</option>
                {[...new Set(lots.map((x) => x.productName))].map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>

              <input
                className="border rounded-2xl px-3 py-2 text-sm w-full md:w-72"
                placeholder="Search product / batch..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="text-left px-3 py-3 font-bold">Product</th>
                  <th className="text-left px-3 py-3 font-bold">Batch No</th>
                  <th className="text-left px-3 py-3 font-bold">MFG</th>
                  <th className="text-left px-3 py-3 font-bold">EXP</th>
                  <th className="text-right px-3 py-3 font-bold">Qty (pcs)</th>
                  <th className="text-left px-3 py-3 font-bold">Added</th>
                  <th className="text-right px-3 py-3 font-bold">Action</th>
                </tr>
              </thead>

              <tbody>
                {loadingLots ? (
                  <tr>
                    <td className="px-3 py-4 text-gray-600" colSpan={7}>
                      Loading lots...
                    </td>
                  </tr>
                ) : filteredLots.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-gray-600" colSpan={7}>
                      No lots found.
                    </td>
                  </tr>
                ) : (
                  filteredLots.map((x) => (
                    <tr key={x.id} className="border-t">
                      <td className="px-3 py-3 font-semibold">{x.productName}</td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                          {x.batchNo || "-"}
                        </span>
                      </td>
                      <td className="px-3 py-3">{fmtDate(x.mfgDate)}</td>
                      <td className="px-3 py-3">{fmtDate(x.expDate)}</td>
                      <td className="px-3 py-3 text-right font-extrabold">
                        {n(x.qtyOnHandPcs).toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-600">{fmtDate(x.createdAt)}</td>

                      <td className="px-3 py-3 text-right">
                        <button
                          className="rounded-xl border px-3 py-1.5 text-xs font-extrabold hover:bg-slate-50"
                          onClick={() => openFix(x)}
                          title="Fix product name for this lot"
                        >
                          Fix
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Tip: Agar product wrong ho gaya ho, row ke <b>Fix</b> button se correct product select karke update kar lo.
          </div>
        </div>
      </div>
    </div>
  );
}
