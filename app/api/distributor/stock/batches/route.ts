import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "DISTRIBUTOR" || !session.distributorId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const productName = (url.searchParams.get("productName") || "").trim();
    if (!productName) {
      return NextResponse.json({ ok: false, error: "productName required" }, { status: 400 });
    }

    const batches = await prisma.inventoryBatch.findMany({
      where: {
        distributorId: session.distributorId,
        productName,
        qty: { gt: 0 },
      },
      orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }], // ✅ nearest expiry first
      select: {
        id: true,
        batchNo: true,
        expiryDate: true,
        qty: true,
      },
    });

    return NextResponse.json({ ok: true, batches });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
