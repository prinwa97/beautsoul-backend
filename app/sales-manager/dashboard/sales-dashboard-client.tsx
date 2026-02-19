"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis,
} from "recharts";

type DonutRow = { name: string; value: number };
type BarRow = { name: string; value: number };

type ApiData = {
  cards: {
    distributors: number;
    retailers: number;
    todayOrders: number;
    todaySalesAmount: number;
  };
  donuts: {
    orderStatus: DonutRow[];
    deliveredVsPending: DonutRow[];
    activeVsInactiveRetailers: DonutRow[];
    distributorStockSplit: DonutRow[]; // Pending vs Sold
    retailerStockSplit: DonutRow[];    // Pending vs Sold
  };
  bars: {
    topDistributorsBySales: BarRow[];
    nonPerformingRetailers: BarRow[];
    topProductsBySold: BarRow[];
  };
};

const COLORS = ["#111827", "#6B7280", "#9CA3AF", "#D1D5DB", "#10B981", "#F59E0B", "#EF4444"];

function Card({ title, value, sub }: { title: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-white border shadow-sm rounded-2xl p-4">
      <div className="text-xs text-gray-600">{title}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900">{value}</div>
      {sub ? <div className="mt-1 text-xs text-gray-500">{sub}</div> : null}
    </div>
  );
}

function Donut({ title, data }: { title: string; data: DonutRow[] }) {
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

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between gap-2 bg-gray-50 rounded-xl px-2 py-1">
            <span className="flex items-center gap-2">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
              <span className="text-gray-800">{d.name}</span>
            </span>
            <b className="text-gray-900">{d.value}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarBox({ title, data }: { title: string; data: BarRow[] }) {
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

export default function DashboardClient() {
  const [data, setData] = useState<ApiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/sales-manager/dashboard", { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || "Failed to load");
      setData(j);
    } catch (e: any) {
      setErr(e?.message || "Error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) return <div className="bg-white border rounded-2xl p-6 shadow-sm">Loading Sales Manager dashboard…</div>;

  if (err) {
    return (
      <div className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="text-red-600 font-semibold">Dashboard Error</div>
        <div className="mt-2 text-sm text-gray-700">{err}</div>
        <button onClick={load} className="mt-4 px-4 py-2 rounded-xl bg-black text-white">Retry</button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {/* Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card title="My Distributors" value={data.cards.distributors} />
        <Card title="My Retailers" value={data.cards.retailers} />
        <Card title="Today Orders" value={data.cards.todayOrders} />
        <Card title="Today Sales (₹)" value={data.cards.todaySalesAmount} />
      </div>

      {/* Donuts (MAX) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Donut title="Order Status Split" data={data.donuts.orderStatus} />
        <Donut title="Delivered vs Pending" data={data.donuts.deliveredVsPending} />
        <Donut title="Retailers: Active vs Inactive" data={data.donuts.activeVsInactiveRetailers} />
        <Donut title="Distributor Stock: Pending vs Sold" data={data.donuts.distributorStockSplit} />
        <Donut title="Retailer Stock: Pending vs Sold" data={data.donuts.retailerStockSplit} />
      </div>

      {/* Bars (only where needed) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <BarBox title="Top Distributors by Sales" data={data.bars.topDistributorsBySales} />
        <BarBox title="Non-performing Retailers" data={data.bars.nonPerformingRetailers} />
      </div>

      <div className="grid grid-cols-1 gap-3">
        <BarBox title="Top Products by Sold (PCS)" data={data.bars.topProductsBySold} />
      </div>

      <button onClick={load} className="px-4 py-2 rounded-xl bg-white border shadow-sm hover:bg-gray-50">
        Refresh
      </button>
    </div>
  );
}
