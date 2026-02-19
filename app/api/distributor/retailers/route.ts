import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const distributorId = await requireDistributorId();

    const { searchParams } = new URL(req.url);
    const take = Math.min(Number(searchParams.get("take") || "200"), 500);
    const q = String(searchParams.get("q") || "").trim();

    const retailers = await prisma.retailer.findMany({
      where: {
        distributorId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        name: true,
        phone: true,
        status: true,
        city: true,
        state: true,
        distributorId: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, retailers }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || e || "Unauthorized");
    const isAuth =
      msg.toLowerCase().includes("unauthor") ||
      msg.toLowerCase().includes("session") ||
      msg.toLowerCase().includes("distributor");

    return NextResponse.json(
      { ok: false, error: msg },
      { status: isAuth ? 401 : 500 }
    );
  }
}
