import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET() {
  try {
    const u: any = await getSessionUser();

    if (!u) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (String(u.role || "").toUpperCase() !== "FIELD_OFFICER") {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const distributorId = cleanStr(u.distributorId);
    if (!distributorId) {
      return NextResponse.json(
        { ok: false, error: "Field Officer distributorId missing" },
        { status: 400 }
      );
    }

    const products = await prisma.productCatalog.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        mrp: true,
        salePrice: true,
      },
      orderBy: { name: "asc" },
      take: 500,
    });

    const productNames = products.map((p) => p.name);

    const rateRows = await prisma.distributorProductRate.findMany({
      where: {
        distributorId,
        productName: { in: productNames },
      },
      select: {
        productName: true,
        saleRate: true,
      },
    });

    const rateMap = new Map(
      rateRows.map((r) => [r.productName, num(r.saleRate)])
    );

    const rows = products.map((p) => ({
      id: p.id,
      name: p.name,
      mrp: p.mrp != null ? num(p.mrp) : null,
      rate: rateMap.has(p.name) ? rateMap.get(p.name) : num(p.salePrice),
    }));

    return NextResponse.json({ ok: true, products: rows });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}