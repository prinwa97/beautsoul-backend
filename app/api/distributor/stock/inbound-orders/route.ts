import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toInt(v: string | null, def: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
}

export async function GET(req: Request) {
  try {
    const distributorId = await requireDistributorId(); // should throw/return if not logged in

    const { searchParams } = new URL(req.url);
    const takeRaw = toInt(searchParams.get("take"), 50);
    const take = Math.min(Math.max(takeRaw, 1), 200);

    const orders = await prisma.inboundOrder.findMany({
      where: {
        forDistributorId: distributorId,
       status: { in: ["CREATED", "DISPATCHED", "IN_TRANSIT", "DELIVERED"] },
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        orderNo: true,
        status: true,
        createdAt: true,
        dispatchDate: true,

        shippingMode: true,
        courierName: true,
        transportName: true,

        lrNo: true,
        trackingNo: true,
        trackingCarrier: true,

        notes: true,

        items: {
          select: {
            id: true,
            productName: true,
            orderedQtyPcs: true,
            rate: true,
            batchNo: true,
            mfgDate: true,
            expiryDate: true,
          },
          orderBy: { productName: "asc" },
        },
      },
    });

    return NextResponse.json({ ok: true, orders });
  } catch (e: any) {
    console.error("GET /api/distributor/stock/inbound-orders error:", e);
    const msg = e?.message || "Server error";
    const status = msg.toLowerCase().includes("unauthor") ? 401 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
