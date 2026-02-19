import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { InboundOrderStatus } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isWarehouseRole(role: unknown) {
  const r = String(role || "").toUpperCase();
  return r.includes("WAREHOUSE") || r.includes("STORE");
}

function toInt(v: string | null, def: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
}

export async function GET(req: Request) {
  try {
    const me = await getSessionUser();
    if (!me) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    if (!isWarehouseRole(me.role)) {
      return NextResponse.json(
        { ok: false, error: "Forbidden (Warehouse only)", role: me.role },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const take = Math.min(toInt(url.searchParams.get("take"), 200), 500);

    // optional status filter (validate against enum)
    const rawStatus = (url.searchParams.get("status") || "").trim().toUpperCase();

    // ✅ Valid statuses from schema
    const allowedStatuses: InboundOrderStatus[] = [
      InboundOrderStatus.CREATED,
      InboundOrderStatus.CONFIRMED,
      InboundOrderStatus.PAYMENT_VERIFIED,
      InboundOrderStatus.PACKED,
      InboundOrderStatus.DISPATCHED,
      InboundOrderStatus.IN_TRANSIT,
      InboundOrderStatus.DELIVERED,
      InboundOrderStatus.CANCELLED,
    ];

    const enumSet = new Set<string>(Object.values(InboundOrderStatus));

    const where: any = {};
    if (rawStatus) {
      // ✅ Only apply if it is a valid enum value, else ignore filter (no crash)
      if (enumSet.has(rawStatus)) {
        where.status = rawStatus as InboundOrderStatus;
      }
    } else {
      where.status = { in: allowedStatuses };
    }

    const orders = await prisma.inboundOrder.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        orderNo: true,
        status: true,
        createdAt: true,
        dispatchDate: true,

        paymentStatus: true,
        paymentVerified: true,
        paidAmount: true,
        utrNo: true,

        shippingMode: true,
        courierName: true,
        transportName: true,
        lrNo: true,
        trackingNo: true,
        trackingCarrier: true,

        forDistributorId: true,
        distributor: { select: { id: true, name: true, city: true, state: true } },
        items: { select: { id: true, productName: true, orderedQtyPcs: true, rate: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      take,
      count: orders.length,
      statusFilterApplied: enumSet.has(rawStatus) ? rawStatus : null,
      orders,
    });
  } catch (e: any) {
    console.error("GET /api/warehouse/inbound error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
