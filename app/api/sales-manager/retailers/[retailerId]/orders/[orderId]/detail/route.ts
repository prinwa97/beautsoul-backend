// app/api/sales-manager/orders/[orderId]/detail/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";
import { apiHandler } from "@/lib/api-handler";
import { badRequest, notFound } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiHandler(async function GET(
  _req: Request,
  ctx: { params: Promise<{ orderId: string }> }
) {
  await requireSalesManager(["SALES_MANAGER", "ADMIN"]);

  const { orderId } = await ctx.params;
  if (!orderId || !String(orderId).trim()) {
    throw badRequest("ORDER_ID_REQUIRED");
  }

  const cleanOrderId = String(orderId).trim();

  // ✅ MAIN ORDER
  const order = await prisma.order.findUnique({
    where: { id: cleanOrderId },
    select: {
      id: true,
      orderNo: true,
      status: true,
      createdAt: true,
      totalAmount: true,
    },
  });

  if (!order) {
    throw notFound("ORDER_NOT_FOUND");
  }

  // ✅ ITEMS
  const items = await prisma.orderItem.findMany({
    where: { orderId: cleanOrderId },
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
});