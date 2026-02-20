// app/api/admin/products/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}
function cleanStr(v: any) {
  return String(v ?? "").trim();
}
function toNum(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : NaN;
}

async function requireAdmin() {
  const u: any = await getSessionUser();
  if (!u) return { ok: false as const, status: 401, error: "UNAUTHORIZED" };
  const role = String(u.role || "").toUpperCase();
  if (role !== "ADMIN") return { ok: false as const, status: 403, error: "FORBIDDEN" };
  return { ok: true as const, user: u };
}

export async function GET(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { searchParams } = new URL(req.url);
    const q = cleanStr(searchParams.get("q"));

    const products = await prisma.productCatalog.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : undefined,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        salePrice: true,
        mrp: true,
        gstRate: true,    // ✅ Prisma hint me tha
        isActive: true,
        updatedAt: true,
        // barcode: true, // ✅ agar table me chahiye to uncomment
      },
    });

    return NextResponse.json({ ok: true, products });
  } catch (e: any) {
    return jsonError(e?.message || "SERVER_ERROR", 500);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const body = await req.json().catch(() => null);
    if (!body) return jsonError("Invalid JSON body");

    const name = cleanStr(body.name);
    const salePrice = toNum(body.salePrice);

    const mrp =
      body.mrp === null || body.mrp === undefined || String(body.mrp).trim() === ""
        ? null
        : toNum(body.mrp);

    const gstRate =
      body.gstRate === null || body.gstRate === undefined || String(body.gstRate).trim() === ""
        ? null
        : toNum(body.gstRate);

    if (!name) return jsonError("Product name required");
    if (!Number.isFinite(salePrice) || salePrice <= 0) return jsonError("Valid selling rate required");
    if (mrp != null && (!Number.isFinite(mrp) || mrp <= 0)) return jsonError("MRP invalid");
    if (gstRate != null && (!Number.isFinite(gstRate) || gstRate < 0 || gstRate > 100)) return jsonError("GST invalid");

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

    return NextResponse.json({ ok: true, product }, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") return jsonError("Duplicate product", 409);
    return jsonError(e?.message || "SERVER_ERROR", 500);
  }
}