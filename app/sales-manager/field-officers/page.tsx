"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PeriodFilter, { PeriodRange } from "./components/PeriodFilter";
import TargetCell from "./components/TargetCell";
import KpiModal, { MetricKey } from "./components/KpiModal";

type Row = {
  foId: string;
  foName: string;

  distributors: number;

  retailersTotal: number;
  retailersActive: number;

  // ✅ NEW
  newRetailers: number;

  orders: number;
  sales: number;

  aov: number;
  growthPct: number;

  audits: number;
  collection: number;

  convPct: number;

  thisMonthTarget: number;
  nextMonthTarget: number | null;
};

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function inr(v: number) {
  try {
    return v.toLocaleString("en-IN");
  } catch {
    return String(v);
  }
}

function CellButton(props: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={props.onClick} className="text-left font-extrabold hover:text-blue-700">
      {props.children}
    </button>
  );
}

export default function SalesManagerFieldOfficersPage() {
  const router = useRouter();

  const [period, setPeriod] = useState<PeriodRange | null>(null);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string>("");

  // ✅ modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalFo, setModalFo] = useState<{ foId: string; foName: string } | null>(null);
  const [modalMetric, setModalMetric] = useState<MetricKey>("ORDERS");

  function openMetric(r: Row, metric: MetricKey) {
    setModalFo({ foId: r.foId, foName: r.foName });
    setModalMetric(metric);
    setModalOpen(true);
  }

  async function load(r: PeriodRange) {
    setLoading(true);
    setError("");

    try {
      const qs = new URLSearchParams({
        period: r.key,
        from: r.from,
        to: r.to,
      });

      const res = await fetch(`/api/sales-manager/field-officers/performance?${qs.toString()}`, {
        cache: "no-store",
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setRows([]);
        setError(data?.error || `API error (${res.status})`);
        return;
      }

      const list = Array.isArray(data?.rows) ? data.rows : [];
      setRows(
        list.map((x: any) => ({
          foId: String(x.foId || ""),
          foName: String(x.foName || ""),

          distributors: n(x.distributors),

          retailersTotal: n(x.retailersTotal),
          retailersActive: n(x.retailersActive),

          // ✅ NEW (backend not sending yet? then it becomes 0 safely)
          newRetailers: n(x.newRetailers),

          orders: n(x.orders),
          sales: n(x.sales),

          aov: n(x.aov),
          growthPct: n(x.growthPct),

          audits: n(x.audits),
          collection: n(x.collection),

          convPct: n(x.convPct),

          thisMonthTarget: n(x.thisMonthTarget),
          nextMonthTarget: x.nextMonthTarget == null ? null : n(x.nextMonthTarget),
        }))
      );
    } catch (e: any) {
      setRows([]);
      setError(e?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (period) load(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period?.key, period?.from, period?.to]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 py-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xl font-extrabold">Field Officers</div>
            <div className="text-xs font-semibold text-black/60">Click any KPI to open details</div>
          </div>

          <div className="w-full md:w-auto">
            <PeriodFilter onChange={setPeriod} />
          </div>
        </div>

        {loading && (
          <div className="mt-3 rounded-xl border border-black/10 bg-white p-3 text-sm font-bold text-black/60">
            Loading...
          </div>
        )}

        {!!error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        <div className="mt-4 w-full overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="overflow-x-auto">
            {/* ✅ width updated a bit because new column */}
            <table className="min-w-[1250px] w-full text-left">
              <thead className="bg-gray-50">
                <tr className="text-[12px] font-extrabold text-black/70">
                  <th className="px-3 py-3">Field Officer</th>
                  <th className="px-3 py-3">Dist</th>
                  <th className="px-3 py-3">Retailers</th>

                  {/* ✅ NEW */}
                  <th className="px-3 py-3">New Retailers</th>

                  <th className="px-3 py-3">Orders</th>
                  <th className="px-3 py-3">Sales</th>
                  <th className="px-3 py-3">AOV</th>
                  <th className="px-3 py-3">Growth%</th>
                  <th className="px-3 py-3">Audit</th>
                  <th className="px-3 py-3">Collection</th>
                  <th className="px-3 py-3">Conv%</th>
                  <th className="px-3 py-3">Next Month Target</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {rows.length === 0 && !loading ? (
                  <tr>
                    {/* ✅ colSpan updated: 12 columns now */}
                    <td colSpan={12} className="px-3 py-8 text-center text-sm font-bold text-black/40">
                      No data
                    </td>
                  </tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.foId} className="hover:bg-gray-50">
                      {/* ✅ FO NAME CLICKABLE */}
                      <td className="px-3 py-3">
  <button
    type="button"
    onClick={() => router.push(`/sales-manager/field-officers/${r.foId}/retailers`)}
    className="text-sm font-extrabold hover:text-blue-700 cursor-pointer"
    title="Assign / Unassign Retailers"
  >
    {r.foName || "-"}
  </button>
</td>

                      <td className="px-3 py-3 text-sm">
                        <CellButton onClick={() => openMetric(r, "DISTRIBUTORS")}>{r.distributors}</CellButton>
                      </td>

                      <td className="px-3 py-3 text-sm">
                        <CellButton onClick={() => openMetric(r, "RETAILERS")}>
                          {r.retailersActive}/{r.retailersTotal}
                        </CellButton>
                      </td>

                      {/* ✅ NEW RETAILERS COLUMN */}
                      <td className="px-3 py-3 text-sm">
                        {/* For now open Retailers metric; later we can add a dedicated "NEW_RETAILERS" metric */}
                        <CellButton onClick={() => openMetric(r, "RETAILERS")}>{r.newRetailers}</CellButton>
                      </td>

                      <td className="px-3 py-3 text-sm">
                        <CellButton onClick={() => openMetric(r, "ORDERS")}>{r.orders}</CellButton>
                      </td>

                      <td className="px-3 py-3 text-sm">
                        <CellButton onClick={() => openMetric(r, "SALES")}>₹{inr(r.sales)}</CellButton>
                      </td>

                      <td className="px-3 py-3 text-sm">
                        <CellButton onClick={() => openMetric(r, "AOV")}>₹{inr(r.aov)}</CellButton>
                      </td>

                      <td className="px-3 py-3 text-sm">
                        <CellButton onClick={() => openMetric(r, "GROWTH")}>
                          {r.growthPct > 0 ? `+${r.growthPct}%` : `${r.growthPct}%`}
                        </CellButton>
                      </td>

                      <td className="px-3 py-3 text-sm">
                        <CellButton onClick={() => openMetric(r, "AUDIT")}>{r.audits}</CellButton>
                      </td>

                      <td className="px-3 py-3 text-sm">
                        <CellButton onClick={() => openMetric(r, "COLLECTION")}>₹{inr(r.collection)}</CellButton>
                      </td>

                      <td className="px-3 py-3 text-sm">
                        <CellButton onClick={() => openMetric(r, "CONV")}>{r.convPct}%</CellButton>
                      </td>

                      <td className="px-3 py-3">
                        <TargetCell foId={r.foId} initialValue={r.nextMonthTarget} thisMonthTarget={r.thisMonthTarget} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="border-t border-black/5 px-3 py-2 text-[11px] text-black/50">
            Note: Next Month Target save hone ke baad lock ho jayega. (Rule: Next target ≥ This month target)
          </div>
        </div>
      </div>

      <KpiModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        foId={modalFo?.foId || ""}
        foName={modalFo?.foName || ""}
        metric={modalMetric}
        period={period}
      />
    </div>
  );
}