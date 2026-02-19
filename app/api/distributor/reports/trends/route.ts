import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

function toDate(s: string | null, fallback: Date) {
  if (!s) return fallback;
  const d = new Date(s);
  return isNaN(d.getTime()) ? fallback : d;
}

function keyDay(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(req: Request) {
  const distributorId = await requireDistributorId();
  const { searchParams } = new URL(req.url);

  const to = toDate(searchParams.get("to"), new Date());
  const from = toDate(searchParams.get("from"), new Date(Date.now() - 29 * 86400000));

  const rows = await prisma.retailerLedger.findMany({
    where: { distributorId, date: { gte: from, lte: to } },
    select: { date: true, type: true, amount: true },
  });

  const map = new Map<string, { date: string; sales: number; received: number }>();

  for (const r of rows) {
    const k = keyDay(r.date);
    const cur = map.get(k) || { date: k, sales: 0, received: 0 };
    if (r.type === "DEBIT") cur.sales += r.amount;
    else cur.received += r.amount;
    map.set(k, cur);
  }

  const data = [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  return NextResponse.json({ from, to, data });
}
