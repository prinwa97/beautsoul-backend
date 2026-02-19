"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FOTabs } from "@/lib/fo-tabs";
import { enqueueJob, getQueue, isOnline } from "@/lib/offline-queue";

/* ================= TYPES ================= */

type Retailer = {
  id: string; 
  name: string;
  phone?: string | null;
  city?: string | null;
  status?: string | null;
};

type Product = {
  id?: string;
  name: string;
  mrp?: number | null;
  salePrice?: number | null; 
};

type CartLine = {
  productName: string;
  qty: number;
  rate: number;
  amount: number;
};

/* ================= HELPERS ================= */

function inr(n: number) {
  const x = Number(n || 0);
  try {
    return x.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  } catch {
    return String(x);
  }
}

async function safeJson(res: Response) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

function uid(prefix = "FO") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

/* ================= PAGE ================= */

export default function FOOrdersMobile() {
  const [msg, setMsg] = useState<string>("");
  const [netOnline, setNetOnline] = useState<boolean>(true);
  
  // ✅ Hydration Fix: Check if component is mounted on client
  const [mounted, setMounted] = useState(false);

  // Retailers
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [retailersLoading, setRetailersLoading] = useState(false);
  const [retailerId, setRetailerId] = useState<string>("");

  // Products
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  // Qty map
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});

  // Search
  const [q, setQ] = useState("");

  // Submit
  const [saving, setSaving] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // ✅ Triggered only on client
  useEffect(() => {
    setMounted(true);
    const updateStatus = () => {
      try {
        setNetOnline(isOnline());
      } catch {
        setNetOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
      }
    };
    updateStatus();
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  function setQtyFor(productName: string, v: number | null) {
    const name = cleanStr(productName);
    if (!name) return;
    if (v == null) {
      setQtyMap((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      return;
    }
    const qty = Math.max(0, Math.floor(Number(v)));
    if (!qty) {
      setQtyMap((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      return;
    }
    setQtyMap((prev) => ({ ...prev, [name]: qty }));
  }

  async function loadRetailers() {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setRetailersLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/field-officer/retailers", {
        cache: "no-store",
        signal: ac.signal,
      });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || `Retailers load failed`);
      const raw: any[] = Array.isArray(data) ? data : Array.isArray(data?.retailers) ? data.retailers : [];
      const map = new Map<string, Retailer>();
      for (const r of raw) {
        const id = cleanStr(r?.id || r?.retailerId || r?.userId);
        const name = cleanStr(r?.name);
        if (!id || !name) continue;
        if (!map.has(id)) {
          map.set(id, { id, name, phone: r?.phone ?? null, city: r?.city ?? null, status: r?.status ?? null });
        }
      }
      const uniq = Array.from(map.values());
      setRetailers(uniq);
      setRetailerId((prev) => (prev && uniq.some((x) => x.id === prev) ? prev : uniq.length ? uniq[0].id : ""));
      if (!uniq.length) setMsg("⚠️ No retailers found.");
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setRetailers([]);
      setMsg("❌ Retailers load error: " + (e?.message || "Error"));
    } finally {
      setRetailersLoading(false);
    }
  }

  async function loadProducts(rid: string) {
    const clean = cleanStr(rid);
    if (!clean) return;
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setProductsLoading(true);
    setMsg("");
    try {
      const enc = encodeURIComponent(clean);
      const res = await fetch(`/api/field-officer/products?retailerId=${enc}`, { cache: "no-store", signal: ac.signal });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || `Products load failed`);
      const list: Product[] = Array.isArray(data) ? data : Array.isArray(data?.products) ? data.products : [];
      setProducts(list);
      setQtyMap((prev) => {
        const next: Record<string, number> = {};
        for (const p of list) {
          const k = cleanStr(p?.name);
          if (k && prev[k] != null) next[k] = prev[k];
        }
        return next;
      });
    } catch (e: any) {
      if (e?.name === "AbortError") return;
      setProducts([]);
      setMsg("❌ Products load error: " + (e?.message || "Error"));
    } finally {
      setProductsLoading(false);
    }
  }

  useEffect(() => { loadRetailers(); }, []);
  useEffect(() => { if (retailerId) loadProducts(retailerId); }, [retailerId]);

  const selectedRetailer = useMemo(() => retailers.find((r) => r.id === retailerId) || null, [retailers, retailerId]);
  const filteredProducts = useMemo(() => {
    const needle = cleanStr(q).toLowerCase();
    if (!needle) return products;
    return products.filter((p) => cleanStr(p.name).toLowerCase().includes(needle));
  }, [products, q]);

  const cartLines: CartLine[] = useMemo(() => {
    const out: CartLine[] = [];
    for (const p of products) {
      const productName = cleanStr(p?.name);
      if (!productName) continue;
      const qty = Math.max(0, Math.floor(Number(qtyMap[productName] ?? 0)));
      if (qty <= 0) continue;
      const rate = Number(p?.salePrice || 0);
      out.push({ productName, qty, rate, amount: qty * rate });
    }
    return out;
  }, [products, qtyMap]);

  const totalAmount = useMemo(() => cartLines.reduce((s, it) => s + Number(it.amount || 0), 0), [cartLines]);

  async function submitOrder() {
    if (!retailerId || !cartLines.length) return setMsg("⚠️ Selection check karo");
    setSaving(true);
    setMsg("");
    const payload = { retailerId, items: cartLines.map((x) => ({ productName: x.productName, qty: x.qty, rate: x.rate })) };

    if (!netOnline) {
      try {
        enqueueJob({ id: uid("ORDER"), kind: "FO_ORDER", payload, createdAt: new Date().toISOString() } as any);
        setMsg("📦 Offline: Order queued. Net aate hi sync karein.");
        setQtyMap({});
        setSaving(false);
        return;
      } catch (e: any) {
        setMsg("❌ Queue failed: " + e.message);
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/field-officer/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await safeJson(res);
      if (!res.ok) throw new Error(data?.error || "Order save failed");
      setMsg(`✅ Order saved: ${data?.order?.orderNo || ""}`);
      setQtyMap({});
    } catch (e: any) {
      setMsg("❌ Save failed: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  const isLoading = retailersLoading || productsLoading;

  // ✅ queueLen depends on mounted state to avoid hydration error
  const queueLen = useMemo(() => {
    if (!mounted) return 0;
    try {
      const q = getQueue();
      return Array.isArray(q) ? q.length : 0;
    } catch { return 0; }
  }, [mounted, netOnline, saving]);

  return (
    <div style={{ minHeight: "100vh", background: "#fff7f6" }}>
      <div style={{ padding: 12, paddingBottom: 96 }}>
        <FOTabs />

        {/* Header */}
        <div style={{ marginTop: 10, background: "#111", color: "white", borderRadius: 18, padding: 14, boxShadow: "0 14px 34px rgba(0,0,0,.18)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 950, fontSize: 16 }}>Field Officer • Orders (Mobile)</div>
              <div style={{ marginTop: 4, fontSize: 12, opacity: 0.9, fontWeight: 900 }}>
                {/* ✅ Client-side only rendering for Net and Queue to avoid mismatch */}
                Net: <b>{mounted ? (netOnline ? "Online" : "Offline") : "Loading..."}</b> • 
                Queue: <b>{mounted ? queueLen : "..."}</b>
              </div>
            </div>

            <button
              onClick={() => { loadRetailers().then(() => { if (retailerId) loadProducts(retailerId); }); }}
              disabled={isLoading}
              style={{ border: "1px solid #fff", background: "transparent", color: "white", borderRadius: 14, padding: "10px 12px", fontWeight: 950, opacity: isLoading ? 0.7 : 1 }}
            >
              {isLoading ? "Syncing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Message */}
        {msg ? (
          <div style={{ marginTop: 10, padding: 12, borderRadius: 14, border: "1px solid #e9ecf3", background: msg.startsWith("✅") || msg.startsWith("📦") ? "#f2fff5" : "#fff2f2", fontWeight: 900 }}>
            {msg}
          </div>
        ) : null}

        {/* Retailer Selector */}
        <div style={{ marginTop: 10, background: "white", border: "1px solid #e9ecf3", borderRadius: 18, padding: 12, boxShadow: "0 12px 24px rgba(0,0,0,.06)" }}>
          <div style={{ fontSize: 12, fontWeight: 950, marginBottom: 6 }}>Retailer</div>
          <select
            value={retailerId}
            onChange={(e) => setRetailerId(e.target.value)}
            disabled={retailersLoading}
            style={{ width: "100%", padding: "12px 12px", borderRadius: 14, border: "1px solid #dfe3ee", background: "white", fontWeight: 900 }}
          >
            {!retailers.length && <option value="">{retailersLoading ? "Loading..." : "No retailers found"}</option>}
            {retailers.map((r, idx) => <option key={`RET-${r.id}-${idx}`} value={r.id}>{r.name}</option>)}
          </select>
          {selectedRetailer && (
            <div style={{ marginTop: 10, borderRadius: 14, background: "#fafbff", border: "1px solid #eef1f7", padding: 12 }}>
              <div style={{ fontWeight: 950 }}>{selectedRetailer.name}</div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#666", fontWeight: 900 }}>{selectedRetailer.city || "-"}{selectedRetailer.phone ? ` • ${selectedRetailer.phone}` : ""}</div>
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ marginTop: 10, background: "white", border: "1px solid #e9ecf3", borderRadius: 18, padding: 12, boxShadow: "0 12px 24px rgba(0,0,0,.06)" }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product..." style={{ width: "100%", padding: "12px 12px", borderRadius: 14, border: "1px solid #dfe3ee", fontWeight: 900 }} />
        </div>

        {/* Products List */}
        <div style={{ marginTop: 10, background: "white", border: "1px solid #e9ecf3", borderRadius: 18, overflow: "hidden", boxShadow: "0 12px 24px rgba(0,0,0,.06)" }}>
          <div style={{ padding: 12, borderBottom: "1px solid #eef1f7", fontWeight: 950 }}>Products (Rate locked)</div>
          {productsLoading ? (
            <div style={{ padding: 12, fontWeight: 900, color: "#666" }}>Loading products...</div>
          ) : filteredProducts.length ? (
            <div style={{ display: "flex", flexDirection: "column" }}>
              {filteredProducts.map((p, idx) => {
                const name = cleanStr(p.name);
                const rate = Number(p.salePrice || 0);
                const qty = qtyMap[name] ?? null;
                const amount = qty ? Number(qty) * rate : 0;
                return (
                  <div key={`PROD-${name}-${idx}`} style={{ padding: 12, borderTop: "1px solid #f0f2f8" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 950 }}>{name}</div>
                        <div style={{ marginTop: 4, fontSize: 12, color: "#666", fontWeight: 900 }}>Rate: ₹{inr(rate)} • MRP: {p.mrp != null ? `₹${inr(Number(p.mrp || 0))}` : "—"}</div>
                        <div style={{ marginTop: 6, fontSize: 12, fontWeight: 950 }}>Amount: {amount > 0 ? `₹${inr(amount)}` : "—"}</div>
                      </div>
                      <div style={{ width: 120, textAlign: "right" }}>
                        <input
                          inputMode="numeric"
                          value={qty == null ? "" : String(qty)}
                          onChange={(e) => setQtyFor(name, e.target.value ? Number(onlyDigits(e.target.value)) : null)}
                          placeholder="0"
                          style={{ width: "100%", padding: "12px 12px", borderRadius: 14, border: "1px solid #dfe3ee", fontWeight: 950, textAlign: "center" }}
                        />
                        <button onClick={() => setQtyFor(name, null)} style={{ marginTop: 8, width: "100%", border: "1px solid #e4e6ef", background: "white", borderRadius: 14, padding: "10px 12px", fontWeight: 950 }}>Clear</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div style={{ padding: 12, fontWeight: 900, color: "#666" }}>No products found.</div>}
        </div>

        {/* Cart Summary */}
        <div style={{ marginTop: 10, background: "white", border: "1px solid #e9ecf3", borderRadius: 18, padding: 12, boxShadow: "0 12px 24px rgba(0,0,0,.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 950, fontSize: 14 }}>Cart</div>
              <div style={{ marginTop: 2, fontSize: 12, color: "#666", fontWeight: 900 }}>Items: <b>{cartLines.length}</b></div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Total</div>
              <div style={{ fontWeight: 950, fontSize: 18 }}>₹ {inr(totalAmount)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom bar */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, borderTop: "1px solid rgba(0,0,0,0.08)", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)", padding: 12 }}>
        <div style={{ maxWidth: 560, margin: "0 auto", display: "flex", gap: 10, alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: "#666", fontWeight: 900 }}>Payable</div>
            <div style={{ fontSize: 18, fontWeight: 950 }}>₹ {inr(totalAmount)}</div>
          </div>
          <button onClick={() => setQtyMap({})} disabled={saving || !Object.keys(qtyMap).length} style={{ border: "1px solid #e4e6ef", background: "white", borderRadius: 16, padding: "12px 12px", fontWeight: 950, opacity: saving || !Object.keys(qtyMap).length ? 0.6 : 1 }}>Clear</button>
          <button
            onClick={submitOrder}
            disabled={saving || !retailerId || !cartLines.length}
            style={{ border: "1px solid #111", background: "#111", color: "white", borderRadius: 16, padding: "12px 16px", fontWeight: 950, opacity: saving || !retailerId || !cartLines.length ? 0.6 : 1, minWidth: 120 }}
          >
            {saving ? "Saving..." : mounted && netOnline ? "Save" : "Queue"}
          </button>
        </div>
      </div>
    </div>
  );
}