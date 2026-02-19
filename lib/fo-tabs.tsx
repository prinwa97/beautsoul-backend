"use client";

import { usePathname } from "next/navigation";

export function FOTabs() {
  const path = usePathname();
  const is = (p: string) => path?.includes(p);

  const pill = (active: boolean) => ({
    flex: 1,
    textAlign: "center" as const,
    padding: "12px 10px",
    borderRadius: 999,
    fontWeight: 950,
    border: active ? "1px solid #111" : "1px solid #e4e6ef",
    background: active ? "#111" : "white",
    color: active ? "white" : "#111",
    textDecoration: "none",
    boxShadow: active ? "0 10px 22px rgba(0,0,0,0.12)" : "0 10px 22px rgba(0,0,0,0.04)",
  });

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, paddingTop: 6, paddingBottom: 10, background: "#f6f7fb" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 950 }}>Field Officer</div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>Orders • Collection • Audit</div>
        </div>
        <a
          href="/"
          style={{
            fontSize: 12,
            fontWeight: 950,
            textDecoration: "none",
            color: "#111",
            border: "1px solid #e4e6ef",
            background: "white",
            padding: "10px 12px",
            borderRadius: 12,
          }}
        >
          Home
        </a>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <a href="/field-officer/orders" style={pill(is("/field-officer/orders"))}>Order</a>
        <a href="/field-officer/collection" style={pill(is("/field-officer/collection"))}>Collection</a>
        <a href="/field-officer/audit" style={pill(is("/field-officer/audit"))}>Audit</a>
      </div>
    </div>
  );
}
