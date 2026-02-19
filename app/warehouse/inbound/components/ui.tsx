"use client";

import React from "react";

/** ===================== Small Utils ===================== */

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function fmtDate(iso?: string | null) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return String(iso);
  }
}

export function fmtDateOnly(iso?: string | null) {
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN");
  } catch {
    return String(iso);
  }
}

export function inr(n: any) {
  const x = Number(n || 0);
  return x.toLocaleString("en-IN");
}

export function calcLineAmount(qty: number, rate?: number | null) {
  const r = Number(rate || 0);
  return Math.round(Number(qty || 0) * r * 100) / 100;
}

/** ===================== Pills ===================== */

export function StatusPill({ value }: { value: string }) {
  const v = String(value || "").toUpperCase();
  const cls =
    v === "CREATED"
      ? "bg-slate-100 text-slate-700 ring-slate-200"
      : v === "CONFIRMED"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : v === "PAYMENT_VERIFIED"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : v === "PACKED"
      ? "bg-violet-50 text-violet-700 ring-violet-200"
      : v === "DISPATCHED"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : v === "IN_TRANSIT"
      ? "bg-orange-50 text-orange-800 ring-orange-200"
      : v === "DELIVERED"
      ? "bg-green-50 text-green-700 ring-green-200"
      : v === "CANCELLED"
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : "bg-slate-100 text-slate-700 ring-slate-200";

  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1", cls)}>{v}</span>;
}

export function PaymentPill({ status, verified }: { status: "UNPAID" | "PAID"; verified: boolean }) {
  if (status === "UNPAID") {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200">
        UNPAID
      </span>
    );
  }
  return verified ? (
    <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      PAID • VERIFIED
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 ring-1 ring-amber-200">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      PAID • NOT VERIFIED
    </span>
  );
}

/** ===================== Journey ===================== */

export function JourneyStepperDots(props: {
  paymentStatus: "UNPAID" | "PAID";
  paymentVerified: boolean;
  status: string;
}) {
  const st = String(props.status || "").toUpperCase();
  const paidDone = props.paymentStatus === "PAID";
  const verifiedDone = props.paymentVerified;
  const packedDone = st === "PACKED" || st === "DISPATCHED" || st === "IN_TRANSIT" || st === "DELIVERED";
  const dispatchDone = st === "DISPATCHED" || st === "IN_TRANSIT" || st === "DELIVERED";

  const steps = [
    { label: "Paid", done: paidDone },
    { label: "Verified", done: verifiedDone },
    { label: "Packed", done: packedDone },
    { label: "Dispatch", done: dispatchDone },
  ];

  return (
    <div className="mt-2 flex items-center gap-2">
      {steps.map((s, i) => (
        <React.Fragment key={s.label}>
          <div className="flex items-center gap-2">
            <span className={cx("h-2.5 w-2.5 rounded-full ring-2 ring-white", s.done ? "bg-emerald-500" : "bg-slate-200")} title={s.label} />
            <span className={s.done ? "text-[11px] font-semibold text-slate-700" : "text-[11px] text-slate-400"}>{s.label}</span>
          </div>
          {i !== steps.length - 1 ? <span className="h-px w-6 bg-slate-200" /> : null}
        </React.Fragment>
      ))}
    </div>
  );
}

export function JourneyStepperChips(props: {
  paymentStatus: "UNPAID" | "PAID";
  paymentVerified: boolean;
  status: string;
}) {
  const st = String(props.status || "").toUpperCase();
  const paidDone = props.paymentStatus === "PAID";
  const verifiedDone = props.paymentVerified;
  const packedDone = st === "PACKED" || st === "DISPATCHED" || st === "IN_TRANSIT" || st === "DELIVERED";
  const dispatchDone = st === "DISPATCHED" || st === "IN_TRANSIT" || st === "DELIVERED";

  const steps = [
    { label: "Paid", done: paidDone },
    { label: "Verified", done: verifiedDone },
    { label: "Packed", done: packedDone },
    { label: "Dispatch", done: dispatchDone },
  ];

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      {steps.map((s) => (
        <span
          key={s.label}
          className={cx(
            "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1",
            s.done ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-50 text-slate-500 ring-slate-200"
          )}
        >
          {s.label}
        </span>
      ))}
    </div>
  );
}
