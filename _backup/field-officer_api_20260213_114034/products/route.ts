import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function asNum(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const retailerId = String(searchParams.get("retailerId") || "").trim();

  if (!retailerId) {
    return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });
  }

  // 1) find distributorId from retailer
  // NOTE: agar aapke schema me field name alag hai, yahin change hoga
  const retailer: any = await prisma.retailer.findUnique({
    where: { id: retailerId },
    select: { distributorId: true },
  });

  const distributorId = retailer?.distributorId;
  if (!distributorId) {
    return NextResponse.json({ ok: false, error: "Retailer not linked to any distributor" }, { status: 400 });
  }

  // 2) product catalog
  const products = await prisma.productCatalog.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true, mrp: true, salePrice: true, isActive: true },
  });

  // 3) distributor fixed rates map
  const rates = await prisma.distributorProductRate.findMany({
    where: { distributorId },
    select: { productName: true, saleRate: true },
  });

  const rateMap = new Map<string, number>();
  for (const r of rates) {
    const pn = String(r.productName || "").trim();
    const sr = asNum(r.saleRate);
    if (pn) rateMap.set(pn, sr);
  }

  // 4) response: IMPORTANT -> salePrice = distributorSaleRate (fallback to catalog salePrice if not set)
  const out = products.map((p: any) => {
    const fixed = rateMap.get(String(p.name || "").trim());
    const finalRate =
      fixed != null && Number.isFinite(fixed) && fixed > 0 ? fixed : (p.salePrice ?? 0);

    return {
      id: p.id,
      name: p.name,
      mrp: p.mrp ?? null,
      salePrice: finalRate,          // ✅ FO UI already uses salePrice, so we override it
      distributorSaleRate: finalRate, // ✅ extra field if needed
      catalogSalePrice: p.salePrice ?? null, // optional debugging
    };
  });

  return NextResponse.json({ ok: true, distributorId, products: out });
}
