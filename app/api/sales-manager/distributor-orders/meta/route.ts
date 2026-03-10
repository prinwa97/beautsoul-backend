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

const NO_STORE_HEADERS = { "cache-control": "no-store" };

export async function GET(req: Request) {
  try {
    const u = await requireSalesManagerOrAdmin();

    if (!u) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const { searchParams } = new URL(req.url);
    const type = String(searchParams.get("type") || "").trim();

    if (type === "products") {
      const products = await prisma.productCatalog.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          salePrice: true,
          mrp: true,
          isActive: true,
        },
        orderBy: { name: "asc" },
      });

      return NextResponse.json(
        { ok: true, products },
        { headers: NO_STORE_HEADERS }
      );
    }

    if (type === "distributors") {
      const distributors = await prisma.distributor.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });

      return NextResponse.json(
        { ok: true, distributors },
        { headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      { ok: true },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Internal Server Error",
        code: err?.code || "INTERNAL_SERVER_ERROR",
      },
      {
        status: Number(err?.status || err?.statusCode || 500) || 500,
        headers: NO_STORE_HEADERS,
      }
    );
  }
}