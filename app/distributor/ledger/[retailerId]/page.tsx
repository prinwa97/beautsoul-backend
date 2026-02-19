"use client";

import React, { useEffect, useMemo, useState, use } from "react";
import Link from "next/link";

type SummaryResponse = {
  ok: boolean;
  retailer: { id: string; name: string; phone?: string | null; city?: string | null; status?: string | null };
  totals: { totalDebit: number; totalCredit: number; receivable: number };
  error?: string;
};

type LedgerRow = {
  id: string;
  date: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  reference?: string | null;
  narration?: string | null;
};

type EntriesResponse = {
  ok: boolean;
  total: number;
  rows: LedgerRow[];
  take: number;
  skip: number;
  error?: string;
};

type PaymentMode = "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";

type SortMode =
  | "recent"
  | "oldest"
  | "high"
  | "low"
  | "type"
  | "ref";

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function fmtDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function asTime(iso: string) {
  const d = new Date(iso);
  const t = d.getTime();
  return Number.isFinite(t) ? t : 0;
}

export default function RetailerLedgerPage({
  params,
}: {
  params: Promise<{ retailerId: string }>;
}) {
  // ✅ Next.js 15/16 fix: params is Promise
  const { retailerId } = use(params);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [err, setErr] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [entries, setEntries] = useState<LedgerRow[]>([]);
  const [total, setTotal] = useState(0);

  // filters
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortMode>("recent");

  // add payment modal
  const [payOpen, setPayOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("CASH");
  const [amount, setAmount] = useState<string>("");
  const [utrNo, setUtrNo] = useState<string>("");
  const [narration, setNarration] = useState<string>("");

  async function loadAll() {
    setLoading(true);
    setErr(null);

    try {
      // ✅ summary
      const sRes = await fetch(
        `/api/distributor/retailer-ledger/summary?retailerId=${encodeURIComponent(retailerId)}`,
        { cache: "no-store" }
      );
      const sJson = (await sRes.json().catch(() => null)) as SummaryResponse | null;

      if (!sRes.ok || !sJson?.ok) {
        setSummary(null);
        setEntries([]);
        setTotal(0);
        setErr(sJson?.error || "Summary load failed");
        return;
      }
      setSummary(sJson);

      // ✅ entries
      const eRes = await fetch(
        `/api/distributor/retailer-ledger/entries?retailerId=${encodeURIComponent(retailerId)}&take=200`,
        { cache: "no-store" }
      );
      const eJson = (await eRes.json().catch(() => null)) as EntriesResponse | null;

      if (!eRes.ok || !eJson?.ok) {
        setEntries([]);
        setTotal(0);
        setErr(eJson?.error || "Entries load failed");
        return;
      }

      setEntries(Array.isArray(eJson.rows) ? eJson.rows : []);
      setTotal(num(eJson.total));
    } catch (e: any) {
      setErr(e?.message || "Network error");
      setSummary(null);
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retailerId]);

  const totals = summary?.totals || { totalDebit: 0, totalCredit: 0, receivable: 0 };

  const balanceColor =
    totals.receivable > 0 ? "text-red-700" : totals.receivable < 0 ? "text-green-700" : "text-gray-700";

  const retailer = summary?.retailer;

  const filteredSorted = useMemo(() => {
    const s = q.trim().toLowerCase();

    let list = !s
      ? entries
      : entries.filter((x) => {
          const ref = (x.reference || "").toLowerCase();
          const nar = (x.narration || "").toLowerCase();
          const typ = (x.type || "").toLowerCase();
          const amt = String(x.amount || 0);
          return ref.includes(s) || nar.includes(s) || typ.includes(s) || amt.includes(s);
        });

    list = [...list].sort((a, b) => {
      if (sort === "type") return (a.type || "").localeCompare(b.type || "");
      if (sort === "ref") return (a.reference || "").localeCompare(b.reference || "");
      if (sort === "high") return num(b.amount) - num(a.amount);
      if (sort === "low") return num(a.amount) - num(b.amount);
      if (sort === "oldest") return asTime(a.date) - asTime(b.date);
      return asTime(b.date) - asTime(a.date); // recent
    });

    return list;
  }, [entries, q, sort]);

  // ✅ Running balance (oldest -> newest compute, then map back)
  const rowsWithBalance = useMemo(() => {
    const asc = [...filteredSorted].sort((a, b) => asTime(a.date) - asTime(b.date));
    let bal = 0;
    const map = new Map<string, number>();

    for (const r of asc) {
      if (r.type === "DEBIT") bal += num(r.amount);
      else bal -= num(r.amount);
      map.set(r.id, bal);
    }

    return filteredSorted.map((r) => ({ ...r, balance: map.get(r.id) ?? 0 }));
  }, [filteredSorted]);

  async function submitPayment() {
    const amt = num(amount);

    if (!amt || amt <= 0) return setErr("Amount must be > 0");
    if (paymentMode !== "CASH" && !utrNo.trim()) return setErr("UTR required for non-cash payments");

    setSaving(true);
    setErr(null);

    try {
      const res = await fetch("/api/distributor/retailer-ledger/add-payment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          retailerId,
          amount: amt,
          paymentMode,
          utrNo: paymentMode === "CASH" ? "" : utrNo.trim(),
          narration: narration.trim(),
        }),
      });

      const j = await res.json().catch(() => null);

      if (!res.ok || !j?.ok) {
        setErr(j?.error || "Payment save failed");
        return;
      }

      // reset & refresh
      setPayOpen(false);
      setAmount("");
      setUtrNo("");
      setNarration("");
      await loadAll();
    } catch (e: any) {
      setErr(e?.message || "Payment save error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl border p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link href="/distributor/ledger" className="text-sm text-gray-600 hover:underline">
                ← Back
              </Link>
              <span className="text-gray-300">|</span>
              <div className="text-xl font-bold text-gray-900 truncate">
                {retailer?.name || "Retailer Ledger"}
              </div>
            </div>
            <div className="text-sm text-gray-500">
              {retailer?.city || "—"} • {retailer?.phone || "—"}{" "}
              {retailer?.status ? `• ${retailer.status}` : ""}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAll()}
              className="rounded-xl border px-3 py-2 text-sm bg-white hover:bg-gray-50"
              disabled={loading}
            >
              Refresh
            </button>

            <button
              onClick={() => setPayOpen(true)}
              className="rounded-xl px-3 py-2 text-sm bg-pink-600 text-white hover:bg-pink-700"
            >
              + Add Payment
            </button>
          </div>
        </div>

        {loading ? (
          <div className="mt-3 text-sm text-gray-500">Loading…</div>
        ) : err ? (
          <div className="mt-3 text-sm text-red-600">{err}</div>
        ) : null}
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi title="Total Debit (Sales)" value={inr(totals.totalDebit)} />
        <Kpi title="Total Credit (Received)" value={inr(totals.totalCredit)} />
        <Kpi title="Receivable (Pending)" valueClass={balanceColor} value={inr(totals.receivable)} />
        <Kpi title="Entries" value={String(total)} />
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="text-sm text-gray-600">
            Showing <b className="text-gray-900">{rowsWithBalance.length}</b> rows
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search ref / narration / amount / type..."
              className="w-full sm:w-80 rounded-xl border px-3 py-2 text-sm bg-white"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="w-full sm:w-60 rounded-xl border px-3 py-2 text-sm bg-white"
            >
              <option value="recent">Most Recent</option>
              <option value="oldest">Oldest</option>
              <option value="high">Highest Amount</option>
              <option value="low">Least Amount</option>
              <option value="type">Type (DEBIT/CREDIT)</option>
              <option value="ref">Reference A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* All entries table */}
      <Card title={`Ledger Entries • ${rowsWithBalance.length}`}>
        <Table rows={rowsWithBalance} />
      </Card>

      {/* Payment modal */}
      {payOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-3">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">Add Payment</div>
                <div className="text-xs text-gray-500">Retailer: {retailer?.name || retailerId}</div>
              </div>
              <button
                onClick={() => setPayOpen(false)}
                className="rounded-lg px-3 py-1 text-sm hover:bg-gray-100"
                disabled={saving}
              >
                Close
              </button>
            </div>

            <div className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600">Payment Mode</label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white"
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                    <option value="CHEQUE">CHEQUE</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-600">Amount (₹)</label>
                  <input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    inputMode="numeric"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white"
                    placeholder="e.g. 1000"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-600">
                  UTR / Ref No {paymentMode === "CASH" ? "(optional)" : "(required)"}
                </label>
                <input
                  value={utrNo}
                  onChange={(e) => setUtrNo(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white"
                  placeholder={paymentMode === "CASH" ? "Optional" : "Required"}
                />
              </div>

              <div>
                <label className="text-xs text-gray-600">Narration (optional)</label>
                <input
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  className="mt-1 w-full rounded-xl border px-3 py-2 text-sm bg-white"
                  placeholder="e.g. Payment received"
                />
              </div>

              {err ? <div className="text-sm text-red-600">{err}</div> : null}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setPayOpen(false)}
                  className="rounded-xl border px-3 py-2 text-sm bg-white hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  onClick={submitPayment}
                  className="rounded-xl px-3 py-2 text-sm bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-60"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save Payment"}
                </button>
              </div>

              <div className="text-xs text-gray-500">
                Note: Running balance = DEBIT (sale) - CREDIT (payment)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- UI bits ---------------- */

function Kpi({
  title,
  value,
  valueClass,
}: {
  title: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border p-4 shadow-sm">
      <div className="text-sm text-gray-500">{title}</div>
      <div className={["mt-2 text-2xl font-extrabold", valueClass || "text-gray-900"].join(" ")}>
        {value}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b text-sm font-semibold text-gray-800">{title}</div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Badge({ type }: { type: "DEBIT" | "CREDIT" }) {
  return (
    <span
      className={[
        "text-xs px-2 py-0.5 rounded-full border",
        type === "DEBIT"
          ? "bg-yellow-50 text-yellow-800 border-yellow-200"
          : "bg-green-50 text-green-700 border-green-200",
      ].join(" ")}
    >
      {type}
    </span>
  );
}

function Table({ rows }: { rows: (LedgerRow & { balance?: number })[] }) {
  if (!rows.length) return <div className="text-sm text-gray-500">No entries.</div>;

  return (
    <div className="overflow-auto">
      <table className="min-w-[1050px] w-full text-sm">
        <thead className="text-xs text-gray-500 bg-gray-50">
          <tr className="border-b">
            <th className="text-left py-2 px-3 w-44">Date</th>
            <th className="text-left py-2 px-3 w-24">Type</th>
            <th className="text-right py-2 px-3 w-44">Amount</th>
            <th className="text-left py-2 px-3 w-56">Ref</th>
            <th className="text-left py-2 px-3">Narration</th>
            <th className="text-right py-2 px-3 w-52">Running Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((r) => (
            <tr key={r.id} className="align-top hover:bg-pink-50/60">
              <td className="py-2 px-3 whitespace-nowrap text-gray-800">{fmtDate(r.date)}</td>
              <td className="py-2 px-3">
                <Badge type={r.type} />
              </td>
              <td className="py-2 px-3 text-right font-semibold text-gray-900">
                {inr(Number(r.amount || 0))}
              </td>
              <td className="py-2 px-3 whitespace-nowrap text-gray-700">
                {r.reference || "—"}
              </td>
              <td className="py-2 px-3 text-gray-700">{r.narration || "—"}</td>
              <td className="py-2 px-3 text-right font-extrabold">
                <span className={(r.balance || 0) > 0 ? "text-red-700" : "text-gray-900"}>
                  {inr(Number(r.balance || 0))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
