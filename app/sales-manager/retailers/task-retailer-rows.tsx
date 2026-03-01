"use client";

import React from "react";

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

type Row = {
  retailerId: string;
  retailerName?: string;
  distributorName?: string;
  city?: string;
  lastOrderAt?: any;
  lastOrderAmount?: any;
  personalizedReason?: string;
};

export default function TaskRetailerRows({
  targets,
  onOpenRetailer,
}: {
  targets: Row[];
  onOpenRetailer: (retailerId: string) => void;
}) {
  const rows = Array.isArray(targets) ? targets.filter((r) => String(r?.retailerId || "").trim()) : [];

  return (
    <div className="overflow-x-auto border rounded-2xl bg-white">
      <table className="min-w-[900px] w-full text-[12px]">
        <thead className="bg-gray-50 border-b">
          <tr className="text-left">
            <th className="px-4 py-2 font-black text-[12px]">Retailer</th>
            <th className="px-4 py-2 font-black text-[12px]">Distributor</th>
            <th className="px-4 py-2 font-black text-[12px]">City</th>
            <th className="px-4 py-2 font-black text-[12px] text-right">Open</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            const name = (r.retailerName || "").trim();
            const id = String(r.retailerId || "").trim();

            return (
              <tr
                key={`${id}-${idx}`}
                className={cn("border-t hover:bg-gray-50 cursor-pointer")}
                onClick={() => onOpenRetailer(id)}
                title="Open retailer popup"
              >
                <td className="px-4 py-3 align-top">
                  <div className="font-black text-gray-900">{name || `${id.slice(0, 12)}…`}</div>
                  <div className="text-[11px] text-gray-500">ID: {id}</div>
                  {r.personalizedReason ? (
                    <div className="mt-1 text-[11px] text-gray-700 line-clamp-2">{r.personalizedReason}</div>
                  ) : null}
                </td>

                <td className="px-4 py-3 align-top">{r.distributorName || "—"}</td>
                <td className="px-4 py-3 align-top">{r.city || "—"}</td>

                <td className="px-4 py-3 align-top text-right">
                  <button
                    className="px-3 py-2 rounded-2xl border bg-white text-xs font-black hover:bg-gray-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenRetailer(id);
                    }}
                  >
                    Open
                  </button>
                </td>
              </tr>
            );
          })}

          {!rows.length ? (
            <tr className="border-t">
              <td colSpan={4} className="px-4 py-6 text-center text-gray-600">
                No retailers.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}