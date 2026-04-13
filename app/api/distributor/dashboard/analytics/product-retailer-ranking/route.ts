import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const distributorId = await requireDistributorId();
    const { searchParams } = new URL(req.url);

    const productName = String(searchParams.get("productName") || "").trim();
    const take = Math.min(Number(searchParams.get("take") || "20"), 100);

    if (!productName) {
      return NextResponse.json({ ok: false, error: "productName required" }, { status: 400 });
    }

    // ✅ 1) Distributor invoices list (id + retailer)
    const invoices = await prisma.invoice.findMany({
      where: { distributorId },
      select: {
        id: true,
        retailerId: true,
        retailer: { select: { id: true, name: true, city: true, phone: true } },
      },
    });

    const invoiceIds = invoices.map((x) => x.id);
    if (invoiceIds.length === 0) return NextResponse.json({ ok: true, productName, list: [] });

    const invMap = new Map(invoices.map((inv) => [inv.id, inv]));

    // ✅ 2) InvoiceItem groupBy by invoiceId (SAFE: invoiceId IN ...)
    const itemGroups = await prisma.invoiceItem.groupBy({
      by: ["invoiceId"],
      where: {
        productName,
        invoiceId: { in: invoiceIds },
      },
      _sum: { qty: true, amount: true },
    });

    // ✅ 3) retailer-wise aggregate
    const agg = new Map<
      string,
      {
        retailerId: string;
        name: string;
        city?: string | null;
        phone?: string | null;
        pcs: number;
        amount: number;
      }
    >();

    for (const g of itemGroups) {
      const inv = invMap.get(g.invoiceId);
      if (!inv?.retailerId) continue;

      const pcs = Number(g._sum.qty || 0);
      const amount = Number(g._sum.amount || 0);

      const prev = agg.get(inv.retailerId);
      if (!prev) {
        agg.set(inv.retailerId, {
          retailerId: inv.retailerId,
          name: inv.retailer?.name || "Retailer",
          city: inv.retailer?.city || null,
          phone: inv.retailer?.phone || null,
          pcs,
          amount,
        });
      } else {
        prev.pcs += pcs;
        prev.amount += amount;
      }
    }

    const list = Array.from(agg.values())
      .sort((a, b) => b.pcs - a.pcs)
      .slice(0, take)
      .map((x, idx) => ({ rank: idx + 1, ...x }));

    return NextResponse.json({ ok: true, productName, list });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
