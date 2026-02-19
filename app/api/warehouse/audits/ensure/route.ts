// app/api/warehouse/audits/ensure/route.ts
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

export async function POST(req: Request) {
  // ✅ auth (no args)
  const auth = await requireWarehouse();
  if (!auth?.ok) {
    return jsonError(auth?.error || "Unauthorized", (auth as any)?.status || 401);
  }

  // ✅ role guard
  const role = getRoleFromAuth(auth);
  if (!role || !["WAREHOUSE_MANAGER", "ADMIN"].includes(role)) {
    return jsonError("Forbidden", 403);
  }

  try {
    const body = await req.json().catch(() => null);
    const auditDate = String(body?.auditDate || "").trim(); // e.g. "2026-02-15"
    const warehouseId = body?.warehouseId ? String(body.warehouseId) : null;

    if (!auditDate) return jsonError("auditDate required", 400);

    // ✅ Ensure one audit per day (optionally per warehouseId)
    const where: any = { auditDate };
    if (warehouseId) where.warehouseId = warehouseId;

    const existing = await prisma.stockAudit.findFirst({
      where,
      select: { id: true, status: true },
    });

    if (existing) {
      return NextResponse.json({ ok: true, exists: true, audit: existing });
    }

    // ✅ Create audit shell
    const created = await prisma.stockAudit.create({
      data: {
        auditDate,
        status: "DRAFT",
        ...(warehouseId ? { warehouseId } : {}),
      } as any,
      select: { id: true, status: true, auditDate: true },
    });

    return NextResponse.json({ ok: true, exists: false, audit: created });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}