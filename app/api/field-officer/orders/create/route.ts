// app/api/field-officer/orders/create/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asInt(v: any, def = 0) {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : def;
}
function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function genOrderNo(prefix = "FO") {
  const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase(); // 6 chars
  return `${prefix}-${ymd}-${rand}`;
}

type Payload = {
  retailerId?: string;
  items?: Array<{ productId: string; qty: number }>;
};

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

export async function POST(req: Request) {
  try {
    const auth = await requireFO();
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

    const body = (await req.json().catch(() => ({}))) as Payload;

    const retailerId = cleanStr(body.retailerId);
    const rawItems = Array.isArray(body.items) ? body.items : [];

    if (!retailerId) {
      return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });
    }

    const items = rawItems
      .map((it) => ({
        productId: String(it?.productId || "").trim(),
        qty: asInt(it?.qty, 0),
      }))
      .filter((it) => it.productId && it.qty > 0);

    if (items.length < 1) {
      return NextResponse.json({ ok: false, error: "At least 1 valid item required" }, { status: 400 });
    }

    // ✅ Ensure retailer exists & belongs to FO distributor
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

    // ✅ Load product names for productIds
    const productIds = Array.from(new Set(items.map((x) => x.productId)));

    const products = await prisma.productCatalog.findMany({
      where: { id: { in: productIds }, isActive: true },
      select: { id: true, name: true, salePrice: true, mrp: true },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate all productIds exist
    for (const pid of productIds) {
      if (!productMap.has(pid)) {
        return NextResponse.json({ ok: false, error: `Invalid or inactive productId: ${pid}` }, { status: 400 });
      }
    }

    // ✅ Distributor specific rates (by productName)
    const names = Array.from(new Set(products.map((p) => p.name)));

    const rateRows = await prisma.distributorProductRate.findMany({
      where: { distributorId: auth.distributorId, productName: { in: names } },
      select: { productName: true, saleRate: true },
    });

    const rateMap = new Map(rateRows.map((r) => [r.productName, r.saleRate]));

    const orderItems = items.map((it) => {
      const p = productMap.get(it.productId)!;
      const rate = Number(rateMap.get(p.name) ?? p.salePrice ?? p.mrp ?? 0);
      if (!rate || rate <= 0) throw new Error(`Rate missing for product: ${p.name}`);

      const amount = Number(it.qty) * rate;

      return {
        productName: p.name,
        qty: it.qty,
        rate,
        amount,
      };
    });

    const totalAmount = orderItems.reduce((sum, x) => sum + x.amount, 0);

    // ✅ Create order
    const order = await prisma.order.create({
      data: {
        // id optional now because schema has default(uuid), but ok to pass too
        id: crypto.randomUUID(),
        orderNo: genOrderNo("FO"),            // ✅ FIX for your current error
        distributorId: auth.distributorId,    // ✅ required in schema
        retailerId,
        status: "SUBMITTED",
        totalAmount,
        paidAmount: 0,
        items: { create: orderItems },        // ✅ matches OrderItem schema
      },
      select: { id: true, orderNo: true, totalAmount: true },
    });

    return NextResponse.json({ ok: true, order }, { status: 201 });
  } catch (e: any) {
    console.error("Create order error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}