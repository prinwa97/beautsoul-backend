"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Row = {
  id: string;
  name: string;
  salePrice: number | null;
  mrp?: number | null;
  gstRate?: number | null;
  isActive: boolean;
  updatedAt?: string;
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

export default function AdminProductsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState("");

  async function load() {
    setLoading(true);
    setToast("");
    try {
      const res = await fetch("/api/admin/products", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        setToast(data?.error || "Failed to load products");
        setRows([]);
        return;
      }
      setRows(Array.isArray(data?.products) ? data.products : []);
    } catch {
      setToast("Network error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(s));
  }, [rows, q]);

  async function toggleActive(id: string, next: boolean) {
    setToast("");
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: next }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) return setToast(data?.error || "Failed to update");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, isActive: next } : r)));
    } catch {
      setToast("Network error");
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-5xl px-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-xl font-black">Admin • Products</div>
            <div className="text-xs text-gray-600">Create product name + company selling rate (to distributor)</div>
          </div>

          <Link
            href="/admin/products/new"
            className="rounded-xl bg-black px-4 py-2 text-sm font-extrabold text-white hover:opacity-90"
          >
            + Add Product
          </Link>
        </div>

        <div className="mt-3 rounded-2xl border border-black/10 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search product…"
              className="w-full md:w-80 rounded-xl border border-black/15 px-3 py-2 text-sm outline-none focus:border-black/40"
            />
            <button
              onClick={load}
              className="rounded-xl border border-black/15 px-3 py-2 text-sm font-bold hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          {toast ? <div className="mt-2 text-sm font-bold text-red-600">{toast}</div> : null}

          <div className="mt-3 overflow-auto">
            <table className="min-w-[820px] w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 pr-3">Selling Rate (₹)</th>
                  <th className="py-2 pr-3">MRP (₹)</th>
                  <th className="py-2 pr-3">GST %</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Action</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td className="py-4 text-gray-600" colSpan={6}>
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td className="py-4 text-gray-600" colSpan={6}>
                      No products found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.id} className="border-t border-black/5">
                      <td className="py-3 pr-3">
                        <div className="font-extrabold">{r.name}</div>
                        <div className="text-xs text-gray-500">{r.id}</div>
                      </td>

                      <td className="py-3 pr-3 font-black">
                        {r.salePrice == null ? "-" : `₹${inr(n(r.salePrice))}`}
                      </td>

                      <td className="py-3 pr-3">{r.mrp == null ? "-" : `₹${inr(n(r.mrp))}`}</td>
                      <td className="py-3 pr-3">{r.gstRate == null ? "-" : `${n(r.gstRate)}%`}</td>

                      <td className="py-3 pr-3">
                        <span
                          className={[
                            "inline-flex rounded-full border px-2 py-0.5 text-[11px] font-black",
                            r.isActive
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-gray-200 bg-gray-100 text-gray-700",
                          ].join(" ")}
                        >
                          {r.isActive ? "ACTIVE" : "INACTIVE"}
                        </span>
                      </td>

                      <td className="py-3 pr-3">
                        <button
                          onClick={() => toggleActive(r.id, !r.isActive)}
                          className="rounded-xl border border-black/15 px-3 py-1.5 text-xs font-black hover:bg-gray-50"
                        >
                          {r.isActive ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-2 text-xs text-gray-500">
            Note: Orders should save rate snapshot in OrderItem so old invoices don’t change when rate changes.
          </div>
        </div>
      </div>
    </div>
  );
}
