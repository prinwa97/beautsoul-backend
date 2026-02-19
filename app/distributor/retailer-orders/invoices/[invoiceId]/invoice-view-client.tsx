"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type InvoiceItem = {
  id: string;
  productName: string;
  qty: number;
  rate: number;
  amount: number;
  batchNo?: string | null;
};

type InvoiceResp = {
  ok: boolean;
  invoice?: {
    id: string;
    invoiceNo: string;
    createdAt: string;
    totalAmount: number;
    retailer?: { name: string; phone?: string | null; city?: string | null } | null;
    items?: InvoiceItem[];
  };
  error?: string;
};

function inr(n: number) {
  return new Intl.NumberFormat("en-IN").format(Number(n || 0));
}

export default function InvoiceViewClient() {
  const params = useParams() as any;

  // ✅ from route: /.../invoices/[invoiceId]
  const invoiceId = useMemo(() => String(params?.invoiceId || "").trim(), [params?.invoiceId]);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [inv, setInv] = useState<InvoiceResp["invoice"] | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      setInv(null);

      if (!invoiceId) {
        setErr("invoiceId missing in URL. List page se correct invoice id pass karo.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          `/api/distributor/retailer-orders/invoices/${encodeURIComponent(invoiceId)}`,
          { cache: "no-store", credentials: "include" }
        );

        const data = (await res.json().catch(() => null)) as InvoiceResp | null;

        if (!alive) return;

        if (!res.ok || !data?.ok) {
          setErr(data?.error || `Invoice API failed (${res.status})`);
          return;
        }

        setInv(data.invoice || null);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "Invoice load failed");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [invoiceId]);

  const pdfHref = invoiceId
    ? `/api/distributor/retailer-orders/invoices/${encodeURIComponent(invoiceId)}/pdf`
    : "#";

  return (
    <div className="min-h-screen bg-[#fff7f6] p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="rounded-2xl border bg-white shadow-sm p-4 md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm text-gray-500 font-semibold">Invoice</div>
              <h1 className="text-xl md:text-2xl font-extrabold">
                {loading ? "Loading..." : inv?.invoiceNo || "—"}
              </h1>

              {/* ✅ Debug line (temporary) */}
              <div className="mt-1 text-[11px] text-gray-400 font-semibold">
                invoiceId: {invoiceId || "MISSING"}
              </div>

              {inv?.createdAt ? (
                <div className="text-sm text-gray-600 font-semibold mt-1">
                  {new Date(inv.createdAt).toLocaleString("en-IN")}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="rounded-xl border px-4 py-2 text-sm font-extrabold hover:bg-gray-50"
              >
                Print
              </button>

              <a
                href={pdfHref}
                target={invoiceId ? "_blank" : undefined}
                rel="noreferrer"
                className={`rounded-xl px-4 py-2 text-sm font-extrabold ${
                  invoiceId ? "bg-black text-white" : "bg-gray-200 text-gray-500 cursor-not-allowed"
                }`}
                onClick={(e) => {
                  if (!invoiceId) e.preventDefault();
                }}
              >
                View / Download Invoice
              </a>
            </div>
          </div>

          {err ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 font-bold">
              {err}
            </div>
          ) : null}

          {!loading && !inv ? <div className="mt-4 text-gray-700 font-bold">Invoice not found.</div> : null}

          {inv ? (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border bg-gray-50 p-3">
                <div className="text-xs text-gray-600 font-bold">Billed To</div>
                <div className="font-extrabold">{inv.retailer?.name || "-"}</div>
                <div className="text-sm text-gray-600 font-semibold">
                  {inv.retailer?.phone || ""}
                  {inv.retailer?.city ? ` • ${inv.retailer.city}` : ""}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-xl border p-3">
                <div className="text-sm text-gray-600 font-bold">Total</div>
                <div className="text-xl font-extrabold">₹ {inr(inv.totalAmount)}</div>
              </div>

              <div className="overflow-auto rounded-xl border">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left">
                      <th className="p-3">Product</th>
                      <th className="p-3 text-right">Qty</th>
                      <th className="p-3 text-right">Rate</th>
                      <th className="p-3 text-right">Amount</th>
                      <th className="p-3">Batch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inv.items || []).map((it) => (
                      <tr key={it.id} className="border-t">
                        <td className="p-3 font-semibold">{it.productName}</td>
                        <td className="p-3 text-right font-bold">{it.qty}</td>
                        <td className="p-3 text-right">₹ {inr(it.rate)}</td>
                        <td className="p-3 text-right font-extrabold">₹ {inr(it.amount)}</td>
                        <td className="p-3 text-xs text-gray-700 font-semibold">{it.batchNo || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-gray-500 font-semibold">
                <Link href="/distributor/retailer-orders" className="underline">
                  Back to Retailer Orders
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .print\\:hidden {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>
    </div>
  );
}
