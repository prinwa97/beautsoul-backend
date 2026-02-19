import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const retailerId = String(searchParams.get("retailerId") || "").trim();

  if (!retailerId) {
    return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });
  }

  // TODO: yahan retailer se distributorId nikaalna hai (schema ke hisaab se)
  // Example possibilities:
  // const retailer = await prisma.retailer.findUnique({ where: { id: retailerId }, select: { distributorId: true } });
  // const distributorId = retailer?.distributorId;

  const retailer: any = await prisma.retailer.findUnique({
    where: { id: retailerId },
    select: { distributorId: true }, // <-- agar aapke schema me field ka naam alag hai to change
  });

  const distributorId = retailer?.distributorId;
  if (!distributorId) {
    return NextResponse.json({ ok: false, error: "Distributor not linked for this retailer" }, { status: 400 });
  }

  const rows = await prisma.distributorProductRate.findMany({
    where: { distributorId },
    select: { productName: true, saleRate: true },
    orderBy: { productName: "asc" },
  });

  return NextResponse.json({ ok: true, distributorId, rates: rows });
}
