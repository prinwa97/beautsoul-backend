"use client";

import React, { useEffect, useMemo, useState } from "react";

type Summary = {
  ok: boolean;
  monthKey: string;
  target: { amount: number; unit: string };
  achieved: { amount: number; unit: string };
  coins: { balance: number; earnedThisMonth: number; spentThisMonth: number };
  streak: number;
  level: string;
};

function safeJson(res: Response) {
  return res.json().catch(() => ({}));
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export function FOHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [netOnline, setNetOnline] = useState(true);

  useEffect(() => {
    const on = () => setNetOnline(true);
    const off = () => setNetOnline(false);
    setNetOnline(typeof navigator !== "undefined" ? navigator.onLine : true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/field-officer/home/summary", { cache: "no-store" });
      const data = await safeJson(res);
      if (res.ok && data?.ok) setSummary(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, []);

  const pct = useMemo(() => {
    const t = Number(summary?.target?.amount || 0);
    const a = Number(summary?.achieved?.amount || 0);
    if (!t) return 0;
    return clamp(Math.round((a / t) * 100), 0, 100);
  }, [summary]);

  return (
    <div style={{ marginTop: 10, background: "#111", color: "white", borderRadius: 18, padding: 14, boxShadow: "0 14px 34px rgba(0,0,0,.18)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 950, fontSize: 16 }}>{title}</div>
          <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 800 }}>
            {subtitle || (summary?.monthKey ? `Month: ${summary.monthKey}` : "Loading...")}
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, fontWeight: 950, opacity: 0.9 }}>
            Net: <span style={{ fontWeight: 950 }}>{netOnline ? "Online" : "Offline"}</span>
            {loading ? " • ..." : ""}
          </div>
          <div style={{ marginTop: 6, fontWeight: 950, fontSize: 12 }}>
            {summary?.level ? `Level: ${summary.level}` : "Level: -"}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 10 }}>
          <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 900 }}>Target</div>
          <div style={{ fontWeight: 950, fontSize: 14 }}>
            {Number(summary?.target?.amount || 0)} {summary?.target?.unit || ""}
          </div>
          <div style={{ marginTop: 6, height: 8, background: "rgba(255,255,255,0.18)", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ width: `${pct}%`, height: "100%", background: "white" }} />
          </div>
          <div style={{ marginTop: 6, fontSize: 11, opacity: 0.9, fontWeight: 900 }}>{pct}% Achieved</div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 10 }}>
          <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 900 }}>Coins</div>
          <div style={{ fontWeight: 950, fontSize: 18 }}>🪙 {Number(summary?.coins?.balance || 0)}</div>
          <div style={{ marginTop: 4, fontSize: 11, opacity: 0.9, fontWeight: 900 }}>
            Earned: {Number(summary?.coins?.earnedThisMonth || 0)}
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.08)", borderRadius: 14, padding: 10 }}>
          <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 900 }}>Streak</div>
          <div style={{ fontWeight: 950, fontSize: 18 }}>🔥 {Number(summary?.streak || 0)}</div>
          <div style={{ marginTop: 4, fontSize: 11, opacity: 0.9, fontWeight: 900 }}>Keep it up!</div>
        </div>
      </div>
    </div>
  );
}
