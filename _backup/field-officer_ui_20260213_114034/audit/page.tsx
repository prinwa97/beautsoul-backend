"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FOTabs } from "@/lib/fo-tabs";
import { useMobileCache } from "@/lib/useMobileCache";
import { safeJson } from "@/lib/mobile-ux";
import { isOnline } from "@/lib/offline-queue";

type Retailer = {
  id: string;     // retailerId (or fallback userId)
  userId: string; // always filled
  name: string;
  phone?: string | null;
  status?: string | null;
  city?: string | null;
  state?: string | null;
};

function inr(n: number) {
  try {
    return Number(n || 0).toLocaleString("en-IN");
  } catch {
    return String(n);
  }
}

export default function FOAuditMobileOnly() {
  const [msg, setMsg] = useState<string | null>(null);
  const [loadingRetailers, setLoadingRetailers] = useState(false);

  // ✅ cache retailers list
  const retailersCache = useMobileCache<Retailer[]>("FO_AUDIT_RETAILERS_V1", []);
  const [retailerId, setRetailerId] = useState<string>("");

  const selected = useMemo(
    () => retailersCache.data.find((r) => r.id === retailerId) || null,
    [retailersCache.data, retailerId]
  );

  async function loadRetailers() {
    setLoadingRetailers(true);
    setMsg(null);

    try {
      // ✅ Offline => only cached
      if (!isOnline?.()) {
        setMsg("📴 Offline: cached retailers shown");
        return;
      }

      const res = await fetch("/api/field-officer/retailers", { cache: "no-store" });
      const data = await safeJson(res);

      if (!res.ok) throw new Error(data?.error || "Retailers load failed");

      const rawList = Array.isArray(data) ? data : data?.retailers || [];

      const list: Retailer[] = rawList.map((r: any) => ({
        id: String(r.id),
        userId: String(r.userId || r.id),
        name: String(r.name || ""),
        phone: r.phone ?? null,
        status: r.status ?? null,
        city: r.city ?? null,
        state: r.state ?? null,
      }));

      retailersCache.setData(list);

      if (list.length > 0) setRetailerId((prev) => prev || list[0].id);
      else setRetailerId("");

      setMsg("✅ Retailers updated");
    } catch (e: any) {
      setMsg("⚠️ " + (e?.message || "Error") + " (cache shown)");
    } finally {
      setLoadingRetailers(false);
    }
  }

  useEffect(() => {
    loadRetailers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Demo audit stats (later API se)
  const auditScore = 82;
  const pendingVisits = 4;

  return (
    <div style={{ padding: 12, background: "#fff7f6", minHeight: "100vh" }}>
      <FOTabs />

      {/* Header */}
      <div style={{ marginTop: 10, background: "#111", color: "white", borderRadius: 18, padding: 14, boxShadow: "0 14px 34px rgba(0,0,0,.18)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 950, fontSize: 16 }}>Audit</div>
            <div style={{ fontSize: 12, opacity: 0.9, fontWeight: 800 }}>Retailer select → audit details</div>
          </div>
          <button
            onClick={loadRetailers}
            disabled={loadingRetailers}
            style={{
              border: "1px solid #fff",
              background: "transparent",
              color: "white",
              borderRadius: 14,
              padding: "10px 12px",
              fontWeight: 950,
              opacity: loadingRetailers ? 0.7 : 1,
            }}
          >
            {loadingRetailers ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ marginTop: 10, padding: 12, borderRadius: 14, border: "1px solid #e9ecf3", background: msg.startsWith("✅") ? "#f2fff5" : "#fff2f2", fontWeight: 900 }}>
          {msg}
        </div>
      )}

      {/* Top summary */}
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
        <div style={{ background: "white", border: "1px solid #e9ecf3", borderRadius: 16, padding: 14, boxShadow: "0 10px 22px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Audit Score (Demo)</div>
          <div style={{ fontSize: 26, fontWeight: 950, marginTop: 6 }}>{auditScore}%</div>
        </div>
        <div style={{ background: "white", border: "1px solid #e9ecf3", borderRadius: 16, padding: 14, boxShadow: "0 10px 22px rgba(0,0,0,0.05)" }}>
          <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Pending Visits (Demo)</div>
          <div style={{ fontSize: 26, fontWeight: 950, marginTop: 6 }}>{pendingVisits}</div>
        </div>
      </div>

      {/* Retailer selection card */}
      <div style={{ marginTop: 10, background: "white", border: "1px solid #e9ecf3", borderRadius: 16, padding: 14, boxShadow: "0 10px 22px rgba(0,0,0,0.06)" }}>
        <div style={{ fontSize: 16, fontWeight: 950 }}>Retailer Audit</div>
        <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Select retailer → audit details</div>

        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 6 }}>Retailer</div>
          <select
            value={retailerId}
            onChange={(e) => setRetailerId(e.target.value)}
            style={{ width: "100%", padding: "12px 12px", borderRadius: 14, border: "1px solid #dfe3ee", background: "white", fontWeight: 900 }}
          >
            {!retailersCache.data.length && <option value="">{loadingRetailers ? "Loading..." : "No retailers found"}</option>}
            {retailersCache.data.map((r) => (
              <option key={`RET-${r.id}`} value={r.id}>
                {r.name}{r.city ? ` (${r.city})` : ""}
              </option>
            ))}
          </select>

          {selected && (
            <div style={{ marginTop: 10, border: "1px solid #eee", borderRadius: 14, padding: 12, background: "#fafbff" }}>
              <div style={{ fontWeight: 950 }}>{selected.name}</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                Phone: <b>{selected.phone || "-"}</b> • City: <b>{selected.city || "-"}</b> • State: <b>{selected.state || "-"}</b> • Status: <b>{selected.status || "-"}</b>
              </div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 6 }}>
                Retailers cached: <b>{retailersCache.data.length}</b> • Selected ID: <b>{retailerId}</b>
              </div>
            </div>
          )}
        </div>

        {/* Demo audit block */}
        <div style={{ marginTop: 12, background: "#111", color: "white", borderRadius: 16, padding: 14 }}>
          <div style={{ fontWeight: 900, opacity: 0.9 }}>Audit Summary (Demo)</div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}>
            <div style={{ opacity: 0.9 }}>Stock Visibility</div>
            <div style={{ fontWeight: 950 }}>{inr(12)} SKU</div>
          </div>
          <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between" }}>
            <div style={{ opacity: 0.9 }}>POS Branding</div>
            <div style={{ fontWeight: 950 }}>Good</div>
          </div>
        </div>
      </div>

      <div style={{ height: 18 }} />
    </div>
  );
}
