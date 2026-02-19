import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// NOTE: abhi simple rakh rahe hain (admin check later).
// Agar tumhare paas admin auth helper hai to yahan requireAdmin() laga dena.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function num(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : NaN;
}
function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

export async function GET() {
  try {
    const products = await prisma.productCatalog.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        salePrice: true,
        mrp: true,
        gstRate: true,
        isActive: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(
  { ok: true, products },
  {
    headers: {
      "Cache-Control": "no-store",
    },
  }
);

  } catch (e) {
    return jsonError("Failed to load products", 500);
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const name = cleanStr(body.name);
    const salePrice = num(body.salePrice);

    const mrp = body.mrp === null || body.mrp === undefined || String(body.mrp).trim() === "" ? null : num(body.mrp);
    const gstRate =
      body.gstRate === null || body.gstRate === undefined || String(body.gstRate).trim() === "" ? null : num(body.gstRate);

    if (!name) return jsonError("Product name required", 400);
    if (!Number.isFinite(salePrice) || salePrice <= 0) return jsonError("Valid selling rate required", 400);

    if (mrp !== null && (!Number.isFinite(mrp) || mrp <= 0)) return jsonError("MRP invalid", 400);
    if (gstRate !== null && (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100)) return jsonError("GST invalid", 400);

    const product = await prisma.productCatalog.create({
      data: {
        name,
        salePrice,
        mrp,
        gstRate,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        salePrice: true,
        mrp: true,
        gstRate: true,
        isActive: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, product });
  } catch (e: any) {
    // Prisma unique violation
    if (e?.code === "P2002") {
      return jsonError("Product already exists", 400);
    }
    return jsonError("Failed to create product", 500);
  }
}
