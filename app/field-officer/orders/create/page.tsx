import React, { Suspense } from "react";
import CreateOrderClient from "./create-order-client";

export default function Page() {
  return (
    <Suspense fallback={<div className="p-4">Loading…</div>}>
      <CreateOrderClient />
    </Suspense>
  );
}