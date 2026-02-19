"use client";

import React, { useState } from "react";
import DistributorOrderClient from "./distributor-order-client";
import PaymentDetailEnter from "./payment-detail-enter";

type Tab = "CREATE_ORDER" | "ENTER_PAYMENT";

export default function DistributorOrdersPage() {
  const [tab, setTab] = useState<Tab>("CREATE_ORDER");
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastOrderNo, setLastOrderNo] = useState<string>("");

  return (
    <div className="min-h-screen bg-[#fff7f6]">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="rounded-2xl bg-white border border-pink-100 shadow-sm p-3 md:p-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("CREATE_ORDER")}
              className={`rounded-xl px-4 py-2 text-sm border ${
                tab === "CREATE_ORDER"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-pink-200 hover:bg-[#fff0f0]"
              }`}
            >
              Create Distributor Order
            </button>

            <button
              type="button"
              onClick={() => setTab("ENTER_PAYMENT")}
              className={`rounded-xl px-4 py-2 text-sm border ${
                tab === "ENTER_PAYMENT"
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-pink-200 hover:bg-[#fff0f0]"
              }`}
            >
              Enter Payment Detail
            </button>
          </div>
        </div>

        <div className="mt-4">
          {tab === "CREATE_ORDER" ? (
            <DistributorOrderClient
              onCreated={(orderNo: string) => {
                setLastOrderNo(orderNo || "");
                setRefreshKey((k) => k + 1);
                setTab("ENTER_PAYMENT"); // ✅ auto switch
              }}
            />
          ) : (
            <PaymentDetailEnter refreshKey={refreshKey} autoOpenOrderNo={lastOrderNo} />
          )}
        </div>
      </div>
    </div>
  );
}