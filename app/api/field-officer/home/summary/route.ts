import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function ymdMonth(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yyyy}-${mm}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysBetween(now: Date, past: Date) {
  const ms = now.getTime() - past.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

export async function GET() {
  try {
    const u: any = await getSessionUser();
    if (!u) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const role = String(u.role || "").toUpperCase();
    if (role !== "FIELD_OFFICER") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const foUserId = String(u.id || "");
    const distributorId = u.distributorId ? String(u.distributorId) : null;

    if (!distributorId) {
      return NextResponse.json({ ok: false, error: "Missing distributorId in session" }, { status: 400 });
    }

    const now = new Date();
    const monthKey = ymdMonth(now);
    const monthStart = startOfMonth(now);

    const retailers = await prisma.retailer.findMany({
      where: { distributorId },
      select: { id: true, name: true, city: true },
      orderBy: { name: "asc" },
    });

    const retailerIds = retailers.map((r) => r.id);

    /* ---------------- TARGET ---------------- */
    let targetAmount = 0;

    const targetsEnabled = process.env.FO_TARGETS_ENABLED === "1";
    if (targetsEnabled && foUserId) {
      // enable only after DB migration creates SalesTarget table
      const targetRow = await prisma.salesTarget.findUnique({
        where: { month_fieldOfficerId: { month: monthKey, fieldOfficerId: foUserId } },
        select: { targetAmount: true },
      });
      targetAmount = Number(targetRow?.targetAmount || 0);
    }

    /* ---------------- ACHIEVED ----------------
       ✅ Fix: Count all "active" order statuses (not only DELIVERED)
       so Achieved will show even if dispatch/delivered not done yet.
    */
    let achievedAmount = 0;
    if (retailerIds.length) {
      const agg: any = await prisma.order.aggregate({
        where: {
          distributorId,
          retailerId: { in: retailerIds },
          createdAt: { gte: monthStart, lte: now },
          status: {
            in: ["SUBMITTED", "CONFIRMED", "DISPATCHED", "DELIVERED"] as any,
          },
        } as any,
        _sum: { totalAmount: true },
      });

      achievedAmount = Number(agg?._sum?.totalAmount || 0);
    }

    const pendingTarget = Math.max(0, targetAmount - achievedAmount);

    /* ---------------- ORDER INACTIVITY ---------------- */
    let ordersTop10: any[] = [];
    if (retailerIds.length) {
      const orders = await prisma.order.findMany({
        where: { distributorId, retailerId: { in: retailerIds } },
        select: { retailerId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });

      const lastMap = new Map<string, Date>();
      for (const o of orders) {
        if (!lastMap.has(o.retailerId)) lastMap.set(o.retailerId, o.createdAt);
      }

      ordersTop10 = retailers
        .map((r) => {
          const last = lastMap.get(r.id);
          const days = last ? daysBetween(now, last) : 99999;
          return { retailerId: r.id, name: r.name, city: r.city, noOrderDays: days };
        })
        .sort((a, b) => b.noOrderDays - a.noOrderDays)
        .slice(0, 10);
    }

    /* ---------------- PAYMENT INACTIVITY ---------------- */
    let paymentsTop10: any[] = [];
    if (retailerIds.length) {
      const ledger = await prisma.retailerLedger.findMany({
        where: { distributorId, retailerId: { in: retailerIds } },
        select: { retailerId: true, type: true, amount: true, date: true },
        orderBy: { date: "desc" },
      });

      const debit = new Map<string, number>();
      const credit = new Map<string, number>();
      const lastPay = new Map<string, Date>();

      for (const e of ledger) {
        const rid = e.retailerId;
        const amt = Number(e.amount || 0);

        if (e.type === ("DEBIT" as any)) {
          debit.set(rid, (debit.get(rid) || 0) + amt);
        } else {
          credit.set(rid, (credit.get(rid) || 0) + amt);
          if (!lastPay.has(rid)) lastPay.set(rid, e.date);
        }
      }

      paymentsTop10 = retailers
        .map((r) => {
          const pending = (debit.get(r.id) || 0) - (credit.get(r.id) || 0);
          const last = lastPay.get(r.id);
          const days = last ? daysBetween(now, last) : 99999;

          return {
            retailerId: r.id,
            name: r.name,
            city: r.city,
            pendingAmount: Math.max(0, pending),
            noPaymentDays: days,
          };
        })
        .filter((x) => x.pendingAmount > 0)
        .sort((a, b) => {
          if (b.pendingAmount !== a.pendingAmount) return b.pendingAmount - a.pendingAmount;
          return b.noPaymentDays - a.noPaymentDays;
        })
        .slice(0, 10);
    }

    return NextResponse.json({
      ok: true,
      month: monthKey,
      target: { targetAmount, achievedAmount, pendingTarget },
      ordersTop10,
      paymentsTop10,
      targetsEnabled,
    });
  } catch (e: any) {
    console.error("FO summary error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}