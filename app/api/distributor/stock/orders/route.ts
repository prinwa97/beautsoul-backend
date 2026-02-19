import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // ✅ SINGLE SOURCE OF TRUTH (no cookies / JSON.parse here)
    const distributorId = await requireDistributorId();

    // ✅ IMPORTANT: include SUBMITTED (FO orders)
    const orders = await prisma.order.findMany({
      where: {
        distributorId,
        status: {
          in: [
            "SUBMITTED",
            "CONFIRMED",
            "DISPATCHED",
            "DELIVERED",
            "REJECTED",
            "CANCELLED",
          ],
        },
      },
      orderBy: { createdAt: "desc" },
      include: {
        items: true,
        retailer: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ ok: true, orders }, { status: 200 });
  } catch (e: any) {
    // ✅ If requireDistributorId fails, treat as unauthorized
    const msg = String(e?.message || "Unauthorized");
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
