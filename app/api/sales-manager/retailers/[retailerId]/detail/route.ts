// app/api/sales-manager/retailers/[retailerId]/detail/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";
import { badRequest, forbidden, notFound, unauthorized } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  retailerId: z.string().trim().min(1, "Retailer id is required"),
});

function formatZodIssues(error: z.ZodError) {
  return error.issues.map((i) => ({
    path: i.path.join("."),
    message: i.message,
    code: i.code,
  }));
}

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function toNum(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ retailerId: string }> }
) {
  try {
    const auth = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);

    if (!(auth as any)?.ok) {
      const status = Number((auth as any)?.status || 401);
      const message = String((auth as any)?.error || "UNAUTHORIZED");

      if (status === 403) {
        throw forbidden(message);
      }

      throw unauthorized(message);
    }

    const rawParams = await ctx.params;
    const { retailerId } = paramsSchema.parse(rawParams);

    const authAny = auth as any;

    const meId = String(
      authAny?.user?.id ||
        authAny?.id ||
        authAny?.userId ||
        authAny?.salesManagerId ||
        ""
    ).trim();

    const meRole = String(
      authAny?.user?.role ||
        authAny?.role ||
        ""
    ).trim().toUpperCase();

    if (!meId) {
      throw unauthorized("INVALID_SESSION");
    }

    let retailer:
      | {
          id: string;
          name: string;
          phone: string | null;
          gst: string | null;
          address: string | null;
          city: string | null;
          district: string | null;
          state: string | null;
          pincode: string | null;
          status: string | null;
          createdAt: Date;
          distributor: { id: string; name: string } | null;
        }
      | null = null;

    if (meRole === "ADMIN") {
      retailer = await prisma.retailer.findUnique({
        where: { id: retailerId },
        select: {
          id: true,
          name: true,
          phone: true,
          gst: true,
          address: true,
          city: true,
          district: true,
          state: true,
          pincode: true,
          status: true,
          createdAt: true,
          distributor: { select: { id: true, name: true } },
        },
      });

      if (!retailer) {
        throw notFound("RETAILER_NOT_FOUND");
      }
    } else {
      retailer = await prisma.retailer.findFirst({
        where: {
          id: retailerId,
          distributor: {
            salesManagerId: meId,
          },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          gst: true,
          address: true,
          city: true,
          district: true,
          state: true,
          pincode: true,
          status: true,
          createdAt: true,
          distributor: { select: { id: true, name: true } },
        },
      });

      if (!retailer) {
        const exists = await prisma.retailer.findUnique({
          where: { id: retailerId },
          select: { id: true },
        });

        if (!exists) {
          throw notFound("RETAILER_NOT_FOUND");
        }

        throw forbidden("RETAILER_NOT_UNDER_YOU");
      }
    }

    const orders = await prisma.order.findMany({
      where: { retailerId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 80,
      select: {
        id: true,
        orderNo: true,
        status: true,
        createdAt: true,
        totalAmount: true,
        items: {
          select: {
            id: true,
            productName: true,
            qty: true,
            rate: true,
            amount: true,
          },
        },
        _count: { select: { items: true } },
      },
    });

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0);

    const orders6m = await prisma.order.findMany({
      where: {
        retailerId,
        createdAt: { gte: start },
      },
      select: {
        createdAt: true,
        totalAmount: true,
        items: { select: { qty: true } },
      },
    });

    const orderMonthMap: Record<string, { orders: number; sales: number; orderQty: number }> = {};

    for (const o of orders6m) {
      const k = monthKey(new Date(o.createdAt));
      if (!orderMonthMap[k]) {
        orderMonthMap[k] = { orders: 0, sales: 0, orderQty: 0 };
      }

      orderMonthMap[k].orders += 1;
      orderMonthMap[k].sales += toNum(o.totalAmount);

      for (const it of o.items) {
        orderMonthMap[k].orderQty += toNum(it.qty);
      }
    }

    const audits6m = await prisma.retailerStockAudit.findMany({
      where: {
        retailerId,
        auditDate: { gte: start },
      },
      select: {
        auditDate: true,
        items: { select: { physicalQty: true, soldQty: true } },
      },
      take: 3000,
      orderBy: [{ auditDate: "desc" }, { id: "desc" }],
    });

    const auditMonthMap: Record<string, { physicalQty: number; soldQty: number; auditsCount: number }> = {};

    for (const a of audits6m) {
      const k = monthKey(new Date(a.auditDate));
      if (!auditMonthMap[k]) {
        auditMonthMap[k] = { physicalQty: 0, soldQty: 0, auditsCount: 0 };
      }

      auditMonthMap[k].auditsCount += 1;

      for (const it of a.items) {
        auditMonthMap[k].physicalQty += toNum(it.physicalQty);
        auditMonthMap[k].soldQty += toNum(it.soldQty);
      }
    }

    const monthKeys: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthKeys.push(monthKey(d));
    }

    const monthWise = monthKeys.map((k) => {
      const ordersCount = orderMonthMap[k]?.orders || 0;
      const orderQty = orderMonthMap[k]?.orderQty || 0;
      const hasAudit = (auditMonthMap[k]?.auditsCount || 0) > 0;

      return {
        month: k,
        orders: ordersCount,
        orderQty,
        physicalQty: hasAudit ? auditMonthMap[k].physicalQty : null,
        soldQty: hasAudit ? auditMonthMap[k].soldQty : null,
        auditMissing: !hasAudit && ordersCount > 0,
        sales: orderMonthMap[k]?.sales || 0,
      };
    });

    const totalOrders = orders.length;
    const totalSales = orders.reduce((a, x) => a + toNum(x.totalAmount), 0);
    const lastOrderAt = orders?.[0]?.createdAt || null;

    const ordersFixed = orders.map((o) => ({
      ...o,
      totalAmount: toNum(o.totalAmount),
      items: o.items.map((it) => ({
        ...it,
        qty: toNum(it.qty),
        rate: toNum(it.rate),
        amount: toNum(it.amount),
      })),
    }));

    return NextResponse.json({
      ok: true,
      retailer,
      summary: {
        totalOrders,
        totalSales,
        aov: totalOrders ? totalSales / totalOrders : 0,
        lastOrderAt,
      },
      monthWise,
      orders: ordersFixed,
    });
  } catch (error: any) {
    let finalError = error;

    if (error instanceof z.ZodError) {
      finalError = badRequest("VALIDATION_FAILED", {
        issues: formatZodIssues(error),
      } as any);
    }

    const status = Number(finalError?.status || finalError?.statusCode || 500);

    return NextResponse.json(
      {
        ok: false,
        error: finalError?.message || "Internal Server Error",
        code: finalError?.code || "INTERNAL_SERVER_ERROR",
        details: finalError?.details ?? undefined,
      },
      { status: Number.isFinite(status) ? status : 500 }
    );
  }
}