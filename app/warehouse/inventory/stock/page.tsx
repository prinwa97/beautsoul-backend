"use client";

import React, { useEffect, useState } from "react";

type StockRow = {
  id: string;
  productName: string;
  batchNo: string | null;
  mfgDate: string | null;
  expDate: string | null;
  qtyOnHandPcs: number;
};

export default function WarehouseStockPage() {
  const [rows, setRows] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/warehouse/inventory", { cache: "no-store" });
    const data = await res.json().catch(() => []);
    setRows(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">Current Stock (Batch wise)</h1>
        <button
          onClick={load}
          className="border rounded-lg px-3 py-1 text-sm"
        >
          Refresh
        </button>
      </div>

      {loading && <div className="text-sm">Loading...</div>}

      <div className="overflow-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2 text-left">Product</th>
              <th className="border p-2 text-left">Batch</th>
              <th className="border p-2 text-left">MFG</th>
              <th className="border p-2 text-left">EXP</th>
              <th className="border p-2 text-right">Qty</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="border p-2">{r.productName}</td>
                <td className="border p-2">{r.batchNo || "-"}</td>
                <td className="border p-2">
                  {r.mfgDate ? new Date(r.mfgDate).toLocaleDateString() : "-"}
                </td>
                <td className="border p-2">
                  {r.expDate ? new Date(r.expDate).toLocaleDateString() : "-"}
                </td>
                <td className="border p-2 text-right font-semibold">
                  {r.qtyOnHandPcs}
                </td>
              </tr>
            ))}

            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="border p-3 text-center text-gray-500">
                  No stock found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
