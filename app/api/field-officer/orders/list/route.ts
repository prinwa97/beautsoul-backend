import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

async function requireFO() {
  const u: any = await getSessionUser();
  if (!u) return { ok: false as const, status: 401 as const, error: "Unauthorized" };

  const role = String(u.role || "").toUpperCase();
  if (role !== "FIELD_OFFICER") {
    return { ok: false as const, status: 403 as const, error: "Forbidden" };
  }

  const distributorId = cleanStr(u.distributorId);
  if (!distributorId) {
    return { ok: false as const, status: 400 as const, error: "Field Officer distributorId missing" };
  }

  return { ok: true as const, user: u, distributorId };
}

export async function GET(req: Request) {
  try {
    const auth = await requireFO();
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const retailerId = cleanStr(searchParams.get("retailerId"));
    const takeRaw = Number(searchParams.get("take") || 50);
    const take = Math.min(Math.max(Number.isFinite(takeRaw) ? Math.floor(takeRaw) : 50, 1), 200);

    if (!retailerId) {
      return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });
    }

    // ✅ Ensure retailer belongs to FO distributor
    const retailer = await prisma.retailer.findUnique({
      where: { id: retailerId },
      select: { id: true, distributorId: true },
    });

    if (!retailer) {
      return NextResponse.json({ ok: false, error: "Retailer not found" }, { status: 404 });
    }
    if (retailer.distributorId !== auth.distributorId) {
      return NextResponse.json({ ok: false, error: "Retailer not under your distributor" }, { status: 403 });
    }

    // ✅ Fetch orders
    const orders = await prisma.order.findMany({
      where: { retailerId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        orderNo: true,
        createdAt: true,
        status: true,
        totalAmount: true,paidAmount: true,retailer: { select: { id: true, name: true, phone: true, city: true } },
        items: {
          select: {
            id: true,
            productName: true,
            qty: true,
            rate: true,
            amount: true,
          },
        },
      },
    });

    return NextResponse.json({ ok: true, orders });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to load orders", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}
