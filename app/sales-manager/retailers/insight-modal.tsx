// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/sales-manager/retailers/insight-modal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

export type InsightEvidence = {
  kind: "RETAILER" | "CITY" | "PRODUCT";
  id: string;
  label: string;
  metric?: string;
};

export type InsightAction = { type: string; label: string };

export type Insight = {
  id: string;
  type: string;
  title: string;
  summary?: string;
  evidence?: InsightEvidence[];
  actions?: InsightAction[];
};

export default function InsightModal({
  open,
  insight,
  onClose,
  onOpenRetailer,
  onOpenCity,
  onOpenProduct,
  onCreatedTasks,
}: {
  open: boolean;
  insight: Insight | null;
  onClose: () => void;
  onOpenRetailer: (retailerId: string) => void;
  onOpenCity: (city: string) => void;
  onOpenProduct: (productName: string) => void;
  onCreatedTasks: () => void;
}) {
  const [creating, setCreating] = useState(false);

  // ✅ snapshot derived data (safe + clean)
  const cityHint = useMemo(() => {
    if (!insight?.evidence?.length) return "";
    return insight.evidence.find((e) => e.kind === "CITY")?.label || "";
  }, [insight]);

  const productNamesHint = useMemo(() => {
    if (!insight?.evidence?.length) return [];
    return insight.evidence.filter((e) => e.kind === "PRODUCT").map((e) => e.label);
  }, [insight]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !insight) return null;

  async function createTasks() {
    // ✅ snapshot: async ke beech insight change bhi ho jaye to safe rahe
    const cur = insight;
    if (!cur) {
      alert("Insight missing. Close and re-open.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`/api/sales-manager/retailers/ai/insights/create-tasks`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          insightId: cur.id,
          insightType: cur.type,
          title: cur.title,
          summary: cur.summary || "",
          evidence: cur.evidence || [],
          // optional hints
          city: cityHint,
          productNames: productNamesHint,
        }),
      });

      const j = await res.json().catch(() => null);

      if (!res.ok || !j?.ok) {
        alert(j?.error || `FAILED (HTTP ${res.status})`);
        return;
      }

      alert(j.created ? "Tasks created." : "Already created for today.");
      onCreatedTasks();
      onClose();
    } catch (e: any) {
      alert(`Network error: ${String(e?.message || e)}`);
    } finally {
      setCreating(false);
    }
  }

  function clickEvidence(e: InsightEvidence) {
    const k = e.kind;
    if (k === "RETAILER") return onOpenRetailer(String(e.id));
    if (k === "CITY") return onOpenCity(String(e.label));
    if (k === "PRODUCT") return onOpenProduct(String(e.label));
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-3">
        <div className="w-full max-w-3xl rounded-2xl bg-white border shadow-xl">
          <div className="p-4 border-b flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-gray-500">AI Insight</div>
              <div className="text-lg font-black text-gray-900 truncate">{insight.title}</div>
              <div className="mt-1 text-xs text-gray-600">
                Type: <b>{insight.type}</b>
              </div>
            </div>
            <button className="px-3 py-2 rounded-xl border bg-white text-sm font-black" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="p-4">
            {insight.summary ? (
              <div className="p-3 rounded-xl border bg-gray-50 text-sm text-gray-800">{insight.summary}</div>
            ) : null}

            <div className="mt-4">
              <div className="text-sm font-black text-gray-900">Evidence</div>
              <div className="mt-2 space-y-2">
                {(insight.evidence || []).map((e, idx) => (
                  <div
                    key={`${e.kind}-${e.id}-${idx}`}
                    className="p-3 rounded-2xl border bg-white cursor-pointer hover:bg-gray-50"
                    onClick={() => clickEvidence(e)}
                    title="Click to open"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold">
                        {e.kind}: {e.label}
                      </div>
                      <div className="text-xs text-gray-600">{e.metric || ""}</div>
                    </div>
                  </div>
                ))}
                {!(insight.evidence || []).length ? <div className="text-sm text-gray-600">No evidence.</div> : null}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2 justify-end">
              <button className="px-4 py-2 rounded-2xl border bg-white text-sm font-black" onClick={onClose}>
                Close
              </button>

              <button
                disabled={creating}
                className="px-4 py-2 rounded-2xl bg-gray-900 text-white text-sm font-black disabled:opacity-60"
                onClick={createTasks}
              >
                {creating ? "Creating…" : "Create tasks from this insight"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}