import type { RetailerLedgerResp, RetailerRow } from "./distributor-ledger.types";

async function readJson(res: Response) {
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j as any)?.error || `Request failed: ${res.status}`);
  return j;
}

export async function fetchDistributorRetailers(): Promise<RetailerRow[]> {
  const res = await fetch("/api/distributor/retailers", { cache: "no-store" });
  const j = await readJson(res);
  // some projects return {retailers:[...]} some return [...]
  return Array.isArray(j) ? (j as RetailerRow[]) : ((j?.retailers || []) as RetailerRow[]);
}

export async function fetchRetailerLedger(retailerId: string, from?: string, to?: string): Promise<RetailerLedgerResp> {
  const qs = new URLSearchParams();
  qs.set("retailerId", retailerId);
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);
  const res = await fetch(`/api/ledger/retailer?${qs.toString()}`, { cache: "no-store" });
  return (await readJson(res)) as RetailerLedgerResp;
}

export async function addPayment(retailerId: string, amount: number, note?: string, refNo?: string) {
  const res = await fetch("/api/ledger/payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ retailerId, amount, note: note || null, refNo: refNo || null }),
  });
  return readJson(res);
}
