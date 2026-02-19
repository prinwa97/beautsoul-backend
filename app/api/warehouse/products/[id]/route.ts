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

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
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
    const { id } = await ctx.params;
    if (!id) return jsonError("id required", 400);

    const body = await req.json().catch(() => ({}));

    // ✅ allow only safe fields to update (adjust to your schema)
    const data: any = {};
    if (body?.name !== undefined) data.name = String(body.name).trim();
    if (body?.mrp !== undefined) data.mrp = Number(body.mrp) || 0;
    if (body?.salePrice !== undefined) data.salePrice = Number(body.salePrice) || 0;
    if (body?.gstPercent !== undefined) data.gstPercent = Number(body.gstPercent) || 0;
    if (body?.isActive !== undefined) data.isActive = Boolean(body.isActive);

    if (Object.keys(data).length === 0) {
      return jsonError("No fields to update", 400);
    }

    const updated = await (prisma as any).productCatalog.update({
      where: { id },
      data,
      select: { id: true, name: true },
    });

    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    // Prisma not found
    const msg = String(e?.message || "Server error");
    if (msg.toLowerCase().includes("record to update not found")) {
      return jsonError("Not found", 404);
    }
    return jsonError(msg, 500);
  }
}