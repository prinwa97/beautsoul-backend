import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const me: any = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (String(me.role || "") !== "SALES_MANAGER") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const rows = await prisma.distributor.findMany({
      where: { salesManagerId: me.id } as any,
      select: { id: true, name: true, code: true, city: true, state: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    return NextResponse.json({ ok: true, distributors: rows });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}
