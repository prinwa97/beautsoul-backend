import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function onlyNumber(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export async function GET(req: Request) {
  try {
    const session: any = await getSessionUser();
    if (!session || String(session.role) !== "DISTRIBUTOR" || !session.distributorId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const daysRaw = Number(url.searchParams.get("days") || "30");
    const days = Math.max(1, Math.min(Number.isFinite(daysRaw) ? Math.floor(daysRaw) : 30, 365));

    const to = new Date();
    const from = startOfDay(new Date(Date.now() - (days - 1) * 24 * 3600 * 1000));

    const rows = await prisma.order.findMany({
      where: {
        distributorId: session.distributorId,
        createdAt: { gte: from, lte: to },
        status: { in: ["SUBMITTED", "CONFIRMED", "DISPATCHED", "DELIVERED"] },
      },
      select: {
        createdAt: true,
        items: { select: { productName: true, qty: true, rate: true, amount: true } }, // ✅ items
      },
      orderBy: { createdAt: "asc" },
    });

    // Fill all dates
    const dayMap = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(from);
      d.setDate(d.getDate() + i);
      dayMap.set(ymd(d), 0);
    }

    const prodAgg = new Map<string, { productName: string; amount: number; qty: number }>();

    for (const o of rows) {
      const dayKey = ymd(new Date(o.createdAt));
      for (const it of o.items || []) {
        const name = String(it.productName || "").trim();
        if (!name) continue;

        const qty = Math.max(0, Math.floor(onlyNumber(it.qty)));
        const rate = onlyNumber(it.rate);
        const amt = it.amount != null ? onlyNumber(it.amount) : qty * rate;

        dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + Math.max(0, amt));

        const prev = prodAgg.get(name);
        if (!prev) prodAgg.set(name, { productName: name, amount: Math.max(0, amt), qty });
        else {
          prev.amount += Math.max(0, amt);
          prev.qty += qty;
        }
      }
    }

    const trend = Array.from(dayMap.entries()).map(([date, amount]) => ({
      date,
      amount: Math.round(amount),
    }));

    const topProducts = Array.from(prodAgg.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10)
      .map((x) => ({
        productName: x.productName,
        amount: Math.round(x.amount),
        qty: Math.round(x.qty),
      }));

    return NextResponse.json({ ok: true, days, trend, topProducts });
  } catch (e: any) {
    console.error("sales/graphs error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
