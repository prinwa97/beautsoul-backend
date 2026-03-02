// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/field-officer/home/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  if (typeof x === "object" && x && "error" in x) return String((x as any).error || "");
  if (typeof x === "object" && x && "message" in x) return String((x as any).message || "");
  return "";
}

function retailerHref(retailerId: string) {
  return `/field-officer/orders/history?retailerId=${encodeURIComponent(retailerId)}`;
}

function rowButtonProps(onActivate: () => void) {
  return {
    role: "button" as const,
    tabIndex: 0,
    onClick: onActivate,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onActivate();
      }
    },
  };
}

export default function FieldOfficerHomePage() {
  const router = useRouter();

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

        const json: SummaryResp | null = await res
          .json()
          .then((x) => x as SummaryResp)
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

  const goRetailer = (retailerId: string) => {
    router.push(retailerHref(retailerId));
  };

  return (
    <div className="max-w-2xl mx-auto px-3 md:px-1 pb-10">
      {/* status */}
      <div className="mt-4">
        {loading ? (
          <div className="rounded-2xl border bg-white p-4 text-sm text-gray-600">Loading summary…</div>
        ) : data?.ok ? null : (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="text-sm font-semibold text-red-800">Summary error</div>
            <div className="mt-1 text-sm text-red-700">{data?.error || "Unknown error"}</div>
          </div>
        )}
      </div>

      {data?.ok && (
        <div className="mt-4 grid gap-3">
          {/* Month + Target */}
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
                <div className="mt-2 text-xs text-gray-500">Target amount is 0 (Targets OFF or not set).</div>
              )}
            </div>
          </div>

          {/* Orders inactivity — FULL ROW LIST (no table/cards) */}
          <SectionFullRows
            title="No Orders (Top 10)"
            subtitle="Retailers with maximum no-order days"
            count={data.ordersTop10?.length || 0}
            emptyText="No data."
            rows={(data.ordersTop10 || []).map((r) => ({
              id: r.retailerId,
              title: r.name,
              subtitle: r.city || "—",
              rightTop: r.noOrderDays >= 99999 ? "—" : String(r.noOrderDays),
              rightBottom: "No Order Days",
              onClick: () => goRetailer(r.retailerId),
            }))}
            tip="Tip: is list ko use karke follow-up calls / visit plan banao."
          />

          {/* Payments inactivity — FULL ROW LIST (no table/cards) */}
          <SectionFullRows
            title="Pending Payments (Top 10)"
            subtitle="Highest pending + oldest last payment"
            count={data.paymentsTop10?.length || 0}
            emptyText="No pending payments found."
            rows={(data.paymentsTop10 || []).map((r) => ({
              id: r.retailerId,
              title: r.name,
              subtitle: r.city || "—",
              rightTop: `₹${fmtINR(n(r.pendingAmount))}`,
              rightBottom: r.noPaymentDays >= 99999 ? "No Pay Days: —" : `No Pay Days: ${r.noPaymentDays}`,
              onClick: () => goRetailer(r.retailerId),
            }))}
            tip="Only retailers with pendingAmount > 0 are included."
          />
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

function SectionFullRows({
  title,
  subtitle,
  count,
  rows,
  emptyText,
  tip,
}: {
  title: string;
  subtitle: string;
  count: number;
  rows: Array<{
    id: string;
    title: string;
    subtitle: string;
    rightTop: string;
    rightBottom: string;
    onClick: () => void;
  }>;
  emptyText: string;
  tip?: string;
}) {
  return (
    <div className="rounded-2xl border bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-gray-900">{title}</div>
          <div className="text-xs text-gray-500">{subtitle}</div>
        </div>
        <span className="text-[11px] px-2 py-1 rounded-full border bg-gray-50 text-gray-700">{count} rows</span>
      </div>

      <div className="mt-3 overflow-hidden rounded-xl border">
        {rows.length ? (
          <div className="divide-y">
            {rows.map((r) => (
              <div
                key={r.id}
                className="px-3 py-3 hover:bg-gray-50 cursor-pointer"
                {...rowButtonProps(r.onClick)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 truncate">{r.title}</div>
                    <div className="text-xs text-gray-600 truncate">{r.subtitle}</div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-extrabold text-gray-900">{r.rightTop}</div>
                    <div className="text-[11px] font-semibold text-gray-500">{r.rightBottom}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-3 py-3 text-sm text-gray-500">{emptyText}</div>
        )}
      </div>

      {tip ? <div className="mt-2 text-xs text-gray-500">{tip}</div> : null}
    </div>
  );
}