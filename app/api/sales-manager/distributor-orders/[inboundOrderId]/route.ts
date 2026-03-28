import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { badRequest, notFound, unauthorized } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "cache-control": "no-store" };

function onlyNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function hasPaymentEntered(order: any) {
  return (
    !!order?.paymentEnteredByUserId ||
    !!order?.paymentMode ||
    !!order?.utrNo ||
    !!order?.paidAt ||
    Number(order?.paidAmount || 0) > 0 ||
    !!String(order?.paymentRemarks || "").trim() ||
    String(order?.paymentStatus || "").toUpperCase() !== "UNPAID"
  );
}

async function requireSalesManager() {
  const user = await getSessionUser();

  if (!user) {
    throw unauthorized("Unauthorized");
  }

  if (String((user as any).role || "").toUpperCase() !== "SALES_MANAGER") {
    throw unauthorized("Unauthorized");
  }

  return user as any;
}

async function loadInboundOrder(inboundOrderId: string) {
  const order = await prisma.inboundOrder.findUnique({
    where: { id: inboundOrderId },
    include: {
      distributor: { select: { id: true, name: true } },
      items: true,
      dispatches: { select: { id: true } },
      receives: { select: { id: true } },
    },
  });

  if (!order) {
    throw notFound("Order not found");
  }

  return order;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ inboundOrderId: string }> }
) {
  try {
    await requireSalesManager();
    const { inboundOrderId } = await ctx.params;

    const order = await loadInboundOrder(String(inboundOrderId || "").trim());

    const totalAmount = (order.items || []).reduce((sum, it) => {
      return sum + onlyNumber(it.rate) * onlyNumber(it.orderedQtyPcs);
    }, 0);

    const paymentEntered = hasPaymentEntered(order);
    const hasDispatchOrReceive =
      (order.dispatches?.length || 0) > 0 || (order.receives?.length || 0) > 0;

    return NextResponse.json(
      {
        ok: true,
        order: {
          ...order,
          totalAmount,
          paymentEntered,
          canEdit: !paymentEntered && !hasDispatchOrReceive,
          canDelete: !paymentEntered && !hasDispatchOrReceive,
        },
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err: any) {
    const status = Number(err?.status || err?.statusCode || 500);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Internal Server Error",
        code: err?.code || "INTERNAL_SERVER_ERROR",
      },
      {
        status: Number.isFinite(status) ? status : 500,
        headers: NO_STORE_HEADERS,
      }
    );
  }
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ inboundOrderId: string }> }
) {
  try {
    const sm = await requireSalesManager();
    const { inboundOrderId } = await ctx.params;

    const body = await req.json().catch(() => ({}));
    const distributorId = String(body?.distributorId || body?.forDistributorId || "").trim();
    const itemsInput = Array.isArray(body?.items) ? body.items : [];

    if (!distributorId) {
      throw badRequest("distributorId required");
    }

    if (itemsInput.length === 0) {
      throw badRequest("items required");
    }

    const order = await loadInboundOrder(String(inboundOrderId || "").trim());

    const smUserId = String((sm as any).userId || (sm as any).id || "").trim();
    if (!smUserId) {
      throw unauthorized("Invalid session");
    }

    if (String(order.createdByUserId || "").trim() !== smUserId) {
      throw unauthorized("You can edit only your own orders");
    }

    if (hasPaymentEntered(order)) {
      throw badRequest("Payment details already entered. Order cannot be edited.");
    }

    if ((order.dispatches?.length || 0) > 0 || (order.receives?.length || 0) > 0) {
      throw badRequest("Dispatched/received order cannot be edited.");
    }

    const dist = await prisma.distributor.findUnique({
      where: { id: distributorId },
      select: { id: true, name: true },
    });

    if (!dist) {
      throw notFound("Distributor not found");
    }

    const cleanItems: { productName: string; orderedQtyPcs: number }[] = [];

    for (const it of itemsInput) {
      const productName = String(it?.productName || it?.name || "").trim();
      const orderedQtyPcs = Math.max(
        1,
        Math.floor(onlyNumber(it?.orderedQtyPcs ?? it?.qtyPcs ?? it?.qty ?? 0))
      );

      if (!productName) {
        throw badRequest("Each item needs productName");
      }

      cleanItems.push({ productName, orderedQtyPcs });
    }

    const names = cleanItems.map((x) => x.productName.toLowerCase());
    if (new Set(names).size !== names.length) {
      throw badRequest("Same product selected multiple times. Use one row per product.");
    }

    const catalog = await prisma.productCatalog.findMany({
      where: {
        name: { in: cleanItems.map((x) => x.productName) },
        isActive: true,
      },
      select: { name: true, salePrice: true },
    });

    const priceMap = new Map<string, number>();
    for (const p of catalog) {
      priceMap.set(p.name, onlyNumber(p.salePrice));
    }

    for (const it of cleanItems) {
      if (!priceMap.has(it.productName)) {
        throw badRequest(`Product not found in catalog: ${it.productName}`);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.inboundOrderItem.deleteMany({
        where: { inboundOrderId: order.id },
      });

      const saved = await tx.inboundOrder.update({
        where: { id: order.id },
        data: {
          forDistributorId: distributorId,
          items: {
            create: cleanItems.map((it) => ({
              productName: it.productName,
              orderedQtyPcs: it.orderedQtyPcs,
              rate: priceMap.get(it.productName) ?? 0,
            })),
          },
        },
        include: {
          distributor: { select: { id: true, name: true } },
          items: true,
          dispatches: { select: { id: true } },
          receives: { select: { id: true } },
        },
      });

      return saved;
    });

    const totalAmount = (updated.items || []).reduce((sum, it) => {
      return sum + onlyNumber(it.rate) * onlyNumber(it.orderedQtyPcs);
    }, 0);

    return NextResponse.json(
      {
        ok: true,
        order: updated,
        totalAmount,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err: any) {
    const status = Number(err?.status || err?.statusCode || 500);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Internal Server Error",
        code: err?.code || "INTERNAL_SERVER_ERROR",
      },
      {
        status: Number.isFinite(status) ? status : 500,
        headers: NO_STORE_HEADERS,
      }
    );
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ inboundOrderId: string }> }
) {
  try {
    const sm = await requireSalesManager();
    const { inboundOrderId } = await ctx.params;

    const order = await loadInboundOrder(String(inboundOrderId || "").trim());

    const smUserId = String((sm as any).userId || (sm as any).id || "").trim();
    if (!smUserId) {
      throw unauthorized("Invalid session");
    }

    if (String(order.createdByUserId || "").trim() !== smUserId) {
      throw unauthorized("You can delete only your own orders");
    }

    if (hasPaymentEntered(order)) {
      throw badRequest("Payment details already entered. Order cannot be deleted.");
    }

    if ((order.dispatches?.length || 0) > 0 || (order.receives?.length || 0) > 0) {
      throw badRequest("Dispatched/received order cannot be deleted.");
    }

    await prisma.inboundOrder.delete({
      where: { id: order.id },
    });

    return NextResponse.json(
      { ok: true, deleted: true, inboundOrderId: order.id },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err: any) {
    const status = Number(err?.status || err?.statusCode || 500);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Internal Server Error",
        code: err?.code || "INTERNAL_SERVER_ERROR",
      },
      {
        status: Number.isFinite(status) ? status : 500,
        headers: NO_STORE_HEADERS,
      }
    );
  }
}