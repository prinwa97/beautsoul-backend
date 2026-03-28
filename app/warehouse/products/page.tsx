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

  const [name, setName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [mrp, setMrp] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [hsn, setHsn] = useState("");
  const [gstRate, setGstRate] = useState("18");
  const [isActive, setIsActive] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<any>(null);

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const r = await fetch("/api/warehouse/products", { cache: "no-store" });
      const j: any = await safeJson(r);
      if (!r.ok) throw new Error(j?.error || "Failed");
      setItems(j.items || []);
    } catch (e: any) {
      setMsg({ type: "err", text: e?.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createProduct() {
    if (!name.trim()) return setMsg({ type: "err", text: "Product name required" });

    const mrpN = numOrNull(mrp);
    const spN = numOrNull(salePrice);

    if (mrpN && spN && spN > mrpN)
      return setMsg({ type: "err", text: "Sale price > MRP not allowed" });

    setLoading(true);

    try {
      const r = await fetch("/api/warehouse/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          barcode,
          mrp: mrpN,
          salePrice: spN,
          hsn,
          gstRate: numOrNull(gstRate),
          isActive,
        }),
      });

      if (!r.ok) throw new Error("Create failed");

      setMsg({ type: "ok", text: "✅ Product created" });

      setName("");
      setBarcode("");
      setMrp("");
      setSalePrice("");
      setHsn("");

      load();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  function startEdit(p: Product) {
    setEditingId(p.id);
    setDraft({ ...p });
  }

  async function saveEdit() {
    if (!editingId) return;

    setLoading(true);

    try {
      const r = await fetch(`/api/warehouse/products/${editingId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });

      if (!r.ok) throw new Error("Update failed");

      setMsg({ type: "ok", text: "✅ Updated" });
      setEditingId(null);
      load();
    } catch (e: any) {
      setMsg({ type: "err", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 text-gray-900">
      {/* HEADER */}
      <div className="rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 p-5 text-white shadow">
        <div className="flex justify-between">
          <div>
            <div className="text-2xl font-bold">Products</div>
            <div className="text-sm opacity-90">Manage pricing & GST</div>
          </div>

          <button
            onClick={load}
            className="rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold"
          >
            Refresh
          </button>
        </div>
      </div>

      {msg && (
        <div
          className={`rounded-xl p-3 text-sm font-medium ${
            msg.type === "ok"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* CREATE */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="font-semibold mb-3">Create Product</div>

        <div className="grid md:grid-cols-6 gap-2">
          <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <input className="input" placeholder="Barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} />
          <input className="input" placeholder="MRP" value={mrp} onChange={(e) => setMrp(e.target.value)} />
          <input className="input" placeholder="Sale Price" value={salePrice} onChange={(e) => setSalePrice(e.target.value)} />
          <input className="input" placeholder="HSN" value={hsn} onChange={(e) => setHsn(e.target.value)} />
          <input className="input" placeholder="GST %" value={gstRate} onChange={(e) => setGstRate(e.target.value)} />
        </div>

        <button
          onClick={createProduct}
          className="mt-3 rounded-xl bg-black text-white px-4 py-2"
        >
          Create
        </button>
      </div>

      {/* LIST */}
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="p-3 border-b font-semibold">
          Products ({items.length})
        </div>

        {items.map((p) => {
          const isEdit = editingId === p.id;
          const row = isEdit ? draft : p;

          return (
            <div key={p.id} className="p-3 grid md:grid-cols-7 gap-2 border-b">
              <input className="input" value={row.name} disabled={!isEdit}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })} />

              <input className="input" value={row.barcode || ""} disabled={!isEdit}
                onChange={(e) => setDraft({ ...draft, barcode: e.target.value })} />

              <input className="input" value={row.mrp || ""} disabled={!isEdit}
                onChange={(e) => setDraft({ ...draft, mrp: e.target.value })} />

              <input className="input" value={row.salePrice || ""} disabled={!isEdit}
                onChange={(e) => setDraft({ ...draft, salePrice: e.target.value })} />

              <input className="input" value={row.hsn || ""} disabled={!isEdit}
                onChange={(e) => setDraft({ ...draft, hsn: e.target.value })} />

              <input className="input" value={row.gstRate || ""} disabled={!isEdit}
                onChange={(e) => setDraft({ ...draft, gstRate: e.target.value })} />

              <div className="flex gap-2">
                {!isEdit ? (
                  <button onClick={() => startEdit(p)} className="btn-outline">
                    Edit
                  </button>
                ) : (
                  <>
                    <button onClick={() => setEditingId(null)} className="btn-outline">
                      Cancel
                    </button>
                    <button onClick={saveEdit} className="btn-primary">
                      Save
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* STYLES */}
      <style jsx>{`
        .input {
          border: 1px solid #d1d5db;
          padding: 8px;
          border-radius: 10px;
          font-size: 14px;
          color: #111827;
        }
        .btn-primary {
          background: black;
          color: white;
          padding: 8px 12px;
          border-radius: 10px;
        }
        .btn-outline {
          border: 1px solid #d1d5db;
          padding: 8px 12px;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}