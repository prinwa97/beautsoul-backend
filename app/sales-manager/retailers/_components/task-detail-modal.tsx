"use client";

import React from "react";
import ModalShell from "../modal-shell";
import { KpiCard } from "./ui";
import TaskRetailerRows from "../task-retailer-rows";
import { safeArr } from "./utils";

function SimpleScript({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-3 rounded-2xl border bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-black text-gray-900">{title}</div>
        <button
          className="px-3 py-1.5 rounded-xl border bg-white text-[11px] font-black hover:bg-gray-50"
          onClick={() => {
            try {
              navigator.clipboard.writeText(text);
              alert("Copied ✅");
            } catch {
              alert("Copy failed");
            }
          }}
        >
          Copy
        </button>
      </div>
      <pre className="mt-2 text-[12px] whitespace-pre-wrap text-gray-800">{text}</pre>
    </div>
  );
}

function TaskDetailBody({
  t,
  money,
  onOpenRetailer,
}: {
  t: any;
  money: (n: any) => string;
  onOpenRetailer: (rid: string) => void;
}) {
  const typeKey = String(t?.typeKey || "").toUpperCase();
  const isReactivate = typeKey === "REACTIVATE_RETAILER";

  const retailerIds: string[] = Array.isArray(t?.retailerIds) ? t.retailerIds : [];
  const targets = safeArr<any>(t.targets);

  const targetRows = targets.length
    ? targets
        .map((x) => ({
          retailerId: String(x.retailerId || x.id || x.retailer?.id || "").trim(),
          retailerName: String(x.retailerName || x.retailer?.name || "").trim(),
          distributorName: String(x.distributorName || "").trim(),
          city: String(x.city || "").trim(),
          lastOrderAt: x.lastOrderAt || null,
          lastOrderAmount: x.lastOrderAmount ?? null,
          personalizedReason: String(x.personalizedReason || x.reason || "").trim(),
        }))
        .filter((r) => r.retailerId)
    : retailerIds
        .map((id) => ({
          retailerId: String(id || "").trim(),
          retailerName: "",
          distributorName: "",
          city: "",
          lastOrderAt: null,
          lastOrderAmount: null,
          personalizedReason: "",
        }))
        .filter((r) => r.retailerId);

  const callScript = `Hi, order update.\nReason: ${t?.aiReason || "AI insight"}\nCan we confirm order today?`;
  const visitScript = `Visit: check stock + pitch.\nGoal: order today.\nReason: ${t?.aiReason || "AI insight"}`;
  const impactText =
    t?.expectedImpactMin ? `₹${money(t.expectedImpactMin)}–₹${money(t.expectedImpactMax || t.expectedImpactMin)}` : "—";

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-2xl border bg-white">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <KpiCard label="Priority" value={t?.priority ?? 0} />
          <KpiCard label="Impact" value={impactText} />
          <KpiCard label="Confidence" value={t?.confidence ? `${Number(t.confidence || 0)}%` : "—"} />
          <KpiCard label={isReactivate ? "Retailers" : "Targets"} value={targetRows.length} />
        </div>
      </div>

      {isReactivate ? (
        <div className="p-3 rounded-2xl border bg-white">
          <div className="text-sm font-black text-gray-900">Retailers</div>
          <div className="mt-2">
            <TaskRetailerRows targets={targetRows} onOpenRetailer={onOpenRetailer} />
          </div>
        </div>
      ) : (
        <div className="p-3 rounded-2xl border bg-white">
          <div className="text-sm font-black text-gray-900">Targets</div>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
            {targetRows.slice(0, 50).map((x, idx) => (
              <div key={`${x.retailerId}-${idx}`} className="p-3 rounded-2xl border bg-white">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-black text-gray-900 truncate">
                      {x.retailerName ? x.retailerName : `${x.retailerId.slice(0, 10)}…`}
                    </div>
                    <div className="text-xs text-gray-600">
                      {x.city ? `City: ${x.city}` : "City: —"} · ID: {x.retailerId}
                    </div>
                    {x.personalizedReason ? <div className="mt-1 text-xs text-gray-700">{x.personalizedReason}</div> : null}
                  </div>
                  <button
                    className="px-3 py-2 rounded-2xl border bg-white text-xs font-black hover:bg-gray-50"
                    onClick={() => onOpenRetailer(x.retailerId)}
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
            {!targetRows.length ? <div className="text-sm text-gray-600">No targets.</div> : null}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        <SimpleScript title="Call Script" text={callScript} />
        <SimpleScript title="Visit Script" text={visitScript} />
      </div>
    </div>
  );
}

export default function TaskDetailModal({
  taskDetailOpen,
  closeTaskDetail,
  taskDetailTask,
  openEvidence,
  completeTask,
  money,
  openRetailer,
}: {
  taskDetailOpen: boolean;
  closeTaskDetail: () => void;
  taskDetailTask: any;
  openEvidence: (title: string, payload: any) => void;
  completeTask: (taskId: string) => void;
  money: (n: any) => string;
  openRetailer: (rid: string) => void;
}) {
  return (
    <ModalShell
      open={taskDetailOpen}
      onClose={closeTaskDetail}
      zIndex={100}
      widthClass="max-w-5xl"
      titleTop={
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-500">Task Detail</div>
            <div className="text-lg font-black text-gray-900 truncate">
              {taskDetailTask?.title || taskDetailTask?.type || "—"}
            </div>
            <div className="text-xs text-gray-600 mt-1 line-clamp-1">{taskDetailTask?.aiReason || "—"}</div>
          </div>

          {taskDetailTask ? (
            <div className="shrink-0 flex items-center gap-2">
              <button
                className="px-3 py-2 rounded-2xl border bg-white text-xs font-black hover:bg-gray-50"
                onClick={() =>
                  openEvidence(
                    `Task Proof: ${taskDetailTask?.title || taskDetailTask?.type}`,
                    taskDetailTask?.reasonJson || taskDetailTask?.evidenceJson || taskDetailTask
                  )
                }
              >
                Proof
              </button>

              {String(taskDetailTask?.status || "").toUpperCase() === "DONE" ? (
                <div className="px-3 py-2 rounded-2xl bg-green-600 text-white text-xs font-black text-center">Done</div>
              ) : (
                <button
                  className="px-3 py-2 rounded-2xl bg-gray-900 text-white text-xs font-black hover:opacity-95"
                  onClick={() => completeTask(taskDetailTask.id)}
                >
                  Complete
                </button>
              )}
            </div>
          ) : null}
        </div>
      }
    >
      <div className="p-4 overflow-auto max-h-[75vh]">
        {taskDetailTask ? (
          <TaskDetailBody t={taskDetailTask} money={money} onOpenRetailer={openRetailer} />
        ) : (
          <div className="text-sm text-gray-600">No task selected.</div>
        )}
      </div>
    </ModalShell>
  );
}