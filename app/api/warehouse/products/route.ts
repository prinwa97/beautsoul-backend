import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWarehouse } from "@/lib/warehouse/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRoleFromAuth(auth: any): string | null {
  return (
    auth?.user?.role ||
    auth?.role ||
    auth?.session?.role ||
    auth?.data?.user?.role ||
    null
  );
}

export async function GET(req: Request) {
  const auth = await requireWarehouse(); // ✅ no args
  if (!auth?.ok) {
    return NextResponse.json(
      { ok: false, error: auth?.error || "Unauthorized" },
      { status: (auth as any)?.status || 401 }
    );
  }

  const role = getRoleFromAuth(auth);
  if (!role || !["WAREHOUSE_MANAGER", "ADMIN"].includes(role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  const u = new URL(req.url);
  const q = (u.searchParams.get("q") || "").trim();
  const take = Math.min(Math.max(Number(u.searchParams.get("take") || 200), 1), 500);

  const where: any = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
    ];
  }

  const items = await prisma.productCatalog.findMany({
  where,
  orderBy: { name: "asc" },
  take,
  select: {
    id: true,
    name: true,
    mrp: true,
    salePrice: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
  },
});

  return NextResponse.json({ ok: true, items });
}