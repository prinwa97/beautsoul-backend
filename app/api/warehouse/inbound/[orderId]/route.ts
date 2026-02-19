import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// NOTE: If you want auth, add it here later.
// For now we fix the "missing id" issue by reading dynamic params correctly.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
    }

    const order = await prisma.inboundOrder.findUnique({
      where: { id: orderId },
      include: {
        distributor: { select: { id: true, name: true, city: true, state: true } },
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
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, order });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
