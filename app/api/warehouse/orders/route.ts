import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isWarehouseRole(role: unknown) {
  const r = String(role || "").toUpperCase();
  return r.includes("WAREHOUSE") || r.includes("STORE") || r === "ADMIN";
}

function asInt(v: string | null, def: number) {
  const n = Math.floor(Number(v ?? ""));
  return Number.isFinite(n) ? n : def;
}

function cleanStr(v: string | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

type AllowedStatus =
  | "SUBMITTED"
  | "CONFIRMED"
  | "DISPATCHED"
  | "DELIVERED"
  | "REJECTED"
  | "CANCELLED";

function isAllowedStatus(v: string): v is AllowedStatus {
  return (
    v === "SUBMITTED" ||
    v === "CONFIRMED" ||
    v === "DISPATCHED" ||
    v === "DELIVERED" ||
    v === "REJECTED" ||
    v === "CANCELLED"
  );
}

export async function GET(req: Request) {
  try {
    const me: any = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!isWarehouseRole(me?.role)) {
      return NextResponse.json({ ok: false, error: "Forbidden (Warehouse only)" }, { status: 403 });
    }

    const url = new URL(req.url);

    const take = Math.min(500, Math.max(10, asInt(url.searchParams.get("take"), 200)));
    const statusParam = cleanStr(url.searchParams.get("status"));
    const q = cleanStr(url.searchParams.get("q"));
    const distributorId = cleanStr(url.searchParams.get("distributorId"));

    const status = statusParam && isAllowedStatus(statusParam.toUpperCase())
      ? (statusParam.toUpperCase() as AllowedStatus)
      : null;

    // ✅ Order model ke fields ke hisaab se ONLY filters
    const where: any = {};
    if (status) where.status = status;
    if (distributorId) where.distributorId = distributorId;

    if (q) {
      where.OR = [
        { orderNo: { contains: q, mode: "insensitive" } },
        { distributor: { name: { contains: q, mode: "insensitive" } } },
        { retailer: { name: { contains: q, mode: "insensitive" } } },
      ];
    }

    // ✅ list rows (NO dispatchDate / shippingMode etc. because Order model me nahi hai)
    const rows = await prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        orderNo: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        totalAmount: true,
        paidAmount: true,

        distributor: { select: { id: true, name: true, city: true, state: true } },
        retailer: { select: { id: true, name: true, city: true, state: true } },

        items: { select: { id: true, productName: true, qty: true, rate: true, amount: true } },

        invoice: {
          select: {
            id: true,
            invoiceNo: true,
            paymentStatus: true,
            paymentMode: true,
            paidAmount: true,
            utrNo: true,
            paidAt: true,
          },
        },
      },
    });

    // ✅ ADVANCED MONITORING (Control Tower)
    const now = Date.now();
    const today0 = startOfToday();

    const pipeline = {
      submitted: 0,
      confirmed: 0,
      dispatched: 0,
      delivered: 0,
      rejected: 0,
      cancelled: 0,
    };

    let backlog = 0;          // active orders (not delivered/cancelled/rejected)
    let warnDelay = 0;        // >12h
    let criticalDelay = 0;    // >24h
    let dispatchedToday = 0;

    let revenuePending = 0;   // totalAmount sum for active orders
    let revenueStuck = 0;     // totalAmount where status not DISPATCHED/DELIVERED and age > 12h

    for (const o of rows) {
      const st = String(o.status || "");
      if (st === "SUBMITTED") pipeline.submitted++;
      else if (st === "CONFIRMED") pipeline.confirmed++;
      else if (st === "DISPATCHED") pipeline.dispatched++;
      else if (st === "DELIVERED") pipeline.delivered++;
      else if (st === "REJECTED") pipeline.rejected++;
      else if (st === "CANCELLED") pipeline.cancelled++;

      const active = st !== "DELIVERED" && st !== "CANCELLED" && st !== "REJECTED";
      if (active) {
        backlog++;
        revenuePending += Number(o.totalAmount || 0);

        const ageHours = (now - new Date(o.createdAt).getTime()) / 36e5;
        if (ageHours > 24) criticalDelay++;
        else if (ageHours > 12) warnDelay++;

        if (ageHours > 12 && st !== "DISPATCHED") {
          revenueStuck += Number(o.totalAmount || 0);
        }
      }

      // dispatched today (heuristic): status DISPATCHED & updatedAt today
      if (st === "DISPATCHED") {
        const upd = new Date(o.updatedAt).getTime();
        if (upd >= today0.getTime()) dispatchedToday++;
      }
    }

    // ✅ Top distributors by backlog (simple but very useful)
    const byDistributor = new Map<string, { id: string; name: string; pending: number; value: number }>();
    for (const o of rows) {
      const st = String(o.status || "");
      const active = st !== "DELIVERED" && st !== "CANCELLED" && st !== "REJECTED";
      if (!active) continue;

      const d = o.distributor;
      const key = d?.id || "unknown";
      const cur = byDistributor.get(key) || { id: d?.id || "unknown", name: d?.name || "Unknown", pending: 0, value: 0 };
      cur.pending += 1;
      cur.value += Number(o.totalAmount || 0);
      byDistributor.set(key, cur);
    }

    const distributorLoad = Array.from(byDistributor.values())
      .sort((a, b) => b.pending - a.pending || b.value - a.value)
      .slice(0, 8);

    return NextResponse.json({
      ok: true,
      take,
      stats: {
        total: rows.length,
        pipeline,
        backlog,
        delay: {
          warn12hPlus: warnDelay,
          critical24hPlus: criticalDelay,
        },
        dispatchedToday,
        revenue: {
          pendingDispatchValue: Math.round(revenuePending),
          stuck12hPlusValue: Math.round(revenueStuck),
        },
        distributorLoad,
      },
      rows,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || e || "Server error") },
      { status: 500 }
    );
  }
}
