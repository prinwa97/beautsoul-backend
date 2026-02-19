// app/api/warehouse/dashboard/route.ts
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

export async function GET() {
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

  try {
    const warehouseId = getWarehouseIdFromAuth(auth);

    // aapke schema me warehouse table/model hai to yeh useful rahega
    // Agar nahi hai to simply counts return kar dena (safe)
    const [draft, submitted, approved] = await Promise.all([
      prisma.stockAudit.count({
        where: {
          ...(warehouseId ? { warehouseId } : {}),
          status: "DRAFT",
        } as any,
      }),
      prisma.stockAudit.count({
        where: {
          ...(warehouseId ? { warehouseId } : {}),
          status: "SUBMITTED",
        } as any,
      }),
      prisma.stockAudit.count({
        where: {
          ...(warehouseId ? { warehouseId } : {}),
          status: "APPROVED",
        } as any,
      }),
    ]);

    // Recent audits list
    const recent = await prisma.stockAudit.findMany({
      where: (warehouseId ? { warehouseId } : {}) as any,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        auditDate: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      role,
      warehouseId,
      stats: { draft, submitted, approved },
      recent,
    });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}