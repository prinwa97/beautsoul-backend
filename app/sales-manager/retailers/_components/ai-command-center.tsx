"use client";

import React from "react";
import { Chip, KpiCard } from "./ui";

export default function AiCommandCenter({
  ai,
  aiLoading,
  aiEnabled,
  done,
  total,
  openCount,
  progressPct,
  onStartMyDay,
  onRefreshAi,
}: {
  ai: any;
  aiLoading: boolean;
  aiEnabled: boolean;
  done: number;
  total: number;
  openCount: number;
  progressPct: number;
  onStartMyDay: () => void;
  onRefreshAi: () => void;
}) {
  return (
    <div className="mt-6 p-4 rounded-2xl border bg-white">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] font-semibold text-gray-500">AI Command Center</div>
          <div className="text-lg font-black text-gray-900">Decide → Execute → Prove</div>
          <div className="text-xs text-gray-600 mt-1">Compact view · simple + clear.</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onStartMyDay}
            className="px-4 py-2 rounded-2xl bg-gray-900 text-white text-sm font-black hover:opacity-95"
          >
            ▶ Start Day
          </button>

          <button onClick={onRefreshAi} className="px-4 py-2 rounded-2xl border bg-white text-sm font-black hover:bg-gray-50">
            ↻ Refresh AI
          </button>

          <span className="text-[11px] px-2 py-0.5 rounded-full border bg-gray-50">
            {aiLoading
              ? "AI: Loading…"
              : ai?.ok
              ? aiEnabled
                ? "AI: Enabled"
                : `AI: Disabled (${ai.reason || "UNKNOWN"})`
              : "AI: Error"}
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2">
        <KpiCard label="AI Score" value={ai?.performance?.score ?? 0} />
        <KpiCard label="Done/Total" value={`${done}/${total}`} />
        <KpiCard label="Open Tasks" value={openCount} />
        <KpiCard label="Progress" value={`${progressPct}%`} />
      </div>

      <div className="mt-3">
        <div className="h-2 rounded-full bg-gray-100 border overflow-hidden">
          <div className="h-full bg-gray-900" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {(ai?.performance?.reasons || []).slice(0, 8).map((x: string, i: number) => (
            <Chip key={i}>{x}</Chip>
          ))}
        </div>
      </div>

      {!aiEnabled ? (
        <div className="mt-3 p-3 rounded-xl border bg-yellow-50 text-yellow-800 text-sm">
          AI disabled: <b>{ai?.reason || "UNKNOWN"}</b>
        </div>
      ) : null}

      {!aiLoading && ai && !ai.ok ? (
        <div className="mt-3 p-3 rounded-xl border bg-red-50 text-red-700 text-sm">
          AI error: <b>{ai.error || "UNKNOWN"}</b> {ai.message ? `— ${ai.message}` : ""}
        </div>
      ) : null}
    </div>
  );
}