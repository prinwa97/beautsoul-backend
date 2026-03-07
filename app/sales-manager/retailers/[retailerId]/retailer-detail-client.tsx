"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type MonthWiseRow = {
  month: string;
  orders: number;
  orderQty: number;
  sales: number;
  physicalQty: number | null;
  soldQty?: number | null;
  auditMissing?: boolean;
};

type Resp = {
  ok: boolean;
  error?: string;
  retailer?: any;
  summary?: {
    totalOrders: number;
    totalSales: number;
    aov: number;
    lastOrderAt: string | null;
  };
  monthWise?: MonthWiseRow[];
};

type MonthDetailResp = {
  ok: boolean;
  error?: string;

  meta?: {
    month: string;
    orderModelKey: string;
    stockModelKey?: string | null;
    stockRowsCount?: number;
    hasPendingStock?: boolean;
    range?: { from: string; to: string };

    auditId?: string | null;
    auditAt?: string | null;
    auditItemsCount?: number;

    auditFoundInMonth?: boolean;
    latestAuditId?: string | null;
    latestAuditAt?: string | null;

    previousMonth?: string | null;
    previousAuditId?: string | null;
    previousAuditAt?: string | null;
    previousAuditItemsCount?: number;
  };

  summary?: { totalOrders: number; totalSales: number; aov: number };
  orders?: any[];

  orderedProducts?: Array<{
    productName: string;
    qty: number;
    amount: number;
    orders: number;

    pendingQtyPcs?: number;
    soldQtyPcs?: number | null;

    auditQtyPcs?: number | null;
    physicalQtyPcs?: number | null;
    physicalSource?: "AUDIT" | "PENDING" | "NONE";

    openingStockQtyPcs?: number | null;
    previousMonthPhysicalQtyPcs?: number | null;
  }>;

  pendingStock?: Array<{
    productName: string;
    qtyOnHandPcs: number;
    soldQtyPcs?: number | null;
    auditQtyPcs?: number | null;
    physicalQtyPcs?: number | null;
    physicalSource?: "AUDIT" | "PENDING" | "NONE";
    openingStockQtyPcs?: number | null;
    previousMonthPhysicalQtyPcs?: number | null;
  }>;
};

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function money(nv: any) {
  const v = Number(nv || 0);
  if (!Number.isFinite(v)) return "0";
  return v.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

function dt(s: any) {
  if (!s) return "—";
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("en-IN");
}

function clamp0(v: number) {
  return v < 0 ? 0 : v;
}

function pct(num: number, den: number) {
  if (!den) return 0;
  return (num / den) * 100;
}

function sourceBadgeCls(src?: string) {
  if (src === "AUDIT") return "bg-green-50 text-green-800 border-green-200";
  if (src === "PENDING") return "bg-blue-50 text-blue-800 border-blue-200";
  return "bg-gray-50 text-gray-800 border-gray-200";
}

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function getErrMsg(j: any, status: number) {
  const fromBody =
    j && typeof j === "object" ? (j.error || j.message || j.msg) : null;
  return String(fromBody || `HTTP_${status}`);
}

export default function RetailerDetailClient({
  retailerId,
}: {
  retailerId: string;
}) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);

  const [openMonth, setOpenMonth] = useState<string>("");
  const [modalOpen, setModalOpen] = useState(false);
  const [monthLoading, setMonthLoading] = useState(false);
  const [monthDetail, setMonthDetail] = useState<MonthDetailResp | null>(null);

  const api = useMemo(
    () => `/api/sales-manager/retailers/${encodeURIComponent(retailerId)}/detail`,
    [retailerId]
  );

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(api, { cache: "no-store" });
      const j = await safeJson<Resp>(res);

      if (!res.ok || !j) {
        const errMsg = getErrMsg(j, res.status);
        setData({ ok: false, error: errMsg });
        return;
      }

      if (!j.ok) {
        setData({ ok: false, error: j.error || "FAILED" });
        return;
      }

      setData(j);
    } catch (e: any) {
      setData({ ok: false, error: String(e?.message || e) });
    } finally {
      setLoading(false);
    }
  }

  async function openMonthModal(month: string) {
    if (!month) return;

    setOpenMonth(month);
    setModalOpen(true);
    setMonthLoading(true);
    setMonthDetail(null);

    try {
      const url = `/api/sales-manager/retailers/${encodeURIComponent(
        retailerId
      )}/month-detail?month=${encodeURIComponent(month)}`;

      const res = await fetch(url, { cache: "no-store" });
      const j = await safeJson<MonthDetailResp>(res);

      if (!res.ok || !j || !j.ok) {
        const errMsg = getErrMsg(j, res.status);
        setMonthDetail({ ok: false, error: errMsg });
        return;
      }

      setMonthDetail(j);
    } catch (e: any) {
      setMonthDetail({ ok: false, error: String(e?.message || e) });
    } finally {
      setMonthLoading(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setMonthDetail(null);
    setOpenMonth("");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const r = data?.retailer;
  const s = data?.summary;

  return (
    <div className="py-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Retailer Detail</h1>
          <div className="mt-1 text-sm text-gray-600">
            Retailer ID: <span className="font-mono">{retailerId}</span>
          </div>
        </div>

        <Link
          href="/sales-manager/retailers"
          className="rounded-2xl border bg-white px-3 py-2 text-sm font-black hover:bg-gray-50"
        >
          ← Back
        </Link>
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-gray-600">Loading retailer…</div>
      ) : null}

      {!loading && data && !data.ok ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Error: {data.error || "UNKNOWN"}
        </div>
      ) : null}

      {!loading && data?.ok ? (
        <>
          <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border bg-white p-4">
              <div className="text-xs font-semibold text-gray-500">Retailer</div>
              <div className="mt-1 text-xl font-black text-gray-900">
                {r?.name || "—"}
              </div>
              <div className="mt-2 text-sm text-gray-700">
                <div>
                  Phone: <span className="font-semibold">{r?.phone || "—"}</span>
                </div>
                <div>
                  GST: <span className="font-semibold">{r?.gst || "—"}</span>
                </div>
                <div>
                  City: <span className="font-semibold">{r?.city || "—"}</span>
                </div>
                <div>
                  State: <span className="font-semibold">{r?.state || "—"}</span>
                </div>
                <div>
                  Pincode: <span className="font-semibold">{r?.pincode || "—"}</span>
                </div>
                <div>
                  Status: <span className="font-semibold">{r?.status || "—"}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <div className="text-xs font-semibold text-gray-500">Distributor</div>
              <div className="mt-1 text-xl font-black text-gray-900">
                {r?.distributor?.name || "—"}
              </div>
              <div className="mt-2 text-sm text-gray-700">
                Dist ID:{" "}
                <span className="font-mono text-xs">
                  {r?.distributor?.id || "—"}
                </span>
              </div>
              <div className="mt-2 text-sm text-gray-700">
                Created: <span className="font-semibold">{dt(r?.createdAt)}</span>
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-4">
              <div className="text-xs font-semibold text-gray-500">Orders Summary</div>
              <div className="mt-1 grid grid-cols-2 gap-2">
                <Kpi title="Total Orders" value={s?.totalOrders ?? 0} />
                <Kpi title="Total Sales" value={`₹${money(s?.totalSales ?? 0)}`} />
                <Kpi title="AOV" value={`₹${money(s?.aov ?? 0)}`} />
                <Kpi
                  title="Last Order"
                  value={s?.lastOrderAt ? dt(s.lastOrderAt) : "—"}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border bg-white p-4">
            <div className="text-lg font-black text-gray-900">
              Month-wise Sales (Click month row)
            </div>

            <div className="mt-3 overflow-x-auto rounded-2xl border bg-white">
              <table className="min-w-[980px] w-full text-[13px]">
                <thead className="border-b bg-gray-50">
                  <tr className="text-left">
                    <TH>Month</TH>
                    <TH className="text-right">Orders</TH>
                    <TH className="text-right">Order Qty</TH>
                    <TH className="text-right">Physical Qty</TH>
                    <TH className="text-right">Sold Qty</TH>
                    <TH className="text-right">Sell-through%</TH>
                    <TH className="text-right">Sales</TH>
                    <TH className="text-right">AOV</TH>
                  </tr>
                </thead>

                <tbody>
                  {(data?.monthWise || []).map((m) => {
                    const aov = m.orders ? m.sales / m.orders : 0;
                    const hasAudit = m.physicalQty != null;
                    const soldQty = hasAudit
                      ? clamp0(n(m.orderQty) - n(m.physicalQty))
                      : null;
                    const sellThrough =
                      hasAudit && n(m.orderQty) > 0
                        ? pct(soldQty ?? 0, n(m.orderQty))
                        : null;

                    const auditMissing =
                      typeof m.auditMissing === "boolean"
                        ? m.auditMissing
                        : m.orders > 0 && !hasAudit;

                    return (
                      <tr
                        key={m.month}
                        onClick={() => openMonthModal(m.month)}
                        className="cursor-pointer border-t hover:bg-gray-50"
                      >
                        <TD className="font-bold">
                          <div className="flex items-center gap-2">
                            <span>{m.month}</span>
                            {auditMissing ? (
                              <Badge cls="border-yellow-200 bg-yellow-50 text-yellow-800">
                                Audit Missing
                              </Badge>
                            ) : null}
                          </div>
                        </TD>

                        <TD className="text-right">{m.orders}</TD>
                        <TD className="text-right font-black">{n(m.orderQty)}</TD>

                        <TD className="text-right font-black">
                          {m.physicalQty == null ? "—" : n(m.physicalQty)}
                        </TD>

                        <TD className="text-right font-black">
                          {soldQty == null ? "—" : soldQty}
                        </TD>

                        <TD className="text-right font-black">
                          {sellThrough == null ? "—" : `${sellThrough.toFixed(1)}%`}
                        </TD>

                        <TD className="text-right">₹{money(m.sales)}</TD>
                        <TD className="text-right">₹{money(aov)}</TD>
                      </tr>
                    );
                  })}

                  {!(data?.monthWise || []).length ? (
                    <tr className="border-t">
                      <TD colSpan={8} className="py-6 text-center text-gray-600">
                        No data.
                      </TD>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          {modalOpen ? (
            <MonthModal
              month={openMonth}
              loading={monthLoading}
              detail={monthDetail}
              onClose={closeModal}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function MonthModal({
  month,
  loading,
  detail,
  onClose,
}: {
  month: string;
  loading: boolean;
  detail: MonthDetailResp | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const auditAt = detail?.meta?.auditAt ? dt(detail.meta.auditAt) : null;
  const previousAuditAt = detail?.meta?.previousAuditAt
    ? dt(detail.meta.previousAuditAt)
    : null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-3">
        <div className="max-h-[90vh] w-full max-w-6xl overflow-auto rounded-2xl border bg-white shadow-xl">
          <div className="sticky top-0 flex items-center justify-between gap-3 border-b bg-white p-4">
            <div>
              <div className="text-xs font-semibold text-gray-500">Month Detail</div>
              <div className="text-lg font-black text-gray-900">{month}</div>

              <div className="mt-1 text-xs text-gray-600">
                Month Audit Used: <b>{auditAt || "—"}</b>
                {detail?.meta?.auditItemsCount ? (
                  <span className="text-gray-500">
                    {" "}
                    · items: {detail.meta.auditItemsCount}
                  </span>
                ) : null}
              </div>

              <div className="mt-1 text-xs text-gray-600">
                Previous Month Audit: <b>{previousAuditAt || "—"}</b>
                {detail?.meta?.previousMonth ? (
                  <span className="text-gray-500">
                    {" "}
                    · month: {detail.meta.previousMonth}
                  </span>
                ) : null}
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-xl border bg-white px-3 py-2 text-sm font-black hover:bg-gray-50"
            >
              ✕ Close
            </button>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="text-sm text-gray-600">Loading month detail…</div>
            ) : null}

            {!loading && detail && !detail.ok ? (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                Error: {detail.error || "UNKNOWN"}
              </div>
            ) : null}

            {!loading && detail?.ok ? (
              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                <div className="rounded-2xl border bg-white p-4 lg:col-span-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-gray-600">
                      Orders: <b>{detail.summary?.totalOrders ?? 0}</b> · Sales:{" "}
                      <b>₹{money(detail.summary?.totalSales ?? 0)}</b> · AOV:{" "}
                      <b>₹{money(detail.summary?.aov ?? 0)}</b>
                    </div>

                    {detail.meta?.range?.from ? (
                      <Badge cls="border-gray-200 bg-gray-50 text-gray-800">
                        Range: {new Date(detail.meta.range.from).toLocaleDateString("en-IN")} →{" "}
                        {new Date(detail.meta.range.to!).toLocaleDateString("en-IN")}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-4 lg:col-span-3">
                  <div className="text-base font-black text-gray-900">
                    Products (Opening + Ordered + Physical)
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Opening Stock = <b>previous month physical</b>. Physical = <b>AUDIT</b>{" "}
                    (if available) else <b>PENDING</b>. Sold Qty = <b>audit soldQty</b>,
                    otherwise formula: <b>Opening + Order Qty - Physical</b>.
                  </div>

                  <div className="mt-3 overflow-x-auto rounded-2xl border bg-white">
                    <table className="min-w-[1200px] w-full text-[13px]">
                      <thead className="border-b bg-gray-50">
                        <tr className="text-left">
                          <TH>Product</TH>
                          <TH className="text-right">Opening Stock</TH>
                          <TH className="text-right">Orders</TH>
                          <TH className="text-right">Order Qty</TH>
                          <TH className="text-right">Amount</TH>
                          <TH className="text-right">Sold Qty</TH>
                          <TH className="text-right">Audit Qty</TH>
                          <TH className="text-right">Physical</TH>
                          <TH>Src</TH>
                        </tr>
                      </thead>

                      <tbody>
                        {(detail.orderedProducts || []).map((p) => {
                          const openingStock =
                            p.openingStockQtyPcs != null
                              ? n(p.openingStockQtyPcs)
                              : p.previousMonthPhysicalQtyPcs != null
                              ? n(p.previousMonthPhysicalQtyPcs)
                              : 0;

                          const orderQty = n(p.qty);
                          const auditQty =
                            p.auditQtyPcs == null ? null : n(p.auditQtyPcs);
                          const physicalQty =
                            p.physicalQtyPcs == null ? null : n(p.physicalQtyPcs);

                          const soldQty =
                            p.soldQtyPcs != null
                              ? n(p.soldQtyPcs)
                              : physicalQty == null
                              ? null
                              : clamp0(openingStock + orderQty - physicalQty);

                          const src: "AUDIT" | "PENDING" | "NONE" =
                            (p.physicalSource as any) ||
                            (auditQty != null ? "AUDIT" : "NONE");

                          return (
                            <tr key={p.productName} className="border-t">
                              <TD className="font-bold">{p.productName}</TD>
                              <TD className="text-right font-black">{openingStock}</TD>
                              <TD className="text-right">{p.orders}</TD>
                              <TD className="text-right font-black">{orderQty}</TD>
                              <TD className="text-right">₹{money(p.amount)}</TD>
                              <TD className="text-right font-black">
                                {soldQty == null ? "—" : soldQty}
                              </TD>
                              <TD className="text-right font-black">
                                {auditQty == null ? "—" : auditQty}
                              </TD>
                              <TD className="text-right font-black">
                                {physicalQty == null ? "—" : physicalQty}
                              </TD>
                              <TD>
                                <Badge cls={sourceBadgeCls(src)}>{src}</Badge>
                              </TD>
                            </tr>
                          );
                        })}

                        {!(detail.orderedProducts || []).length ? (
                          <tr className="border-t">
                            <TD colSpan={9} className="py-6 text-center text-gray-600">
                              No products found.
                            </TD>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border bg-white p-4 lg:col-span-3">
                  <div className="text-base font-black text-gray-900">
                    Orders in {month}
                  </div>

                  <div className="mt-3 overflow-x-auto rounded-2xl border bg-white">
                    <table className="min-w-[1100px] w-full text-[13px]">
                      <thead className="border-b bg-gray-50">
                        <tr className="text-left">
                          <TH>Order No</TH>
                          <TH>Status</TH>
                          <TH>Created</TH>
                          <TH className="text-right">Total</TH>
                          <TH>Items</TH>
                        </tr>
                      </thead>
                      <tbody>
                        {(detail.orders || []).map((o: any) => (
                          <tr key={o.id} className="border-t align-top">
                            <TD className="font-bold">{o.orderNo || "—"}</TD>
                            <TD>{o.status || "—"}</TD>
                            <TD>{dt(o.createdAt)}</TD>
                            <TD className="text-right">₹{money(o.totalAmount)}</TD>
                            <TD>
                              {Array.isArray(o.items) && o.items.length ? (
                                <div className="flex flex-col gap-1">
                                  {o.items.map((it: any) => (
                                    <div key={it.id} className="text-[12px]">
                                      <span className="font-bold">
                                        {it.productName || "—"}
                                      </span>
                                      <span className="text-gray-500">
                                        {" "}
                                        · Qty: {Number(it.qty || 0)}
                                      </span>
                                      <span className="text-gray-500">
                                        {" "}
                                        · ₹{money(it.amount || 0)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-500">
                                  Items not available
                                </span>
                              )}
                            </TD>
                          </tr>
                        ))}

                        {!(detail.orders || []).length ? (
                          <tr className="border-t">
                            <TD colSpan={5} className="py-6 text-center text-gray-600">
                              No orders in this month.
                            </TD>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value }: { title: string; value: any }) {
  return (
    <div className="rounded-2xl border bg-white p-3">
      <div className="text-[11px] font-semibold text-gray-500">{title}</div>
      <div className="mt-1 text-sm font-black text-gray-900">{value}</div>
    </div>
  );
}

function Badge({ children, cls }: { children: any; cls: string }) {
  return (
    <span
      className={[
        "rounded-full border px-2 py-0.5 text-[11px] font-bold",
        cls,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function TH({
  children,
  className = "",
}: {
  children: any;
  className?: string;
}) {
  return <th className={["px-4 py-3 font-black", className].join(" ")}>{children}</th>;
}

function TD({
  children,
  className = "",
  colSpan,
}: {
  children: any;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={["px-4 py-3 align-top", className].join(" ")}>
      {children}
    </td>
  );
}