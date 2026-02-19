import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isWarehouseRole(role: unknown) {
  const r = String(role || "").toUpperCase();
  return r.includes("WAREHOUSE") || r.includes("STORE") || r === "ADMIN";
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ orderId: string }> }
) {
  try {
    const me = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!isWarehouseRole((me as any)?.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { orderId } = await ctx.params;

    const order = await prisma.inboundOrder.findUnique({
      where: { id: orderId },
      include: { items: true, distributor: true },
    });

    if (!order) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }

    // ✅ Company stock lots (your Stock-In writes here)
    const productNames = Array.from(new Set((order.items || []).map((x) => x.productName)));

    const lots = await prisma.stockLot.findMany({
      where: {
        ownerType: "COMPANY",
        ownerId: null,
        productName: { in: productNames },
        qtyOnHandPcs: { gt: 0 },
      },
      orderBy: [{ expDate: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        productName: true,
        batchNo: true,
        mfgDate: true,
        expDate: true,
        qtyOnHandPcs: true,
        createdAt: true,
      },
    });

    // ✅ IMPORTANT: Keep response shape same as your UI expects (InventoryBatch-like)
    const batches = lots.map((l) => ({
      id: l.id,
      distributorId: order.forDistributorId, // for compatibility (UI uses it in type)
      productName: l.productName,
      batchNo: l.batchNo,
      mfgDate: l.mfgDate ? l.mfgDate.toISOString() : null,
      expiryDate: l.expDate ? l.expDate.toISOString() : null,
      qty: Number(l.qtyOnHandPcs || 0),
    }));

    return NextResponse.json({ ok: true, order, batches }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
