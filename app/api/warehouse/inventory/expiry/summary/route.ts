import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bucketFromDaysLeft, daysLeft } from "@/lib/inventory/expiry";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

type Bucket = "EXPIRED" | "CRITICAL" | "WARNING" | "WATCH" | "OK";
const BUCKETS: Bucket[] = ["EXPIRED", "CRITICAL", "WARNING", "WATCH", "OK"];

export async function GET(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) return jsonError("Unauthorized", 401);

    let entityType: "WAREHOUSE" | "DISTRIBUTOR";
    let entityId: string | null = null;

    const u = new URL(req.url);

    if (session.role === "DISTRIBUTOR") {
      entityType = "DISTRIBUTOR";
      entityId = session.distributorId || null;
    } else if (session.role === "WAREHOUSE_MANAGER" || session.role === "ADMIN") {
      entityType = "WAREHOUSE";
      const s: any = session; // ✅ warehouseId safe
      entityId = (s?.warehouseId || u.searchParams.get("warehouseId") || null) as string | null;
    } else {
      return jsonError("Forbidden", 403);
    }

    if (!entityId) return jsonError("entityId missing in session / query", 400);

    // ✅ Prisma fields mismatch se bachne ke liye "any" query
    const rows = (await (prisma as any).inventoryBatch.findMany({
      where: {
        entityType,
        entityId,
        // qtyAvailable field naam mismatch ho sakta hai → yahan mat lagao
        expiryDate: { not: null },
      },
      select: {
        // ✅ minimal safe fields (agar inme bhi mismatch ho, select hata do)
        expiryDate: true,
        qtyAvailable: true,
        availableQty: true,
        qty: true,
        balanceQty: true,
      },
    })) as any[];

    const out: Record<Bucket, { batches: number; qty: number }> = {
      EXPIRED: { batches: 0, qty: 0 },
      CRITICAL: { batches: 0, qty: 0 },
      WARNING: { batches: 0, qty: 0 },
      WATCH: { batches: 0, qty: 0 },
      OK: { batches: 0, qty: 0 },
    };

    for (const r of rows) {
      if (!r?.expiryDate) continue;

      const qtyAvail =
        Number(r.qtyAvailable ?? r.availableQty ?? r.qty ?? r.balanceQty ?? 0) || 0;

      if (qtyAvail <= 0) continue;

      const b = bucketFromDaysLeft(daysLeft(new Date(r.expiryDate))) as Bucket;

      if (!BUCKETS.includes(b)) continue;

      out[b].batches += 1;
      out[b].qty += qtyAvail;
    }

    return NextResponse.json({
      ok: true,
      entityType,
      entityId,
      summary: out,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}