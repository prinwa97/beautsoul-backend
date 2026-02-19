// app/api/field-officer/orders/[orderId]/route.ts
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

function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

// ✅ Next 15/16: params is Promise
type Ctx = { params: Promise<{ orderId: string }> };

/**
 * Allowed only when:
 * - FO logged in
 * - order.retailer.distributorId === FO.distributorId
 * - order.status === SUBMITTED
 * - order.invoice exists? => lock
 */

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const auth = await requireFO();
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

    const { orderId: raw } = await ctx.params; // ✅ unwrap
    const orderId = cleanStr(raw);
    if (!orderId) return NextResponse.json({ ok: false, error: "orderId required" }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    // items: [{ itemId, qty }]
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) {
      return NextResponse.json({ ok: false, error: "items required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        retailer: { select: { distributorId: true } },
        invoice: { select: { id: true } }, // ✅ relation (no invoiceId field)
        items: { select: { id: true, rate: true } },
      },
    });

    if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

    if (order.retailer?.distributorId !== auth.distributorId) {
      return NextResponse.json({ ok: false, error: "Order not under your distributor" }, { status: 403 });
    }

    if (String(order.status || "").toUpperCase() !== "SUBMITTED") {
      return NextResponse.json(
        { ok: false, error: `Order locked (status: ${order.status}). Edit allowed only before distributor processes.` },
        { status: 403 }
      );
    }

    // ✅ lock if invoice exists
    if (order.invoice?.id) {
      return NextResponse.json({ ok: false, error: "Order locked (invoice already created)" }, { status: 403 });
    }

    const existingRateByItemId = new Map(order.items.map((it) => [it.id, n(it.rate)]));

    const updates: Array<{ itemId: string; qty: number; amount: number }> = [];
    for (const it of items) {
      const itemId = cleanStr(it?.itemId);
      const qty = Math.floor(n(it?.qty));
      if (!itemId) continue;
      if (!existingRateByItemId.has(itemId)) continue;

      const rate = existingRateByItemId.get(itemId) || 0;

      // qty <= 0 means delete item
      if (!Number.isFinite(qty) || qty <= 0) updates.push({ itemId, qty: 0, amount: 0 });
      else updates.push({ itemId, qty, amount: qty * rate });
    }

    if (!updates.length) {
      return NextResponse.json({ ok: false, error: "No valid items to update" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      for (const u of updates) {
        if (u.qty <= 0) {
          await tx.orderItem.delete({ where: { id: u.itemId } });
        } else {
          await tx.orderItem.update({
            where: { id: u.itemId },
            data: { qty: u.qty, amount: u.amount },
          });
        }
      }

      const freshItems = await tx.orderItem.findMany({
        where: { orderId },
        select: { amount: true },
      });

      const totalAmount = freshItems.reduce((sum, x) => sum + n(x.amount), 0);

      await tx.order.update({
        where: { id: orderId },
        data: { totalAmount },
      });

      return { totalAmount, itemsCount: freshItems.length };
    });

    return NextResponse.json({ ok: true, orderId, ...result }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to update order", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, ctx: Ctx) {
  try {
    const auth = await requireFO();
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

    const { orderId: raw } = await ctx.params; // ✅ unwrap
    const orderId = cleanStr(raw);
    if (!orderId) return NextResponse.json({ ok: false, error: "orderId required" }, { status: 400 });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        retailer: { select: { distributorId: true } },
        invoice: { select: { id: true } }, // ✅ relation
      },
    });

    if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });

    if (order.retailer?.distributorId !== auth.distributorId) {
      return NextResponse.json({ ok: false, error: "Order not under your distributor" }, { status: 403 });
    }

    if (String(order.status || "").toUpperCase() !== "SUBMITTED") {
      return NextResponse.json(
        { ok: false, error: `Order locked (status: ${order.status}). Delete allowed only before distributor processes.` },
        { status: 403 }
      );
    }

    // ✅ lock if invoice exists
    if (order.invoice?.id) {
      return NextResponse.json({ ok: false, error: "Order locked (invoice already created)" }, { status: 403 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId } });
      await tx.order.delete({ where: { id: orderId } });
    });

    return NextResponse.json({ ok: true, orderId, deleted: true }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "Failed to delete order", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}
