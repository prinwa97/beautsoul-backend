"use client";

import React, { useEffect, useMemo, useState } from "react";

type SortKey = "RECENT" | "OLDEST" | "HIGH" | "LOW" | "NAME_AZ";

type RetailerRow = {
  retailerId: string;
  name: string;
  city?: string | null;
  phone?: string | null;
  balance: number; // + = due (collect), - = advance
  absBalance: number;
  lastLedgerAt?: string | null;
};

type LedgerRow = {
  id: string;
  date: string;
  type: "DEBIT" | "CREDIT";
  amount: number;
  reference?: string | null;
  narration?: string | null;
};

type PayMode = "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";

function inr(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function ymd(iso: string) {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function todayYMD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function Icon({ name }: { name: "download" | "close" | "rupee" }) {
  const c = "h-5 w-5";
  if (name === "download")
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none">
        <path d="M12 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path
          d="M8 11l4 4 4-4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );

  if (name === "close")
    return (
      <svg className={c} viewBox="0 0 24 24" fill="none">
        <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );

  return (
    <svg className={c} viewBox="0 0 24 24" fill="none">
      <path
        d="M7 6h10M7 10h10M9 18l4-4c1.5-1.5 1-4-1.5-4H7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function CollectionPage() {
  // List
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("RECENT");
  const [rows, setRows] = useState<RetailerRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Ledger drawer
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<RetailerRow | null>(null);
  const [ledger, setLedger] = useState<LedgerRow[]>([]);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerSkip, setLedgerSkip] = useState(0);
  const [ledgerTake] = useState(30);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Collect modal
  const [collectOpen, setCollectOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState<PayMode>("UPI");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayYMD());
  const [saving, setSaving] = useState(false);

  // Toast
  const [toast, setToast] = useState("");

  async function loadList(nextQ: string, nextSort: SortKey) {
    setLoading(true);
    try {
      const r = await fetch(
        `/api/field-officer/collections/retailers?q=${encodeURIComponent(nextQ)}&take=200&sort=${encodeURIComponent(
          nextSort
        )}`,
        { cache: "no-store" }
      );
      const j = await r.json();
      setRows(j?.rows || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadList("", sort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => loadList(q, sort), 250);
    return () => clearTimeout(t);
  }, [q, sort]);

  async function openLedger(r: RetailerRow) {
    setToast("");
    setActive(r);
    setOpen(true);

    setLedger([]);
    setLedgerSkip(0);
    await loadLedger(r.retailerId, 0, true);
  }

  async function loadLedger(retailerId: string, skip: number, reset = false) {
    setLedgerLoading(true);
    try {
      const res = await fetch(
        `/api/field-officer/collections/ledger?retailerId=${encodeURIComponent(retailerId)}&take=${ledgerTake}&skip=${skip}`,
        { cache: "no-store" }
      );
      const j = await res.json();
      if (!j?.ok) {
        setToast(j?.error || "Ledger load failed");
        return;
      }

      setLedgerTotal(Number(j.total || 0));

      const newRows = (j.rows || []).map((x: any) => ({
        id: x.id,
        date: x.date,
        type: x.type,
        amount: Number(x.amount || 0),
        reference: x.reference ?? null,
        narration: x.narration ?? null,
      })) as LedgerRow[];

      setLedger((prev) => (reset ? newRows : [...prev, ...newRows]));
      setLedgerSkip(skip);
    } finally {
      setLedgerLoading(false);
    }
  }

  // ✅ Outstanding running balance for each ledger row
  // Rule: DEBIT increases due, CREDIT reduces due
  const ledgerWithBalance = useMemo(() => {
    const items = [...ledger];

    // running calc needs oldest -> newest
    items.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let bal = 0;
    const withBal = items.map((it) => {
      const amt = Number(it.amount || 0);
      if (it.type === "DEBIT") bal += amt;
      else if (it.type === "CREDIT") bal -= amt;
      return { ...it, balanceAfter: bal };
    });

    // UI: newest-first
    withBal.reverse();
    return withBal;
  }, [ledger]);

  // ✅ Color + label rule:
  // + => Due (company will collect) => RED
  // - => Advance (retailer paid extra) => GREEN
  function balanceColor(b: number) {
    if (b > 0) return "text-red-600";
    if (b < 0) return "text-green-600";
    return "text-gray-600";
  }
  function balanceLabel(b: number) {
    if (b > 0) return "Due";
    if (b < 0) return "Advance";
    return "Clear";
  }

  function closeLedger() {
    setOpen(false);
  }

  function openCollect() {
    if (!active) {
      setToast("Select retailer first");
      return;
    }
    setCollectOpen(true);
    setAmount("");
    setMode("UPI");
    setReference("");
    setNote("");
    setDate(todayYMD());
    setToast("");
  }

  function closeCollect() {
    setCollectOpen(false);
    setSaving(false);
  }

  async function saveCollection() {
    if (!active) return;

    const amt = Math.floor(Number(amount || 0));
    if (!Number.isFinite(amt) || amt <= 0) {
      setToast("Enter valid amount");
      return;
    }
    if (mode !== "CASH" && !reference.trim()) {
      setToast("UTR / Reference required");
      return;
    }

    setSaving(true);
    setToast("");

    try {
      const res = await fetch("/api/field-officer/collections/collect-retailer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          retailerId: active.retailerId,
          amount: amt,
          mode,
          reference: reference.trim() || null,
          note: note.trim() || null,
          date,
        }),
      });

      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) {
        setToast(j?.error || "Failed to save");
        setSaving(false);
        return;
      }

      setToast("✅ Saved");
      setSaving(false);

      // refresh list + ledger + selected header values
      await loadList(q, sort);

      // reload ledger
      await loadLedger(active.retailerId, 0, true);

      // close modal
      setTimeout(() => closeCollect(), 450);
    } catch (e: any) {
      setToast(e?.message || "Failed to save");
      setSaving(false);
    }
  }

  const compactRows = useMemo(() => rows, [rows]);

  return (
    <div className="p-0 space-y-">
    <div className="flex items-end justify-center">
      <div>
        <div className="text-2xl font-extrabold">Collection</div>
      </div>
    </div>

      {/* Filters */}
      <div className="rounded-2xl border border-black/10 bg-white p-3 shadow-sm space-y-2">
        <input
          placeholder="Search retailer / city / phone…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-xl border border-black/10 bg-black/5 px-3 py-3 text-sm outline-none"
        />

        <div className="flex items-center gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="flex-1 rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-semibold outline-none"
          >
            <option value="RECENT">Most recent</option>
            <option value="OLDEST">Oldest</option>
            <option value="HIGH">Highest amount</option>
            <option value="LOW">Least amount</option>
            <option value="NAME_AZ">Name A to Z</option>
          </select>

          {/* Download selected retailer ledger */}
          <button
            type="button"
            onClick={() => {
              if (!active) {
                setToast("Select retailer to download ledger");
                return;
              }
              window.location.href = `/api/field-officer/collections/ledger/export?retailerId=${encodeURIComponent(
                active.retailerId
              )}`;
            }}
            className="rounded-xl border border-black/10 bg-white px-3 py-2 text-gray-800 shadow-sm"
            title="Download selected retailer ledger"
          >
            <Icon name="download" />
          </button>
        </div>
      </div>

      {toast ? (
        <div className="rounded-2xl bg-black/5 px-4 py-3 text-sm font-semibold text-gray-800">{toast}</div>
      ) : null}

      {/* Retailer list */}
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : compactRows.length ? (
        <div className="space-y-2">
          {compactRows.map((r) => {
            const b = Number(r.balance || 0);
            const isActive = active?.retailerId === r.retailerId;

            return (
              <button
                key={r.retailerId}
                type="button"
                onClick={() => openLedger(r)}
                className={[
                  "w-full rounded-xl border bg-white px-3 py-2 text-left shadow-sm active:scale-[0.99]",
                  isActive ? "border-gray-900" : "border-black/10",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-900">{r.name}</div>
                    <div className="truncate text-[11px] text-gray-500">
                      {r.city || "—"}
                      {r.phone ? ` • ${r.phone}` : ""}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={["text-sm font-extrabold", balanceColor(b)].join(" ")}>
                      {inr(Math.abs(b))}
                    </div>
                    <div className="text-[10px] text-gray-500">{balanceLabel(b)}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-sm text-gray-500">No retailers found</div>
      )}

      {/* Ledger Drawer */}
      {open && active && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40">
          {/* Drawer */}
          <div className="w-full rounded-t-3xl bg-white shadow-2xl">
            {/* Header */}
            <div className="p-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-base font-extrabold">{active.name}</div>
                  <div className="mt-1 text-xs text-gray-500">
                    {active.city || "—"}
                    {active.phone ? ` • ${active.phone}` : ""}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-[11px] font-semibold">
                    <span className={balanceColor(active.balance)}>{inr(Math.abs(active.balance))}</span>
                    <span className="text-gray-600">{balanceLabel(active.balance)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = `/api/field-officer/collections/ledger/export?retailerId=${encodeURIComponent(
                        active.retailerId
                      )}`;
                    }}
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-gray-800 shadow-sm"
                    title="Download ledger CSV"
                  >
                    <Icon name="download" />
                  </button>
                  <button
                    type="button"
                    onClick={closeLedger}
                    className="rounded-xl bg-black/5 px-3 py-2 text-gray-800 shadow-sm"
                    title="Close"
                  >
                    <Icon name="close" />
                  </button>
                </div>
              </div>
            </div>

            {/* Ledger box */}
            <div className="mx-4 rounded-2xl border border-black/10 bg-white">
              <div className="flex items-center justify-between border-b border-black/10 px-3 py-2">
                <div className="text-xs font-semibold text-gray-700">
                  Ledger ({ledger.length}/{ledgerTotal})
                </div>
                <button
                  type="button"
                  disabled={ledgerLoading}
                  onClick={() => loadLedger(active.retailerId, 0, true)}
                  className="rounded-lg bg-black/5 px-2 py-1 text-xs font-semibold text-gray-700 disabled:opacity-60"
                >
                  Refresh
                </button>
              </div>

              {/* Scroll area */}
              <div className="max-h-[48vh] overflow-y-auto">
                {ledgerWithBalance.length ? (
                  <div className="divide-y divide-black/10">
                    {ledgerWithBalance.map((x: any) => {
                      const isCredit = x.type === "CREDIT";
                      const cleared = isCredit && Number(x.balanceAfter || 0) === 0;

                      return (
                        <div key={x.id} className="px-3 py-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-[11px] text-gray-500">{ymd(x.date)}</div>
                              <div className="truncate text-xs font-semibold text-gray-900">
                                {x.narration || (isCredit ? "Payment received" : "Debit")}
                              </div>
                              {x.reference ? (
                                <div className="truncate text-[11px] text-gray-500">Ref: {x.reference}</div>
                              ) : null}
                            </div>

                            <div className="text-right">
                              <div
                                className={[
                                  "text-sm font-extrabold",
                                  isCredit ? "text-green-600" : "text-red-600",
                                ].join(" ")}
                              >
                                {inr(Number(x.amount || 0))}
                              </div>

                              {isCredit ? (
                                <div className="text-[10px] text-gray-500">
                                  Remaining: {inr(Number(x.balanceAfter || 0))}
                                  {cleared ? <span className="ml-2 font-semibold text-green-700">✅ Cleared</span> : null}
                                </div>
                              ) : (
                                <div className="text-[10px] text-gray-500">{x.type}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-3 py-6 text-sm text-gray-500">No ledger entries</div>
                )}
              </div>
            </div>

            {/* Sticky bottom action bar */}
            <div
              className="sticky bottom-0 mt-4 border-t border-black/10 bg-white p-4"
              style={{
                paddingBottom: "calc(env(safe-area-inset-bottom) + 88px)", // keeps above bottom nav
              }}
            >
              <button
                type="button"
                onClick={openCollect}
                className="w-full rounded-2xl bg-green-600 px-4 py-4 text-base font-extrabold text-white shadow-[0_10px_25px_rgba(0,0,0,0.18)] active:scale-[0.99]"
              >
                Collect Payment
              </button>
              <div className="mt-2 text-center text-[11px] text-gray-500">Button stays above bottom tabs</div>
            </div>
          </div>
        </div>
      )}

      {/* Collect Modal */}
      {collectOpen && active && (
        <div className="fixed inset-0 z-[60] flex items-end bg-black/40">
          <div className="w-full rounded-t-3xl bg-white p-4 pb-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-base font-extrabold">Collect Payment</div>
                <div className="mt-1 text-xs text-gray-500">
                  {active.name} • {inr(Math.abs(active.balance))} {balanceLabel(active.balance)}
                </div>
              </div>
              <button
                type="button"
                onClick={closeCollect}
                className="rounded-xl bg-black/5 px-3 py-2 text-sm font-semibold"
              >
                Close
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <div className="text-xs font-semibold text-gray-700">Amount</div>
                <input
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  type="number"
                  inputMode="numeric"
                  placeholder="Enter amount"
                  className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-base font-semibold outline-none"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  {[500, 1000, 2000, 5000].map((x) => (
                    <button
                      key={x}
                      type="button"
                      onClick={() => setAmount(String(x))}
                      className="rounded-full bg-black/5 px-3 py-1 text-xs font-semibold text-gray-700"
                    >
                      {inr(x)}
                    </button>
                  ))}
                  {active.balance > 0 && (
                    <button
                      type="button"
                      onClick={() => setAmount(String(Math.floor(Math.abs(active.balance))))}
                      className="rounded-full bg-green-600 px-3 py-1 text-xs font-semibold text-white"
                    >
                      Full Due
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-700">Mode</div>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as PayMode)}
                  className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm font-semibold outline-none"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div>
                <div className="text-xs font-semibold text-gray-700">Date</div>
                <input
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  type="date"
                  className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-3 py-3 text-sm font-semibold outline-none"
                />
              </div>

              <div className="col-span-2">
                <div className="text-xs font-semibold text-gray-700">UTR / Reference</div>
                <input
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder={mode === "CASH" ? "Optional for Cash" : "Required for this mode"}
                  className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none"
                />
              </div>

              <div className="col-span-2">
                <div className="text-xs font-semibold text-gray-700">Note</div>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note"
                  className="mt-1 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none"
                />
              </div>
            </div>

            {toast ? (
              <div className="mt-3 rounded-2xl bg-black/5 px-4 py-3 text-sm font-semibold text-gray-800">{toast}</div>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeCollect}
                disabled={saving}
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-bold text-gray-900 shadow-sm disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCollection}
                disabled={saving}
                className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-extrabold text-white shadow-sm disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}