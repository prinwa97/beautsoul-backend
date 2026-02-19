import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function safeNum(x: any) {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const retailerId = String(body?.retailerId || "").trim();
  const items = Array.isArray(body?.items) ? body.items : [];

  if (!retailerId) {
    return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });
  }
  if (!items.length) {
    return NextResponse.json({ ok: false, error: "items required" }, { status: 400 });
  }

  // retailer -> distributor
  const retailer: any = await prisma.retailer.findUnique({
    where: { id: retailerId },
    select: { distributorId: true },
  });
  const distributorId = retailer?.distributorId;
  if (!distributorId) {
    return NextResponse.json({ ok: false, error: "Retailer not linked to any distributor" }, { status: 400 });
  }

  // latest distributor rates map
  const rateRows = await prisma.distributorProductRate.findMany({
    where: { distributorId },
    select: { productName: true, saleRate: true },
  });
  const rateMap = new Map<string, number>();
  for (const r of rateRows) {
    const pn = String(r.productName || "").trim();
    const sr = safeNum(r.saleRate);
    if (pn && sr > 0) rateMap.set(pn, sr);
  }

  // Normalize items (rate forced from distributor map; fallback 0)
  const normalized = items
    .map((it: any) => {
      const productName = String(it.productName || it.name || "").trim();
      const qty = Math.max(0, Math.floor(safeNum(it.qty ?? it.qtyPcs ?? 0)));
      const rate = safeNum(rateMap.get(productName) ?? 0);
      const amount = qty * rate;
      return { productName, qty, rate, amount };
    })
    .filter((x) => x.productName && x.qty > 0);

  if (!normalized.length) {
    return NextResponse.json({ ok: false, error: "No valid items" }, { status: 400 });
  }

  // TODO: yahan aapka existing order create logic hoga (aapke schema ke hisaab se)
  // Main abhi skeleton return kar raha hoon so you can see new computed values.
  // Aapka project already order create kar raha hai, to is file me niche existing prisma create blocks paste karke
  // normalized[] use kar lena.

  const totalAmount = normalized.reduce((s, x) => s + x.amount, 0);

  return NextResponse.json({ ok: true, distributorId, items: normalized, totalAmount });
}
