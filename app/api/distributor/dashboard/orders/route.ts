import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export async function GET() {
  const distributorId = await requireDistributorId();

  const orders = await prisma.order.findMany({
    where: { distributorId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      orderNo: true,
      status: true,
      totalAmount: true,
      paidAmount: true,
      createdAt: true,
      retailer: { select: { id: true, name: true } }, // <- relation name in your schema is Retailer
      items: {
        select: { id: true, productName: true, qty: true, rate: true, amount: true },
      },
    },
  });

  return NextResponse.json({ distributorId, orders });
}
