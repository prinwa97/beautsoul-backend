"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

function money(n: any) {
  const x = Number(n || 0);
  return x.toLocaleString("en-IN");
}

// ✅ fixed palette
const PALETTE = [
  "#111827", // black-ish
  "#2563EB", // blue
  "#16A34A", // green
  "#F59E0B", // amber
  "#EF4444", // red
  "#8B5CF6", // violet
  "#06B6D4", // cyan
  "#F97316", // orange
  "#10B981", // emerald
  "#64748B", // slate
];

function pickColor(i: number) {
  return PALETTE[i % PALETTE.length];
}

// ✅ 1) Sales Trend (Line)
export function SalesTrendGraph({
  data,
}: {
  data: { date: string; amount: number }[];
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div className="text-base font-semibold">Sales Trend</div>
        <div className="text-xs text-gray-500">Daily total sale amount</div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => money(v)} />
            <Tooltip formatter={(v: any) => `₹${money(v)}`} />
            <Line
              type="monotone"
              dataKey="amount"
              strokeWidth={3}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ✅ 2) Top Products (Bar)
export function TopProductsGraph({
  data,
  title = "Top Products",
}: {
  data: { productName: string; amount: number; qty: number }[];
  title?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="mb-3">
        <div className="text-base font-semibold">{title}</div>
        <div className="text-xs text-gray-500">Amount + Quantity</div>
      </div>

      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="productName"
              tick={{ fontSize: 12 }}
              interval={0}
              angle={-10}
              height={60}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(v: any, name: any) =>
                name === "amount" ? `₹${money(v)}` : v
              }
            />
            <Legend />
            <Bar dataKey="amount" isAnimationActive={false} />
            <Bar dataKey="qty" isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ✅ Donut base block (colors + clickable list + clickable slices)
function DonutBlock({
  title,
  subtitle,
  pieData,
  onClickName,
}: {
  title: string;
  subtitle: string;
  pieData: { name: string; value: number }[];
  onClickName?: (name: string) => void;
}) {
  const total = (pieData || []).reduce((s, x) => s + Number(x.value || 0), 0);

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm h-full">
      <div className="mb-2">
        <div className="text-base font-semibold">{title}</div>
        <div className="text-xs text-gray-500">{subtitle}</div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-6">
        <div className="h-[220px] w-full md:w-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={70}
                outerRadius={95}
                paddingAngle={2}
                isAnimationActive={false}
                onClick={(data: any) => {
                  const name = String(data?.name || "");
                  if (!name || name === "Others") return;
                  onClickName?.(name);
                }}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={pickColor(i)} />
                ))}
              </Pie>
              <Tooltip formatter={(v: any) => `₹${money(v)}`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex-1">
          <div className="text-sm text-gray-600">Total</div>
          <div className="text-2xl font-semibold">₹{money(total)}</div>

          <div className="mt-3 space-y-2">
            {pieData.map((x, i) => {
              const pct = total ? Math.round((x.value * 100) / total) : 0;
              const clickable = !!onClickName && x.name !== "Others";

              return (
                <button
                  key={x.name}
                  type="button"
                  onClick={() => clickable && onClickName?.(x.name)}
                  className={`w-full text-left flex items-center justify-between gap-3 text-sm rounded-xl px-2 py-2 ${
                    clickable ? "hover:bg-gray-50" : ""
                  }`}
                  disabled={!clickable}
                  title={clickable ? "Click for details" : ""}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: pickColor(i) }}
                    />
                    <div className="truncate">{x.name}</div>
                  </div>

                  <div className="whitespace-nowrap text-gray-600">
                    ₹{money(x.value)} • {pct}%
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ 3) Top Products Share
export function TopProductsDonut({
  data,
  topN = 5,
  onClickProduct,
}: {
  data: { productName: string; amount: number; qty: number }[];
  topN?: number;
  onClickProduct?: (productName: string) => void;
}) {
  const clean = (data || []).filter((x) => Number(x.amount || 0) > 0);

  const top = clean.slice(0, topN);
  const otherSum = clean
    .slice(topN)
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const pieData = [
    ...top.map((x) => ({ name: x.productName, value: Number(x.amount || 0) })),
    ...(otherSum > 0 ? [{ name: "Others", value: otherSum }] : []),
  ];

  return (
    <DonutBlock
      title="Top Products Share"
      subtitle={`Top ${topN} products + Others (by amount)`}
      pieData={pieData}
      onClickName={onClickProduct}
    />
  );
}

// ✅ 4) Top Retailers Share
export function TopRetailersDonut({
  data,
  topN = 5,
  onClickRetailer,
}: {
  data: {
    id: string;
    name: string;
    city: string | null;
    amount: number;
    orders: number;
  }[];
  topN?: number;
  onClickRetailer?: (retailerName: string) => void;
}) {
  const clean = (data || []).filter((x) => Number(x.amount || 0) > 0);

  const top = clean.slice(0, topN);
  const otherSum = clean
    .slice(topN)
    .reduce((s, x) => s + Number(x.amount || 0), 0);

  const pieData = [
    ...top.map((x) => ({ name: x.name, value: Number(x.amount || 0) })),
    ...(otherSum > 0 ? [{ name: "Others", value: otherSum }] : []),
  ];

  return (
    <DonutBlock
      title="Top Retailers Share"
      subtitle={`Top ${topN} retailers + Others (by amount)`}
      pieData={pieData}
      onClickName={onClickRetailer}
    />
  );
}
