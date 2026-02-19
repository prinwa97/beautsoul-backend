import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSessionUser();
    if (!session || session.role !== "DISTRIBUTOR" || !session.distributorId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Product-wise totals from batches
    const rows = await prisma.inventoryBatch.groupBy({
      by: ["productName"],
      where: { distributorId: session.distributorId },
      _sum: { qty: true },
      orderBy: { productName: "asc" },
    });

    const summary = rows.map((r) => ({
      productName: r.productName,
      qty: Number(r._sum.qty || 0),
    }));

    const totalPcs = summary.reduce((s, x) => s + Number(x.qty || 0), 0);

    return NextResponse.json({ ok: true, totalPcs, summary });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
