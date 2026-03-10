import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { badRequest, notFound, unauthorized } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = { "cache-control": "no-store" };

/* -----------------------------
  Helpers
------------------------------ */

function onlyNumber(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function pad(n: number, len: number) {
  const s = String(Math.floor(Math.abs(n)));
  return s.length >= len ? s : "0".repeat(len - s.length) + s;
}

function makeOrderNo() {
  // Example: SMO + 10 digits
  const rnd = Math.floor(Math.random() * 1_000_000_0000);
  return "SMO" + pad(rnd, 10);
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

/* -----------------------------
  GET
  - /api/sales-manager/distributor-orders?meta=1  => products + distributors
  - /api/sales-manager/distributor-orders?take=100 => orders
------------------------------ */
export async function GET(req: Request) {
  try {
    await requireSalesManager();

    const { searchParams } = new URL(req.url);
    const meta = searchParams.get("meta");
    const takeRaw = onlyNumber(searchParams.get("take") || 100);
    const take = Math.max(1, Math.min(takeRaw || 100, 200));

    if (meta === "1") {
      const [products, distributors] = await Promise.all([
        prisma.productCatalog.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            salePrice: true,
            mrp: true,
            isActive: true,
          },
          orderBy: { name: "asc" },
        }),
        prisma.distributor.findMany({
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
      ]);

      return NextResponse.json(
        { ok: true, products, distributors },
        { headers: NO_STORE_HEADERS }
      );
    }

    const orders = await prisma.inboundOrder.findMany({
      take,
      orderBy: { createdAt: "desc" },
      include: {
        distributor: { select: { id: true, name: true } },
        items: true,
      },
    });

    const enriched = orders.map((o) => {
      const totalAmount = (o.items || []).reduce((sum, it) => {
        const rate = onlyNumber((it as any).rate || 0);
        const qty = onlyNumber((it as any).orderedQtyPcs || 0);
        return sum + rate * qty;
      }, 0);

      return {
        ...o,
        totalAmount,
      };
    });

    return NextResponse.json(
      { ok: true, orders: enriched },
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

/* -----------------------------
  POST
  Create InboundOrder (SM -> Distributor -> Warehouse)
  Body:
  {
    distributorId: "cuid...",
    items: [{ productName: "Soap 100g", orderedQtyPcs: 10 }]
  }
  Notes:
  - rate AUTO from ProductCatalog.salePrice (locked)
------------------------------ */
export async function POST(req: Request) {
  try {
    const sm = await requireSalesManager();

    const body = await req.json().catch(() => ({}));
    const distributorId = String(body?.distributorId || body?.forDistributorId || "").trim();
    const itemsInput = Array.isArray(body?.items) ? body.items : [];

    if (!distributorId) {
      throw badRequest("distributorId required");
    }

    if (itemsInput.length === 0) {
      throw badRequest("items required");
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
      where: { name: { in: cleanItems.map((x) => x.productName) } },
      select: { name: true, salePrice: true, isActive: true },
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

    let orderNo = makeOrderNo();
    let uniqueFound = false;

    for (let tries = 0; tries < 5; tries++) {
      const exists = await prisma.inboundOrder.findUnique({
        where: { orderNo },
        select: { id: true },
      });

      if (!exists) {
        uniqueFound = true;
        break;
      }

      orderNo = makeOrderNo();
    }

    if (!uniqueFound) {
      throw badRequest("Could not generate unique order number. Please try again.");
    }

    const smUserId = String((sm as any).userId || (sm as any).id || "").trim();
    if (!smUserId) {
      throw unauthorized("Invalid session");
    }

    const created = await prisma.inboundOrder.create({
      data: {
        orderNo,
        forDistributorId: distributorId,
        createdByUserId: smUserId,
        status: "CREATED",
        paymentStatus: "UNPAID",
        paidAmount: 0,
        paymentVerified: false,
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
      },
    });

    const totalAmount = (created.items || []).reduce((sum, it) => {
      const rate = onlyNumber((it as any).rate || 0);
      const qty = onlyNumber((it as any).orderedQtyPcs || 0);
      return sum + rate * qty;
    }, 0);

    return NextResponse.json(
      {
        ok: true,
        orderId: created.id,
        orderNo: created.orderNo,
        distributor: created.distributor,
        items: created.items,
        totalAmount,
      },
      {
        status: 201,
        headers: NO_STORE_HEADERS,
      }
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