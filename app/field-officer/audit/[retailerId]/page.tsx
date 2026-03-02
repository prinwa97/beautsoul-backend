"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type ItemRow = {
  rowId: string;
  productId: string;
  productName: string;
  batchNo?: string | null;
  expiryDate?: string | null;
  systemQty: number;
  physicalQty: number | null;
};

const asInt = (v: any) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : 0;
};

const fmtDay = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("en-IN") : "—";

export default function FOAuditRetailerPage() {
  const params = useParams<{ retailerId: string }>();
  const retailerId = String(params?.retailerId || "");
  const router = useRouter();

  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  async function loadPrepare() {
    const res = await fetch(`/api/field-officer/audit/${retailerId}/prepare`, {
      cache: "no-store",
      credentials: "include",
    });

    const data = await res.json();
    if (!data?.ok) throw new Error(data?.error || "Failed");

    setItems(
      (data.items || []).map((x: any) => ({
        rowId: String(x.rowId),
        productId: String(x.productId || ""),
        productName: String(x.productName),
        batchNo: x.batchNo ?? null,
        expiryDate: x.expiryDate ?? null,
        systemQty: asInt(x.systemQty),
        physicalQty: x.physicalQty == null ? null : asInt(x.physicalQty),
      }))
    );
  }

  useEffect(() => {
    (async () => {
      if (!retailerId) return;
      try {
        setLoading(true);
        await loadPrepare();
      } catch (e: any) {
        setToast(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [retailerId]);

  const totalSold = useMemo(() => {
    return items.reduce((s, r) => {
      const phys = r.physicalQty ?? 0;
      return s + Math.max(0, r.systemQty - phys);
    }, 0);
  }, [items]);

  async function submit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/field-officer/audit/${retailerId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ items }),
      });

      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "Submit failed");

      setToast("✅ Audit submitted");
      setTimeout(() => router.push("/field-officer/audit"), 500);
    } catch (e: any) {
      setToast(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-center text-2xl font-extrabold">Audit</div>

      {toast && (
        <div className="rounded-xl bg-black/5 px-3 py-2 text-sm font-semibold">
          {toast}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : (
        <>
          <div className="rounded-2xl border bg-white overflow-hidden">
            {/* Header (Var removed) */}
            <div className="flex justify-between px-3 py-2 border-b text-xs font-semibold">
              <span>Products ({items.length})</span>
              <span className="text-gray-500">Audit</span>
            </div>

            {items.map((r, idx) => {
              const physical = r.physicalQty ?? 0;
              const sold = Math.max(0, r.systemQty - physical);

              return (
                <div key={r.rowId} className="px-3 py-2 border-b">
                  {/* Compact Row: name + qty top */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">
                        {r.productName}
                      </div>

                      <div className="text-[10px] text-gray-500 mt-0.5">
                        Sys: <b>{r.systemQty}</b> • Batch: {r.batchNo || "—"} •
                        Exp: {fmtDay(r.expiryDate)}
                      </div>

                      {sold > 0 && (
                        <div className="text-[10px] text-green-700 font-bold mt-1">
                          Sold: {sold}
                        </div>
                      )}
                    </div>

                    {/* Small Qty box (top-right) */}
                    <input
                      inputMode="numeric"
                      value={r.physicalQty ?? ""}
                      placeholder="Qty"
                      onChange={(e) => {
                        const raw = e.target.value.trim();
                        const v = raw === "" ? null : asInt(raw);

                        setItems((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, physicalQty: v } : x
                          )
                        );
                      }}
                      className="w-16 rounded-lg border border-black/20 bg-gray-50 px-2 py-1 text-right text-sm font-bold outline-none"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="sticky bottom-0 bg-white border-t p-4">
            <button
              onClick={submit}
              disabled={saving}
              className="w-full rounded-2xl bg-black text-white py-4 font-extrabold"
            >
              {saving ? "Submitting…" : "Submit Audit"}
            </button>

            <div className="text-center text-[11px] text-gray-500 mt-2">
              Total Sold (auto): {totalSold}
            </div>
          </div>
        </>
      )}
    </div>
  );
}