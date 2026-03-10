"use client";

import React from "react";
import { Section, Table, TD, TH } from "./ui";
import { money } from "./utils";

export default function SlowMoversByCitySection({
  rows,
  openCity,
  openProduct,
}: {
  rows: any[];
  openCity: (city: string) => void;
  openProduct: (name: string) => void;
}) {
  return (
    <Section title="Slow Movers by City (AI)">
      <Table wide>
        <thead>
          <tr className="text-left">
            <TH>City</TH>
            <TH>Product</TH>
            <TH className="text-right">Orders</TH>
            <TH className="text-right">Sales</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map((x: any, idx: number) => (
            <tr key={`${x.city}-${x.productName}-${idx}`} className="border-t">
              <TD
                className="font-bold cursor-pointer hover:underline"
                onClick={() => openCity(x.city)}
                title="Open city drawer"
              >
                {x.city}
              </TD>
              <TD
                className="font-bold cursor-pointer hover:underline"
                onClick={() => openProduct(x.productName)}
                title="Open product drawer"
              >
                {x.productName}
              </TD>
              <TD className="text-right">{Number(x.orders || 0)}</TD>
              <TD className="text-right">₹{money(x.sales)}</TD>
            </tr>
          ))}

          {!rows.length ? (
            <tr className="border-t">
              <TD colSpan={4} className="text-center text-gray-600 py-6">
                No slow mover data.
              </TD>
            </tr>
          ) : null}
        </tbody>
      </Table>
    </Section>
  );
}