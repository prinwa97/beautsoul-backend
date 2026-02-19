import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { bucketFromDaysLeft, daysLeft } from "@/lib/inventory/expiry";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

const allowed = new Set(["EXPIRED", "CRITICAL", "WARNING", "WATCH", "OK"]);

function clamp(n: number, a: number, b: number) {
  return Math.min(Math.max(n, a), b);
}

export async function GET(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) return jsonError("Unauthorized", 401);

    let entityType: "WAREHOUSE" | "DISTRIBUTOR";
    let entityId: string | null = null;

    if (session.role === "DISTRIBUTOR") {
      entityType = "DISTRIBUTOR";
      entityId = session.distributorId || null;
    } else if (session.role === "WAREHOUSE_MANAGER" || session.role === "ADMIN") {
      entityType = "WAREHOUSE";
      const u = new URL(req.url);

      // ✅ session type me warehouseId nahi hai, safe cast
      const s = session as any;
      entityId = (s?.warehouseId || u.searchParams.get("warehouseId") || null) as string | null;
    } else {
      return jsonError("Forbidden", 403);
    }

    if (!entityId) return jsonError("entityId missing", 400);

    const u = new URL(req.url);
    const bucket = (u.searchParams.get("bucket") || "CRITICAL").toUpperCase();
    const take = clamp(Number(u.searchParams.get("take") || 50), 1, 200);

    if (!allowed.has(bucket)) return jsonError("Invalid bucket", 400);

    const rows = (await prisma.inventoryBatch.findMany({
      where: {
        entityType,
        entityId,
        expiryDate: { not: null },
      } as any,
      orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }] as any,
      take,
    })) as any[];

    // ✅ NOW: map se bahar (single time)
    const now = new Date();

    const filtered = rows
      .map((r) => {
        const qtyAvail =
          Number(r.qtyAvailable ?? r.availableQty ?? r.qty ?? r.balanceQty ?? r.stockQty ?? 0) || 0;

        const batch =
          String(r.batchCode ?? r.batchNo ?? r.batch ?? r.code ?? r.batch_number ?? "") || null;

        const pid =
          String(
            r.productId ??
              r.productCatalogId ??
              r.productMasterId ??
              r.product_id ??
              r.product?.id ??
              ""
          ) || null;

        const pname = String(r.productName ?? r.product?.name ?? r.name ?? "") || null;

        const exp = r.expiryDate ? new Date(r.expiryDate) : null;

        // ✅ use same now (no redeclare)
        const dl = exp ? daysLeft(exp) : -99999;

        return {
          id: String(r.id),
          productId: pid,
          productName: pname,
          batchCode: batch,
          expiryDate: exp,
          daysLeft: dl,
          qtyAvailable: qtyAvail,
          inboundAt: r.createdAt ? new Date(r.createdAt) : null,
          bucket: bucketFromDaysLeft(dl),
        };
      })
      .filter((x) => x.qtyAvailable > 0)
      .filter((x) => x.bucket === bucket);

    return NextResponse.json({
      ok: true,
      entityType,
      entityId,
      bucket,
      total: filtered.length,
      rows: filtered,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}