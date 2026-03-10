"use client";

import React from "react";
import { addDaysLocal, isoDate, startOfFYLocal, startOfMonthLocal } from "./utils";
import { ModeBtn } from "./ui";

type Mode = "TODAY" | "MONTH" | "YEAR" | "CUSTOM";
type Sort = "SALES" | "ORDERS" | "GROWTH";

export default function RetailersHeader({
  mode,
  setMode,
  sort,
  setSort,
  from,
  setFrom,
  to,
  setTo,
  distId,
  setDistId,
  city,
  setCity,
  q,
  setQ,
  data,
  onApply,
}: {
  mode: Mode;
  setMode: (v: Mode) => void;
  sort: Sort;
  setSort: (v: Sort) => void;
  from: string;
  setFrom: (v: string) => void;
  to: string;
  setTo: (v: string) => void;
  distId: string;
  setDistId: (v: string) => void;
  city: string;
  setCity: (v: string) => void;
  q: string;
  setQ: (v: string) => void;
  data: any;
  onApply: () => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Retailer Analytics</h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ModeBtn active={mode === "TODAY"} onClick={() => setMode("TODAY")}>
            Today
          </ModeBtn>
          <ModeBtn active={mode === "MONTH"} onClick={() => setMode("MONTH")}>
            This Month
          </ModeBtn>
          <ModeBtn active={mode === "YEAR"} onClick={() => setMode("YEAR")}>
            This Year
          </ModeBtn>
          <ModeBtn active={mode === "CUSTOM"} onClick={() => setMode("CUSTOM")}>
            Custom
          </ModeBtn>

          <div className="hidden md:block w-px h-8 bg-gray-200 mx-1" />

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="border rounded-2xl px-3 py-2 text-sm font-bold bg-white"
          >
            <option value="SALES">Sort: Sales</option>
            <option value="ORDERS">Sort: Orders</option>
            <option value="GROWTH">Sort: Growth%</option>
          </select>

          {mode === "CUSTOM" ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">From</span>
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="border rounded-lg px-2 py-1 text-sm bg-white"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">To</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="border rounded-lg px-2 py-1 text-sm bg-white"
                />
              </div>
              <button onClick={onApply} className="px-3 py-2 rounded-2xl bg-gray-900 text-white text-sm font-black">
                Apply
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={distId}
            onChange={(e) => setDistId(e.target.value)}
            className="border rounded-2xl px-3 py-2 text-sm font-bold bg-white"
          >
            <option value="">All Distributors</option>
            {(data?.filters?.distributors || []).map((d: any) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="border rounded-2xl px-3 py-2 text-sm font-bold bg-white"
          >
            <option value="">All Cities</option>
            {(data?.filters?.cities || []).map((c: string) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            onClick={onApply}
            className="px-4 py-2 rounded-2xl bg-gray-900 text-white text-sm font-black"
          >
            Apply Filters
          </button>

          <div className="text-xs text-gray-500">
            {(() => {
              const f = data?.range?.from ? new Date(String(data.range.from).slice(0, 10) + "T00:00:00") : null;
              const t0 = data?.range?.to ? new Date(String(data.range.to).slice(0, 10) + "T00:00:00") : null;
              const t = t0 ? addDaysLocal(t0, -1) : null;

              const fTxt = f
                ? f.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                : "—";
              const tTxt = t
                ? t.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
                : "—";
              return `Showing: ${fTxt} → ${tTxt}`;
            })()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search retailer / distributor / city…"
            className="border rounded-2xl px-3 py-2 text-sm bg-white w-full md:w-80"
          />
        </div>
      </div>
    </>
  );
}