"use client";

import React from "react";
import { SkeletonTask, TD, TH } from "./ui";

export default function TodaysAiTodoPlanSection({
  aiEnabled,
  aiLoading,
  taskSearch,
  setTaskSearch,
  searchRef,
  tasksOpen,
  tasksDone,
  setLastSelectedTask,
  openTaskDetail,
  loadAi,
  money,
}: {
  aiEnabled: boolean;
  aiLoading: boolean;
  taskSearch: string;
  setTaskSearch: (v: string) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
  tasksOpen: any[];
  tasksDone: any[];
  setLastSelectedTask: (t: any) => void;
  openTaskDetail: (t: any) => void;
  loadAi: () => void;
  money: (n: any) => string;
}) {

  
  return (
    <div id="today-plan" className="mt-3 p-4 rounded-2xl border bg-white">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="text-[11px] font-semibold text-gray-500">Execution</div>
          <div className="text-lg font-black text-gray-900">Today’s AI To-Do Plan</div>
          <div className="text-xs text-gray-600 mt-1">Row-click table · Details/Proof/Complete buttons removed.</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={searchRef}
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            placeholder="Search tasks… (Ctrl/Cmd+K)"
            className="border rounded-2xl px-3 py-2 text-sm bg-white w-full md:w-72"
          />
          <button onClick={loadAi} className="px-3 py-2 rounded-2xl border bg-white text-sm font-black hover:bg-gray-50">
            ↻ Refresh
          </button>
        </div>
      </div>

      {!aiEnabled ? (
        <div className="mt-3 p-3 rounded-xl border bg-yellow-50 text-yellow-800 text-sm">
          Tasks not loaded because AI is disabled: <b>UNKNOWN</b>
        </div>
      ) : null}

      {aiLoading ? (
        <div className="mt-3 grid grid-cols-1 gap-2">
          <SkeletonTask />
          <SkeletonTask />
          <SkeletonTask />
        </div>
      ) : (
        <div className="mt-3 overflow-x-auto border rounded-2xl bg-white">
          <table className="min-w-[1200px] w-full text-[12px]">
            <thead className="bg-gray-50 border-b">
              <tr className="text-left">
                <TH className="w-[90px]">Priority</TH>
                <TH className="w-[340px]">Task</TH>
                <TH className="w-[160px]">City</TH>
                <TH className="w-[120px] text-right">Targets</TH>
                <TH className="w-[170px] text-right">Impact</TH>
                <TH className="w-[140px] text-right">Confidence</TH>
                <TH className="w-[120px]">Status</TH>
              </tr>
            </thead>

            <tbody>
              {[...tasksOpen, ...(tasksDone.length ? tasksDone : [])].map((t: any, idx: number) => {
                const pri = Number(t?.priority || 0) || idx + 1;
                const status = String(t?.status || "OPEN").toUpperCase();
                const cityText = String(t?.city || "").trim() || "—";

                const targetsCount = Array.isArray(t?.targets) && t.targets.length
                  ? t.targets.length
                  : Array.isArray(t?.retailerIds)
                  ? t.retailerIds.length
                  : 0;

                const impactText =
                  t?.expectedImpactMin
                    ? `₹${money(t.expectedImpactMin)}–₹${money(t.expectedImpactMax || t.expectedImpactMin)}`
                    : "—";

                const confPct = (() => {
                  const v = Number(t?.confidence);
                  if (!Number.isFinite(v)) return null;
                  if (v > 0 && v <= 1) return Math.round(v * 100);
                  if (v >= 0 && v <= 100) return Math.round(v);
                  return null;
                })();

                return (
                  <tr
                    key={t.id || idx}
                    className="border-t hover:bg-gray-50 cursor-pointer"
                    onMouseEnter={() => setLastSelectedTask(t)}
                    onClick={() => openTaskDetail(t)}
                    title="Open task detail"
                  >
                    <TD className="font-black">{pri}</TD>
                    <TD className="font-bold">
                      {t.title || t.type || "Task"}
                      <div className="text-[10px] text-gray-500 mt-0.5">{t.type || t.typeKey || ""}</div>
                      {t.aiReason ? <div className="text-[11px] text-gray-700 mt-1 line-clamp-1">{t.aiReason}</div> : null}
                    </TD>
                    <TD className="font-semibold">{cityText}</TD>
                    <TD className="text-right font-black">{targetsCount}</TD>
                    <TD className="text-right font-black">{impactText}</TD>
                    <TD className="text-right font-black">{confPct == null ? "—" : `${confPct}%`}</TD>
                    <TD className={status === "DONE" ? "font-black text-green-700" : "font-black"}>{status}</TD>
                  </tr>
                );
              })}

              {!tasksOpen.length && !tasksDone.length ? (
                <tr className="border-t">
                  <TD colSpan={7} className="text-center text-gray-600 py-8">
                    {aiEnabled ? "No tasks for today." : "AI disabled."}
                  </TD>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}