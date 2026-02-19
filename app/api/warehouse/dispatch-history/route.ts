// app/api/warehouse/dispatch-history/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWarehouse } from "@/lib/warehouse/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function getRoleFromAuth(auth: any): string | null {
  return (
    auth?.user?.role ||
    auth?.role ||
    auth?.session?.role ||
    auth?.data?.user?.role ||
    null
  );
}

function getWarehouseIdFromAuth(auth: any): string | null {
  return (
    auth?.warehouseId ||
    auth?.user?.warehouseId ||
    auth?.data?.warehouseId ||
    auth?.data?.user?.warehouseId ||
    null
  );
}

function clamp(n: number, a: number, b: number) {
  return Math.min(Math.max(n, a), b);
}
function asInt(v: any, def = 0) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : def;
}

export async function GET(req: Request) {
  // ✅ auth (no args)
  const auth = await requireWarehouse();
  if (!auth?.ok) {
    return NextResponse.json(
      { ok: false, error: auth?.error || "Unauthorized" },
      { status: (auth as any)?.status || 401 }
    );
  }

  // ✅ role guard
  const role = getRoleFromAuth(auth);
  if (!role || !["WAREHOUSE_MANAGER", "ADMIN"].includes(role)) {
    return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const take = clamp(asInt(searchParams.get("take"), 50), 1, 200);
    const skip = Math.max(asInt(searchParams.get("skip"), 0), 0);

    const warehouseId = getWarehouseIdFromAuth(auth);

    // NOTE:
    // Aapke schema me dispatch history kis model me stored hai, project-to-project change hota hai.
    // Common options: InboundOrder / OutboundOrder / StockMove / Dispatch / Shipment etc.
    // Main yahan safe way me "OutboundOrder" try nahi kar raha, kyunki model exist na ho to build/TS error.
    //
    // ✅ Isliye: yahan "Dispatch" type ka aapka model jo already exist ho, usko use karein.
    // Aapke project me jo model name hai (example: "OutboundOrder" ya "InboundOrder"), bas niche replace kar do.

    // 🔁 Replace "Dispatch" with your actual model name (must exist in Prisma client).
    const items = await (prisma as any).dispatch.findMany({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        // add more fields if you have them:
        // orderNo: true,
        // status: true,
        // distributorId: true,
        // retailerId: true,
        // totalQty: true,
      },
    });

    const total = await (prisma as any).dispatch.count({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
      },
    });

    return NextResponse.json({ ok: true, take, skip, total, items, warehouseId });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}