// app/api/warehouse/orders/[orderId]/dispatch/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isWarehouseRole(role: unknown) {
  const r = String(role || "").toUpperCase();
  return r.includes("WAREHOUSE") || r.includes("STORE") || r === "ADMIN";
}

export async function POST(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const me: any = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!isWarehouseRole(me?.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden (Warehouse only)" }, { status: 403 });
    }

    const { orderId } = await ctx.params;
    if (!orderId) return NextResponse.json({ ok: false, error: "orderId missing" }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true },
    });
    if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

    const st = String(order.status || "").toUpperCase();

    // ✅ only PACKED can dispatch (change if you want)
    if (st !== "PACKED") {
      return NextResponse.json(
        { ok: false, error: `Dispatch allowed only for PACKED (current=${st})` },
        { status: 400 }
      );
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "DISPATCHED" },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e || "Server error") }, { status: 500 });
  }
}
