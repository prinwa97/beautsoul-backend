// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/sales-manager/retailers/_components/ui.tsx
"use client";

import React from "react";
import { cn } from "./utils";

export function ModeBtn({
  active,
  onClick,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-3 py-2 rounded-2xl border text-sm font-black transition whitespace-nowrap",
        active
          ? "bg-gray-900 border-gray-900 text-white"
          : "bg-white border-pink-200 text-gray-900 hover:bg-[#fff0f0] hover:shadow-sm"
      )}
    >
      {children}
    </button>
  );
}

export function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6 p-4 rounded-2xl border bg-white">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-black text-gray-900">{title}</h2>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

export function MiniStat({
  label,
  value,
  cls,
}: {
  label: string;
  value: any;
  cls: string;
}) {
  return (
    <div className={cn("px-3 py-2 rounded-2xl border", cls)}>
      <div className="text-[10px] font-extrabold text-gray-600">{label}</div>
      <div className="text-sm font-black text-gray-900">{value}</div>
    </div>
  );
}

export function Table({
  children,
  wide,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="overflow-x-auto border rounded-2xl bg-white">
      <table className={cn(wide ? "min-w-[1200px]" : "min-w-[900px]", "w-full text-[12px]")}>
        {children}
      </table>
    </div>
  );
}

export function TH({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <th className={cn("px-4 py-2 font-black text-[12px]", className)}>{children}</th>;
}

export function TD({
  children,
  className = "",
  colSpan,
  onClick,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
  onClick?: React.MouseEventHandler<HTMLTableCellElement>;
  title?: string;
}) {
  return (
    <td
      colSpan={colSpan}
      className={cn("px-4 py-2 align-top text-[12px]", className)}
      onClick={onClick}
      title={title}
    >
      {children}
    </td>
  );
}

export function KpiCard({ label, value }: { label: string; value: any }) {
  return (
    <div className="p-3 rounded-2xl border bg-white">
      <div className="text-[11px] font-semibold text-gray-500">{label}</div>
      <div className="mt-1 text-xl font-black text-gray-900">{value}</div>
    </div>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return <span className="text-[11px] px-2 py-0.5 rounded-full border bg-gray-50">{children}</span>;
}

export function SkeletonTask() {
  return (
    <div className="p-4 rounded-2xl border bg-white">
      <div className="h-4 w-40 bg-gray-100 rounded" />
      <div className="mt-3 h-3 w-3/4 bg-gray-100 rounded" />
      <div className="mt-2 h-3 w-2/3 bg-gray-100 rounded" />
      <div className="mt-4 flex gap-2">
        <div className="h-8 w-28 bg-gray-100 rounded-2xl" />
        <div className="h-8 w-28 bg-gray-100 rounded-2xl" />
      </div>
    </div>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const cls =
    tone === "good"
      ? "bg-green-50 text-green-700 border-green-200"
      : tone === "warn"
      ? "bg-amber-50 text-amber-800 border-amber-200"
      : tone === "bad"
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-black",
        cls
      )}
    >
      {children}
    </span>
  );
}

export function EvidenceSummary({ payload }: { payload: any }) {
  const reasons: Array<{ feature?: string; detail?: string; strength?: number }> = [];

  const rj =
    payload?.reasonJson ||
    payload?.evidenceJson ||
    payload?.reason ||
    payload?.evidence ||
    payload;

  const push = (arr: any) => {
    if (!Array.isArray(arr)) return;
    for (const x of arr) {
      reasons.push({
        feature: x?.feature || x?.key || x?.name,
        detail: x?.detail || x?.msg || x?.reason,
        strength: typeof x?.strength === "number" ? x.strength : undefined,
      });
    }
  };

  const risk =
    rj?.riskEvidence ||
    rj?.risk?.evidence ||
    rj?.risk?.reasons ||
    rj?.riskReasons ||
    null;

  const opp =
    rj?.oppEvidence ||
    rj?.opportunity?.evidence ||
    rj?.opportunity?.reasons ||
    rj?.oppReasons ||
    null;

  push(risk);
  push(opp);

  if (!reasons.length) {
    const type = String(rj?.type || "");
    const title = String(rj?.title || "");
    const city = String(rj?.city || "");
    const product = String(rj?.productName || "");
    const count = typeof rj?.count === "number" ? rj.count : Number(rj?.count || 0);

    if (type) reasons.push({ feature: "Type", detail: type });
    if (title) reasons.push({ feature: "Summary", detail: title });
    if (city && city !== "—") reasons.push({ feature: "City", detail: city });
    if (product && product !== "—") reasons.push({ feature: "Product", detail: product });
    if (Number.isFinite(count) && count > 0) reasons.push({ feature: "Count", detail: String(count) });
  }

  const safe = reasons.slice(0, 8);

  return (
    <div className="p-3 rounded-2xl border bg-white">
      <div className="text-[11px] font-semibold text-gray-500">Top Reasons</div>

      {safe.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {safe.map((x, i) => (
            <span key={i} className="text-[11px] px-2 py-1 rounded-xl border bg-gray-50">
              <b>{x.feature || "Signal"}</b>
              {x.detail ? <span className="text-gray-700"> · {x.detail}</span> : null}
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-2 text-xs text-gray-700">No structured reasons found. Use “Show Raw”.</div>
      )}
    </div>
  );
}