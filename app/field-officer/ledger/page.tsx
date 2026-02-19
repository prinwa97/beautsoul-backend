"use client";
import React from "react";
import Link from "next/link";
import { FOHeader } from "../components/FOHeader";

export default function FOLedgerPage() {
  return (
    <div style={{ padding: 12, minHeight: "100vh" }}>
      <div style={{ display: "flex", gap: 10 }}>
        <Link href="/field-officer/collection" style={{ fontWeight: 900 }}>Collection</Link>
        <Link href="/field-officer/orders" style={{ fontWeight: 900 }}>Orders</Link>
        <Link href="/field-officer/ledger" style={{ fontWeight: 900 }}>Ledger</Link>
        <Link href="/field-officer/audit" style={{ fontWeight: 900 }}>Audit</Link>
      </div>

      <FOHeader title="Ledger" subtitle="Retailer khata (bills + payments)" />

      <div style={{ marginTop: 12, background: "white", border: "1px solid #eee", borderRadius: 18, padding: 14, fontWeight: 900 }}>
        Ledger detail page already aapke paas hai: /field-officer/ledger?retailerId=...
      </div>
    </div>
  );
}
