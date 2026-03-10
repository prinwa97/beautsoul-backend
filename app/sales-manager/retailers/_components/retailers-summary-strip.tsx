"use client";

import React from "react";
import { MiniStat } from "./ui";

export default function RetailersSummaryStrip({
  totalSales4m,
  summary,
}: {
  totalSales4m: string;
  summary: any;
}) {
  return (
    <div className="mt-5 p-3 rounded-2xl border bg-white">
      <div className="flex flex-wrap items-center gap-2">
        <MiniStat label="Sales (last 4m)" value={totalSales4m} cls="bg-blue-50 border-blue-200" />
        <MiniStat label="Retailers" value={summary?.totalRetailers ?? 0} cls="bg-gray-50 border-gray-200" />
        <MiniStat label="Active ≤30d" value={summary?.active30 ?? 0} cls="bg-green-50 border-green-200" />
        <MiniStat label="Inactive 31–60d" value={summary?.inactive31_60 ?? 0} cls="bg-yellow-50 border-yellow-200" />
        <MiniStat label="Dormant 61–90d" value={summary?.dormant61_90 ?? 0} cls="bg-orange-50 border-orange-200" />
        <MiniStat label="Dead 90+d" value={summary?.dead90 ?? 0} cls="bg-red-50 border-red-200" />
        <div className="w-px h-6 bg-gray-200 mx-1" />
        <MiniStat label="Distributors" value={summary?.totalDistributors ?? 0} cls="bg-gray-50 border-gray-200" />
        <MiniStat label="New Retailers" value={summary?.newRetailers ?? 0} cls="bg-gray-50 border-gray-200" />
        <MiniStat label="New Distributors" value={summary?.newDistributors ?? 0} cls="bg-gray-50 border-gray-200" />
      </div>
    </div>
  );
}