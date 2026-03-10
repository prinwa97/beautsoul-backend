"use client";

import React from "react";
import { Section, Table, TD, TH } from "./ui";
import { getRetailerId, money } from "./utils";

export default function TopRetailersAiSection({
  rows,
  openRetailerOrders,
}: {
  rows: any[];
  openRetailerOrders: (retailerId: string, retailerName: string) => void;
}) {
  return (
    <Section title="Top Retailers (AI)">
      <Table wide>
        <thead>
          <tr className="text-left">
            <TH>#</TH>
            <TH>Retailer</TH>
            <TH>City</TH>
            <TH className="text-right">Orders</TH>
            <TH className="text-right">Sales</TH>
            <TH className="text-right">Growth%</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((r: any, idx: number) => {
            const rid = getRetailerId(r);
            return (
              <tr
                key={rid || idx}
                className="border-t cursor-pointer hover:bg-gray-50"
                onClick={() => {
                  window.location.href = `/sales-manager/retailers/${rid}`;
                }}
                title="Open retailer drawer"
              >
                <TD>{idx + 1}</TD>
                <TD className="font-bold">{r.retailerName}</TD>
                <TD>{r.city || "—"}</TD>

                <TD className="text-right">
                  <button
                    className="px-2 py-1 rounded-xl border bg-white text-xs font-black hover:bg-gray-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      openRetailerOrders(rid, r.retailerName);
                    }}
                    title="Open all orders of this retailer"
                  >
                    {Number(r.orders || 0)}
                  </button>
                </TD>

                <TD className="text-right">₹{money(r.sales)}</TD>
                <TD className="text-right">{Number(r.growthPct || 0).toFixed(1)}%</TD>
              </tr>
            );
          })}

          {!rows.length ? (
            <tr className="border-t">
              <TD colSpan={6} className="text-center text-gray-600 py-6">
                No leaderboard data.
              </TD>
            </tr>
          ) : null}
        </tbody>
      </Table>
    </Section>
  );
}