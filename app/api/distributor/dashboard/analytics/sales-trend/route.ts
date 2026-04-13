import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const distributorId = await requireDistributorId();
    const { searchParams } = new URL(req.url);

    const daysRaw = Number(searchParams.get("days") || "7");
    const days = Math.min(Math.max(1, daysRaw), 31);

    const now = new Date();
    const from = startOfDay(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000));
    const to = now;

    const invoices = await prisma.invoice.findMany({
      where: {
        distributorId, // ✅ ONLY THIS
        createdAt: { gte: from, lte: to },
      },
      select: { createdAt: true, totalAmount: true },
      orderBy: { createdAt: "asc" },
    });

    const map = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
      map.set(ymd(d), 0);
    }

    for (const inv of invoices) {
      const k = ymd(inv.createdAt);
      map.set(k, (map.get(k) || 0) + Math.round(Number(inv.totalAmount || 0)));
    }

    const list = Array.from(map.entries()).map(([date, amount]) => ({ date, amount }));

    return NextResponse.json({ ok: true, days, list });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}