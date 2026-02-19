// app/api/distributor/retailer-orders/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseDateParam(v: string | null) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function clampInt(v: string | null, def: number, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  const x = Math.floor(n);
  return Math.max(min, Math.min(max, x));
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function rangeDates(range: string | null) {
  const now = new Date();
  const r = String(range || "").toLowerCase().trim();

  if (r === "today") return { from: startOfDay(now), to: endOfDay(now) };
  if (r === "week") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { from: startOfDay(from), to: endOfDay(now) };
  }
  if (r === "month") {
    const from = new Date(now);
    from.setDate(from.getDate() - 29);
    return { from: startOfDay(from), to: endOfDay(now) };
  }
  return { from: null as Date | null, to: null as Date | null };
}

export async function GET(req: Request) {
  try {
    const distributorId = await requireDistributorId();

    const { searchParams } = new URL(req.url);
    const take = clampInt(searchParams.get("take"), 200, 1, 500);

    const range = searchParams.get("range"); // today | week | month
    const fromRaw = searchParams.get("from");
    const toRaw = searchParams.get("to");
    const statusRaw = (searchParams.get("status") || "").trim().toUpperCase();
    
    const retailerId = (searchParams.get("retailerId") || "").trim();

    // status filter (optional)
    const allowedStatuses = ["SUBMITTED", "CONFIRMED", "DISPATCHED", "DELIVERED", "REJECTED", "CANCELLED"];
    const status = allowedStatuses.includes(statusRaw) ? (statusRaw as any) : null;

    let fromDate = parseDateParam(fromRaw);
    let toDate = parseDateParam(toRaw);

    if ((!fromDate || !toDate) && range) {
      const rr = rangeDates(range);
      if (!fromDate) fromDate = rr.from;
      if (!toDate) toDate = rr.to;
    }

    const where: any = { distributorId };
    if (status) where.status = status;

    if (retailerId) where.retailerId = retailerId;


    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = fromDate;
      if (toDate) where.createdAt.lte = toDate;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      include: {
        retailer: { select: { id: true, name: true, phone: true, city: true } },
        items: true,
        invoice: { select: { id: true, invoiceNo: true, totalAmount: true, createdAt: true } },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        take,
        count: orders.length,
        from: fromDate ? fromDate.toISOString() : null,
        to: toDate ? toDate.toISOString() : null,
        orders, // ✅ UI will show now
      },
      { status: 200 }
    );
  } catch (e: any) {
    const msg = String(e?.message || e || "Unauthorized");
    const isAuth =
      msg.toLowerCase().includes("unauthor") ||
      msg.toLowerCase().includes("session") ||
      msg.toLowerCase().includes("distributor");

    return NextResponse.json({ ok: false, error: msg }, { status: isAuth ? 401 : 500 });
  }
}
