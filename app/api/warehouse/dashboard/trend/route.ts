import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isWarehouseRole(role: unknown) {
  const r = String(role || "").toUpperCase();
  return r.includes("WAREHOUSE") || r.includes("STORE") || r === "ADMIN";
}

function monthStart(y: number, m: number) {
  return new Date(y, m, 1);
}
function ym(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function GET() {
  try {
    const me: any = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!isWarehouseRole(me?.role)) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const now = new Date();
    const months: { key: string; start: Date; end: Date }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const start = monthStart(d.getFullYear(), d.getMonth());
      const end = monthStart(d.getFullYear(), d.getMonth() + 1);
      months.push({ key: ym(start), start, end });
    }

    const rows = [];
    for (const m of months) {
      const agg = await prisma.invoiceItem.aggregate({
        where: { invoice: { createdAt: { gte: m.start, lt: m.end } } },
        _sum: { qty: true, amount: true },
      });
      rows.push({
        month: m.key,
        qty: Number(agg._sum.qty || 0),
        amount: Number(agg._sum.amount || 0),
      });
    }

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e || "Server error") }, { status: 500 });
  }
}
