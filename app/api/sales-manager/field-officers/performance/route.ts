// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/api/sales-manager/field-officers/performance/route.ts
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
function n(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function asDateYMD(ymd: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const start = new Date(Date.UTC(y, mo - 1, d, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(y, mo - 1, d + 1, 0, 0, 0));
  return { start, endExclusive };
}

function rangeFromTo(fromYMD: string, toYMD: string) {
  const a = asDateYMD(fromYMD);
  const b = asDateYMD(toYMD);
  if (!a || !b) return null;
  const start = a.start;
  const endExclusive = b.endExclusive;
  if (start.getTime() >= endExclusive.getTime()) return null;
  return { start, endExclusive };
}

function daysBetweenInclusive(fromYMD: string, toYMD: string) {
  const a = asDateYMD(fromYMD);
  const b = asDateYMD(toYMD);
  if (!a || !b) return null;
  const ms = b.start.getTime() - a.start.getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000)) + 1;
  return days > 0 ? days : null;
}

function addDaysUTC(d: Date, days: number) {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function ymdFromUTC(d: Date) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function prevRange(period: string, fromYMD: string, toYMD: string) {
  const days = daysBetweenInclusive(fromYMD, toYMD);
  if (!days) return null;

  const fromA = asDateYMD(fromYMD);
  if (!fromA) return null;

  const prevTo = addDaysUTC(fromA.start, -1);
  const prevFrom = addDaysUTC(prevTo, -(days - 1));
  const pf = ymdFromUTC(prevFrom);
  const pt = ymdFromUTC(prevTo);

  return { from: pf, to: pt };
}

function pctGrowth(curr: number, prev: number) {
  curr = n(curr);
  prev = n(prev);
  if (prev <= 0) return curr <= 0 ? 0 : 100;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function monthKeyOfUTC(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function monthKeyAddUTC(base: Date, add: number) {
  const d = new Date(base);
  d.setUTCDate(1);
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCMonth(d.getUTCMonth() + add);
  return monthKeyOfUTC(d);
}

function monthRangeUTC(monthKey: string) {
  const [y, m] = monthKey.split("-").map((x) => Number(x));
  if (!y || !m || m < 1 || m > 12) return null;
  const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
  const endExclusive = new Date(Date.UTC(y, m, 1, 0, 0, 0));
  return { start, endExclusive };
}

export async function GET(req: Request) {
  const auth = await requireSalesManager(["SALES_MANAGER", "ADMIN"]);
  if (!auth.ok) return jsonError(auth.error || "Unauthorized", (auth as any).status || 401);

  try {
    const { searchParams } = new URL(req.url);

    const period = clean(searchParams.get("period")) || "THIS_MONTH";
    const from = clean(searchParams.get("from"));
    const to = clean(searchParams.get("to"));
    const distributorId = clean(searchParams.get("distributorId"));

    if (!from || !to) return jsonError("from and to required (YYYY-MM-DD)", 400);

    const rng = rangeFromTo(from, to);
    if (!rng) return jsonError("Invalid date range. Use from=YYYY-MM-DD&to=YYYY-MM-DD (from <= to)", 400);

    // 🔥 Determine CURRENT month from "to" date (your requirement)
    const toD = asDateYMD(to)?.start || new Date();
    const thisMonthKey = monthKeyOfUTC(toD); // e.g. 2026-02
    const nextMonthKey = monthKeyAddUTC(toD, 1); // e.g. 2026-03

    const managedDists = await prisma.distributor.findMany({
      where:
        auth.role === "ADMIN"
          ? distributorId
            ? { id: distributorId }
            : {}
          : distributorId
          ? { id: distributorId, salesManagerId: auth.userId }
          : { salesManagerId: auth.userId },
      select: { id: true },
    });

    const distIds = managedDists.map((d) => d.id);
    if (!distIds.length) return NextResponse.json({ ok: true, period, from, to, rows: [] });

    const fos = await prisma.user.findMany({
      where: { role: "FIELD_OFFICER", distributorId: { in: distIds } },
      select: { id: true, name: true, distributorId: true },
      orderBy: { name: "asc" },
      take: 1000,
    });

    if (!fos.length) return NextResponse.json({ ok: true, period, from, to, rows: [] });

    const foIds = fos.map((x) => x.id);

    // ✅ NEXT MONTH targets (editable)
    const nextTargets = await prisma.fieldOfficerTarget.findMany({
      where: { foUserId: { in: foIds }, monthKey: nextMonthKey },
      select: { foUserId: true, targetValue: true, locked: true },
    });

    const nextTargetMap = new Map<string, { value: number | null; locked: boolean }>();
    for (const t of nextTargets) {
      nextTargetMap.set(t.foUserId, { value: t.targetValue == null ? null : n(t.targetValue), locked: !!t.locked });
    }

    // ✅ THIS MONTH target = from DB if exists, otherwise rollover from previous month's "next target"
    // Rule: If Sales Manager sets "next month target" = 30000 in Feb,
    // then in March that becomes "this month target".
    // So thisMonthTarget should read FieldOfficerTarget for monthKey=thisMonthKey.
    const thisTargets = await prisma.fieldOfficerTarget.findMany({
      where: { foUserId: { in: foIds }, monthKey: thisMonthKey },
      select: { foUserId: true, targetValue: true, locked: true },
    });
    const thisTargetMap = new Map<string, number>();
    for (const t of thisTargets) thisTargetMap.set(t.foUserId, n(t.targetValue));

    // ✅ FO -> assigned retailers (source: RetailerAssignmentActive)
    const maps = await prisma.retailerAssignmentActive.findMany({
      where: { foUserId: { in: foIds } },
      select: { foUserId: true, retailerId: true },
    });

    const foRetailers = new Map<string, string[]>();
    for (const m of maps) {
      if (!m.retailerId) continue;
      const arr = foRetailers.get(m.foUserId) || [];
      arr.push(m.retailerId);
      foRetailers.set(m.foUserId, arr);
    }

    const allRetailerIds = Array.from(new Set(maps.map((m) => m.retailerId).filter(Boolean))) as string[];

    // ✅ even if no retailers, still return target fields
    if (!allRetailerIds.length) {
      const rows = fos.map((fo) => ({
        foId: fo.id,
        foName: fo.name,
        distributors: fo.distributorId ? 1 : 0,
        retailersTotal: 0,
        retailersActive: 0,
        newRetailers: 0,
        orders: 0,
        sales: 0,
        aov: 0,
        growthPct: 0,
        audits: 0,
        collection: 0,
        convPct: 0,
        thisMonthTarget: thisTargetMap.get(fo.id) || 0,
        nextMonthTarget: nextTargetMap.get(fo.id)?.value ?? null,
        nextMonthLocked: nextTargetMap.get(fo.id)?.locked ?? false,
        achievementThisMonth: 0,
        achievementPct: null,
        thisMonthKey,
        nextMonthKey,
      }));
      return NextResponse.json({ ok: true, period, from, to, rows, thisMonthKey, nextMonthKey });
    }

    const prev = prevRange(period, from, to);
    const prevRng = prev ? rangeFromTo(prev.from, prev.to) : null;

    const foByRetailer = new Map<string, string>();
    for (const m of maps) {
      if (m.retailerId) foByRetailer.set(m.retailerId, m.foUserId);
    }

    // Orders in selected period
    const ordersCurr = await prisma.order.findMany({
      where: { retailerId: { in: allRetailerIds }, createdAt: { gte: rng.start, lt: rng.endExclusive } },
      select: { retailerId: true, totalAmount: true },
      take: 200000,
    });

    // Orders in previous period
    const ordersPrev = prevRng
      ? await prisma.order.findMany({
          where: { retailerId: { in: allRetailerIds }, createdAt: { gte: prevRng.start, lt: prevRng.endExclusive } },
          select: { retailerId: true, totalAmount: true },
          take: 200000,
        })
      : [];

    const foOrdersCount = new Map<string, number>();
    const foOrdersSales = new Map<string, number>();
    const foPrevSales = new Map<string, number>();

    for (const o of ordersCurr) {
      const foId = o.retailerId ? foByRetailer.get(o.retailerId) : null;
      if (!foId) continue;
      foOrdersCount.set(foId, (foOrdersCount.get(foId) || 0) + 1);
      foOrdersSales.set(foId, (foOrdersSales.get(foId) || 0) + n(o.totalAmount));
    }
    for (const o of ordersPrev) {
      const foId = o.retailerId ? foByRetailer.get(o.retailerId) : null;
      if (!foId) continue;
      foPrevSales.set(foId, (foPrevSales.get(foId) || 0) + n(o.totalAmount));
    }

    // Collections (ledger credit)
    const ledgerRows = await prisma.retailerLedger.findMany({
      where: { retailerId: { in: allRetailerIds }, type: "CREDIT", date: { gte: rng.start, lt: rng.endExclusive } },
      select: { retailerId: true, amount: true },
      take: 200000,
    });

    const foCollection = new Map<string, number>();
    for (const l of ledgerRows) {
      const foId = l.retailerId ? foByRetailer.get(l.retailerId) : null;
      if (!foId) continue;
      foCollection.set(foId, (foCollection.get(foId) || 0) + n(l.amount));
    }

    // Audits count
    const audits = await prisma.retailerStockAudit.groupBy({
      by: ["fieldOfficerId"],
      where: { fieldOfficerId: { in: foIds }, auditDate: { gte: rng.start, lt: rng.endExclusive } },
      _count: { _all: true },
    });
    const foAudits = new Map(audits.map((a) => [a.fieldOfficerId, a._count._all]));

    // Active retailers = any order/collection/audit within period
    const activeSetByFO = new Map<string, Set<string>>();
    for (const o of ordersCurr) {
      if (!o.retailerId) continue;
      const foId = foByRetailer.get(o.retailerId);
      if (!foId) continue;
      const set = activeSetByFO.get(foId) || new Set<string>();
      set.add(o.retailerId);
      activeSetByFO.set(foId, set);
    }
    for (const l of ledgerRows) {
      if (!l.retailerId) continue;
      const foId = foByRetailer.get(l.retailerId);
      if (!foId) continue;
      const set = activeSetByFO.get(foId) || new Set<string>();
      set.add(l.retailerId);
      activeSetByFO.set(foId, set);
    }
    const auditActive = await prisma.retailerStockAudit.findMany({
      where: { fieldOfficerId: { in: foIds }, auditDate: { gte: rng.start, lt: rng.endExclusive } },
      select: { fieldOfficerId: true, retailerId: true },
      take: 200000,
    });
    for (const a of auditActive) {
      if (!a.retailerId) continue;
      const set = activeSetByFO.get(a.fieldOfficerId) || new Set<string>();
      set.add(a.retailerId);
      activeSetByFO.set(a.fieldOfficerId, set);
    }

    // ✅ NEW RETAILERS in selected period: retailer createdAt in range and assigned to FO (via active map)
    const newRetailers = await prisma.retailer.findMany({
      where: { id: { in: allRetailerIds }, createdAt: { gte: rng.start, lt: rng.endExclusive } },
      select: { id: true },
      take: 200000,
    });
    const newRetailerSet = new Set(newRetailers.map((r) => r.id));
    const foNewRetailers = new Map<string, number>();
    for (const rid of newRetailerSet) {
      const foId = foByRetailer.get(rid);
      if (!foId) continue;
      foNewRetailers.set(foId, (foNewRetailers.get(foId) || 0) + 1);
    }

    // ✅ Current month achievement = orders sum in CURRENT month range (not selected period)
    const thisMonthRng = monthRangeUTC(thisMonthKey);
    const ordersThisMonth = thisMonthRng
      ? await prisma.order.findMany({
          where: { retailerId: { in: allRetailerIds }, createdAt: { gte: thisMonthRng.start, lt: thisMonthRng.endExclusive } },
          select: { retailerId: true, totalAmount: true },
          take: 200000,
        })
      : [];

    const foAchThisMonth = new Map<string, number>();
    for (const o of ordersThisMonth) {
      const foId = o.retailerId ? foByRetailer.get(o.retailerId) : null;
      if (!foId) continue;
      foAchThisMonth.set(foId, (foAchThisMonth.get(foId) || 0) + n(o.totalAmount));
    }

    const rows = fos.map((fo) => {
      const retailers = foRetailers.get(fo.id) || [];
      const retailersTotal = retailers.length;

      const orders = foOrdersCount.get(fo.id) || 0;
      const sales = foOrdersSales.get(fo.id) || 0;
      const aov = orders > 0 ? Math.round((sales / orders) * 100) / 100 : 0;

      const prevSales = foPrevSales.get(fo.id) || 0;
      const growthPct = pctGrowth(sales, prevSales);

      const auditsCount = foAudits.get(fo.id) || 0;
      const collection = foCollection.get(fo.id) || 0;

      const activeRetailers = (activeSetByFO.get(fo.id) || new Set()).size;
      const convPct = retailersTotal > 0 ? Math.round(((orders / retailersTotal) * 100) * 10) / 10 : 0;

      const thisMonthTarget = thisTargetMap.get(fo.id) || 0;
      const achievementThisMonth = foAchThisMonth.get(fo.id) || 0;
      const achievementPct =
        thisMonthTarget > 0 ? Math.round(((achievementThisMonth / thisMonthTarget) * 100) * 10) / 10 : null;

      return {
        foId: fo.id,
        foName: fo.name,
        distributors: fo.distributorId ? 1 : 0,
        retailersTotal,
        retailersActive: activeRetailers,
        newRetailers: foNewRetailers.get(fo.id) || 0,
        orders,
        sales,
        aov,
        growthPct,
        audits: auditsCount,
        collection,
        convPct,

        // ✅ UI expected fields
        thisMonthTarget,
        nextMonthTarget: nextTargetMap.get(fo.id)?.value ?? null,
        nextMonthLocked: nextTargetMap.get(fo.id)?.locked ?? false,

        // ✅ current month achievement for display
        achievementThisMonth,
        achievementPct,

        thisMonthKey,
        nextMonthKey,
      };
    });

    return NextResponse.json({
      ok: true,
      period,
      from,
      to,
      prevFrom: prev?.from || null,
      prevTo: prev?.to || null,
      thisMonthKey,
      nextMonthKey,
      rows,
    });
  } catch (e: any) {
    return jsonError(e?.message || "Failed", 500);
  }
}