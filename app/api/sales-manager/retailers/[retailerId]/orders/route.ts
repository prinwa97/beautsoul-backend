import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

export async function GET(req: NextRequest, ctx: any) {
  try {
    await requireSalesManager(["SALES_MANAGER", "ADMIN"]);

    const rawParams =
      ctx?.params && typeof ctx.params?.then === "function" ? await ctx.params : ctx?.params;

    const retailerId = rawParams?.retailerId;
    if (!retailerId) return jsonError("RETAILER_ID_REQUIRED");

    const productName = String(req.nextUrl.searchParams.get("productName") || "").trim();

    const limitRaw = Number(req.nextUrl.searchParams.get("limit") || 60);
    const limit = Number.isFinite(limitRaw) ? Math.min(200, Math.max(1, limitRaw)) : 60;

    const orders = await prisma.order.findMany({
      where: {
        retailerId,
        ...(productName
          ? {
              items: {
                some: {
                  productName: { contains: productName, mode: "insensitive" },
                },
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        orderNo: true,
        status: true,
        createdAt: true,
        totalAmount: true,
        _count: { select: { items: true } },
      },
    });

    return NextResponse.json({
      ok: true,
      orders: orders.map((o) => ({
        id: o.id,
        orderNo: o.orderNo,
        status: o.status,
        createdAt: o.createdAt,
        totalAmount: o.totalAmount,
        itemsCount: o._count.items,
      })),
    });
  } catch (e: any) {
    return jsonError(String(e?.message || e), 500);
  }
}