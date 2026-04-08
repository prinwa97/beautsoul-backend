"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function money(n: any) {
  const x = Number(n || 0);
  return x.toLocaleString("en-IN");
}

const PALETTE = [
  "#111827",
  "#2563EB",
  "#16A34A",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#06B6D4",
  "#F97316",
  "#10B981",
  "#64748B",
];

function pickColor(i: number) {
  return PALETTE[i % PALETTE.length];
}

export default function TopRetailersDonut({
  data,
  topN = 6,
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
    ...top.map((x) => ({
      name: x.name,
      value: Number(x.amount || 0),
    })),
    ...(otherSum > 0 ? [{ name: "Others", value: otherSum }] : []),
  ];

  const total = pieData.reduce((s, x) => s + Number(x.value || 0), 0);

  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm h-full">
      <div className="mb-2">
        <div className="text-base font-semibold">Top Retailers Share</div>
        <div className="text-xs text-gray-500">
          Top {topN} retailers + Others (by amount)
        </div>
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
                  onClickRetailer?.(name);
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
              const clickable = x.name !== "Others";

              return (
                <button
                  key={x.name}
                  type="button"
                  onClick={() => clickable && onClickRetailer?.(x.name)}
                  className={`w-full rounded-xl px-2 py-2 text-left text-sm flex items-center justify-between gap-3 ${
                    clickable ? "hover:bg-gray-50" : ""
                  }`}
                  disabled={!clickable}
                  title={clickable ? "Click for details" : ""}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
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