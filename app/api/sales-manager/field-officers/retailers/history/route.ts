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
function asInt(v: any, dflt = 20) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : dflt;
}

/**
 * GET /api/sales-manager/field-officers/retailers/history?retailerId=...&take=20
 */
export async function GET(req: Request) {
  const auth = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);
  if (!auth.ok) return jsonError(auth.error || "Unauthorized", (auth as any).status || 401);

  try {
    const { searchParams } = new URL(req.url);
    const retailerId = clean(searchParams.get("retailerId"));
    const take = Math.min(200, Math.max(1, asInt(searchParams.get("take"), 20)));

    if (!retailerId) return jsonError("retailerId required", 400);

    // scope by retailer's distributor
    const retailer = await prisma.retailer.findUnique({
      where: { id: retailerId },
      select: { id: true, distributorId: true },
    });
    if (!retailer) return jsonError("Retailer not found", 404);
    if (!retailer.distributorId) return jsonError("Retailer distributor missing", 400);

    if (auth.role !== "ADMIN") {
      const ok = await prisma.distributor.findFirst({
        where: { id: retailer.distributorId, salesManagerId: auth.userId },
        select: { id: true },
      });
      if (!ok) return jsonError("Retailer not in your distributors", 403);
    }

    const rows = await prisma.retailerAssignmentHistory.findMany({
      where: { retailerId },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        fromFoUser: { select: { id: true, name: true, phone: true } },
        toFoUser: { select: { id: true, name: true, phone: true } },
        actorUser: { select: { id: true, name: true, role: true } },
        distributor: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      rows: rows.map((r) => ({
        id: r.id,
        retailerId: r.retailerId,
        eventType: r.eventType,
        reason: r.reason ?? null,
        distributorId: r.distributorId ?? null,
        distributorName: (r as any).distributor?.name || null,
        fromFo: r.fromFoUser ? { id: r.fromFoUser.id, name: r.fromFoUser.name, phone: r.fromFoUser.phone } : null,
        toFo: r.toFoUser ? { id: r.toFoUser.id, name: r.toFoUser.name, phone: r.toFoUser.phone } : null,
        actor: r.actorUser ? { id: r.actorUser.id, name: r.actorUser.name, role: r.actorUser.role } : null,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null,
      })),
    });
  } catch (e: any) {
    return jsonError(e?.message || "Failed", 500);
  }
}