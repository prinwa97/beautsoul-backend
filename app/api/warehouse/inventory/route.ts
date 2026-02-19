import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWarehouse } from "@/lib/warehouse/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function getRoleFromAuth(auth: any): string | null {
  return (
    auth?.user?.role ||
    auth?.role ||
    auth?.session?.role ||
    auth?.data?.user?.role ||
    null
  );
}

function getWarehouseIdFromAuth(auth: any): string | null {
  return (
    auth?.warehouseId ||
    auth?.user?.warehouseId ||
    auth?.data?.warehouseId ||
    auth?.data?.user?.warehouseId ||
    null
  );
}

export async function GET(req: Request) {
  // ✅ requireWarehouse takes 0 args
  const auth = await requireWarehouse();
  if (!auth?.ok) {
    return NextResponse.json(
      { ok: false, error: auth?.error || "Unauthorized" },
      { status: (auth as any)?.status || 401 }
    );
  }

  // ✅ role guard
  const role = getRoleFromAuth(auth);
  if (!role || !["WAREHOUSE_MANAGER", "ADMIN"].includes(role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const u = new URL(req.url);
    const take = Math.min(Math.max(Number(u.searchParams.get("take") || 50), 1), 200);
    const q = (u.searchParams.get("q") || "").trim();

    const warehouseId = getWarehouseIdFromAuth(auth);

    // inventory batches list (basic)
    const where: any = {
      ...(warehouseId ? { entityType: "WAREHOUSE", entityId: warehouseId } : {}),
    };

    if (q) {
      where.OR = [
        { productName: { contains: q, mode: "insensitive" } },
        { batchCode: { contains: q, mode: "insensitive" } },
      ];
    }

    const rows = await (prisma as any).inventoryBatch.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take,
    });

    return NextResponse.json({
      ok: true,
      role,
      warehouseId,
      take,
      q,
      rows,
    });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}