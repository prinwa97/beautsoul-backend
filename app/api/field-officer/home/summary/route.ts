import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- date helpers ---------------- */

function monthKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysBetween(now: Date, past: Date) {
  const ms = now.getTime() - past.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/* ---------------- ROUTE ---------------- */

export async function GET() {
  try {
    const u: any = await getSessionUser();

    if (!u) {
      return NextResponse.json(
        { ok: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    if (String(u.role).toUpperCase() !== "FIELD_OFFICER") {
      return NextResponse.json(
        { ok: false, error: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const foUserId = String(u.id || "").trim();
    const distributorId = String(u.distributorId || "").trim();

    if (!foUserId || !distributorId) {
      return NextResponse.json(
        { ok: false, error: "Invalid session data" },
        { status: 400 }
      );
    }

    const now = new Date();
    const mKey = monthKey(now);
    const mStart = startOfMonth(now);

    /* ---------------- TARGET ---------------- */

    let targetAmount = 0;

    const targetsEnabled = process.env.FO_TARGETS_ENABLED === "1";

    if (targetsEnabled) {
      const t = await prisma.fieldOfficerTarget.findUnique({
        where: { foUserId_monthKey: { foUserId, monthKey: mKey } },
        select: { targetValue: true },
      });

      targetAmount = Number(t?.targetValue || 0);
    }

    /* ---------------- ACHIEVED SALES ---------------- */

    const achievedAgg = await prisma.order.aggregate({
      where: {
        distributorId,
        createdAt: { gte: mStart, lte: now },
        status: {
          in: ["SUBMITTED", "CONFIRMED", "DISPATCHED", "DELIVERED"],
        },
      },
      _sum: {
        totalAmount: true,
      },
    });

    const achievedAmount = Number(achievedAgg._sum.totalAmount || 0);
    const pendingTarget = Math.max(0, targetAmount - achievedAmount);

    /* ---------------- ORDER INACTIVITY (TOP 10) ---------------- */

    const orderGroups = await prisma.order.groupBy({
      by: ["retailerId"],
      where: {
        distributorId,
      },
      _max: {
        createdAt: true,
      },
      orderBy: {
        _max: {
          createdAt: "asc",
        },
      },
      take: 10,
    });

    const orderRetailers = await prisma.retailer.findMany({
      where: {
        id: { in: orderGroups.map((o) => o.retailerId) },
      },
      select: {
        id: true,
        name: true,
        city: true,
      },
    });

    const retailerMap = new Map(orderRetailers.map((r) => [r.id, r]));

    const ordersTop10 = orderGroups.map((g) => {
      const r = retailerMap.get(g.retailerId);

      const last = g._max.createdAt;
      const days = last ? daysBetween(now, last) : 99999;

      return {
        retailerId: g.retailerId,
        name: r?.name || "",
        city: r?.city || null,
        noOrderDays: days,
      };
    });

    /* ---------------- PAYMENT INACTIVITY / PENDING PAYMENTS (TOP 10) ---------------- */

    const ledgerGrouped = await prisma.retailerLedger.groupBy({
      by: ["retailerId", "type"],
      where: { distributorId },
      _sum: { amount: true },
      _max: { date: true },
    });

    const debitMap = new Map<string, number>();
    const creditMap = new Map<string, number>();
    const lastPayMap = new Map<string, Date>();

    for (const g of ledgerGrouped as any[]) {
      const retailerId = String(g.retailerId);
      const amt = Number(g?._sum?.amount || 0);

      if (g.type === "DEBIT") {
        debitMap.set(retailerId, (debitMap.get(retailerId) || 0) + amt);
      } else if (g.type === "CREDIT") {
        creditMap.set(retailerId, (creditMap.get(retailerId) || 0) + amt);
      }

      const dt = g?._max?.date ? new Date(g._max.date) : null;
      if (dt) {
        const prev = lastPayMap.get(retailerId);
        if (!prev || dt > prev) {
          lastPayMap.set(retailerId, dt);
        }
      }
    }

    const paymentRetailerIds = Array.from(
      new Set([...debitMap.keys(), ...creditMap.keys()])
    );

    const payRetailers = await prisma.retailer.findMany({
      where: {
        id: { in: paymentRetailerIds },
      },
      select: {
        id: true,
        name: true,
        city: true,
      },
    });

    const payMap = new Map(payRetailers.map((r) => [r.id, r]));

    const paymentsTop10 = paymentRetailerIds
      .map((retailerId) => {
        const r = payMap.get(retailerId);
        const debit = debitMap.get(retailerId) || 0;
        const credit = creditMap.get(retailerId) || 0;
        const pendingAmount = debit - credit;

        const last = lastPayMap.get(retailerId) || null;
        const days = last ? daysBetween(now, last) : 99999;

        return {
          retailerId,
          name: r?.name || "",
          city: r?.city || null,
          pendingAmount,
          noPaymentDays: days,
        };
      })
      .filter((x) => x.pendingAmount > 0)
      .sort((a, b) => {
        if (b.pendingAmount !== a.pendingAmount) {
          return b.pendingAmount - a.pendingAmount;
        }
        return b.noPaymentDays - a.noPaymentDays;
      })
      .slice(0, 10);

    return NextResponse.json({
      ok: true,
      month: mKey,
      target: {
        targetAmount,
        achievedAmount,
        pendingTarget,
      },
      ordersTop10,
      paymentsTop10,
      targetsEnabled,
    });
  } catch (err: any) {
    console.error("FO summary error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Server error",
      },
      { status: 500 }
    );
  }
}