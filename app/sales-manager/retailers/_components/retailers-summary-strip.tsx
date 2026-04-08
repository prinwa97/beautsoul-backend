"use client";

import React from "react";
import { MiniStat } from "./ui";

const months = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const commonCls = "bg-white border-gray-200";

type Props = {
  totalSales4m?: string | number;
  todaySales?: string | number;
  thisWeekSales?: string | number;
  thisMonthSales?: string | number;
  monthlySales?: number[];
  summary?: any;
};

export default function RetailersSummaryStrip({
  totalSales4m,
  todaySales,
  thisWeekSales,
  thisMonthSales,
  monthlySales = [],
  summary,
}: Props) {
  const hasNewSalesStrip =
    todaySales !== undefined ||
    thisWeekSales !== undefined ||
    thisMonthSales !== undefined ||
    (monthlySales?.length ?? 0) > 0;

  return (
    <div className="mt-5 rounded-2xl border bg-white p-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Old mode fallback */}
        {!hasNewSalesStrip && (
          <MiniStat
            label="Sales (last 4m)"
            value={totalSales4m ?? 0}
            cls={commonCls}
          />
        )}

        {/* New mode */}
        {hasNewSalesStrip && (
          <>
            <MiniStat label="Today" value={todaySales ?? 0} cls={commonCls} />
            <MiniStat label="This Week" value={thisWeekSales ?? 0} cls={commonCls} />
            <MiniStat label="This Month" value={thisMonthSales ?? 0} cls={commonCls} />

            <div className="mx-1 h-6 w-px bg-gray-200" />

            {months.map((m, i) => (
              <MiniStat
                key={m}
                label={m}
                value={monthlySales?.[i] ?? 0}
                cls={commonCls}
              />
            ))}
          </>
        )}

        <div className="mx-1 h-6 w-px bg-gray-200" />

        <MiniStat
          label="Retailers"
          value={summary?.totalRetailers ?? 0}
          cls={commonCls}
        />
        <MiniStat
          label="Active ≤30d"
          value={summary?.active30 ?? 0}
          cls={commonCls}
        />
        <MiniStat
          label="Inactive 31–60d"
          value={summary?.inactive31_60 ?? 0}
          cls={commonCls}
        />
        <MiniStat
          label="Dormant 61–90d"
          value={summary?.dormant61_90 ?? 0}
          cls={commonCls}
        />
        <MiniStat
          label="Dead 90+d"
          value={summary?.dead90 ?? 0}
          cls={commonCls}
        />

        <div className="mx-1 h-6 w-px bg-gray-200" />

        <MiniStat
          label="Distributors"
          value={summary?.totalDistributors ?? 0}
          cls={commonCls}
        />
        <MiniStat
          label="New Retailers"
          value={summary?.newRetailers ?? 0}
          cls={commonCls}
        />
        <MiniStat
          label="New Distributors"
          value={summary?.newDistributors ?? 0}
          cls={commonCls}
        />
      </div>
    </div>
  );
}