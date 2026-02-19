import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

function toDate(s: string | null, fallback: Date) {
  if (!s) return fallback;
  const d = new Date(s);
  return isNaN(d.getTime()) ? fallback : d;
}

export async function GET(req: Request) {
  const distributorId = await requireDistributorId();
  const { searchParams } = new URL(req.url);

  const to = toDate(searchParams.get("to"), new Date());
  const from = toDate(searchParams.get("from"), new Date(Date.now() - 29 * 86400000));
  const sort = (searchParams.get("sort") || "pending_desc").toLowerCase();

  const rows = await prisma.retailerLedger.findMany({
    where: {
      distributorId,
      date: { gte: from, lte: to },
    },
    select: { retailerId: true, type: true, amount: true, date: true },
  });

  const m = new Map<
    string,
    { debit: number; credit: number; lastOrderDate?: Date; lastPaymentDate?: Date }
  >();

  for (const r of rows) {
    const cur = m.get(r.retailerId) || { debit: 0, credit: 0 };
    if (r.type === "DEBIT") {
      cur.debit += r.amount;
      if (!cur.lastOrderDate || r.date > cur.lastOrderDate) cur.lastOrderDate = r.date;
    } else {
      cur.credit += r.amount;
      if (!cur.lastPaymentDate || r.date > cur.lastPaymentDate) cur.lastPaymentDate = r.date;
    }
    m.set(r.retailerId, cur);
  }

  const retailerIds = [...m.keys()];
  const retailers = await prisma.retailer.findMany({
    where: { id: { in: retailerIds } },
    select: { id: true, name: true, city: true },
  });

  const nameMap = new Map(retailers.map((r) => [r.id, r]));

  const list = retailerIds.map((id) => {
    const v = m.get(id)!;
    const pending = v.debit - v.credit;
    return {
      retailerId: id,
      name: nameMap.get(id)?.name || "Retailer",
      city: nameMap.get(id)?.city || "",
      debit: v.debit,
      credit: v.credit,
      pending,
      lastOrderDate: v.lastOrderDate || null,
      lastPaymentDate: v.lastPaymentDate || null,
    };
  });

  list.sort((a, b) => {
    if (sort === "sales_desc") return b.debit - a.debit;
    if (sort === "received_desc") return b.credit - a.credit;
    if (sort === "pending_asc") return a.pending - b.pending;
    return b.pending - a.pending; // pending_desc
  });

  return NextResponse.json({ from, to, list });
}
