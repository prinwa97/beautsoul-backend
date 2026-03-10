"use client";

import React from "react";
import { Section, TD, TH } from "./ui";
import { fmtDateTime, getRetailerId, money } from "./utils";

export default function MonthPivotSection({
  months,
  pivotRows,
  openRetailer,
  openRetailerMonthOrders,
}: {
  months: string[];
  pivotRows: any[];
  openRetailer: (retailerId: string) => void;
  openRetailerMonthOrders: (retailerId: string, retailerName: string, month: string) => void;
}) {
  return (
    <Section title="All Retailers Month-wise (Orders + Sales) + Health Score">
      <div className="text-xs text-gray-600 mb-2">
        Months: {(months || []).join(", ")} (showing last {months.length} months)
      </div>

      <div className="overflow-x-auto border rounded-2xl bg-white">
        <table className="min-w-[1200px] w-full text-[12px]">
          <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
            <tr className="text-left">
              <TH>Retailer</TH>
              <TH>Distributor</TH>
              <TH>City</TH>
              <TH className="text-right">Health</TH>
              <TH>Trend</TH>
              {months.map((m) => (
                <TH key={m} className="text-right">
                  {m}
                </TH>
              ))}
              <TH>Last Order</TH>
            </tr>
          </thead>

          <tbody>
            {pivotRows.map((r: any) => (
              <tr key={r.retailerId} className="border-t hover:bg-gray-50">
                <TD className="font-bold">
                  <button
                    type="button"
                    className="text-left font-bold hover:underline"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRetailer(getRetailerId(r));
                    }}
                    title="Open retailer drawer"
                  >
                    {r.retailerName}
                  </button>
                </TD>

                <TD>{r.distributorName}</TD>
                <TD>{r.city || "—"}</TD>
                <TD className="text-right">{Number(r.healthScore || 0)}</TD>
                <TD>{String(r.trend || "—")}</TD>

                {months.map((m) => {
                  const cell = r.byMonth?.[m];
                  const ord = Number(cell?.orders || 0);
                  const sal = Number(cell?.sales || 0);
                  const clickable = ord > 0 || sal > 0;

                  return (
                    <TD key={m} className="text-right">
                      {clickable ? (
                        <button
                          type="button"
                          className="w-full rounded-xl border border-gray-200 bg-white px-2 py-2 text-right hover:bg-gray-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            openRetailerMonthOrders(getRetailerId(r), r.retailerName, m);
                          }}
                          title={`Open ${m} orders`}
                        >
                          <div className="font-bold">{ord}</div>
                          <div className="text-[10px] text-gray-500">₹{money(sal)}</div>
                        </button>
                      ) : (
                        <div className="px-2 py-2">
                          <div className="font-bold">{ord}</div>
                          <div className="text-[10px] text-gray-400">₹{money(sal)}</div>
                        </div>
                      )}
                    </TD>
                  );
                })}

                <TD>{fmtDateTime(r.lastOrderAt)}</TD>
              </tr>
            ))}

            {!pivotRows.length ? (
              <tr className="border-t">
                <TD colSpan={5 + months.length + 1} className="text-center text-gray-600 py-6">
                  No retailers found.
                </TD>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Section>
  );
}