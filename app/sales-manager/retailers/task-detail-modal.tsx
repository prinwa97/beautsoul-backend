// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/sales-manager/retailers/task-detail-modal.tsx
"use client";

import { useEffect, useMemo, useState } from "react";

type Resp = {
  ok: boolean;
  error?: string;
  task?: any;
  retailers?: Array<{ id: string; name: string; city: string | null }>;
  script?: string[];
  recentRemarks?: Array<any>;
};

function money(n: any) {
  const v = Number(n || 0);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function TaskDetailModal({
  open,
  taskId,
  onClose,
  onOpenRetailer,
  onOpenCity,
  onOpenProduct,
}: {
  open: boolean;
  taskId: string;
  onClose: () => void;
  onOpenRetailer: (retailerId: string) => void;
  onOpenCity: (city: string) => void;
  onOpenProduct: (productName: string) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Resp | null>(null);

  const api = useMemo(() => {
    if (!taskId) return "";
    return `/api/sales-manager/retailers/tasks/${encodeURIComponent(taskId)}`;
  }, [taskId]);

  useEffect(() => {
    if (!open || !api) return;
    (async () => {
      setLoading(true);
      setData(null);
      try {
        const res = await fetch(api, { cache: "no-store" });
        const j = (await res.json().catch(() => null)) as Resp | null;
        setData(j || { ok: false, error: "FAILED" });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, api]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const t = data?.task;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-3">
        <div className="w-full max-w-4xl rounded-2xl bg-white border shadow-xl">
          <div className="p-4 border-b flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-gray-500">Task Detail</div>
              <div className="text-lg font-black text-gray-900">{t?.title || "—"}</div>
              <div className="mt-1 text-xs text-gray-600">
                Type: <b>{t?.type || "—"}</b> · Priority: <b>{t?.priority ?? "—"}</b> · Status: <b>{t?.status || "—"}</b>
              </div>
              <div className="mt-1 text-xs text-gray-600">
                Impact: <b>₹{money(t?.expectedImpactMin || 0)}–₹{money(t?.expectedImpactMax || 0)}</b>
                {t?.city ? (
                  <>
                    {" "}· City:{" "}
                    <button className="font-black underline" onClick={() => onOpenCity(t.city)}>
                      {t.city}
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            <button className="px-3 py-2 rounded-xl border bg-white text-sm font-black" onClick={onClose}>
              ✕
            </button>
          </div>

          <div className="p-4">
            {loading ? <div className="text-sm text-gray-600">Loading…</div> : null}
            {!loading && data && !data.ok ? (
              <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
                Error: {data.error || "UNKNOWN"}
              </div>
            ) : null}

            {!loading && data?.ok ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <div className="p-3 rounded-2xl border bg-white">
                  <div className="text-sm font-black text-gray-900">Targets</div>

                  {(data.retailers || []).length ? (
                    <div className="mt-2 space-y-2 max-h-[360px] overflow-auto pr-1">
                      {(data.retailers || []).map((r) => (
                        <div
                          key={r.id}
                          className="p-3 rounded-2xl border bg-white cursor-pointer hover:bg-gray-50"
                          onClick={() => onOpenRetailer(r.id)}
                        >
                          <div className="font-bold">{r.name}</div>
                          <div className="text-xs text-gray-600 mt-1">City: {r.city || "—"}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-2 text-sm text-gray-600">No target retailers.</div>
                  )}

                  {Array.isArray(t?.productNames) && t.productNames.length ? (
                    <div className="mt-4">
                      <div className="text-sm font-black text-gray-900">Suggested Products</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {t.productNames.map((p: string) => (
                          <button
                            key={p}
                            className="px-3 py-1 rounded-full border bg-white text-xs font-black hover:bg-gray-50"
                            onClick={() => onOpenProduct(p)}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="p-3 rounded-2xl border bg-white">
                  <div className="text-sm font-black text-gray-900">AI Pitch Script</div>
                  <div className="mt-2 space-y-2">
                    {(data.script || []).map((line, idx) => (
                      <div key={idx} className="p-3 rounded-2xl border bg-gray-50 text-sm text-gray-800">
                        {line}
                      </div>
                    ))}
                    {!(data.script || []).length ? <div className="text-sm text-gray-600">No script.</div> : null}
                  </div>

                  {t?.aiReason ? (
                    <div className="mt-4 p-3 rounded-2xl border bg-white">
                      <div className="text-sm font-black text-gray-900">Reason</div>
                      <div className="mt-1 text-sm text-gray-700">{t.aiReason}</div>
                    </div>
                  ) : null}

                  {(data.recentRemarks || []).length ? (
                    <div className="mt-4 p-3 rounded-2xl border bg-white">
                      <div className="text-sm font-black text-gray-900">Recent Remarks</div>
                      <div className="mt-2 space-y-2">
                        {(data.recentRemarks || []).map((r: any) => (
                          <div key={r.id} className="p-3 rounded-2xl border bg-gray-50 text-sm text-gray-800">
                            <div className="text-xs text-gray-600">{new Date(r.createdAt).toLocaleString("en-IN")}</div>
                            <div className="mt-1">{r.text || r.remarkText || "—"}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="mt-4 flex justify-end">
              <button className="px-4 py-2 rounded-2xl border bg-white text-sm font-black" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}