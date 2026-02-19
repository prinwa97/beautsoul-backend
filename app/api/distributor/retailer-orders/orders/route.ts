import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  const x = Math.floor(n);
  return Math.max(min, Math.min(max, x));
}

export async function GET(req: Request) {
  try {
    const distributorId = await requireDistributorId();

    const { searchParams } = new URL(req.url);
    const take = clampInt(searchParams.get("take"), 200, 1, 500);

    // Optional status filter
    const status = (searchParams.get("status") || "").trim().toUpperCase();
    const allowed = ["SUBMITTED", "CONFIRMED", "DISPATCHED", "DELIVERED", "REJECTED", "CANCELLED"];
    const statusFilter = allowed.includes(status) ? status : null;

    const orders = await prisma.order.findMany({
      where: {
        distributorId,
        ...(statusFilter ? { status: statusFilter as any } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      include: {
        // ✅ schema relation names
        items: true,
        retailer: { select: { id: true, name: true, phone: true, city: true } },
        invoice: { select: { id: true, invoiceNo: true, totalAmount: true, createdAt: true } },
      },
    });

    return NextResponse.json({ ok: true, take, count: orders.length, orders }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || e || "Unauthorized");
    const isAuth =
      msg.toLowerCase().includes("unauthor") ||
      msg.toLowerCase().includes("session") ||
      msg.toLowerCase().includes("distributor");

    return NextResponse.json({ ok: false, error: msg }, { status: isAuth ? 401 : 500 });
  }
}
