import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}
function asInt(v: any, def = 0) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : def;
}

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
    const q = cleanStr(searchParams.get("q"));
    const take = Math.min(400, Math.max(1, asInt(searchParams.get("take"), 200)));

    const retailers = await prisma.retailer.findMany({
      where: {
        distributorId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { city: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      } as any,
      select: { id: true, name: true, city: true, phone: true, status: true },
      orderBy: { name: "asc" },
      take,
    });

    const retailerIds = retailers.map((r) => r.id);

    // ✅ last audit date per retailer
    // Order by desc, take distinct retailerId => latest audit
    const latestAudits = retailerIds.length
      ? await prisma.retailerStockAudit.findMany({
          where: { distributorId, retailerId: { in: retailerIds } } as any,
          select: { retailerId: true, auditDate: true },
          orderBy: { auditDate: "desc" },
          distinct: ["retailerId"],
        })
      : [];

    const lastAuditMap = new Map<string, Date>();
    for (const a of latestAudits) lastAuditMap.set(a.retailerId, a.auditDate);

    const retailersWithAudit = retailers.map((r) => ({
      ...r,
      lastAuditDate: lastAuditMap.get(r.id) || null,
    }));

    return NextResponse.json({ ok: true, retailers: retailersWithAudit });
  } catch (e: any) {
    console.error("FO audit retailers error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
