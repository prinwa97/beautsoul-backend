"use client";

import React, { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";

type Row = { name: string; value: number };

type ApiData = {
  summary: {
    distributorPending: number;
    distributorSold: number;
    retailerPending: number;
    retailerSold: number;
  };
  donuts: {
    distributor: Row[];
    retailer: Row[];
    topProductsShare: Row[];
  };
  bars: {
    topProductsSold: Row[];
    topRetailersSold: Row[];
    nonMovingProducts: Row[];
  };
};

const COLORS = ["#111827", "#6B7280", "#9CA3AF", "#D1D5DB", "#10B981", "#F59E0B", "#EF4444"];

function Donut({ title, data }: { title: string; data: Row[] }) {
  const total = useMemo(() => data.reduce((a, b) => a + (b.value || 0), 0), [data]);
  return (
    <div className="bg-white border shadow-sm rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-900">{title}</div>
        <div className="text-xs text-gray-600">Total: <b>{total}</b></div>
      </div>
      <div className="mt-3 h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={88} paddingAngle={2}>
              {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BarBox({ title, data }: { title: string; data: Row[] }) {
  return (
    <div className="bg-white border shadow-sm rounded-2xl p-4">
      <div className="text-sm font-semibold text-gray-900">{title}</div>
      <div className="mt-3 h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function StockClient() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/sales-manager/stock", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to load stock");
      setData(j);
    } catch (e: any) {
      setErr(e?.message || "Error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="bg-white border rounded-2xl p-6 shadow-sm">Loading stock…</div>;
  if (err) return <div className="bg-white border rounded-2xl p-6 shadow-sm text-red-600">{err}</div>;
  if (!data) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Donut title="Distributor Stock: Pending vs Sold" data={data.donuts.distributor} />
        <Donut title="Retailer Stock: Pending vs Sold" data={data.donuts.retailer} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Donut title="Top Products Share (Sold)" data={data.donuts.topProductsShare} />
        <BarBox title="Top Products by Sold (PCS)" data={data.bars.topProductsSold} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <BarBox title="Top Retailers by Sold (PCS)" data={data.bars.topRetailersSold} />
        <BarBox title="Non-moving Products (Low/Zero Sold)" data={data.bars.nonMovingProducts} />
      </div>

      <button onClick={load} className="px-4 py-2 rounded-xl bg-white border shadow-sm hover:bg-gray-50">
        Refresh
      </button>
    </div>
  );
}
