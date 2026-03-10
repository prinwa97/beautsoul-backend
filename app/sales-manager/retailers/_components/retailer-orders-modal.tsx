"use client";

import React from "react";
import ModalShell from "../modal-shell";
import { dtShort, money } from "./utils";
import { TD, TH } from "./ui";

export default function RetailerOrdersModal({
  open,
  onClose,
  ordersRetailer,
  ordersLoading,
  ordersData,
  ordersBodyRef,
  openOrderDetail,
}: {
  open: boolean;
  onClose: () => void;
  ordersRetailer: { id: string; name: string } | null;
  ordersLoading: boolean;
  ordersData: { ok: boolean; error?: string; orders?: any[] } | null;
  ordersBodyRef: React.RefObject<HTMLDivElement | null>;
  openOrderDetail: (oid: string) => void;
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      zIndex={90}
      widthClass="max-w-5xl"
      titleTop={
        <div>
          <div className="text-xs font-semibold text-gray-500">Orders</div>
          <div className="text-lg font-black text-gray-900">{ordersRetailer?.name || "—"}</div>
          <div className="text-xs text-gray-600 mt-1">Retailer ke sabhi orders.</div>
        </div>
      }
    >
      <div ref={ordersBodyRef} className="p-4 overflow-auto max-h-[75vh]">
        {ordersLoading ? <div className="text-sm text-gray-600">Loading orders…</div> : null}

        {!ordersLoading && ordersData && !ordersData.ok ? (
          <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            Error: {ordersData.error || "UNKNOWN"}
          </div>
        ) : null}

        {!ordersLoading && ordersData?.ok ? (
          <div className="overflow-x-auto border rounded-2xl bg-white">
            <table className="min-w-[900px] w-full text-[12px]">
              <thead className="bg-gray-50 border-b">
                <tr className="text-left">
                  <TH>Order No</TH>
                  <TH>Status</TH>
                  <TH>Date</TH>
                  <TH className="text-right">Items</TH>
                  <TH className="text-right">Total</TH>
                </tr>
              </thead>
              <tbody>
                {(ordersData.orders || []).map((o) => (
                  <tr
                    key={o.id}
                    className="border-t cursor-pointer hover:bg-gray-50"
                    onClick={() => openOrderDetail(o.id)}
                    title="Open order detail"
                  >
                    <TD className="font-bold">{o.orderNo || o.id}</TD>
                    <TD>{o.status || "—"}</TD>
                    <TD>{o.createdAt ? dtShort(o.createdAt) : "—"}</TD>
                    <TD className="text-right">{Number(o.itemsCount || 0)}</TD>
                    <TD className="text-right font-black">₹{money(o.totalAmount)}</TD>
                  </tr>
                ))}

                {!(ordersData.orders || []).length ? (
                  <tr className="border-t">
                    <TD colSpan={5} className="text-center text-gray-600 py-6">
                      No orders found.
                    </TD>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}