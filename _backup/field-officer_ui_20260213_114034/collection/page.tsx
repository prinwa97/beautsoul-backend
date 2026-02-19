"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FOTabs } from "@/lib/fo-tabs";
import { BottomSheet } from "../components/BottomSheet";
import { useMobileCache } from "@/lib/useMobileCache";
import { enqueueJob, getQueue, isOnline } from "@/lib/offline-queue";

type RetailerRow = {
  retailerId: string;
  name: string;
  city?: string | null;
  status?: string | null;
  pendingAmount: number;
  invoiceCount: number;
  lastInvoiceAt?: string | null;
};

type InvoiceRow = {
  id: string;
  invoiceNo?: string | null;
  createdAt?: string | null;
  totalAmount: number;
  paidAmount: number;
  paymentStatus: string;
  retailerId: string;
};

/* --- Helpers --- */
const inr = (n: number) => Number(n || 0).toLocaleString("en-IN");
const safeJson = (res: Response) => res.json().catch(() => ({}));
const fmtDate = (iso?: string | null) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export default function FOCollectionsMobile() {
  const [mounted, setMounted] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [retailersLoading, setRetailersLoading] = useState(false);
  const [netOnline, setNetOnline] = useState(true);

  // Cache for Retailers
  const retailersCache = useMobileCache<RetailerRow[]>("FO_COLL_RET_V2", []);

  // Search & Filters
  const [q, setQ] = useState("");
  const [sheetRetailer, setSheetRetailer] = useState<RetailerRow | null>(null);
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Collection State
  const [collectOpen, setCollectOpen] = useState(false);
  const [amount, setAmount] = useState("0");
  const [mode, setMode] = useState("");
  const [saving, setSaving] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Hydration Fix
  useEffect(() => {
    setMounted(true);
    setNetOnline(isOnline());
    loadRetailers();
  }, []);

  async function loadRetailers() {
    setRetailersLoading(true);
    try {
      const res = await fetch("/api/field-officer/collections/retailers");
      const data = await safeJson(res);
      if (data.ok) retailersCache.setData(data.retailers);
      else setMsg("❌ " + (data.error || "Retailers load failed"));
    } catch {
      setMsg("❌ Error loading retailers");
    } finally {
      setRetailersLoading(false);
    }
  }

  async function loadInvoices(rid: string) {
    setInvoicesLoading(true);
    setInvoices([]);
    try {
      const res = await fetch(`/api/field-officer/ledger/invoices?retailerId=${rid}`);
      const data = await safeJson(res);

      // ✅ tolerant: backend may return invoices or rows
      const list = data?.invoices || data?.rows || [];

      if (data.ok) setInvoices(list);
      else throw new Error(data.error || "Invoices load failed");
    } catch (e: any) {
      setMsg("❌ Invoices load failed: " + (e?.message || "Unknown"));
    } finally {
      setInvoicesLoading(false);
    }
  }

  const filteredRetailers = useMemo(() => {
    return retailersCache.data.filter((r) =>
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      (r.city || "").toLowerCase().includes(q.toLowerCase())
    );
  }, [retailersCache.data, q]);

  if (!mounted) return null;

  return (
    <div style={{ padding: 12, background: "#fff7f6", minHeight: "100vh" }}>
      <FOTabs />

      {/* Header */}
      <div style={{ marginTop: 10, background: "#111", color: "white", borderRadius: 18, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Collections</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>
              Net: {netOnline ? "Online" : "Offline"} • Queue: {getQueue().length}
            </div>
          </div>
          <button
            onClick={loadRetailers}
            style={{ border: "1px solid #fff", padding: "8px 12px", borderRadius: 12, color: "white", background: "transparent" }}
          >
            {retailersLoading ? "..." : "Refresh"}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "#111", color: "white", fontWeight: 900 }}>
          {msg}
        </div>
      )}

      {/* Search */}
      <div style={{ marginTop: 10 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search Retailer..."
          style={{ width: "100%", padding: 12, borderRadius: 14, border: "1px solid #ddd" }}
        />
      </div>

      {/* List */}
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
        {filteredRetailers.map((r) => (
          <div key={r.retailerId} style={{ background: "white", padding: 12, borderRadius: 18, border: "1px solid #eee" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 950 }}>{r.name}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{r.city || "No City"}</div>
              </div>
              <div style={{ textAlign: "right", fontWeight: 950 }}>₹ {inr(r.pendingAmount)}</div>
            </div>

            {/* ✅ 3 Buttons: Invoices / Ledger / Collect */}
            <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
              <button
                onClick={() => { setSheetRetailer(r); setCollectOpen(false); loadInvoices(r.retailerId); }}
                style={{ flex: 1, padding: 10, borderRadius: 12, background: "#f0f0f0", border: "none", fontWeight: 700 }}
              >
                Invoices
              </button>

              <button
                onClick={() => { window.location.href = `/field-officer/ledger?retailerId=${r.retailerId}`; }}
                style={{ flex: 1, padding: 10, borderRadius: 12, background: "#f7f7f7", border: "none", fontWeight: 700 }}
              >
                Ledger
              </button>

              <button
                onClick={() => { setSheetRetailer(r); setCollectOpen(true); }}
                style={{ flex: 1, padding: 10, borderRadius: 12, background: "#111", color: "white", border: "none", fontWeight: 700 }}
              >
                Collect
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Invoices BottomSheet */}
      <BottomSheet open={!!sheetRetailer && !collectOpen} onClose={() => setSheetRetailer(null)} title="Retailer Invoices">
        {invoicesLoading ? (
          <p>Loading...</p>
        ) : invoices.map((inv) => (
          <div key={inv.id} style={{ padding: 12, borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontWeight: 700 }}>{inv.invoiceNo || "No No."}</div>
              <div style={{ fontSize: 11 }}>{fmtDate(inv.createdAt)}</div>

              {/* ✅ Collected line */}
              <div style={{ fontSize: 11, color: "green" }}>
                Collected: ₹{inr(inv.paidAmount || 0)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: 700 }}>₹{inr(inv.totalAmount)}</div>
              <div style={{ fontSize: 11, color: "red" }}>
                Due: ₹{inr((inv.totalAmount || 0) - (inv.paidAmount || 0))}
              </div>
            </div>
          </div>
        ))}
      </BottomSheet>

      {/* Payment Sheet (UI only) */}
      <BottomSheet open={collectOpen} onClose={() => setCollectOpen(false)} title="Collect Payment">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}
          />
          <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ padding: 12, borderRadius: 12, border: "1px solid #ddd" }}>
            <option value="">Select Mode</option>
            <option value="CASH">Cash</option>
            <option value="UPI">UPI</option>
          </select>

          <button
            disabled={saving}
            style={{ padding: 14, borderRadius: 14, background: "#111", color: "white", fontWeight: 900, opacity: saving ? 0.6 : 1 }}
            onClick={async () => {
              if (!sheetRetailer) return;
              const amt = Math.floor(Number(amount || 0));
              if (!amt) return setMsg("❌ Amount required");
              if (!mode) return setMsg("❌ Mode required");

              setSaving(true);
              try {
                const res = await fetch("/api/field-officer/collections/collect-retailer", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    retailerId: sheetRetailer.retailerId,
                    amount: amt,
                    mode,
                  }),
                });
                const data = await safeJson(res);
                if (!data.ok) throw new Error(data.error || "Save failed");

                setMsg("✅ Collection saved");
                setCollectOpen(false);
                await loadRetailers();
                await loadInvoices(sheetRetailer.retailerId);
              } catch (e: any) {
                setMsg("❌ Save failed: " + (e?.message || "Unknown"));
              } finally {
                setSaving(false);
              }
            }}
          >
            Save Collection
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}