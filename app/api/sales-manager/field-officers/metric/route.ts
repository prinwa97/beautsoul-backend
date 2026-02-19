// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/api/sales-manager/field-officers/metric/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesManager } from "@/lib/sales-manager/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function clean(s: any) {
  const x = String(s ?? "").trim();
  return x.length ? x : "";
}

function parseYMD(ymd: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;

  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;

  const start = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(y, mo - 1, d + 1, 0, 0, 0));
  return { start, endExclusive, y, mo, d };
}

function rangeFromTo(fromYMD: string, toYMD: string) {
  const a = parseYMD(fromYMD);
  const b = parseYMD(toYMD);
  if (!a || !b) return null;

  const start = a.start;
  const endExclusive = b.endExclusive; // inclusive end -> +1 day
  if (start.getTime() >= endExclusive.getTime()) return null;

  return { start, endExclusive, toParts: b };
}

// ✅ professional growth logic
function pctChange(curr: number, prev: number) {
  const c = Number(curr || 0);
  const p = Number(prev || 0);

  if (p === 0 && c === 0) return 0;
  if (p === 0 && c > 0) return 100;

  return ((c - p) / p) * 100;
}

function monthLabelUTC(d: Date) {
  try {
    return d.toLocaleString("en-IN", { month: "short", year: "numeric", timeZone: "UTC" });
  } catch {
    return "—";
  }
}

function monthStartUTC(year: number, monthIndex0: number) {
  return new Date(Date.UTC(year, monthIndex0, 1, 0, 0, 0));
}

function nextMonthStartUTC(year: number, monthIndex0: number) {
  return new Date(Date.UTC(year, monthIndex0 + 1, 1, 0, 0, 0));
}

/**
 * GET /api/sales-manager/field-officers/metric?foUserId=...&metric=ORDERS&from=YYYY-MM-DD&to=YYYY-MM-DD
 * supported: ORDERS | RETAILERS | COLLECTION | AUDIT | DISTRIBUTORS | GROWTH | CURRENT_MONTH
 */
export async function GET(req: Request) {
  const auth = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);
  if (!auth.ok) return jsonError(auth.error || "Unauthorized", (auth as any).status || 401);

  try {
    const { searchParams } = new URL(req.url);

    const foUserId = clean(searchParams.get("foUserId"));
    const metric = clean(searchParams.get("metric")).toUpperCase();
    const from = clean(searchParams.get("from"));
    const to = clean(searchParams.get("to"));

    if (!foUserId) return jsonError("foUserId required", 400);
    if (!metric) return jsonError("metric required", 400);
    if (!from || !to) return jsonError("from and to required (YYYY-MM-DD)", 400);

    const rng = rangeFromTo(from, to);
    if (!rng) return jsonError("Invalid date range", 400);

    // FO basic
    const fo = await prisma.user.findUnique({
      where: { id: foUserId },
      select: { id: true, name: true, role: true, distributorId: true },
    });
    if (!fo || fo.role !== "FIELD_OFFICER") return jsonError("Field officer not found", 404);

    // SM access guard (if not admin)
    if (auth.role !== "ADMIN") {
      const ok = await prisma.distributor.findFirst({
        where: { id: fo.distributorId || "__", salesManagerId: auth.userId },
        select: { id: true },
      });
      if (!ok) return jsonError("Forbidden", 403);
    }

    // ✅ Assigned retailers (SOURCE OF TRUTH: RetailerAssignmentActive)
    const maps = await prisma.retailerAssignmentActive.findMany({
      where: { foUserId },
      select: { retailerId: true },
    });
    const retailerIds = maps.map((x) => x.retailerId).filter(Boolean) as string[];

    // retailers info (for names)
    const retailers = retailerIds.length
      ? await prisma.retailer.findMany({
          where: { id: { in: retailerIds } },
          select: { id: true, name: true, city: true, state: true, phone: true },
        })
      : [];
    const rMap = new Map(retailers.map((r) => [r.id, r]));

    // ------------------ DISTRIBUTORS ------------------
    if (metric === "DISTRIBUTORS") {
      const dist = fo.distributorId
        ? await prisma.distributor.findUnique({
            where: { id: fo.distributorId },
            select: { name: true, code: true, city: true, state: true, status: true },
          })
        : null;

      return NextResponse.json({
        ok: true,
        metric,
        from,
        to,
        fo: { name: fo.name },
        rows: dist ? [dist] : [],
      });
    }

    // If no retailers assigned
    if (!retailerIds.length) {
      return NextResponse.json({
        ok: true,
        metric,
        from,
        to,
        fo: { name: fo.name },
        rows: [],
      });
    }

    // ------------------ GROWTH (LAST 6 COMPLETED MONTHS, current month excluded) ------------------
    if (metric === "GROWTH") {
      const toParts = rng.toParts;
      const anchorYear = toParts.y;
      const anchorMonth0 = toParts.mo - 1;

      const months: { start: Date; end: Date; label: string }[] = [];

      // ✅ PROFESSIONAL: current/running month exclude
      // Example: if to is Feb 2026 => show Aug 2025 .. Jan 2026 (6 completed months)
      for (let i = 6; i >= 1; i--) {
        const d = new Date(Date.UTC(anchorYear, anchorMonth0 - i, 1, 0, 0, 0));
        const y = d.getUTCFullYear();
        const m0 = d.getUTCMonth();
        const start = monthStartUTC(y, m0);
        const end = nextMonthStartUTC(y, m0);
        months.push({ start, end, label: monthLabelUTC(start) });
      }

      const raw: Array<{ month: string; sales: number; orders: number; activeRetailers: number; aov: number }> = [];

      for (const m of months) {
        const agg = await prisma.order.aggregate({
          where: { retailerId: { in: retailerIds }, createdAt: { gte: m.start, lt: m.end } },
          _sum: { totalAmount: true },
          _count: { _all: true },
        });

        const sales = Number(agg._sum.totalAmount || 0);
        const orders = Number(agg._count._all || 0);

        const activeRetailers = await prisma.order.groupBy({
          by: ["retailerId"],
          where: { retailerId: { in: retailerIds }, createdAt: { gte: m.start, lt: m.end } },
        });

        const active = activeRetailers.length;
        const aov = orders > 0 ? sales / orders : 0;

        raw.push({ month: m.label, sales, orders, activeRetailers: active, aov });
      }

      const out = raw.map((cur, idx) => {
        const prev = idx > 0 ? raw[idx - 1] : null;

        const salesGrowthPct = prev ? pctChange(cur.sales, prev.sales) : 0;
        const ordersGrowthPct = prev ? pctChange(cur.orders, prev.orders) : 0;
        const activeRetailersGrowthPct = prev ? pctChange(cur.activeRetailers, prev.activeRetailers) : 0;
        const aovGrowthPct = prev ? pctChange(cur.aov, prev.aov) : 0;

        return {
          month: cur.month,
          salesGrowthPct: Math.round(salesGrowthPct),
          ordersGrowthPct: Math.round(ordersGrowthPct),
          activeRetailersGrowthPct: Math.round(activeRetailersGrowthPct),
          aovGrowthPct: Math.round(aovGrowthPct),
          target: null,
          achievementPct: null,
        };
      });

      return NextResponse.json({ ok: true, metric, from, to, fo: { name: fo.name }, rows: out });
    }

    // ------------------ CURRENT MONTH (LIVE) ------------------
    if (metric === "CURRENT_MONTH") {
      // ✅ Live month based on selected period's "to" month (professional)
      const toParts = rng.toParts;
      const y = toParts.y;
      const m0 = toParts.mo - 1;

      const start = monthStartUTC(y, m0);
      const end = nextMonthStartUTC(y, m0);

      const agg = await prisma.order.aggregate({
        where: { retailerId: { in: retailerIds }, createdAt: { gte: start, lt: end } },
        _sum: { totalAmount: true },
        _count: { _all: true },
      });

      const sales = Number(agg._sum.totalAmount || 0);
      const orders = Number(agg._count._all || 0);

      const activeRetailers = await prisma.order.groupBy({
        by: ["retailerId"],
        where: { retailerId: { in: retailerIds }, createdAt: { gte: start, lt: end } },
      });

      const active = activeRetailers.length;
      const aov = orders > 0 ? sales / orders : 0;

      return NextResponse.json({
        ok: true,
        metric,
        from,
        to,
        fo: { name: fo.name },
        rows: [{ month: monthLabelUTC(start), sales, orders, activeRetailers: active, aov }],
      });
    }

    // ------------------ ORDERS ------------------
    if (metric === "ORDERS") {
      const orders = await prisma.order.findMany({
        where: { retailerId: { in: retailerIds }, createdAt: { gte: rng.start, lt: rng.endExclusive } },
        select: { orderNo: true, createdAt: true, status: true, totalAmount: true, retailerId: true },
        orderBy: { createdAt: "desc" },
        take: 300,
      });

      const rows = orders.map((o) => ({
        orderNo: o.orderNo || "—",
        retailerName: rMap.get(o.retailerId)?.name || "—",
        date: o.createdAt,
        status: o.status,
        amount: Number(o.totalAmount || 0),
      }));

      return NextResponse.json({ ok: true, metric, from, to, fo: { name: fo.name }, rows });
    }

    // ------------------ COLLECTION ------------------
    if (metric === "COLLECTION") {
      const credits = await prisma.retailerLedger.findMany({
        where: { retailerId: { in: retailerIds }, type: "CREDIT", date: { gte: rng.start, lt: rng.endExclusive } },
        select: { date: true, amount: true, retailerId: true },
        orderBy: { date: "desc" },
        take: 500,
      });

      const rows = credits.map((c) => ({
        retailerName: rMap.get(c.retailerId)?.name || "—",
        date: c.date,
        collectedAmount: Number(c.amount || 0),
      }));

      return NextResponse.json({ ok: true, metric, from, to, fo: { name: fo.name }, rows });
    }

    // ------------------ AUDIT ------------------
    if (metric === "AUDIT") {
      const audits = await prisma.retailerStockAudit.findMany({
        where: { fieldOfficerId: foUserId, auditDate: { gte: rng.start, lt: rng.endExclusive } },
        select: { auditDate: true, createdAt: true, retailerId: true },
        orderBy: { auditDate: "desc" },
        take: 300,
      });

      const rows = audits.map((a) => ({
        retailerName: rMap.get(a.retailerId)?.name || "—",
        auditDate: a.auditDate,
        createdAt: a.createdAt,
      }));

      return NextResponse.json({ ok: true, metric, from, to, fo: { name: fo.name }, rows });
    }

    // ------------------ RETAILERS ------------------
    if (metric === "RETAILERS") {
      const orderActive = await prisma.order.groupBy({
        by: ["retailerId"],
        where: { retailerId: { in: retailerIds }, createdAt: { gte: rng.start, lt: rng.endExclusive } },
      });

      const collActive = await prisma.retailerLedger.groupBy({
        by: ["retailerId"],
        where: { retailerId: { in: retailerIds }, type: "CREDIT", date: { gte: rng.start, lt: rng.endExclusive } },
      });

      const auditActive = await prisma.retailerStockAudit.groupBy({
        by: ["retailerId"],
        where: {
          retailerId: { in: retailerIds },
          fieldOfficerId: foUserId,
          auditDate: { gte: rng.start, lt: rng.endExclusive },
        },
      });

      const active = new Set<string>();
      for (const r of orderActive) active.add(r.retailerId);
      for (const r of collActive) active.add(r.retailerId);
      for (const r of auditActive) active.add(r.retailerId);

      const rows = retailerIds.map((rid) => {
        const r = rMap.get(rid);
        return {
          retailerName: r?.name || "—",
          phone: r?.phone || null,
          city: r?.city || null,
          state: r?.state || null,
          status: active.has(rid) ? "ACTIVE" : "INACTIVE",
        };
      });

      return NextResponse.json({ ok: true, metric, from, to, fo: { name: fo.name }, rows });
    }

    return jsonError("Unsupported metric", 400);
  } catch (e: any) {
    return jsonError(e?.message || "Failed", 500);
  }
}
