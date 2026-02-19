import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function clean(s: any) {
  const x = String(s ?? "").trim();
  return x.length ? x : "";
}

export async function GET(_req: Request, ctx: { params: Promise<{ foUserId: string }> }) {
  const auth = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);
  if (!auth.ok) return jsonError(auth.error || "Unauthorized", (auth as any).status || 401);

  try {
    const { foUserId } = await ctx.params;
    const id = clean(foUserId);
    if (!id) return jsonError("foUserId missing", 400);

    // FO basic
    const fo = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true, distributorId: true },
    });
    if (!fo || String(fo.role) !== "FIELD_OFFICER") return jsonError("Invalid FO", 400);

    // scope check (unless ADMIN)
    if (auth.role !== "ADMIN") {
      if (!fo.distributorId) return jsonError("FO distributorId missing", 400);
      const dist = await prisma.distributor.findFirst({
        where: { id: fo.distributorId, salesManagerId: auth.userId },
        select: { id: true },
      });
      if (!dist) return jsonError("FO not in your distributors", 403);
    }

    return NextResponse.json({
      ok: true,
      fo: { id: fo.id, name: fo.name || "-" },
    });
  } catch (e: any) {
    return jsonError(e?.message || "Failed", 500);
  }
}
