import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function requireWarehouseOrAdmin() {
  const u: any = await getSessionUser();
  if (!u) return { ok: false as const, status: 401 as const, error: "Unauthorized" };

  const role = String(u.role || "").toUpperCase();
  const allowed = new Set(["ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE", "STORE_MANAGER"]);
  if (!allowed.has(role)) return { ok: false as const, status: 403 as const, error: "Forbidden" };

  return { ok: true as const, user: u };
}

function asInt(v: string | null, def: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.floor(n);
}

export async function GET(req: Request) {
  try {
    const auth = await requireWarehouseOrAdmin();
    if (!auth.ok) return jsonError(auth.error, auth.status);

    const { searchParams } = new URL(req.url);

    const takeRaw = asInt(searchParams.get("take"), 20);
    const skipRaw = asInt(searchParams.get("skip"), 0);

    const take = Math.min(50, Math.max(1, takeRaw));
    const skip = Math.max(0, skipRaw);

    const rows = await prisma.stockAudit.findMany({
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        status: true,
        createdAt: true,

        // ✅ Schema me available fields (Prisma error list se)
        warehouseId: true,
        monthKey: true,
        auditDate: true,
        snapshotAt: true,
        totalSystemQty: true,
        totalPhysicalQty: true,
        totalVarianceQty: true,

        // Optional: quick counts
        _count: { select: { lines: true, tasks: true } },
      },
    });

    const total = await prisma.stockAudit.count();

    return NextResponse.json({ ok: true, total, rows, take, skip });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}
