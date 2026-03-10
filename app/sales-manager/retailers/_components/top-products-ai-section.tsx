"use client";

import React from "react";
import { Section, Table, TD, TH } from "./ui";
import { money } from "./utils";

export default function TopProductsAiSection({
  rows,
  openProduct,
}: {
  rows: any[];
  openProduct: (name: string) => void;
}) {
  return (
    <Section title="Top Products (AI)">
      <Table wide>
        <thead>
          <tr className="text-left">
            <TH>#</TH>
            <TH>Product</TH>
            <TH className="text-right">Orders</TH>
            <TH className="text-right">Qty</TH>
            <TH className="text-right">Sales</TH>
            <TH className="text-right">Growth%</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((p: any, idx: number) => (
            <tr
              key={p.productName || idx}
              className="border-t hover:bg-gray-50 cursor-pointer"
              onClick={() => openProduct(p.productName)}
              title="Open product drawer"
            >
              <TD>{idx + 1}</TD>
              <TD className="font-bold underline underline-offset-2">{p.productName}</TD>
              <TD className="text-right">{Number(p.orders || 0)}</TD>
              <TD className="text-right">{Number(p.qty || 0)}</TD>
              <TD className="text-right">₹{money(p.sales)}</TD>
              <TD className="text-right">{Number(p.growthPct || 0).toFixed(1)}%</TD>
            </tr>
          ))}

          {!rows.length ? (
            <tr className="border-t">
              <TD colSpan={6} className="text-center text-gray-600 py-6">
                No products data.
              </TD>
            </tr>
          ) : null}
        </tbody>
      </Table>
    </Section>
  );
}