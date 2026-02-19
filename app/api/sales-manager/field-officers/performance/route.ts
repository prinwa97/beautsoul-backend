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
  if (!Number.isFinite(curr)) curr = 0;
  if (!Number.isFinite(prev)) prev = 0;
  if (prev <= 0) {
    if (curr <= 0) return 0;
    return 100;
  }
  return Math.round(((curr - prev) / prev) * 1000) / 10;
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

    const managedDists = await prisma.distributor.findMany({
      where:
        auth.role === "ADMIN"
          ? distributorId
            ? { id: distributorId }
            : {}
          : distributorId
          ? { id: distributorId, salesManagerId: auth.userId }
          : { salesManagerId: auth.userId },
      select: { id: true, name: true, code: true },
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

    // ✅ FO -> assigned retailers (SOURCE OF TRUTH: RetailerAssignmentActive)
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

    if (!allRetailerIds.length) {
      const rows = fos.map((fo) => ({
        foId: fo.id,
        foName: fo.name,
        target: null as number | null,
        distributors: fo.distributorId ? 1 : 0,
        retailersTotal: 0,
        retailersActive: 0,
        orders: 0,
        sales: 0,
        aov: 0,
        growthPct: 0,
        audits: 0,
        collection: 0,
        convPct: 0,
      }));
      return NextResponse.json({ ok: true, period, from, to, rows });
    }

    const prev = prevRange(period, from, to);
    const prevRng = prev ? rangeFromTo(prev.from, prev.to) : null;

    const foByRetailer = new Map<string, string>();
    for (const m of maps) {
      if (m.retailerId) foByRetailer.set(m.retailerId, m.foUserId);
    }

    const ordersCurr = await prisma.order.findMany({
      where: { retailerId: { in: allRetailerIds }, createdAt: { gte: rng.start, lt: rng.endExclusive } },
      select: { retailerId: true, totalAmount: true },
      take: 200000,
    });

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
      foOrdersSales.set(foId, (foOrdersSales.get(foId) || 0) + Number(o.totalAmount || 0));
    }

    for (const o of ordersPrev) {
      const foId = o.retailerId ? foByRetailer.get(o.retailerId) : null;
      if (!foId) continue;
      foPrevSales.set(foId, (foPrevSales.get(foId) || 0) + Number(o.totalAmount || 0));
    }

    const ledgerRows = await prisma.retailerLedger.findMany({
      where: { retailerId: { in: allRetailerIds }, type: "CREDIT", date: { gte: rng.start, lt: rng.endExclusive } },
      select: { retailerId: true, amount: true },
      take: 200000,
    });

    const foCollection = new Map<string, number>();
    for (const l of ledgerRows) {
      const foId = l.retailerId ? foByRetailer.get(l.retailerId) : null;
      if (!foId) continue;
      foCollection.set(foId, (foCollection.get(foId) || 0) + Number(l.amount || 0));
    }

    const audits = await prisma.retailerStockAudit.groupBy({
      by: ["fieldOfficerId"],
      where: { fieldOfficerId: { in: foIds }, auditDate: { gte: rng.start, lt: rng.endExclusive } },
      _count: { _all: true },
    });
    const foAudits = new Map(audits.map((a) => [a.fieldOfficerId, a._count._all]));

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

      return {
        foId: fo.id,
        foName: fo.name,
        target: null as number | null,
        distributors: fo.distributorId ? 1 : 0,
        retailersTotal,
        retailersActive: activeRetailers,
        orders,
        sales,
        aov,
        growthPct,
        audits: auditsCount,
        collection,
        convPct,
      };
    });

    return NextResponse.json({
      ok: true,
      period,
      from,
      to,
      prevFrom: prev?.from || null,
      prevTo: prev?.to || null,
      rows,
    });
  } catch (e: any) {
    return jsonError(e?.message || "Failed", 500);
  }
}
