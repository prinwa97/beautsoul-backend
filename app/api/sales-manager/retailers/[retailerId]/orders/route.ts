import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";
import { apiHandler } from "@/lib/api-handler";
import { badRequest } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiHandler(
  async (
    req: Request,
    ctx: { params: Promise<{ retailerId: string }> }
  ) => {
    await requireSalesManager(["SALES_MANAGER", "ADMIN"]);

    const { retailerId } = await ctx.params;

    if (!retailerId || !String(retailerId).trim()) {
      throw badRequest("RETAILER_ID_REQUIRED");
    }

    const { searchParams } = new URL(req.url);

    const productName = String(searchParams.get("productName") || "").trim();

    const limitRaw = Number(searchParams.get("limit") || 60);
    const limit = Number.isFinite(limitRaw)
      ? Math.min(200, Math.max(1, limitRaw))
      : 60;

    const orders = await prisma.order.findMany({
      where: {
        retailerId,
        ...(productName
          ? {
              items: {
                some: {
                  productName: {
                    contains: productName,
                    mode: "insensitive" as const,
                  },
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
  }
);