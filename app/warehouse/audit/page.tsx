"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

type AuditRow = {
  id: string;
  monthKey: string;
  auditDate: string;
  snapshotAt: string;
  status: string;
  totalSystemQty: number;
  totalPhysicalQty: number;
  totalVarianceQty: number;
  createdAt: string;
};

export default function WarehouseAuditHome() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function load() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/warehouse/audits", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed");
      setRows(data.rows || []);
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function ensureCurrent() {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/warehouse/audits/ensure", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Failed");
      window.location.href = `/warehouse/audit/${data.audit.id}`;
    } catch (e: any) {
      setMsg(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="p-3 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold">Warehouse Audit</h1>
            <p className="text-sm text-gray-600">25th monthly physical audit • snapshot + variance + approval</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={load}
              className="rounded-xl bg-white px-4 py-2 text-sm font-medium ring-1 ring-gray-200"
              disabled={loading}
            >
              Refresh
            </button>
            <button
              onClick={ensureCurrent}
              className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              disabled={loading}
            >
              Create / Open Current Month
            </button>
          </div>
        </div>

        {msg ? (
          <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">{msg}</div>
        ) : null}

        <div className="mt-4 rounded-2xl bg-white ring-1 ring-gray-200 overflow-hidden">
          <div className="border-b border-gray-100 p-3 text-sm text-gray-600">
            Recent Audits (last 24)
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-gray-600">
                <tr className="border-b border-gray-100">
                  <th className="py-2 px-3">Month</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">System</th>
                  <th className="py-2 px-3 text-right">Physical</th>
                  <th className="py-2 px-3 text-right">Variance</th>
                  <th className="py-2 px-3">Open</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-3 px-3 font-medium">{r.monthKey}</td>
                    <td className="py-3 px-3">{r.status}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{r.totalSystemQty}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{r.totalPhysicalQty}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{r.totalVarianceQty}</td>
                    <td className="py-3 px-3">
                      <Link className="underline" href={`/warehouse/audit/${r.id}`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
                {!rows.length ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-500">
                      No audits yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
