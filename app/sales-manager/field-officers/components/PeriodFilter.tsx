"use client";

import React, { useEffect, useMemo, useState } from "react";

export type PeriodKey = "THIS_MONTH" | "LAST_MONTH" | "LAST_7_DAYS" | "LAST_30_DAYS" | "CUSTOM";

export type PeriodRange = {
  key: PeriodKey;
  label: string;
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD (inclusive)
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function fmtYMD(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function buildPresetRange(key: Exclude<PeriodKey, "CUSTOM">, now = new Date()): PeriodRange {
  const today = startOfDay(now);
  if (key === "THIS_MONTH") {
    const from = startOfMonth(today);
    const to = endOfMonth(today);
    return { key, label: "This Month", from: fmtYMD(from), to: fmtYMD(to) };
  }
  if (key === "LAST_MONTH") {
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const from = startOfMonth(lastMonth);
    const to = endOfMonth(lastMonth);
    return { key, label: "Last Month", from: fmtYMD(from), to: fmtYMD(to) };
  }
  if (key === "LAST_7_DAYS") {
    const from = addDays(today, -6); // inclusive = 7 days incl today
    const to = today;
    return { key, label: "Last 7 Days", from: fmtYMD(from), to: fmtYMD(to) };
  }
  // LAST_30_DAYS
  const from = addDays(today, -29);
  const to = today;
  return { key, label: "Last 30 Days", from: fmtYMD(from), to: fmtYMD(to) };
}

function isValidYMD(s: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export default function PeriodFilter(props: {
  value?: PeriodKey;                 // optional controlled key
  onChange: (range: PeriodRange) => void;
  className?: string;
}) {
  const [key, setKey] = useState<PeriodKey>(props.value ?? "THIS_MONTH");

  // custom inputs
  const [customFrom, setCustomFrom] = useState<string>(() => fmtYMD(startOfMonth(new Date())));
  const [customTo, setCustomTo] = useState<string>(() => fmtYMD(startOfDay(new Date())));

  useEffect(() => {
    if (props.value) setKey(props.value);
  }, [props.value]);

  const range: PeriodRange = useMemo(() => {
    if (key !== "CUSTOM") return buildPresetRange(key);
    const from = isValidYMD(customFrom) ? customFrom : fmtYMD(startOfMonth(new Date()));
    const to = isValidYMD(customTo) ? customTo : fmtYMD(startOfDay(new Date()));
    return { key, label: "Custom", from, to };
  }, [key, customFrom, customTo]);

  // emit change whenever range changes
  useEffect(() => {
    props.onChange(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.key, range.from, range.to]);

  const tabs: { k: PeriodKey; label: string }[] = [
    { k: "THIS_MONTH", label: "This Month" },
    { k: "LAST_MONTH", label: "Last Month" },
    { k: "LAST_7_DAYS", label: "Last 7 Days" },
    { k: "LAST_30_DAYS", label: "Last 30 Days" },
    { k: "CUSTOM", label: "Custom Range" },
  ];

  const customError =
    key === "CUSTOM" &&
    (customFrom > customTo || !isValidYMD(customFrom) || !isValidYMD(customTo));

  return (
    <div className={props.className ?? ""}>
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => {
          const active = key === t.k;
          return (
            <button
              key={t.k}
              type="button"
              onClick={() => setKey(t.k)}
              className={[
                "rounded-full border px-3 py-1 text-xs font-extrabold",
                active ? "bg-black text-white border-black" : "bg-white text-black border-black/15 hover:border-black/40",
              ].join(" ")}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {key === "CUSTOM" && (
        <div className="mt-3 rounded-xl border border-black/10 bg-white p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-bold text-black/70">
              From
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </label>

            <label className="text-xs font-bold text-black/70">
              To
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="mt-1 w-full rounded-lg border border-black/10 px-3 py-2 text-sm"
              />
            </label>
          </div>

          {customError && (
            <div className="mt-2 text-xs font-bold text-red-600">
              Please select a valid range (From ≤ To).
            </div>
          )}

          <div className="mt-2 text-[11px] text-black/60">
            Selected: <span className="font-bold">{range.from}</span> to{" "}
            <span className="font-bold">{range.to}</span>
          </div>
        </div>
      )}

      {key !== "CUSTOM" && (
        <div className="mt-2 text-[11px] text-black/60">
          Selected: <span className="font-bold">{range.from}</span> to{" "}
          <span className="font-bold">{range.to}</span>
        </div>
      )}
    </div>
  );
}