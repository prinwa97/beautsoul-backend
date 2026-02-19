import React, { Suspense } from "react";
import HistoryClient from "./history-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="p-4 pb-24">
          <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm font-bold text-black/60">
            Loading…
          </div>
        </div>
      }
    >
      <HistoryClient />
    </Suspense>
  );
}