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
  receivedQty: number;
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
    return d.toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  } catch {
    return "-";
  }
}

function isoDateInput(v?: string | null) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function StockInPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [lots, setLots] = useState<StockLot[]>([]);
  const [loadingLots, setLoadingLots] = useState(false);

  const [productName, setProductName] = useState("");
  const [batchNo, setBatchNo] = useState("");
  const [mfgDate, setMfgDate] = useState("");
  const [expDate, setExpDate] = useState("");
  const [qty, setQty] = useState<string>("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const [q, setQ] = useState("");
  const [filterProduct, setFilterProduct] = useState("");

  const [editing, setEditing] = useState<{
    id: string;
    originalProductName: string;
    originalBatchNo: string;
  } | null>(null);

  const [editProductName, setEditProductName] = useState("");
  const [editBatchNo, setEditBatchNo] = useState("");
  const [editMfgDate, setEditMfgDate] = useState("");
  const [editExpDate, setEditExpDate] = useState("");
  const [editQty, setEditQty] = useState("");
  const [updating, setUpdating] = useState(false);

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

    if (!pn) return setMsg({ type: "err", text: "Please select a product" });
    if (!bn) return setMsg({ type: "err", text: "Batch number is required" });
    if (!mfgDate) return setMsg({ type: "err", text: "MFG date is required" });
    if (!expDate) return setMsg({ type: "err", text: "EXP date is required" });
    if (!qty || qn <= 0) return setMsg({ type: "err", text: "Quantity must be greater than 0" });

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

  function openEdit(x: StockLot) {
    setEditing({
      id: x.id,
      originalProductName: x.productName,
      originalBatchNo: x.batchNo,
    });
    setEditProductName(x.productName || "");
    setEditBatchNo(x.batchNo || "");
    setEditMfgDate(isoDateInput(x.mfgDate));
    setEditExpDate(isoDateInput(x.expDate));
    setEditQty(String(n(x.qtyOnHandPcs) || ""));
    setMsg(null);

    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {}
  }

  function closeEdit() {
    setEditing(null);
    setEditProductName("");
    setEditBatchNo("");
    setEditMfgDate("");
    setEditExpDate("");
    setEditQty("");
  }

  async function applyEdit() {
    if (!editing) return;

    const pn = editProductName.trim();
    const bn = editBatchNo.trim();
    const qn = Number(editQty || 0);

    if (!pn) return setMsg({ type: "err", text: "Please select a product" });
    if (!bn) return setMsg({ type: "err", text: "Batch number is required" });
    if (!editMfgDate) return setMsg({ type: "err", text: "MFG date is required" });
    if (!editExpDate) return setMsg({ type: "err", text: "EXP date is required" });
    if (!editQty || qn <= 0) return setMsg({ type: "err", text: "Quantity must be greater than 0" });

    const md = new Date(editMfgDate);
    const ed = new Date(editExpDate);
    if (Number.isNaN(md.getTime())) return setMsg({ type: "err", text: "Invalid MFG date" });
    if (Number.isNaN(ed.getTime())) return setMsg({ type: "err", text: "Invalid EXP date" });
    if (ed <= md) return setMsg({ type: "err", text: "EXP date must be after MFG date" });

    setUpdating(true);
    setMsg(null);

    try {
      const r = await fetch("/api/warehouse/stock-in", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          id: editing.id,
          productName: pn,
          batchNo: bn,
          mfgDate: editMfgDate,
          expDate: editExpDate,
          qty: qn,
        }),
      });

      const j: any = await safeJson(r);
      if (!r.ok) throw new Error(j?.error || j?._raw || `Update failed (${r.status})`);

      setMsg({ type: "ok", text: `✅ Lot updated: ${pn} / ${bn}` });
      closeEdit();
      await loadLots();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Update failed" });
    } finally {
      setUpdating(false);
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
    <div className="space-y-5 text-gray-900">
      <div className="rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-extrabold tracking-tight">Warehouse • Stock In</div>
            <div className="mt-1 text-sm text-white/85">
              Add production stock here. Each entry must have a <b>unique batch number</b>.
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={loadLots}
              type="button"
              className="rounded-2xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/15 disabled:opacity-60"
            >
              {loadingLots ? "Refreshing..." : "Refresh List"}
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <div
          className={cx(
            "rounded-2xl border p-3 text-sm font-medium",
            msg.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-rose-200 bg-rose-50 text-rose-900"
          )}
        >
          {msg.text}
        </div>
      )}

      <div className="flex flex-col gap-5">
        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="text-lg font-bold text-gray-900">Add New Batch</div>
          <div className="mt-1 text-xs text-gray-600">
            Product → Batch No → Quantity / MFG / EXP → Save
          </div>

          {editing && (
            <div className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-extrabold text-gray-900">Edit Lot</div>
                  <div className="mt-1 text-xs text-gray-700">
                    Current: <b>{editing.originalProductName}</b> • Batch: <b>{editing.originalBatchNo}</b>
                  </div>
                </div>

                <button
                  className="text-xs font-bold text-slate-700 underline"
                  onClick={closeEdit}
                  type="button"
                >
                  Cancel
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <label className="text-sm font-semibold text-gray-800">Product</label>
                  <select
                    className="mt-1 w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-500"
                    value={editProductName}
                    onChange={(e) => setEditProductName(e.target.value)}
                    disabled={loadingProducts || updating}
                  >
                    <option value="">
                      {loadingProducts ? "Loading products..." : "Select product"}
                    </option>
                    {products.map((p) => (
                      <option key={p.id} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-800">Batch No</label>
                  <input
                    className="mt-1 w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
                    value={editBatchNo}
                    onChange={(e) => setEditBatchNo(e.target.value)}
                    placeholder="e.g. sc0003"
                    disabled={updating}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-semibold text-gray-800">MFG Date</label>
                    <input
                      type="date"
                      className="mt-1 w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                      value={editMfgDate}
                      onChange={(e) => setEditMfgDate(e.target.value)}
                      disabled={updating}
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-800">EXP Date</label>
                    <input
                      type="date"
                      className="mt-1 w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-black"
                      value={editExpDate}
                      onChange={(e) => setEditExpDate(e.target.value)}
                      disabled={updating}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-gray-800">Quantity (pcs)</label>
                  <input
                    className="mt-1 w-full rounded-2xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
                    value={editQty}
                    onChange={(e) => setEditQty(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="e.g. 10000"
                    inputMode="numeric"
                    disabled={updating}
                  />
                </div>

                <button
                  onClick={applyEdit}
                  disabled={updating}
                  type="button"
                  className="w-full rounded-2xl bg-slate-900 px-5 py-3 text-sm font-extrabold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {updating ? "Updating..." : "Update Lot"}
                </button>

                <div className="text-[11px] text-gray-600">
                  Note: Editing will update the product, batch number, dates, and quantity.
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-semibold text-gray-800">Product</label>
                <select
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-black disabled:bg-gray-50 disabled:text-gray-500"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  disabled={loadingProducts || saving}
                >
                  <option value="">
                    {loadingProducts ? "Loading..." : "Select product"}
                  </option>
                  {products.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name}
                    </option>
                  ))}
                </select>

                {products.length === 0 && !loadingProducts && (
                  <div className="mt-1 text-xs text-gray-600">
                    No products found. Please add a product first in <b>Warehouse → Products</b>.
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-800">Batch No</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
                  value={batchNo}
                  onChange={(e) => setBatchNo(e.target.value)}
                  placeholder="e.g. sc0003"
                  disabled={saving}
                />
                <div className="mt-1 text-[11px] text-gray-500">
                  Use a unique batch number for each entry.
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-800">Qty Received</label>
                <input
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-black"
                  value={qty}
                  onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="e.g. 10000"
                  inputMode="numeric"
                  disabled={saving}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <label className="text-sm font-semibold text-gray-800">MFG Date</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-black"
                  value={mfgDate}
                  onChange={(e) => setMfgDate(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-800">EXP Date</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-black"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  disabled={saving}
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={save}
                  disabled={saving}
                  type="button"
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Batch"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-bold text-gray-900">Current Company Stock Lots</div>
              <div className="mt-1 text-xs text-gray-600">
                Total: <b>{lots.length}</b>
              </div>
            </div>

            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <select
                className="rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-black"
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
                className="w-full rounded-2xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-black md:w-72"
                placeholder="Search product / batch..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-3 text-left font-bold">Product</th>
                  <th className="px-3 py-3 text-left font-bold">Batch No</th>
                  <th className="px-3 py-3 text-left font-bold">MFG</th>
                  <th className="px-3 py-3 text-left font-bold">EXP</th>
                  <th className="px-3 py-3 text-right font-bold">Received Qty</th>
                  <th className="px-3 py-3 text-right font-bold">Current Qty</th>
                  <th className="px-3 py-3 text-left font-bold">Added</th>
                  <th className="px-3 py-3 text-right font-bold">Action</th>
                </tr>
              </thead>

              <tbody className="text-gray-900">
                {loadingLots ? (
                  <tr>
                    <td className="px-3 py-4 text-gray-600" colSpan={8}>
                      Loading lots...
                    </td>
                  </tr>
                ) : filteredLots.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-gray-600" colSpan={8}>
                      No lots found.
                    </td>
                  </tr>
                ) : (
                  filteredLots.map((x) => (
                    <tr key={x.id} className="border-t border-gray-100 hover:bg-slate-50">
                      <td className="px-3 py-3 font-semibold text-gray-900">{x.productName}</td>

                      <td className="px-3 py-3">
                        <span className="inline-flex items-center rounded-xl bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800">
                          {x.batchNo || "-"}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-gray-800">{fmtDate(x.mfgDate)}</td>
                      <td className="px-3 py-3 text-gray-800">{fmtDate(x.expDate)}</td>

                      <td className="px-3 py-3 text-right font-extrabold text-slate-900">
                        {n(x.receivedQty).toLocaleString("en-IN")}
                      </td>

                      <td className="px-3 py-3 text-right font-extrabold text-emerald-700">
                        {n(x.qtyOnHandPcs).toLocaleString("en-IN")}
                      </td>

                      <td className="px-3 py-3 text-xs text-gray-600">{fmtDate(x.createdAt)}</td>

                      <td className="px-3 py-3 text-right">
                        <button
                          className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-extrabold text-gray-800 hover:bg-slate-50"
                          onClick={() => openEdit(x)}
                          type="button"
                          title="Edit this lot"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Tip: If any product, batch, date, or quantity is incorrect, use the <b>Edit</b> button to update the lot.
          </div>
        </div>
      </div>
    </div>
  );
}