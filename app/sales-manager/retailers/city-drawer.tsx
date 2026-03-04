// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/sales-manager/retailers/city-drawer.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ModalShell from "./modal-shell";

type Mode = "TODAY" | "MONTH" | "YEAR" | "CUSTOM";

type Resp = {
  ok: boolean;
  error?: string;
  city?: string;
  mode?: Mode;
  range?: { from: string; to: string };
  filters?: { distId: string | null };
  kpis?: { orders: number; sales: number; activeRetailers: number; totalRetailers: number; growthPct: number };
  topRetailers?: Array<{ retailerId: string; retailerName: string; sales: number; orders: number }>;
  topProducts?: Array<{ productName: string; sales: number; orders: number }>;
  cityPlan?: Array<{ title: string; targets: number }>;
};

function money(nv: any) {
  const v = Number(nv || 0);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

export default function CityDrawer({
  city,
  open,
  onClose,
  onOpenRetailer,
  onOpenProduct,

  // ✅ NEW: single source of truth from parent
  mode,
  from,
  to,
}: {
  city: string;
  open: boolean;
  onClose: () => void;
  onOpenRetailer: (retailerId: string) => void;
  onOpenProduct: (productName: string) => void;

  mode: Mode;
  from: string;
  to: string;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Resp | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

    const api = useMemo(() => {
    if (!city) return "";
    const p = new URLSearchParams();
    p.set("mode", mode);

    // ✅ Always pass range (single source of truth from parent)
    if (from) p.set("from", from);
    if (to) p.set("to", to);

    return `/api/sales-manager/retailers/cities/${encodeURIComponent(city)}/drawer?${p.toString()}`;
  }, [city, mode, from, to]);


  useEffect(() => {
    if (!open || !api) return;
    (async () => {
      setLoading(true);
      setData(null);
      try {
        const res = await fetch(api, { cache: "no-store" });
               const j = (await res.json().catch(() => null)) as Resp | null;

        if (!res.ok || !j?.ok) {
          setData(j || { ok: false, error: j?.error || `HTTP_${res.status}` });
          return;
        }

        setData(j);
      } catch (e: any) {
        setData({ ok: false, error: String(e?.message || e) });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, api]);

  // ✅ FIX: deps array constant (no conditional deps)
  useEffect(() => {
    if (!open) return;
    bodyRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [open, city, mode, from, to]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const name = data?.city || city;
  const k = data?.kpis;

  function openRetailerTop(retailerId: string) {
    if (!retailerId) return;
    onClose();
    setTimeout(() => onOpenRetailer(retailerId), 0);
  }

  function openProductTop(productName: string) {
    if (!productName) return;
    onClose();
    setTimeout(() => onOpenProduct(productName), 0);
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      zIndex={80}
      widthClass="max-w-5xl"
      titleTop={
        <div className="min-w-0">
          <div className="text-xs font-semibold text-gray-500">City</div>
          <div className="text-lg font-black text-gray-900 truncate">{name}</div>

          <div className="text-xs text-gray-600 mt-1">
            Sales: <b>₹{money(k?.sales ?? 0)}</b> · Orders: <b>{k?.orders ?? 0}</b> · Growth:{" "}
            <b>{Number(k?.growthPct ?? 0).toFixed(1)}%</b>
          </div>
          <div className="text-xs text-gray-600 mt-1">
            Retailers: <b>{k?.activeRetailers ?? 0}</b> active / <b>{k?.totalRetailers ?? 0}</b> total
          </div>

          <div className="mt-1 text-[11px] text-gray-500">
            Mode: <b>{mode}</b>
            {mode === "CUSTOM" ? (
              <>
                {" "}
                · Range: <b>{from}</b> → <b>{to}</b>
              </>
            ) : null}
          </div>
        </div>
      }
    >
      <div ref={bodyRef} className="p-4 overflow-auto max-h-[78vh]">
        {loading ? <div className="text-sm text-gray-600">Loading…</div> : null}

        {!loading && data && !data.ok ? (
          <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">Error: {data.error || "UNKNOWN"}</div>
        ) : null}

        {!loading && data?.ok ? (
          <>
            <Block title="Top Retailers (click)">
              <TableShell>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <Th className="w-12">#</Th>
                      <Th>Retailer</Th>
                      <Th className="w-24">Orders</Th>
                      <Th className="w-32 text-right">Sales</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.topRetailers || []).map((r, i) => (
                      <tr
                        key={r.retailerId}
                        className="border-t hover:bg-gray-50 cursor-pointer"
                        onClick={() => openRetailerTop(r.retailerId)}
                      >
                        <Td>{i + 1}</Td>
                        <Td className="font-bold">{r.retailerName}</Td>
                        <Td>{r.orders}</Td>
                        <Td className="text-right font-black">₹{money(r.sales)}</Td>
                      </tr>
                    ))}
                    {!(data.topRetailers || []).length ? (
                      <tr>
                        <Td colSpan={4} className="text-gray-600">
                          No retailers for {mode}.
                        </Td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </TableShell>
            </Block>

            <Block title="Top Products (click)">
              <TableShell>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <Th className="w-12">#</Th>
                      <Th>Product</Th>
                      <Th className="w-24">Orders</Th>
                      <Th className="w-32 text-right">Sales</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.topProducts || []).map((p, i) => (
                      <tr
                        key={p.productName}
                        className="border-t hover:bg-gray-50 cursor-pointer"
                        onClick={() => openProductTop(p.productName)}
                      >
                        <Td>{i + 1}</Td>
                        <Td className="font-bold">{p.productName}</Td>
                        <Td>{p.orders}</Td>
                        <Td className="text-right font-black">₹{money(p.sales)}</Td>
                      </tr>
                    ))}
                    {!(data.topProducts || []).length ? (
                      <tr>
                        <Td colSpan={4} className="text-gray-600">
                          No products for {mode}.
                        </Td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </TableShell>
            </Block>

            <Block title="AI City Plan (2-week)">
              <div className="space-y-2">
                {(data.cityPlan || []).map((x, i) => (
                  <div key={i} className="p-3 rounded-xl border bg-white">
                    <div className="font-bold">{x.title}</div>
                    <div className="text-xs text-gray-600 mt-1">Targets: {x.targets}</div>
                  </div>
                ))}
                {!(data.cityPlan || []).length ? <div className="text-sm text-gray-600">No plan.</div> : null}
              </div>
            </Block>
          </>
        ) : null}
      </div>
    </ModalShell>
  );
}

function Block({ title, children }: { title: string; children: any }) {
  return (
    <div className="mb-4 p-3 rounded-2xl border bg-white">
      <div className="text-sm font-black text-gray-900">{title}</div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function TableShell({ children }: { children: any }) {
  return <div className="rounded-2xl border overflow-hidden bg-white">{children}</div>;
}

function Th({ className = "", children }: { className?: string; children: any }) {
  return <th className={`text-left px-3 py-2 font-bold text-gray-700 ${className}`}>{children}</th>;
}

function Td({ className = "", children, colSpan }: { className?: string; children: any; colSpan?: number }) {
  return (
    <td className={`px-3 py-2 align-top ${className}`} colSpan={colSpan}>
      {children}
    </td>
  );
}