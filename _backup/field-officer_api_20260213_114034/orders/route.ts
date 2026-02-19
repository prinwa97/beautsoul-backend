// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/api/field-officer/orders/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= helpers ================= */

function asInt(n: any) {
  const x = Math.floor(Number(n || 0));
  return Number.isFinite(x) ? x : 0;
}

function asFloat(n: any) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? x : 0;
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function makeId(prefix = "ord") {
  // stable unique id for Prisma String @id (Order.id / OrderItem.id)
  // nodejs runtime supports crypto.randomUUID()
  // fallback to timestamp if crypto not available
  try {
    // @ts-ignore
    const u = crypto?.randomUUID?.();
    if (u) return `${prefix}_${u}`;
  } catch {}
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function makeOrderNo() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `FO-${yyyy}${mm}${dd}-${rand}`;
}

async function requireFieldOfficer() {
  const u: any = await getSessionUser();
  if (!u) return { ok: false as const, status: 401 as const, error: "Unauthorized" };

  const role = String(u.role || "").toUpperCase();
  if (role !== "FIELD_OFFICER") {
    return { ok: false as const, status: 403 as const, error: "Only Field Officer allowed" };
  }

  const distributorId = String(u.distributorId || u?.distributor?.id || "").trim();
  if (!distributorId) {
    return { ok: false as const, status: 400 as const, error: "DistributorId missing in session. Re-login." };
  }

  return { ok: true as const, user: u, distributorId };
}

/* ================= POST: create order ================= */

type Body = {
  retailerId?: string;
  items?: Array<{
    productName?: string;
    qty?: any;
    rate?: any;
  }>;
};

export async function POST(req: Request) {
  try {
    const auth = await requireFieldOfficer();
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

    const body = (await req.json().catch(() => ({}))) as Body;

    const retailerId = cleanStr(body.retailerId);
    const itemsRaw = Array.isArray(body.items) ? body.items : [];

    if (!retailerId) {
      return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });
    }
    if (!itemsRaw.length) {
      return NextResponse.json({ ok: false, error: "items required" }, { status: 400 });
    }

    // ✅ verify retailer exists + belongs to same distributor (security)
    const retailer = await prisma.retailer.findUnique({
      where: { id: retailerId },
      select: { id: true, distributorId: true, status: true, name: true },
    });

    if (!retailer) return NextResponse.json({ ok: false, error: "Retailer not found" }, { status: 404 });
    if (!retailer.distributorId) {
      return NextResponse.json({ ok: false, error: "Retailer has no distributorId" }, { status: 400 });
    }
    if (String(retailer.distributorId) !== String(auth.distributorId)) {
      return NextResponse.json({ ok: false, error: "Retailer not under your distributor" }, { status: 403 });
    }

    // ✅ normalize items
    const items = itemsRaw
      .map((it) => {
        const productName = cleanStr(it?.productName);
        const qty = asInt(it?.qty);
        const rate = asFloat(it?.rate);
        const amount = qty * rate;
        return { productName, qty, rate, amount };
      })
      .filter((x) => x.productName && x.qty > 0 && x.rate >= 0);

    if (!items.length) {
      return NextResponse.json({ ok: false, error: "Valid items not found (productName/qty/rate)" }, { status: 400 });
    }

    // ✅ totals
    const totalAmount = items.reduce((s, x) => s + Number(x.amount || 0), 0);

    // ✅ create
    const orderId = makeId("order");
    const orderNo = makeOrderNo();

    const created = await prisma.order.create({
      data: {
        id: orderId,
        orderNo,
        distributorId: auth.distributorId,
        retailerId,
        status: "SUBMITTED",
        totalAmount,
        paidAmount: 0,
        updatedAt: new Date(),

        items: {
          create: items.map((x) => ({
            id: makeId("oi"),
            productName: x.productName,
            qty: x.qty,
            rate: x.rate,
            amount: x.amount,
          })),
        },
      },
      select: {
        id: true,
        orderNo: true,
        status: true,
        retailerId: true,
        distributorId: true,
        totalAmount: true,
        paidAmount: true,
        createdAt: true,
        items: {
          select: { id: true, productName: true, qty: true, rate: true, amount: true },
        },
      },
    });

    return NextResponse.json({ ok: true, order: created });
  } catch (e: any) {
    // Prisma unique constraint handling (orderNo)
    const msg = String(e?.message || "");
    if (msg.includes("P2002")) {
      return NextResponse.json({ ok: false, error: "Duplicate orderNo. Try again." }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

/* ================= GET: health check ================= */

export async function GET() {
  return NextResponse.json({ ok: true, route: "field-officer/orders" });
}
