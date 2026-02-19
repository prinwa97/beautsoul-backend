import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function requireSalesManagerOrAdmin() {
  const user = await getSessionUser();
  if (!user) return null;
  const role = String((user as any).role || "").toUpperCase();
  if (role !== "SALES_MANAGER" && role !== "ADMIN") return null;
  return user;
}

export async function GET(req: Request) {
  try {
    const u = await requireSalesManagerOrAdmin();
    if (!u) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = String(searchParams.get("type") || "").trim();

    // ✅ meta: products
    if (type === "products") {
      const products = await prisma.productCatalog.findMany({
        where: { isActive: true },
        select: { id: true, name: true, salePrice: true, mrp: true, isActive: true },
        orderBy: { name: "asc" },
      });
      return NextResponse.json({ ok: true, products }, { headers: { "cache-control": "no-store" } });
    }

    // ✅ meta: distributors
    if (type === "distributors") {
      const distributors = await prisma.distributor.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
      return NextResponse.json({ ok: true, distributors }, { headers: { "cache-control": "no-store" } });
    }

    // ✅ default
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch (e: any) {
    console.error("sales-manager distributor-orders meta error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
