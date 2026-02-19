import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isWarehouseRole(role: unknown) {
  const r = String(role || "").toUpperCase();
  return r.includes("WAREHOUSE") || r.includes("STORE") || r === "ADMIN" || r === "WAREHOUSE_MANAGER";
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : undefined;
}

function parseDateISO(v: any) {
  const s = cleanStr(v);
  if (!s) return undefined;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

type Mode = "COURIER" | "TRANSPORT" | "SELF";

export async function POST(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const me: any = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!isWarehouseRole(me?.role)) {
      return NextResponse.json({ ok: false, error: `Forbidden (role=${String(me?.role || "")})` }, { status: 403 });
    }

    const { orderId } = await ctx.params;
    if (!orderId) return NextResponse.json({ ok: false, error: "orderId missing" }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    const shippingMode = String(body?.shippingMode || "").toUpperCase() as Mode;
    if (!shippingMode || !["COURIER", "TRANSPORT", "SELF"].includes(shippingMode)) {
      return NextResponse.json({ ok: false, error: "shippingMode must be COURIER / TRANSPORT / SELF" }, { status: 400 });
    }

    const courierName = cleanStr(body?.courierName);
    const transportName = cleanStr(body?.transportName);
    const lrNo = cleanStr(body?.lrNo);
    const trackingNo = cleanStr(body?.trackingNo);
    const trackingCarrier = cleanStr(body?.trackingCarrier);
    const dispatchDate = parseDateISO(body?.dispatchDate) ?? new Date();

    // ✅ Mode-wise validation (trackingNo OPTIONAL for courier)
    if (shippingMode === "COURIER") {
      if (!courierName) return NextResponse.json({ ok: false, error: "courierName required" }, { status: 400 });
    }
    if (shippingMode === "TRANSPORT") {
      if (!transportName) return NextResponse.json({ ok: false, error: "transportName required" }, { status: 400 });
      if (!lrNo) return NextResponse.json({ ok: false, error: "lrNo required" }, { status: 400 });
    }

    const inbound = await prisma.inboundOrder.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, paymentVerified: true },
    });

    if (!inbound) return NextResponse.json({ ok: false, error: "Inbound order not found" }, { status: 404 });
    if (!inbound.paymentVerified) return NextResponse.json({ ok: false, error: "Payment not verified" }, { status: 400 });

    const st = String(inbound.status || "").toUpperCase();
    if (st === "CANCELLED") return NextResponse.json({ ok: false, error: "Order cancelled" }, { status: 400 });
    if (st === "DELIVERED") return NextResponse.json({ ok: false, error: "Already delivered" }, { status: 400 });

    if (st !== "PACKED" && st !== "DISPATCHED" && st !== "IN_TRANSIT") {
      return NextResponse.json({ ok: false, error: `Dispatch allowed only after PACKED (current=${st})` }, { status: 400 });
    }

    const updated = await prisma.inboundOrder.update({
      where: { id: orderId },
      data: {
        status: "DISPATCHED" as any,
        dispatchDate,

        shippingMode,
        courierName: shippingMode === "COURIER" ? courierName : null,
        transportName: shippingMode === "TRANSPORT" ? transportName : null,
        lrNo: shippingMode === "TRANSPORT" ? lrNo : null,

        trackingNo: trackingNo ?? null,
        trackingCarrier: trackingCarrier ?? null,
      },
      select: {
        id: true,
        status: true,
        dispatchDate: true,
        shippingMode: true,
        courierName: true,
        transportName: true,
        lrNo: true,
        trackingNo: true,
        trackingCarrier: true,
      },
    });

    return NextResponse.json({ ok: true, order: updated }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e || "Server error") }, { status: 500 });
  }
}
