import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

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
  if (!user) return null;
  if (user.role !== "SALES_MANAGER") return null;
  return user; // {id, role, distributorId?}
}

/* -----------------------------
  GET
  - /api/sales-manager/distributor-orders?meta=1  => products + distributors
  - /api/sales-manager/distributor-orders?take=100 => orders
------------------------------ */
export async function GET(req: Request) {
  try {
    const sm = await requireSalesManager();
    if (!sm) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const meta = searchParams.get("meta");
    const take = Math.min(onlyNumber(searchParams.get("take") || 100), 200);

    if (meta === "1") {
      const [products, distributors] = await Promise.all([
        prisma.productCatalog.findMany({
          where: { isActive: true },
          select: { id: true, name: true, salePrice: true, mrp: true, isActive: true },
          orderBy: { name: "asc" },
        }),
        prisma.distributor.findMany({
          // aap chahe to ACTIVE filter hata sakte ho
          // where: { status: "ACTIVE" },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
      ]);

      return NextResponse.json(
        { ok: true, products, distributors },
        { headers: { "cache-control": "no-store" } }
      );
    }

    // Orders list (Sales manager created inbound orders)
    const orders = await prisma.inboundOrder.findMany({
      take,
      orderBy: { createdAt: "desc" },
      include: {
        distributor: { select: { id: true, name: true } },
        items: true,
      },
    });

    // totalAmount compute (items rate * qty)
    const enriched = orders.map((o) => {
      const totalAmount = (o.items || []).reduce((s, it) => {
        const rate = onlyNumber(it.rate || 0);
        const qty = onlyNumber(it.orderedQtyPcs || 0);
        return s + rate * qty;
      }, 0);

      return { ...o, totalAmount };
    });

    return NextResponse.json(
      { ok: true, orders: enriched },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e: any) {
    console.error("SM distributor-orders GET error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
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
    if (!sm) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const distributorId = String(body?.distributorId || body?.forDistributorId || "").trim();
    const itemsInput = Array.isArray(body?.items) ? body.items : [];

    if (!distributorId) {
      return NextResponse.json({ ok: false, error: "distributorId required" }, { status: 400 });
    }

    if (itemsInput.length === 0) {
      return NextResponse.json({ ok: false, error: "items required" }, { status: 400 });
    }

    // Validate distributor exists
    const dist = await prisma.distributor.findUnique({
      where: { id: distributorId },
      select: { id: true, name: true },
    });
    if (!dist) {
      return NextResponse.json({ ok: false, error: "Distributor not found" }, { status: 404 });
    }

    // Normalize + validate items
    const cleanItems: { productName: string; orderedQtyPcs: number }[] = [];
    for (const it of itemsInput) {
      const productName = String(it?.productName || it?.name || "").trim();
      const orderedQtyPcs = Math.max(1, Math.floor(onlyNumber(it?.orderedQtyPcs ?? it?.qtyPcs ?? it?.qty ?? 0)));

      if (!productName) {
        return NextResponse.json({ ok: false, error: "Each item needs productName" }, { status: 400 });
      }
      cleanItems.push({ productName, orderedQtyPcs });
    }

    // Prevent duplicate products
    const names = cleanItems.map((x) => x.productName.toLowerCase());
    if (new Set(names).size !== names.length) {
      return NextResponse.json(
        { ok: false, error: "Same product selected multiple times. Use one row per product." },
        { status: 400 }
      );
    }

    // Fetch productCatalog rates by name
    const catalog = await prisma.productCatalog.findMany({
      where: { name: { in: cleanItems.map((x) => x.productName) } },
      select: { name: true, salePrice: true, isActive: true },
    });

    const priceMap = new Map<string, number>();
    for (const p of catalog) {
      priceMap.set(p.name, onlyNumber(p.salePrice));
    }

    // Ensure all products exist
    for (const it of cleanItems) {
      if (!priceMap.has(it.productName)) {
        return NextResponse.json(
          { ok: false, error: `Product not found in catalog: ${it.productName}` },
          { status: 400 }
        );
      }
    }

    // Create orderNo unique
    let orderNo = makeOrderNo();
    for (let tries = 0; tries < 5; tries++) {
      const exists = await prisma.inboundOrder.findUnique({ where: { orderNo } });
      if (!exists) break;
      orderNo = makeOrderNo();
    }

    // Create InboundOrder + items
    const created = await prisma.inboundOrder.create({
      data: {
        orderNo,
        forDistributorId: distributorId,
        createdByUserId: sm.id,
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

    const totalAmount = (created.items || []).reduce((s, it) => {
      const rate = onlyNumber(it.rate || 0);
      const qty = onlyNumber(it.orderedQtyPcs || 0);
      return s + rate * qty;
    }, 0);

    return NextResponse.json(
      { ok: true, orderId: created.id, orderNo: created.orderNo, distributor: created.distributor, items: created.items, totalAmount },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e: any) {
    console.error("SM distributor-orders POST error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
