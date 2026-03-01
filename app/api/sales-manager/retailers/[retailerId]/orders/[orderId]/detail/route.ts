// app/api/sales-manager/orders/[orderId]/detail/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ orderId: string }> }
) {
  try {
    await requireSalesManager(["SALES_MANAGER", "ADMIN"]);

    const { orderId } = await ctx.params;
    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "ORDER_ID_REQUIRED" },
        { status: 400 }
      );
    }

    // ✅ MAIN ORDER
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNo: true,
        status: true,
        createdAt: true,
        totalAmount: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // ✅ ITEMS (IMPORTANT)
    const items = await prisma.orderItem.findMany({
      where: { orderId },
      select: {
        id: true,
        productName: true,
        qty: true,
        rate: true,
        amount: true,
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({
      ok: true,
      order,
      items,
    });
  } catch (e: any) {
    console.error("ORDER DETAIL ERROR:", e);
    return NextResponse.json({
      ok: false,
      error: "FAILED",
      detail: String(e?.message || e),
    });
  }
}