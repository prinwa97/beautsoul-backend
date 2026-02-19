import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const u: any = await getSessionUser();
    if (!u) return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });

    const role = String(u.role || "").toUpperCase();
    if (role !== "FIELD_OFFICER") {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    const distributorId = u.distributorId ? String(u.distributorId) : null;
    if (!distributorId) {
      return NextResponse.json({ ok: false, error: "Missing distributorId in session" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const retailerId = String(searchParams.get("retailerId") || "").trim();
    if (!retailerId) return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });

    // ✅ ascending => oldest first, newest (today) last
    const sessions = await prisma.retailerStockAudit.findMany({
      where: { distributorId, retailerId } as any,
      select: { id: true, auditDate: true, createdAt: true },
      orderBy: { auditDate: "asc" },
      take: 200,
    });

    return NextResponse.json({ ok: true, sessions });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}