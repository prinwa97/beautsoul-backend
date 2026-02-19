"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ItemRow = {
  rowId: string;
  productId: string; // ✅ MUST (prepare api returns it; if missing, empty string)
  productName: string;
  batchNo?: string | null;
  expiryDate?: string | null;
  systemQty: number;
  physicalQty: number | null; // ✅ blank allowed in UI
};

function asInt(v: any) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : 0;
}

function fmtDay(d: string | null | undefined) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return String(d);
  }
}

function Icon({ name }: { name: "back" | "refresh" }) {
  const c = "h-5 w-5";
  if (name === "refresh")
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none">
        <path d="M20 12a8 8 0 10-2.34 5.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M20 12v-6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  return (
    <svg className={c} viewBox="0 0 24 24" fill="none">
      <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function FOAuditRetailerPage() {
  const params = useParams<{ retailerId: string }>();
  const retailerId = String(params?.retailerId || "");
  const router = useRouter();

  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  async function loadPrepare() {
    const res = await fetch(`/api/field-officer/audit/${encodeURIComponent(retailerId)}/prepare`, {
      cache: "no-store",
      credentials: "include",
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

    setItems(
      (data.items || []).map((x: any) => ({
        rowId: String(x.rowId || `${x.productName}:${x.batchNo}:${x.expiryDate}`),
        productId: String(x.productId || ""),
        productName: String(x.productName || "—"),
        batchNo: x.batchNo ?? null,
        expiryDate: x.expiryDate ? String(x.expiryDate) : null,
        systemQty: asInt(x.systemQty),
        physicalQty: x.physicalQty == null ? null : asInt(x.physicalQty),
      }))
    );
  }

  async function reloadAll() {
    setLoading(true);
    setToast("");
    try {
      await loadPrepare();
    } catch (e: any) {
      setToast(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!retailerId) return;
      try {
        setLoading(true);
        setToast("");
        await loadPrepare();
      } catch (e: any) {
        if (!alive) return;
        setToast(e?.message || "Failed");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retailerId]);

  const totalVariance = useMemo(() => {
    return items.reduce((s, r) => {
      const phys = r.physicalQty == null ? 0 : asInt(r.physicalQty);
      return s + (phys - asInt(r.systemQty));
    }, 0);
  }, [items]);

  async function submit() {
    setSaving(true);
    setToast("");
    try {
      const res = await fetch(`/api/field-officer/audit/${encodeURIComponent(retailerId)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || `HTTP ${res.status}`);

      setToast("✅ Audit submitted");
      setTimeout(() => router.push("/field-officer/audit"), 400);
    } catch (e: any) {
      setToast(e?.message || "Submit failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-0 space-y-3">
      {/* Header */}
      <div className="flex items-end justify-center relative">
        <button
          type="button"
          onClick={() => router.back()}
          className="absolute left-0 top-1/2 -translate-y-1/2 rounded-xl bg-black/5 px-3 py-2 text-gray-800 shadow-sm"
          title="Back"
        >
          <Icon name="back" />
        </button>

        <div>
          <div className="text-2xl font-extrabold">Audit</div>
        </div>

        <button
          type="button"
          onClick={reloadAll}
          disabled={loading}
          className="absolute right-0 top-1/2 -translate-y-1/2 rounded-xl border border-black/10 bg-white px-3 py-2 text-gray-800 shadow-sm disabled:opacity-60"
          title="Refresh"
        >
          <Icon name="refresh" />
        </button>
      </div>

      {toast ? <div className="rounded-2xl bg-black/5 px-4 py-3 text-sm font-semibold text-gray-800">{toast}</div> : null}

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : (
        <>
          <div className="rounded-2xl border border-black/10 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-black/10 px-3 py-2">
              <div className="text-xs font-semibold text-gray-700">Products / Batches ({items.length})</div>
              <div className="text-xs font-semibold text-gray-700">
                Total variance: <span className="font-extrabold">{totalVariance}</span>
              </div>
            </div>

            <div className="divide-y divide-black/10">
              {items.map((r, idx) => {
                const physical = r.physicalQty == null ? 0 : asInt(r.physicalQty);
                const variance = physical - asInt(r.systemQty);
                const varColor = variance > 0 ? "text-green-700" : variance < 0 ? "text-red-700" : "text-gray-700";

                return (
                  <div key={r.rowId} className="px-3 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-gray-900">{r.productName}</div>

                        <div className="mt-1 text-[11px] text-gray-500">
                          System Qty: <span className="font-semibold text-gray-700">{r.systemQty}</span>
                        </div>

                        <div className="mt-1 text-[11px] text-gray-500">
                          Batch: <span className="font-semibold text-gray-700">{r.batchNo || "—"}</span>
                          {"  "}•{"  "}
                          Exp: <span className="font-semibold text-gray-700">{fmtDay(r.expiryDate)}</span>
                        </div>

                        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-[11px] font-semibold">
                          <span className={varColor}>Var: {variance}</span>
                        </div>
                      </div>

                      <div className="w-32 shrink-0">
                        <div className="text-[11px] font-semibold text-gray-500 mb-1 text-right">Physical Qty</div>

                        <input
                          inputMode="numeric"
                          value={r.physicalQty == null ? "" : String(r.physicalQty)} // ✅ blank instead of 0
                          placeholder="—"
                          onChange={(e) => {
                            const raw = e.target.value;
                            const v = raw.trim() === "" ? null : asInt(raw);
                            setItems((prev) => {
                              const copy = [...prev];
                              copy[idx] = { ...copy[idx], physicalQty: v };
                              return copy;
                            });
                          }}
                          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-right text-sm font-extrabold outline-none"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {!items.length ? <div className="px-3 py-6 text-sm text-gray-500">No products found for audit.</div> : null}
            </div>
          </div>

          <div
            className="sticky bottom-0 mt-4 border-t border-black/10 bg-white p-4"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)" }}
          >
            <button
              type="button"
              onClick={submit}
              disabled={saving || !items.length}
              className={[
                "w-full rounded-2xl px-4 py-4 text-base font-extrabold text-white shadow-[0_10px_25px_rgba(0,0,0,0.18)] active:scale-[0.99]",
                saving || !items.length ? "bg-gray-400" : "bg-gray-900",
              ].join(" ")}
            >
              {saving ? "Submitting…" : "Submit Audit"}
            </button>

            <div className="mt-2 text-center text-[11px] text-gray-500">Button stays above bottom tabs</div>
          </div>
        </>
      )}
    </div>
  );
}
