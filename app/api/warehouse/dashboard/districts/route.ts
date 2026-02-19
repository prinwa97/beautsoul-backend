import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isWarehouseRole(role: unknown) {
  const r = String(role || "").toUpperCase();
  return r.includes("WAREHOUSE") || r.includes("STORE") || r === "ADMIN";
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

export async function GET() {
  try {
    const me: any = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!isWarehouseRole(me?.role)) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const now = new Date();
    const m0s = monthStart(now);
    const m0e = addMonths(m0s, 1);
    const m1s = addMonths(m0s, -1);
    const m1e = m0s;

    // we use Invoice -> distributor -> district
    const m0Inv = await prisma.invoice.findMany({
      where: { createdAt: { gte: m0s, lt: m0e } },
      select: { totalAmount: true, distributor: { select: { district: true } } },
      take: 50000,
    });

    const m1Inv = await prisma.invoice.findMany({
      where: { createdAt: { gte: m1s, lt: m1e } },
      select: { totalAmount: true, distributor: { select: { district: true } } },
      take: 50000,
    });

    function bucket(inv: typeof m0Inv) {
      const map = new Map<string, number>();
      for (const x of inv) {
        const d = String(x.distributor?.district || "UNKNOWN").trim() || "UNKNOWN";
        map.set(d, (map.get(d) || 0) + Number(x.totalAmount || 0));
      }
      return map;
    }

    const b0 = bucket(m0Inv);
    const b1 = bucket(m1Inv);

    const districts = new Set<string>([...b0.keys(), ...b1.keys()]);
    const rows = Array.from(districts).map((district) => {
      const m0Amt = b0.get(district) || 0;
      const m1Amt = b1.get(district) || 0;
      const growthPct = m1Amt > 0 ? ((m0Amt - m1Amt) / m1Amt) * 100 : null;
      return { district, m0Amt, m1Amt, growthPct };
    });

    rows.sort((a, b) => b.m0Amt - a.m0Amt);

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e || "Server error") }, { status: 500 });
  }
}
