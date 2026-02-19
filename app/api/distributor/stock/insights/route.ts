import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "DISTRIBUTOR" || !session.distributorId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const distributorId = session.distributorId;

    const batches = await prisma.inventoryBatch.findMany({
      where: {
        distributorId,
        qty: { gt: 0 }, // only batches with stock
      },
      select: {
        productName: true,
        batchNo: true,
        expiryDate: true,
        qty: true,
      },
      orderBy: [
        { productName: "asc" },
        { expiryDate: "asc" }, // FEFO
      ],
    });

    const totalPcs = batches.reduce(
      (s, b) => s + Number(b.qty || 0),
      0
    );

    return NextResponse.json({
      ok: true,
      totalPcs,
      batches,
      batchDetails: batches,
    });
  } catch (e: any) {
    console.error("Stock insights error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
