"use client";

import React from "react";
import { TD, TH } from "./ui";

export default function TopDecisionsSection({
  rows,
  aiLoading,
  aiEnabled,
  onBriefClick,
  openCity,
  openProduct,
  openEvidence,
}: {
  rows: any[];
  aiLoading: boolean;
  aiEnabled: boolean;
  onBriefClick: (x: any) => void;
  openCity: (city: string) => void;
  openProduct: (name: string) => void;
  openEvidence: (title: string, payload: any) => void;
}) {
  return (
    <div className="mt-3 p-4 rounded-2xl border bg-white">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-semibold text-gray-500">Top Decisions</div>
          <div className="text-lg font-black text-gray-900">Where to focus today</div>
        </div>
        <button
          className="px-3 py-2 rounded-2xl border bg-white text-xs font-black hover:bg-gray-50"
          onClick={() => openEvidence("AI Executive Brief (Raw)", rows)}
        >
          View Proof
        </button>
      </div>

      <div className="mt-3 overflow-x-auto border rounded-2xl bg-white">
        <table className="min-w-[900px] w-full text-[12px]">
          <thead className="bg-gray-50 border-b">
            <tr className="text-left">
              <TH>#</TH>
              <TH>Type</TH>
              <TH>Decision</TH>
              <TH className="text-right">Count</TH>
              <TH className="text-right">Open</TH>
            </tr>
          </thead>
          <tbody>
            {rows.map((x, idx) => (
              <tr
                key={x.id}
                className="border-t hover:bg-gray-50 cursor-pointer"
                onClick={() => onBriefClick(x.raw)}
                title="Open related drawer if available"
              >
                <TD className="font-black">{idx + 1}</TD>
                <TD className="text-xs">{x.type}</TD>
                <TD className="font-bold">
                  {x.title}
                  {x.city ? (
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border bg-gray-50">City: {x.city}</span>
                  ) : null}
                  {x.productName ? (
                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border bg-gray-50">
                      Product: {x.productName}
                    </span>
                  ) : null}
                </TD>
                <TD className="text-right font-black">{typeof x.count === "number" ? x.count : "—"}</TD>
                <TD className="text-right">
                  {x.city ? (
                    <button
                      className="px-3 py-2 rounded-2xl border bg-white text-xs font-black hover:bg-gray-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCity(x.city);
                      }}
                    >
                      City
                    </button>
                  ) : x.productName ? (
                    <button
                      className="px-3 py-2 rounded-2xl border bg-white text-xs font-black hover:bg-gray-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        openProduct(x.productName);
                      }}
                    >
                      Product
                    </button>
                  ) : (
                    <button
                      className="px-3 py-2 rounded-2xl border bg-white text-xs font-black hover:bg-gray-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEvidence("Decision Evidence", x.raw);
                      }}
                    >
                      Proof
                    </button>
                  )}
                </TD>
              </tr>
            ))}

            {!rows.length ? (
              <tr className="border-t">
                <TD colSpan={5} className="text-center text-gray-600 py-6">
                  {aiLoading ? "Loading decisions…" : aiEnabled ? "No decisions." : "AI disabled."}
                </TD>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}