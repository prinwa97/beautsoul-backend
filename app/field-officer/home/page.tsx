"use client";

import React, { useEffect, useMemo, useState } from "react";

type SummaryResp = {
  ok: boolean;
  error?: string;
  month?: string;
  targetsEnabled?: boolean;
  target?: {
    targetAmount: number;
    achievedAmount: number;
    pendingTarget: number;
  };
  ordersTop10?: Array<{
    retailerId: string;
    name: string;
    city?: string | null;
    noOrderDays: number;
  }>;
  paymentsTop10?: Array<{
    retailerId: string;
    name: string;
    city?: string | null;
    pendingAmount: number;
    noPaymentDays: number;
  }>;
};

function n(x: any) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function fmtINR(amount: number) {
  try {
    return amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  } catch {
    return String(amount);
  }
}

function clamp(v: number, a: number, b: number) {
  return Math.min(Math.max(v, a), b);
}

function getErrMessage(x: unknown) {
  if (!x) return "";
  if (typeof x === "string") return x;
  if (typeof x === "object" && "error" in x) return String((x as any).error || "");
  if (typeof x === "object" && "message" in x) return String((x as any).message || "");
  return "";
}

export default function FieldOfficerHomePage() {
  const [data, setData] = useState<SummaryResp | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);

        const res = await fetch("/api/field-officer/home/summary", {
          cache: "no-store",
          credentials: "include",
        });

        // ✅ Proper typing: do NOT let TS infer `never`
        const json: SummaryResp | null = await res
          .json()
          .then((x) => (x as SummaryResp))
          .catch(() => null);

        if (!alive) return;

        if (!res.ok || !json?.ok) {
          const msg = getErrMessage(json) || `HTTP ${res.status}`;
          setData({ ok: false, error: msg });
          return;
        }

        setData(json);
      } catch (e: any) {
        if (!alive) return;
        setData({ ok: false, error: e?.message || "Network error" });
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const targetAmount = n(data?.target?.targetAmount);
  const achievedAmount = n(data?.target?.achievedAmount);
  const pendingTarget = n(data?.target?.pendingTarget);

  const progressPct = useMemo(() => {
    if (!targetAmount) return 0;
    return clamp((achievedAmount / targetAmount) * 100, 0, 100);
  }, [targetAmount, achievedAmount]);

  return (
    <div className="max-w-2xl mx-auto px-3 md:px-1 pb-10">
      

      {/* status */}
      <div className="mt-4">
        {loading ? (
          <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600">
            Loading summary…
          </div>
        ) : data?.ok ? null : (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="text-sm font-semibold text-red-800">Summary error</div>
            <div className="mt-1 text-sm text-red-700">
              {data?.error || "Unknown error"}
            </div>
          </div>
        )}
      </div>

      {/* Month + Target */}
      {data?.ok && (
        <div className="mt-4 grid gap-3">
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-gray-500">MONTH</div>
                <div className="text-lg font-bold text-gray-900">{data.month || "—"}</div>
              </div>

              <span
                className={[
                  "text-[11px] px-2 py-1 rounded-full border font-semibold",
                  data.targetsEnabled
                    ? "bg-green-50 text-green-700 border-green-200"
                    : "bg-yellow-50 text-yellow-800 border-yellow-200",
                ].join(" ")}
              >
                Targets: {data.targetsEnabled ? "ON" : "OFF"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <MiniStat label="Target" value={`₹${fmtINR(targetAmount)}`} />
              <MiniStat label="Achieved" value={`₹${fmtINR(achievedAmount)}`} />
              <MiniStat label="Pending" value={`₹${fmtINR(pendingTarget)}`} />
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>Progress</span>
                <span className="font-semibold text-gray-900">{progressPct.toFixed(0)}%</span>
              </div>
              <div className="mt-2 h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-gray-900" style={{ width: `${progressPct}%` }} />
              </div>

              {!targetAmount && (
                <div className="mt-2 text-xs text-gray-500">
                  Target amount is 0 (Targets OFF or not set).
                </div>
              )}
            </div>
          </div>

          {/* Orders inactivity */}
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900">No Orders (Top 10)</div>
                <div className="text-xs text-gray-500">Retailers with maximum no-order days</div>
              </div>
              <span className="text-[11px] px-2 py-1 rounded-full border bg-gray-50 text-gray-700">
                {data.ordersTop10?.length || 0} rows
              </span>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2">Retailer</th>
                    <th className="text-left px-3 py-2">City</th>
                    <th className="text-right px-3 py-2">No Order Days</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.ordersTop10 || []).length ? (
                    (data.ordersTop10 || []).map((r) => (
                      <tr key={r.retailerId} className="border-t">
                        <td className="px-3 py-2 font-semibold text-gray-900">{r.name}</td>
                        <td className="px-3 py-2 text-gray-700">{r.city || "—"}</td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900">
                          {r.noOrderDays >= 99999 ? "—" : r.noOrderDays}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-3 text-gray-500" colSpan={3}>
                        No data.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Tip: is list ko use karke follow-up calls / visit plan banao.
            </div>
          </div>

          {/* Payments inactivity */}
          <div className="rounded-2xl border bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-gray-900">Pending Payments (Top 10)</div>
                <div className="text-xs text-gray-500">Highest pending + oldest last payment</div>
              </div>
              <span className="text-[11px] px-2 py-1 rounded-full border bg-gray-50 text-gray-700">
                {data.paymentsTop10?.length || 0} rows
              </span>
            </div>

            <div className="mt-3 overflow-hidden rounded-xl border">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="text-left px-3 py-2">Retailer</th>
                    <th className="text-left px-3 py-2">City</th>
                    <th className="text-right px-3 py-2">Pending</th>
                    <th className="text-right px-3 py-2">No Pay Days</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.paymentsTop10 || []).length ? (
                    (data.paymentsTop10 || []).map((r) => (
                      <tr key={r.retailerId} className="border-t">
                        <td className="px-3 py-2 font-semibold text-gray-900">{r.name}</td>
                        <td className="px-3 py-2 text-gray-700">{r.city || "—"}</td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900">
                          ₹{fmtINR(n(r.pendingAmount))}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-gray-900">
                          {r.noPaymentDays >= 99999 ? "—" : r.noPaymentDays}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="px-3 py-3 text-gray-500" colSpan={4}>
                        No pending payments found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-2 text-xs text-gray-500">
              Only retailers with pendingAmount &gt; 0 are included.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-gray-50 px-3 py-2">
      <div className="text-[11px] font-semibold text-gray-500">{label}</div>
      <div className="mt-0.5 text-sm font-extrabold text-gray-900">{value}</div>
    </div>
  );
}