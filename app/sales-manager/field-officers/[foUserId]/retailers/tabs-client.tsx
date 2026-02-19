"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import SummaryPanel from "./summary-panel";
import AssignPanel from "./assign-panel";

type FoMeta = {
  foName: string;
  distributorId: string;
  distributorName: string;
};

function clsx(...a: Array<string | false | null | undefined>) {
  return a.filter(Boolean).join(" ");
}

export default function RetailerWorkTabsClient({ foUserId }: { foUserId: string }) {
  const router = useRouter();
  const [tab, setTab] = useState<"SUMMARY" | "ASSIGN">("SUMMARY");

  const [meta, setMeta] = useState<FoMeta>({
    foName: "-",
    distributorId: "",
    distributorName: "",
  });

  // last 30 days (same for summary)
  const period = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return { from: iso(from), to: iso(to) };
  }, []);

  // Load FO meta once (for header + assignment filter)
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const qs = new URLSearchParams({ foUserId, from: period.from, to: period.to });
        const res = await fetch(`/api/sales-manager/field-officers/work/summary?${qs.toString()}`, { cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!alive) return;

        const foName = String(data?.fo?.name || "-");
        const distributorId = String(data?.fo?.distributor?.id || "");
        const distributorName = String(data?.fo?.distributor?.name || "");

        setMeta({ foName, distributorId, distributorName });
      } catch {
        if (!alive) return;
        setMeta({ foName: "-", distributorId: "", distributorName: "" });
      }
    })();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foUserId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full max-w-none px-2 md:px-4 py-4">
        {/* Header */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xl font-extrabold">FO Work</div>
            <div className="mt-1 text-sm font-bold text-black/70 truncate">Field Officer: {meta.foName || "-"}</div>
            <div className="mt-0.5 text-xs font-bold text-black/50">
              Distributor: {meta.distributorName || meta.distributorId || "—"}
            </div>
          </div>

          <button
            onClick={() => router.back()}
            className="shrink-0 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-black hover:bg-gray-50"
          >
            ← Back
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            onClick={() => setTab("SUMMARY")}
            className={clsx(
              "rounded-xl border px-4 py-2 text-sm font-black",
              tab === "SUMMARY" ? "border-black bg-black text-white" : "border-black/10 bg-white hover:bg-gray-50"
            )}
          >
            Summary
          </button>

          <button
            onClick={() => setTab("ASSIGN")}
            className={clsx(
              "rounded-xl border px-4 py-2 text-sm font-black",
              tab === "ASSIGN" ? "border-black bg-black text-white" : "border-black/10 bg-white hover:bg-gray-50"
            )}
          >
            Assign Retailers
          </button>
        </div>

        {/* Content */}
        {tab === "SUMMARY" ? (
          <SummaryPanel foUserId={foUserId} from={period.from} to={period.to} />
        ) : (
          <AssignPanel foUserId={foUserId} distributorId={meta.distributorId} distributorName={meta.distributorName} />
        )}
      </div>
    </div>
  );
}
