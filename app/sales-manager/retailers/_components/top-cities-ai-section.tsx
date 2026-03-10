"use client";

import React from "react";
import { Section, Table, TD, TH } from "./ui";
import { money } from "./utils";

export default function TopCitiesAiSection({
  rows,
  openCity,
}: {
  rows: any[];
  openCity: (city: string) => void;
}) {
  return (
    <Section title="Top Cities (AI)">
      <Table wide>
        <thead>
          <tr className="text-left">
            <TH>#</TH>
            <TH>City</TH>
            <TH className="text-right">Orders</TH>
            <TH className="text-right">Sales</TH>
            <TH className="text-right">Growth%</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((c: any, idx: number) => (
            <tr
              key={c.city || idx}
              className="border-t cursor-pointer hover:bg-gray-50"
              onClick={() => openCity(c.city)}
              title="Open city drawer"
            >
              <TD>{idx + 1}</TD>
              <TD className="font-bold">{c.city}</TD>
              <TD className="text-right">{Number(c.orders || 0)}</TD>
              <TD className="text-right">₹{money(c.sales)}</TD>
              <TD className="text-right">{Number(c.growthPct || 0).toFixed(1)}%</TD>
            </tr>
          ))}

          {!rows.length ? (
            <tr className="border-t">
              <TD colSpan={5} className="text-center text-gray-600 py-6">
                No cities data.
              </TD>
            </tr>
          ) : null}
        </tbody>
      </Table>
    </Section>
  );
}