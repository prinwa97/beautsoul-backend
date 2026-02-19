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
  const productName = String(searchParams.get("productName") || "").trim();

  if (!productName) {
    return NextResponse.json({ ok: false, error: "productName required" }, { status: 400 });
  }

  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - (days - 1));

  const orders = await prisma.order.findMany({
    where: {
      distributorId,
      createdAt: { gte: from, lte: to },
      // ✅ reduce scan: only orders that contain this product
      items: { some: { productName } },
      status: { in: ["SUBMITTED", "CONFIRMED", "DISPATCHED", "DELIVERED"] },
    },
    select: {
      retailerId: true,
      retailer: { select: { id: true, name: true, city: true } }, // ✅ retailer
      items: { select: { productName: true, qty: true, rate: true, amount: true } }, // ✅ items
    },
  });

  const key = (s: any) => String(s || "").trim().toLowerCase();
  const targetK = key(productName);

  const agg = new Map<
    string,
    { retailerId: string; retailerName: string; city: string | null; amount: number; qty: number; orders: number }
  >();

  for (const o of orders) {
    const rid = String(o.retailerId || o.retailer?.id || "");
    if (!rid) continue;

    let has = false;
    let orderQty = 0;
    let orderAmt = 0;

    for (const it of o.items || []) {
      if (key(it.productName) !== targetK) continue;

      const qty = Number(it.qty || 0);
      const rate = Number(it.rate || 0);
      const amt = Number(it.amount ?? qty * rate);

      orderQty += qty;
      orderAmt += amt;
      if (qty > 0 || amt > 0) has = true;
    }

    if (!has) continue;

    const name = o.retailer?.name || "Retailer";
    const city = o.retailer?.city ?? null;

    const row = agg.get(rid) || {
      retailerId: rid,
      retailerName: name,
      city,
      amount: 0,
      qty: 0,
      orders: 0,
    };

    row.amount += orderAmt;
    row.qty += orderQty;
    row.orders += 1;
    agg.set(rid, row);
  }

  const rows = Array.from(agg.values()).sort((a, b) => b.amount - a.amount).slice(0, 10);

  return NextResponse.json({ ok: true, days, productName, rows });
}
