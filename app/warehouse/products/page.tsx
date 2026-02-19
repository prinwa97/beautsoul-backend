"use client";

import React, { useEffect, useState } from "react";

type Product = {
  id: string;
  name: string;
  barcode: string | null;
  mrp: number | null;
  salePrice: number | null;
  hsn: string | null;
  gstRate: number | null;
  isActive: boolean;
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

function numOrNull(v: string) {
  const t = (v || "").trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export default function WarehouseProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  // create form
  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [mrp, setMrp] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [hsn, setHsn] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [isActive, setIsActive] = useState(true);

  // edit mode
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch("/api/warehouse/products", { cache: "no-store" });
      const j: any = await safeJson(r);
      if (!r.ok) throw new Error(j?.error || j?._raw || `Failed (${r.status})`);
      setItems(j.items || []);
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Error" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function createProduct() {
    setMsg(null);

    if (!name.trim()) return setMsg({ type: "err", text: "Product name required" });
    const mrpN = numOrNull(mrp);
    const spN = numOrNull(salePrice);
    const gstN = numOrNull(gstRate);

    if (mrpN != null && mrpN <= 0) return setMsg({ type: "err", text: "MRP must be > 0" });
    if (spN != null && spN <= 0) return setMsg({ type: "err", text: "Sale price must be > 0" });
    if (mrpN != null && spN != null && spN > mrpN) return setMsg({ type: "err", text: "Sale price cannot be greater than MRP" });

    setLoading(true);
    try {
      const r = await fetch("/api/warehouse/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          barcode: barcode ? barcode.trim() : null,
          mrp: mrpN,
          salePrice: spN,
          hsn: hsn ? hsn.trim() : null,
          gstRate: gstN,
          isActive,
        }),
      });
      const j: any = await safeJson(r);
      if (!r.ok) throw new Error(j?.error || j?._raw || `Create failed (${r.status})`);

      setName(""); setBarcode(""); setMrp(""); setSalePrice(""); setHsn("");
      setMsg({ type: "ok", text: "✅ Product created" });
      await load();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Error" });
    } finally {
      setLoading(false);
    }
  }

  async function patch(id: string, data: any) {
    const r = await fetch(`/api/warehouse/products/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(data),
    });
    const j: any = await safeJson(r);
    if (!r.ok) throw new Error(j?.error || j?._raw || `Update failed (${r.status})`);
    return j;
  }

  function startEdit(p: Product) {
    setMsg(null);
    setEditingId(p.id);
    setDraft({
      name: p.name || "",
      barcode: p.barcode ?? "",
      mrp: p.mrp ?? "",
      salePrice: p.salePrice ?? "",
      hsn: p.hsn ?? "",
      gstRate: p.gstRate ?? "",
      isActive: !!p.isActive,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  async function saveEdit() {
    if (!editingId || !draft) return;

    // validations
    const nm = String(draft.name || "").trim();
    if (!nm) return setMsg({ type: "err", text: "Name required" });

    const mrpN = numOrNull(String(draft.mrp ?? ""));
    const spN = numOrNull(String(draft.salePrice ?? ""));
    const gstN = numOrNull(String(draft.gstRate ?? ""));

    if (mrpN != null && mrpN <= 0) return setMsg({ type: "err", text: "MRP must be > 0" });
    if (spN != null && spN <= 0) return setMsg({ type: "err", text: "Sale price must be > 0" });
    if (mrpN != null && spN != null && spN > mrpN) return setMsg({ type: "err", text: "Sale price cannot be greater than MRP" });

    setLoading(true);
    setMsg(null);
    try {
      await patch(editingId, {
        name: nm,
        barcode: String(draft.barcode || "").trim(), // empty allowed
        mrp: String(draft.mrp ?? ""),
        salePrice: String(draft.salePrice ?? ""),
        hsn: String(draft.hsn || "").trim(),
        gstRate: String(draft.gstRate ?? ""),
        isActive: !!draft.isActive,
      });

      setMsg({ type: "ok", text: "✅ Saved" });
      cancelEdit();
      await load();
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message || "Save failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="text-xl font-semibold">Products (MRP + Sale Price)</div>
        <button onClick={load} className="rounded-xl border px-3 py-2 text-sm" disabled={loading}>
          Refresh
        </button>
      </div>

      {msg && (
        <div className={`mt-3 rounded-xl p-3 text-sm ${msg.type === "ok" ? "bg-green-50" : "bg-red-50"}`}>
          {msg.text}
        </div>
      )}

      {/* Create */}
      <div className="mt-4 rounded-2xl border p-4">
        <div className="font-semibold mb-3">Create Product</div>

        <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
          <input className="border rounded-xl px-3 py-2 text-sm" placeholder="Name"
            value={name} onChange={(e) => setName(e.target.value)} />

          <input className="border rounded-xl px-3 py-2 text-sm" placeholder="Barcode (optional)"
            value={barcode} onChange={(e) => setBarcode(e.target.value)} />

          <input className="border rounded-xl px-3 py-2 text-sm" placeholder="MRP"
            value={mrp} onChange={(e) => setMrp(e.target.value.replace(/[^\d.]/g, ""))} />

          <input className="border rounded-xl px-3 py-2 text-sm" placeholder="Sale Price"
            value={salePrice} onChange={(e) => setSalePrice(e.target.value.replace(/[^\d.]/g, ""))} />

          <input className="border rounded-xl px-3 py-2 text-sm" placeholder="HSN"
            value={hsn} onChange={(e) => setHsn(e.target.value)} />

          <input className="border rounded-xl px-3 py-2 text-sm" placeholder="GST %"
            value={gstRate} onChange={(e) => setGstRate(e.target.value.replace(/[^\d.]/g, ""))} />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        </div>

        <button onClick={createProduct}
          className="mt-3 rounded-xl bg-black text-white px-4 py-2 text-sm"
          disabled={loading}
        >
          Create
        </button>
      </div>

      {/* List */}
      <div className="mt-4 rounded-2xl border overflow-hidden">
        <div className="p-3 border-b font-semibold">
          Product List {loading ? "(loading...)" : `(${items.length})`}
        </div>

        <div className="divide-y">
          {items.map((p) => {
            const isEditing = editingId === p.id;
            const row = isEditing ? draft : p;

            return (
              <div key={p.id} className="p-3 grid grid-cols-1 md:grid-cols-9 gap-2 items-center">
                <div className="md:col-span-2">
                  <div className="text-xs text-gray-500">Name</div>
                  <input
                    className="border rounded-xl px-3 py-2 text-sm w-full disabled:bg-gray-50"
                    value={isEditing ? String(row?.name ?? "") : String(p.name ?? "")}
                    disabled={!isEditing}
                    onChange={(e) => setDraft((d: any) => ({ ...d, name: e.target.value }))}
                  />
                </div>

                <div>
                  <div className="text-xs text-gray-500">Barcode</div>
                  <input
                    className="border rounded-xl px-3 py-2 text-sm w-full disabled:bg-gray-50"
                    value={isEditing ? String(row?.barcode ?? "") : String(p.barcode ?? "")}
                    disabled={!isEditing}
                    onChange={(e) => setDraft((d: any) => ({ ...d, barcode: e.target.value }))}
                  />
                </div>

                <div>
                  <div className="text-xs text-gray-500">MRP</div>
                  <input
                    className="border rounded-xl px-3 py-2 text-sm w-full disabled:bg-gray-50"
                    value={isEditing ? String(row?.mrp ?? "") : String(p.mrp ?? "")}
                    disabled={!isEditing}
                    onChange={(e) => setDraft((d: any) => ({ ...d, mrp: e.target.value.replace(/[^\d.]/g, "") }))}
                  />
                </div>

                <div>
                  <div className="text-xs text-gray-500">Sale Price</div>
                  <input
                    className="border rounded-xl px-3 py-2 text-sm w-full disabled:bg-gray-50"
                    value={isEditing ? String(row?.salePrice ?? "") : String(p.salePrice ?? "")}
                    disabled={!isEditing}
                    onChange={(e) => setDraft((d: any) => ({ ...d, salePrice: e.target.value.replace(/[^\d.]/g, "") }))}
                  />
                </div>

                <div>
                  <div className="text-xs text-gray-500">HSN</div>
                  <input
                    className="border rounded-xl px-3 py-2 text-sm w-full disabled:bg-gray-50"
                    value={isEditing ? String(row?.hsn ?? "") : String(p.hsn ?? "")}
                    disabled={!isEditing}
                    onChange={(e) => setDraft((d: any) => ({ ...d, hsn: e.target.value }))}
                  />
                </div>

                <div>
                  <div className="text-xs text-gray-500">GST%</div>
                  <input
                    className="border rounded-xl px-3 py-2 text-sm w-full disabled:bg-gray-50"
                    value={isEditing ? String(row?.gstRate ?? "") : String(p.gstRate ?? "")}
                    disabled={!isEditing}
                    onChange={(e) => setDraft((d: any) => ({ ...d, gstRate: e.target.value.replace(/[^\d.]/g, "") }))}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className={`rounded-xl px-3 py-2 text-sm border ${p.isActive ? "bg-green-50" : "bg-gray-100"}`}
                    disabled={isEditing}
                    onClick={async () => {
                      setMsg(null);
                      setLoading(true);
                      try {
                        await patch(p.id, { isActive: !p.isActive });
                        await load();
                      } catch (e: any) {
                        setMsg({ type: "err", text: e?.message || "Toggle failed" });
                      } finally {
                        setLoading(false);
                      }
                    }}
                  >
                    {p.isActive ? "Active" : "Inactive"}
                  </button>
                </div>

                <div className="flex gap-2 justify-end">
                  {!isEditing ? (
                    <button
                      className="rounded-xl border px-3 py-2 text-sm"
                      onClick={() => startEdit(p)}
                    >
                      Edit
                    </button>
                  ) : (
                    <>
                      <button
                        className="rounded-xl border px-3 py-2 text-sm"
                        onClick={cancelEdit}
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <button
                        className="rounded-xl bg-black text-white px-3 py-2 text-sm"
                        onClick={saveEdit}
                        disabled={loading}
                      >
                        Save
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div className="p-6 text-sm text-gray-500">No products yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
