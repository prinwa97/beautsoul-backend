// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/sales-manager/retailers/_components/order-detail-modal.tsx
"use client";

import React from "react";
import ModalShell from "../modal-shell";
import { TH, TD } from "./ui";
import { dtShort, money } from "./utils";

type Props = {
  open: boolean;
  onClose: () => void;
  orderData: any;
  orderId: string;
  orderLoading: boolean;
  orderBodyRef: React.RefObject<HTMLDivElement | null>;
};

function InfoCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-3">
      <div className="text-[11px] font-semibold text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-black text-gray-900">{value}</div>
    </div>
  );
}

export default function OrderDetailModal({
  open,
  onClose,
  orderData,
  orderId,
  orderLoading,
  orderBodyRef,
}: Props) {
  const order = orderData?.order || null;
  const items = Array.isArray(orderData?.items) ? orderData.items : [];

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      zIndex={95}
      widthClass="max-w-5xl"
      titleTop={
        <div>
          <div className="text-xs font-semibold text-gray-500">Order Detail</div>
          <div className="text-lg font-black text-gray-900">
            {order?.orderNo || orderId || "—"}
          </div>
        </div>
      }
    >
      <div ref={orderBodyRef} className="p-4 overflow-auto max-h-[75vh]">
        {orderLoading ? <div className="text-sm text-gray-600">Loading order detail…</div> : null}

        {!orderLoading && orderData && !orderData?.ok ? (
          <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
            Error: {orderData?.error || "UNKNOWN"}
          </div>
        ) : null}

        {!orderLoading && orderData?.ok ? (
          <div className="space-y-4">
            {/* Top summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <InfoCard label="Order No" value={order?.orderNo || "—"} />
              <InfoCard label="Status" value={order?.status || "—"} />
              <InfoCard label="Date" value={order?.createdAt ? dtShort(order.createdAt) : "—"} />
              <InfoCard label="Total Amount" value={`₹${money(order?.totalAmount)}`} />
            </div>

            {/* Items */}
            <div className="rounded-2xl border bg-white p-3">
              <div className="text-sm font-black text-gray-900">Items</div>

              <div className="mt-3 overflow-x-auto border rounded-2xl bg-white">
                <table className="min-w-[800px] w-full text-[12px]">
                  <thead className="bg-gray-50 border-b">
                    <tr className="text-left">
                      <TH>Product</TH>
                      <TH className="text-right">Qty</TH>
                      <TH className="text-right">Rate</TH>
                      <TH className="text-right">Amount</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it: any, idx: number) => (
                      <tr key={it.id || idx} className="border-t">
                        <TD className="font-bold">{it.productName || "—"}</TD>
                        <TD className="text-right font-black">{Number(it.qty || 0)}</TD>
                        <TD className="text-right">₹{money(it.rate || 0)}</TD>
                        <TD className="text-right font-black">₹{money(it.amount || 0)}</TD>
                      </tr>
                    ))}

                    {!items.length ? (
                      <tr className="border-t">
                        <TD colSpan={4} className="text-center text-gray-600 py-6">
                          No items found.
                        </TD>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
}