import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session: any = await getSessionUser();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const role = String(session.role || "").toUpperCase();
  if (role !== "SALES_MANAGER") {
    return NextResponse.json({ ok: false, error: "Forbidden (Sales Manager only)" }, { status: 403 });
  }

  // ✅ Fetch real name from DB using session.id
  const u = await prisma.user.findUnique({
    where: { id: String(session.id) },
    select: { id: true, name: true, code: true, status: true },
  });

  const salesManager = {
    id: u?.id || String(session.id),
    name: u?.name || "—",
    code: (u as any)?.code ?? null,
    status: (u as any)?.status ?? null,
  };

  const cards = { distributors: 0, retailers: 0, todayOrders: 0, todaySalesAmount: 0 };
  const donuts = {
    orderStatus: [
      { name: "SUBMITTED", value: 0 },
      { name: "CONFIRMED", value: 0 },
      { name: "DISPATCHED", value: 0 },
      { name: "DELIVERED", value: 0 },
      { name: "CANCELLED", value: 0 },
    ],
    deliveredVsPending: [
      { name: "DELIVERED", value: 0 },
      { name: "PENDING", value: 0 },
    ],
    activeVsInactiveRetailers: [
      { name: "ACTIVE", value: 0 },
      { name: "INACTIVE", value: 0 },
    ],
    distributorStockSplit: [
      { name: "PENDING", value: 0 },
      { name: "SOLD", value: 0 },
    ],
    retailerStockSplit: [
      { name: "PENDING", value: 0 },
      { name: "SOLD", value: 0 },
    ],
  };
  const bars = { topDistributorsBySales: [], nonPerformingRetailers: [], topProductsBySold: [] };

  return NextResponse.json({ ok: true, salesManager, cards, donuts, bars });
}