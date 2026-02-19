import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

function clamp(n: number, a: number, b: number) {
  return Math.min(Math.max(n, a), b);
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  let distributorId: string;
  try {
    distributorId = await requireDistributorId();
  } catch {
    return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const days = clamp(Number(searchParams.get("days") || "30"), 7, 365);
  const retailerId = String(searchParams.get("retailerId") || "").trim();

  if (!retailerId) {
    return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });
  }

  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));

  const orders = await prisma.order.findMany({
    where: {
      distributorId,
      retailerId,
      createdAt: { gte: from, lte: to },
      status: { in: ["SUBMITTED", "CONFIRMED", "DISPATCHED", "DELIVERED"] },
    },
    select: {
      items: { select: { productName: true, qty: true, rate: true, amount: true } }, // ✅ items
    },
  });

  const key = (s: any) => String(s || "").trim();
  const agg = new Map<string, { productName: string; amount: number; qty: number; orders: number }>();

  for (const o of orders) {
    const seen = new Set<string>();
    for (const it of o.items || []) {
      const pn = key(it.productName);
      if (!pn) continue;

      const qty = Number(it.qty || 0);
      const rate = Number(it.rate || 0);
      const amt = Number(it.amount ?? qty * rate);

      const row = agg.get(pn) || { productName: pn, amount: 0, qty: 0, orders: 0 };
      row.amount += amt;
      row.qty += qty;

      if (!seen.has(pn)) {
        row.orders += 1;
        seen.add(pn);
      }

      agg.set(pn, row);
    }
  }

  const rows = Array.from(agg.values()).sort((a, b) => b.amount - a.amount).slice(0, 10);

  return NextResponse.json({ ok: true, days, retailerId, rows });
}
