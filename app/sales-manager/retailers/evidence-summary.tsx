"use client";
import React from "react";

export default function EvidenceSummary({ payload }: { payload: any }) {
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

  push(rj?.riskEvidence || rj?.risk?.evidence);
  push(rj?.oppEvidence || rj?.opportunity?.evidence);

  // fallback (like your brief_risk json)
  if (!reasons.length) {
    const type = String(rj?.type || "");
    const title = String(rj?.title || "");
    const count = typeof rj?.count === "number" ? rj.count : Number(rj?.count || 0);

    if (type) reasons.push({ feature: "Type", detail: type });
    if (title) reasons.push({ feature: "Summary", detail: title });
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
        <div className="mt-2 text-xs text-gray-700">No structured reasons found. Use "Show Raw".</div>
      )}
    </div>
  );
}