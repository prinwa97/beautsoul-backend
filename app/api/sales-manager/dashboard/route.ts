import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request) {
  try {
    const session: any = await getSessionUser();

    if (!session) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const role = String(session.role || "").toUpperCase();
    if (role !== "SALES_MANAGER") {
      return NextResponse.json(
        { ok: false, error: "Forbidden (Sales Manager only)", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const userId = String(session.userId || session.id || "").trim();
    if (!userId) {
      return NextResponse.json(
        { ok: false, error: "Invalid session", code: "INVALID_SESSION" },
        { status: 401 }
      );
    }

    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
      },
    });

    const salesManager = {
      id: u?.id || userId,
      name: u?.name || "—",
      code: u?.code ?? null,
      status: u?.status ?? null,
    };

    const cards = {
      distributors: 0,
      retailers: 0,
      todayOrders: 0,
      todaySalesAmount: 0,
    };

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

    const bars = {
      topDistributorsBySales: [],
      nonPerformingRetailers: [],
      topProductsBySold: [],
    };

    return NextResponse.json({
      ok: true,
      salesManager,
      cards,
      donuts,
      bars,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Internal Server Error",
        code: err?.code || "INTERNAL_SERVER_ERROR",
      },
      { status: Number(err?.status || err?.statusCode || 500) }
    );
  }
}