// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/sales-manager/retailers/product-drawer.tsx
"use client";

import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import ModalShell from "./modal-shell";

type Mode = "TODAY" | "MONTH" | "YEAR" | "CUSTOM";

type OrderRow = {
  id: string;
  orderNo?: string | null;
  status?: string | null;
  createdAt?: string | Date | null;
  totalAmount?: any;
  itemsCount?: number;
};

type AuditBatchRow = {
  batchNo: string;
  purchasedQty: number;
  soldQty: number;
  pendingQty: number;
};

type Resp = {
  ok: boolean;
  error?: string;
  product?: { name: string };
  mode?: Mode;
  range?: { from: string; to: string };
  kpis?: {
    orders: number;
    qty: number;
    sales: number;
    repeatRetailers: number;
    growthPct: number;
  };
  topRetailers?: Array<{
    retailerId: string;
    retailerName: string;
    city: string;
    sales: number;
    orders: number;
    lastAuditAt?: string | null;
  }>;
  topCities?: Array<{ city: string; sales: number; orders: number }>;
  adoptionGap?: Array<{ retailerId: string; retailerName: string; city: string; reason: string }>;
  bundlePairs?: Array<{ productName: string; coSales: number; liftPct: number }>;
};

function money(nv: any) {
  const v = Number(nv || 0);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function dt(s: any) {
  if (!s) return "—";
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN");
}

export default function ProductDrawer({
  productName,
  open,
  onClose,
  onOpenRetailer,
  onOpenCity,
  mode,
  from,
  to,
}: {
  productName: string;
  open: boolean;
  onClose: () => void;
  onOpenRetailer: (retailerId: string) => void;
  onOpenCity: (city: string) => void;
  mode: Mode;
  from: string;
  to: string;
}) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Resp | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // orders modal
  const [ordersOpen, setOrdersOpen] = useState(false);
  const [ordersRetailer, setOrdersRetailer] = useState<{ id: string; name: string } | null>(null);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersData, setOrdersData] = useState<{ ok: boolean; error?: string; orders?: OrderRow[] } | null>(null);
  const ordersBodyRef = useRef<HTMLDivElement>(null);

  // order detail modal
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderId, setOrderId] = useState<string>("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderData, setOrderData] = useState<any>(null);
  const orderBodyRef = useRef<HTMLDivElement>(null);

  // audit modal
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditRetailer, setAuditRetailer] = useState<{ id: string; name: string } | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditData, setAuditData] = useState<{
    ok: boolean;
    error?: string;
    lastAuditAt?: string | null;
    batches?: AuditBatchRow[];
  } | null>(null);
  const auditBodyRef = useRef<HTMLDivElement>(null);

  const fetchSeqRef = useRef(0);

  const api = useMemo(() => {
    if (!productName) return "";
    const p = new URLSearchParams();
    p.set("mode", mode);
    if (mode === "CUSTOM") {
      p.set("from", from);
      p.set("to", to);
    }
    return `/api/sales-manager/retailers/products/${encodeURIComponent(productName)}/drawer?${p.toString()}`;
  }, [productName, mode, from, to]);

  useEffect(() => {
    if (!open || !api) return;

    let active = true;
    const seq = ++fetchSeqRef.current;

    setLoading(true);
    setData(null);

    // reset nested modals when new product opens
    setOrdersOpen(false);
    setOrdersRetailer(null);
    setOrdersLoading(false);
    setOrdersData(null);

    setOrderOpen(false);
    setOrderId("");
    setOrderLoading(false);
    setOrderData(null);

    setAuditOpen(false);
    setAuditRetailer(null);
    setAuditLoading(false);
    setAuditData(null);

    (async () => {
      try {
        const res = await fetch(api, { cache: "no-store" });
        const j = (await res.json().catch(() => null)) as Resp | null;

        if (!active || seq !== fetchSeqRef.current) return;
        setData(j || { ok: false, error: "FAILED" });
      } catch (e: any) {
        if (!active || seq !== fetchSeqRef.current) return;
        setData({ ok: false, error: String(e?.message || e) });
      } finally {
        if (!active || seq !== fetchSeqRef.current) return;
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, api]);

  useEffect(() => {
    if (!open) return;
    bodyRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [open, productName, mode, from, to]);

  useEffect(() => {
    if (!ordersOpen) return;
    ordersBodyRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [ordersOpen, ordersRetailer?.id]);

  useEffect(() => {
    if (!orderOpen) return;
    orderBodyRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [orderOpen, orderId]);

  useEffect(() => {
    if (!auditOpen) return;
    auditBodyRef.current?.scrollTo({ top: 0, behavior: "auto" });
  }, [auditOpen, auditRetailer?.id]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;

      if (orderOpen) {
        setOrderOpen(false);
        return;
      }
      if (ordersOpen) {
        setOrdersOpen(false);
        return;
      }
      if (auditOpen) {
        setAuditOpen(false);
        return;
      }

      onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, orderOpen, ordersOpen, auditOpen, onClose]);

  if (!open) return null;

  const pName = data?.product?.name || productName;
  const k = data?.kpis;

  async function openOrders(retailerId: string, retailerName: string) {
    setOrdersRetailer({ id: retailerId, name: retailerName });
    setOrdersOpen(true);
    setOrdersLoading(true);
    setOrdersData(null);

    // also close other child modals
    setOrderOpen(false);
    setOrderId("");
    setOrderData(null);

    try {
      const url = `/api/sales-manager/retailers/${encodeURIComponent(retailerId)}/orders?productName=${encodeURIComponent(
        pName
      )}&limit=60`;
      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      setOrdersData(j || { ok: false, error: "FAILED" });
    } catch (e: any) {
      setOrdersData({ ok: false, error: String(e?.message || e) });
    } finally {
      setOrdersLoading(false);
    }
  }

  async function openOrder(oid: string) {
    setOrderId(oid);
    setOrderOpen(true);
    setOrderLoading(true);
    setOrderData(null);

    try {
      const url = `/api/sales-manager/orders/${encodeURIComponent(oid)}/detail`;
      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      setOrderData(j || { ok: false, error: "FAILED" });
    } catch (e: any) {
      setOrderData({ ok: false, error: String(e?.message || e) });
    } finally {
      setOrderLoading(false);
    }
  }

  async function openAudit(retailerId: string, retailerName: string) {
    setAuditRetailer({ id: retailerId, name: retailerName });
    setAuditOpen(true);
    setAuditLoading(true);
    setAuditData(null);

    try {
      const url = `/api/sales-manager/retailers/${encodeURIComponent(retailerId)}/audit/latest?productName=${encodeURIComponent(
        pName
      )}`;
      const res = await fetch(url, { cache: "no-store" });
      const j = await res.json().catch(() => null);
      setAuditData(j || { ok: false, error: "FAILED" });
    } catch (e: any) {
      setAuditData({ ok: false, error: String(e?.message || e) });
    } finally {
      setAuditLoading(false);
    }
  }

  return (
    <>
      <ModalShell
        open={open}
        onClose={() => {
          setOrdersOpen(false);
          setOrderOpen(false);
          setAuditOpen(false);
          onClose();
        }}
        zIndex={80}
        widthClass="max-w-6xl"
        titleTop={
          <div className="min-w-0">
            <div className="text-xs font-semibold text-gray-500">Product</div>
            <div className="text-lg font-black text-gray-900 truncate">{pName}</div>

            <div className="text-xs text-gray-600 mt-1">
              Orders: <b>{k?.orders ?? 0}</b> · Sales: <b>₹{money(k?.sales ?? 0)}</b> · Qty: <b>{k?.qty ?? 0}</b> · Growth:{" "}
              <b>{Number(k?.growthPct ?? 0).toFixed(1)}%</b>
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
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
              Error: {data.error || "UNKNOWN"}
            </div>
          ) : null}

          {!loading && data?.ok ? (
            <>
              <Block title="Top Retailers (Orders + Audit)">
                <div className="overflow-x-auto border rounded-2xl bg-white">
                  <table className="min-w-[950px] w-full text-[13px]">
                    <thead className="bg-gray-50 border-b">
                      <tr className="text-left">
                        <TH>Retailer</TH>
                        <TH>City</TH>
                        <TH className="text-right">Sales</TH>
                        <TH className="text-right">Orders</TH>
                        <TH>Audit (Last)</TH>
                        <TH className="text-right">Action</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {(data.topRetailers || []).map((r) => (
                        <tr key={r.retailerId} className="border-t hover:bg-gray-50">
                          <TD className="font-bold">
                            <button
                              type="button"
                              className="underline underline-offset-2 hover:text-gray-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenRetailer(r.retailerId);
                              }}
                            >
                              {r.retailerName}
                            </button>
                          </TD>

                          <TD>{r.city || "—"}</TD>
                          <TD className="text-right font-black">₹{money(r.sales)}</TD>

                          <TD className="text-right">
                            <button
                              type="button"
                              className="px-2 py-1 rounded-xl border bg-white text-xs font-black hover:bg-gray-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                openOrders(r.retailerId, r.retailerName);
                              }}
                              title="Open orders for this retailer (filtered by product)"
                            >
                              {r.orders}
                            </button>
                          </TD>

                          <TD>
                            <button
                              type="button"
                              className="px-2 py-1 rounded-xl border bg-white text-xs font-black hover:bg-gray-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                openAudit(r.retailerId, r.retailerName);
                              }}
                              title="Open latest audit (batch-wise)"
                            >
                              {r.lastAuditAt ? dt(r.lastAuditAt) : "—"}
                            </button>
                          </TD>

                          <TD className="text-right">
                            <button
                              type="button"
                              className="px-3 py-2 rounded-2xl bg-gray-900 text-white text-xs font-black"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenRetailer(r.retailerId);
                              }}
                            >
                              Open Retailer
                            </button>
                          </TD>
                        </tr>
                      ))}

                      {!(data.topRetailers || []).length ? (
                        <tr className="border-t">
                          <TD colSpan={6} className="text-center text-gray-600 py-6">
                            No data for {mode}.
                          </TD>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </Block>

              <Block title="Top Cities (click)">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(data.topCities || []).map((c) => (
                    <button
                      type="button"
                      key={c.city}
                      className="p-3 rounded-xl border bg-white text-left hover:bg-gray-50"
                      onClick={() => onOpenCity(c.city)}
                      title="Open city"
                    >
                      <div className="font-bold">{c.city}</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Sales: <b>₹{money(c.sales)}</b> · Orders: <b>{c.orders}</b>
                      </div>
                    </button>
                  ))}
                  {!(data.topCities || []).length ? <div className="text-sm text-gray-600">No cities for {mode}.</div> : null}
                </div>
              </Block>

              <Block title="Adoption Gap (should buy but not buying)">
                <div className="space-y-2">
                  {(data.adoptionGap || []).slice(0, 12).map((r) => (
                    <button
                      type="button"
                      key={r.retailerId}
                      className="w-full p-2 rounded-xl border bg-white text-left hover:bg-gray-50"
                      onClick={() => onOpenRetailer(r.retailerId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-bold">{r.retailerName}</div>
                        <div className="text-xs text-gray-600">{r.city || "—"}</div>
                      </div>
                      <div className="text-xs text-gray-600 mt-1">{r.reason}</div>
                    </button>
                  ))}
                  {!(data.adoptionGap || []).length ? <div className="text-sm text-gray-600">No adoption gap list for {mode}.</div> : null}
                </div>
              </Block>

              <Block title="Cross-sell / Bundle pairs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(data.bundlePairs || []).map((x) => (
                    <div key={x.productName} className="p-3 rounded-xl border bg-white">
                      <div className="font-bold">{x.productName}</div>
                      <div className="text-xs text-gray-600 mt-1">Co-sales: ₹{money(x.coSales)}</div>
                    </div>
                  ))}
                  {!(data.bundlePairs || []).length ? <div className="text-sm text-gray-600">No pairs for {mode}.</div> : null}
                </div>
              </Block>
            </>
          ) : null}
        </div>
      </ModalShell>

      <ModalShell
        open={ordersOpen}
        onClose={() => {
          setOrdersOpen(false);
          setOrderOpen(false);
          setOrderId("");
          setOrderData(null);
        }}
        zIndex={90}
        widthClass="max-w-5xl"
        titleTop={
          <div>
            <div className="text-xs font-semibold text-gray-500">Orders</div>
            <div className="text-lg font-black text-gray-900">
              {ordersRetailer?.name || "—"} <span className="text-xs text-gray-500">({pName})</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">Orders list is product-filtered (this product items only).</div>
          </div>
        }
      >
        <div ref={ordersBodyRef} className="p-4 overflow-auto max-h-[75vh]">
          {ordersLoading ? <div className="text-sm text-gray-600">Loading orders…</div> : null}

          {!ordersLoading && ordersData && !ordersData.ok ? (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
              Error: {ordersData.error || "UNKNOWN"}
            </div>
          ) : null}

          {!ordersLoading && ordersData?.ok ? (
            <div className="overflow-x-auto border rounded-2xl bg-white">
              <table className="min-w-[800px] w-full text-[13px]">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left">
                    <TH>Order No</TH>
                    <TH>Status</TH>
                    <TH>Date</TH>
                    <TH className="text-right">Items</TH>
                    <TH className="text-right">Total</TH>
                  </tr>
                </thead>
                <tbody>
                  {(ordersData.orders || []).map((o) => (
                    <tr
                      key={o.id}
                      className="border-t cursor-pointer hover:bg-gray-50"
                      onClick={() => openOrder(o.id)}
                      title="Open order"
                    >
                      <TD className="font-bold underline underline-offset-2">{o.orderNo || o.id}</TD>
                      <TD>{o.status || "—"}</TD>
                      <TD>{o.createdAt ? dt(o.createdAt) : "—"}</TD>
                      <TD className="text-right">{Number(o.itemsCount || 0)}</TD>
                      <TD className="text-right font-black">₹{money(o.totalAmount)}</TD>
                    </tr>
                  ))}

                  {!(ordersData.orders || []).length ? (
                    <tr className="border-t">
                      <TD colSpan={5} className="text-center text-gray-600 py-6">
                        No orders found.
                      </TD>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </ModalShell>

      <ModalShell
        open={orderOpen}
        onClose={() => setOrderOpen(false)}
        zIndex={95}
        widthClass="max-w-5xl"
        titleTop={
          <div>
            <div className="text-xs font-semibold text-gray-500">Order Detail</div>
            <div className="text-lg font-black text-gray-900">{orderId || "—"}</div>
          </div>
        }
      >
        <div ref={orderBodyRef} className="p-4 overflow-auto max-h-[75vh]">
          {orderLoading ? <div className="text-sm text-gray-600">Loading order…</div> : null}

          {!orderLoading && orderData && !orderData.ok ? (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
              Error: {orderData.error || "UNKNOWN"}
            </div>
          ) : null}

          {!orderLoading && orderData?.ok ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <Info label="Order No" value={orderData.order?.orderNo || "—"} />
                <Info label="Status" value={orderData.order?.status || "—"} />
                <Info label="Date" value={orderData.order?.createdAt ? dt(orderData.order.createdAt) : "—"} />
                <Info label="Total" value={`₹${money(orderData.order?.totalAmount)}`} />
              </div>

              <div className="mt-4 p-3 rounded-2xl border bg-white">
                <div className="text-sm font-black text-gray-900">Items</div>
                <div className="mt-2 overflow-x-auto border rounded-2xl">
                  <table className="min-w-[700px] w-full text-[13px]">
                    <thead className="bg-gray-50 border-b">
                      <tr className="text-left">
                        <TH>Product</TH>
                        <TH className="text-right">Qty</TH>
                        <TH className="text-right">Rate</TH>
                        <TH className="text-right">Amount</TH>
                      </tr>
                    </thead>
                    <tbody>
                      {(orderData.items || []).map((it: any, idx: number) => (
                        <tr key={it.id || idx} className="border-t">
                          <TD className="font-bold">{it.productName || it.product?.name || "—"}</TD>
                          <TD className="text-right">{Number(it.qty || 0)}</TD>
                          <TD className="text-right">₹{money(it.rate || it.price)}</TD>
                          <TD className="text-right font-black">₹{money(it.amount || it.total)}</TD>
                        </tr>
                      ))}
                      {!(orderData.items || []).length ? (
                        <tr className="border-t">
                          <TD colSpan={4} className="text-center text-gray-600 py-6">
                            No items.
                          </TD>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </ModalShell>

      <ModalShell
        open={auditOpen}
        onClose={() => setAuditOpen(false)}
        zIndex={90}
        widthClass="max-w-5xl"
        titleTop={
          <div>
            <div className="text-xs font-semibold text-gray-500">Audit</div>
            <div className="text-lg font-black text-gray-900">
              {auditRetailer?.name || "—"} <span className="text-xs text-gray-500">({pName})</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Last audit: <b>{auditData?.lastAuditAt ? dt(auditData.lastAuditAt) : "—"}</b>
            </div>
          </div>
        }
      >
        <div ref={auditBodyRef} className="p-4 overflow-auto max-h-[75vh]">
          {auditLoading ? <div className="text-sm text-gray-600">Loading audit…</div> : null}

          {!auditLoading && auditData && !auditData.ok ? (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
              Error: {auditData.error || "UNKNOWN"}
            </div>
          ) : null}

          {!auditLoading && auditData?.ok ? (
            <div className="overflow-x-auto border rounded-2xl bg-white">
              <table className="min-w-[900px] w-full text-[13px]">
                <thead className="bg-gray-50 border-b">
                  <tr className="text-left">
                    <TH>Batch No</TH>
                    <TH className="text-right">Purchased</TH>
                    <TH className="text-right">Sold</TH>
                    <TH className="text-right">Pending</TH>
                  </tr>
                </thead>
                <tbody>
                  {(auditData.batches || []).map((b, idx) => (
                    <tr key={`${b.batchNo}-${idx}`} className="border-t">
                      <TD className="font-bold">{b.batchNo || "—"}</TD>
                      <TD className="text-right">{Number(b.purchasedQty || 0)}</TD>
                      <TD className="text-right">{Number(b.soldQty || 0)}</TD>
                      <TD className="text-right font-black">{Number(b.pendingQty || 0)}</TD>
                    </tr>
                  ))}

                  {!(auditData.batches || []).length ? (
                    <tr className="border-t">
                      <TD colSpan={4} className="text-center text-gray-600 py-6">
                        No audit batch data.
                      </TD>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </ModalShell>
    </>
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

function TH({ children, className = "" }: { children: any; className?: string }) {
  return <th className={["px-3 py-2 font-black", className].join(" ")}>{children}</th>;
}

function TD({
  children,
  className = "",
  colSpan,
  onClick,
  title,
}: {
  children: any;
  className?: string;
  colSpan?: number;
  onClick?: React.MouseEventHandler<HTMLTableCellElement>;
  title?: string;
}) {
  return (
    <td
      colSpan={colSpan}
      className={["px-4 py-2 align-top text-[12px]", className].join(" ")}
      onClick={onClick}
      title={title}
    >
      {children}
    </td>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div className="p-3 rounded-2xl border bg-white">
      <div className="text-[11px] font-semibold text-gray-500">{label}</div>
      <div className="mt-1 text-sm font-black text-gray-900">{value}</div>
    </div>
  );
}