import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isWarehouseRole(role: unknown) {
  const r = String(role || "").toUpperCase();
  return r.includes("WAREHOUSE") || r.includes("STORE") || r === "ADMIN";
}

export async function GET() {
  try {
    const me: any = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!isWarehouseRole(me?.role)) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    // last 200 verified inbound orders
    const rows = await prisma.inboundOrder.findMany({
      where: { paymentVerified: true, paymentVerifiedAt: { not: null } },
      orderBy: { paymentVerifiedAt: "desc" },
      take: 200,
      select: {
        id: true,
        orderNo: true,
        createdAt: true,
        paymentVerifiedAt: true,
        paymentVerifiedByUserId: true,
      },
    });

    let totalMs = 0;
    let cnt = 0;
    const buckets = { lt1h: 0, h1_6: 0, h6_24: 0, gt24: 0 };

    for (const r of rows) {
      const a = r.createdAt?.getTime?.() ? r.createdAt.getTime() : new Date(r.createdAt as any).getTime();
      const b = r.paymentVerifiedAt?.getTime?.()
        ? r.paymentVerifiedAt.getTime()
        : new Date(r.paymentVerifiedAt as any).getTime();

      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;

      const diff = Math.max(0, b - a);
      totalMs += diff;
      cnt++;

      const hours = diff / (1000 * 60 * 60);
      if (hours < 1) buckets.lt1h++;
      else if (hours < 6) buckets.h1_6++;
      else if (hours < 24) buckets.h6_24++;
      else buckets.gt24++;
    }

    const avgHours = cnt ? totalMs / cnt / (1000 * 60 * 60) : null;

    return NextResponse.json({ ok: true, avgHours, sample: cnt, buckets });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e || "Server error") }, { status: 500 });
  }
}
