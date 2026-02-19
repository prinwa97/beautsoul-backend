"use client";
import React from "react";

export default function Trend({
  current,
  previous,
  decimals = 0,
}: {
  current: number;
  previous?: number | null;
  decimals?: number;
}) {
  const c = Number(current || 0);
  const p = previous == null ? null : Number(previous || 0);

  let arrow = "—";
  let cls = "text-gray-500";

  if (p == null) {
    // first cell: neutral style (or you can make green)
    arrow = "—";
    cls = "text-gray-500";
  } else if (c > p) {
    arrow = "▲";
    cls = "text-green-600";
  } else if (c < p) {
    arrow = "▼";
    cls = "text-red-600";
  }

  const label = `${c > 0 ? "+" : ""}${c.toFixed(decimals)}%`;

  return (
    <span className={`${cls} font-extrabold`}>
      {arrow} {label}
    </span>
  );
}