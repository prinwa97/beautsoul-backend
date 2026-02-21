import React, { Suspense } from "react";
import OrdersClient from "./orders-client";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4">Loading…</div>}>
      <OrdersClient />
    </Suspense>
  );
}