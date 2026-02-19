import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}
function clean(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

export async function GET(req: Request) {
  const auth = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);
  if (!auth.ok) return jsonError(auth.error || "Unauthorized", (auth as any).status || 401);

  try {
    const { searchParams } = new URL(req.url);
    const distributorId = clean(searchParams.get("distributorId"));
    if (!distributorId) return jsonError("distributorId required", 400);

    if (auth.role !== "ADMIN") {
      const ok = await prisma.distributor.findFirst({
        where: { id: distributorId, salesManagerId: auth.userId },
        select: { id: true },
      });
      if (!ok) return jsonError("Not your distributor", 403);
    }

    const active = await prisma.retailerAssignmentActive.findMany({
      select: { retailerId: true },
    });
    const assignedSet = new Set(active.map((x) => x.retailerId));

    const all = await prisma.retailer.findMany({
      where: { distributorId },
      select: { id: true, name: true, phone: true, city: true, status: true },
      orderBy: { name: "asc" },
    });

    const rows = all.filter((r) => !assignedSet.has(r.id));
    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return jsonError(e?.message || "Failed", 500);
  }
}
