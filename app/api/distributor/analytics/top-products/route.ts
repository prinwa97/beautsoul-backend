import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const distributorId = await requireDistributorId();
    const { searchParams } = new URL(req.url);

    const take = Math.min(Number(searchParams.get("take") || "5"), 10);

    // ✅ InvoiceItem -> productName wise qty sum
    // Assumption:
    // InvoiceItem: productName, qty, amount, invoiceId
    // Invoice: distributorId
    const grouped = await prisma.invoiceItem.groupBy({
      by: ["productName"],
      where: {
        invoice: { distributorId }, // relation filter
      },
      _sum: { qty: true, amount: true },
      orderBy: { _sum: { qty: "desc" } },
      take,
    });

    const products = grouped.map((g, idx) => ({
      rank: idx + 1,
      productName: g.productName,
      pcs: Number(g._sum.qty || 0),
      amount: Number(g._sum.amount || 0),
    }));

    return NextResponse.json({ ok: true, products });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
