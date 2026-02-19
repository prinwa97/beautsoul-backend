"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type OrderRow = {
  id: string;
  orderNo?: string | null;
  status?: string | null;
  createdAt?: string | null;
  totalAmount?: number | null;
  retailer?: { id: string; name: string } | null;
};

function fmtDate(d?: string | null) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleString("en-IN", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return d;
  }
}

function n(x: any) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

export default function OrdersClient() {
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<OrderRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      // NOTE: adjust this API if your actual endpoint differs
      const res = await fetch(`/api/distributor/orders/list?q=${encodeURIComponent(q)}&take=200`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        setRows([]);
        setErr(data?.error || `Failed (${res.status})`);
      } else {
        setRows(Array.isArray(data.orders) ? data.orders : []);
      }
    } catch (e: any) {
      setRows([]);
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(() => rows.reduce((s, r) => s + n(r.totalAmount), 0), [rows]);

  return (
    <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Distributor Orders</h1>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order no / retailer..."
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              minWidth: 220,
            }}
          />
          <button
            onClick={load}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "white",
              cursor: "pointer",
            }}
          >
            Search
          </button>
        </div>
      </div>

      <div style={{ marginTop: 10, opacity: 0.75, fontSize: 13 }}>
        {loading ? "Loading..." : `Orders: ${rows.length} | Total: ₹${total.toFixed(2)}`}
      </div>

      {err ? (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: "#fff2f2", border: "1px solid #ffd0d0" }}>
          <b>API error:</b> {err}
          <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
            If your API route name is different, tell me your existing route path and I’ll align this fetch URL.
          </div>
        </div>
      ) : null}

      <div style={{ marginTop: 12, border: "1px solid #eee", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 140px 160px 120px", padding: 12, background: "#fafafa", fontSize: 12, fontWeight: 700 }}>
          <div>Order No</div>
          <div>Retailer</div>
          <div>Status</div>
          <div>Created</div>
          <div style={{ textAlign: "right" }}>Amount</div>
        </div>

        {rows.map((r) => (
          <div
            key={r.id}
            style={{
              display: "grid",
              gridTemplateColumns: "180px 1fr 140px 160px 120px",
              padding: 12,
              borderTop: "1px solid #eee",
              alignItems: "center",
              fontSize: 13,
            }}
          >
            <div style={{ fontWeight: 700 }}>
              <Link href={`/distributor/orders/${r.id}`} style={{ textDecoration: "none" }}>
                {r.orderNo || r.id.slice(0, 8)}
              </Link>
            </div>
            <div>{r.retailer?.name || "-"}</div>
            <div>{r.status || "-"}</div>
            <div>{fmtDate(r.createdAt)}</div>
            <div style={{ textAlign: "right" }}>₹{n(r.totalAmount).toFixed(2)}</div>
          </div>
        ))}

        {!loading && rows.length === 0 ? (
          <div style={{ padding: 14, opacity: 0.7 }}>No orders found.</div>
        ) : null}
      </div>
    </div>
  );
}
