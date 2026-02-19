import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const u: any = await getSessionUser();
    if (!u) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (String(u.role || "").toUpperCase() !== "FIELD_OFFICER") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const products = await prisma.productCatalog.findMany({
      where: { isActive: true }, // ✅ FIX (status field nahi hai)
      select: { id: true, name: true, mrp: true },
      orderBy: { name: "asc" },
      take: 500,
    });

    return NextResponse.json({ ok: true, products });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
