import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export async function GET() {
  const distributorId = await requireDistributorId();

  const rows = await prisma.distributorProductRate.findMany({
    where: { distributorId },
    select: { productName: true, saleRate: true, updatedAt: true },
    orderBy: { productName: "asc" },
  });

  return NextResponse.json({ ok: true, rates: rows });
}

export async function POST(req: Request) {
  const distributorId = await requireDistributorId();
  const body = await req.json().catch(() => null);

  const productName = String(body?.productName || "").trim();
  const saleRate = Number(body?.saleRate);

  if (!productName) {
    return NextResponse.json({ ok: false, error: "productName required" }, { status: 400 });
  }
  if (!Number.isFinite(saleRate) || saleRate <= 0) {
    return NextResponse.json({ ok: false, error: "saleRate must be > 0" }, { status: 400 });
  }

  const saved = await prisma.distributorProductRate.upsert({
    where: { distributorId_productName: { distributorId, productName } },
    create: { distributorId, productName, saleRate },
    update: { saleRate },
    select: { productName: true, saleRate: true, updatedAt: true },
  });

  return NextResponse.json({ ok: true, rate: saved });
}
