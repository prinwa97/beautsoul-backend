// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/api/sales-manager/retailers/cities/[city]/drawer/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function json(ok: boolean, data: any, status = 200) {
  return NextResponse.json({ ok, ...data }, { status });
}
function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}
function num(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}
function asMode(v: any) {
  const m = String(v || "").toUpperCase();
  if (m === "TODAY" || m === "MONTH" || m === "YEAR" || m === "CUSTOM") return m;
  return "MONTH";
}
function parseYMD(v: any) {
  const s = String(v || "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!y || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0));
}
function startOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
}
function startOfYearUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1, 0, 0, 0));
}
function pctChange(curr: number, prev: number) {
  if (!prev) return curr ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

export async function GET(req: Request, ctx: { params: Promise<{ city: string }> }) {
  try {
    const session: any = await getSessionUser();
    if (!session) return json(false, { error: "UNAUTHORIZED" }, 401);

    const role = String(session.role || "").toUpperCase();
    if (role !== "SALES_MANAGER" && role !== "ADMIN") return json(false, { error: "FORBIDDEN" }, 403);

    const { city } = await ctx.params;
    const cityName = cleanStr(decodeURIComponent(city || ""));
    if (!cityName) return json(false, { error: "INVALID_CITY" }, 400);

    const url = new URL(req.url);
    const mode = asMode(url.searchParams.get("mode"));
    const distId = cleanStr(url.searchParams.get("distId"));

    const now = new Date();
    let from: Date;
    let to: Date;

    if (mode === "TODAY") {
      const d0 = new Date();
      d0.setHours(0, 0, 0, 0);
      from = d0;
      to = new Date(d0.getTime() + 24 * 60 * 60 * 1000);
    } else if (mode === "YEAR") {
      from = startOfYearUTC(new Date());
      to = new Date();
    } else if (mode === "CUSTOM") {
      const f = parseYMD(url.searchParams.get("from"));
      const t = parseYMD(url.searchParams.get("to"));
      if (!f || !t) return json(false, { error: "INVALID_RANGE" }, 400);
      from = f;
      to = new Date(t.getTime() + 24 * 60 * 60 * 1000);
    } else {
      from = startOfMonthUTC(new Date());
      to = new Date();
    }

    const spanMs = to.getTime() - from.getTime();
    const prevFrom = new Date(from.getTime() - spanMs);
    const prevTo = new Date(from.getTime());

    const whereOrder: any = {
      createdAt: { gte: from, lt: to },
      retailer: { city: cityName },
    };
    const wherePrev: any = {
      createdAt: { gte: prevFrom, lt: prevTo },
      retailer: { city: cityName },
    };

    if (distId) {
      whereOrder.retailer.distributorId = distId;
      wherePrev.retailer.distributorId = distId;
    }

    const TAKE = 7000;

    const [orders, prevOrders, retailerCount] = await Promise.all([
      prisma.order.findMany({
        where: whereOrder,
        select: {
          id: true,
          retailerId: true,
          retailer: { select: { name: true } },
          items: { select: { productName: true, amount: true } },
        },
        orderBy: { createdAt: "desc" },
        take: TAKE,
      }),
      prisma.order.findMany({
        where: wherePrev,
        select: { id: true, items: { select: { productName: true, amount: true } } },
        orderBy: { createdAt: "desc" },
        take: TAKE,
      }),
      prisma.retailer.count({
        where: { city: cityName, ...(distId ? { distributorId: distId } : {}) },
      }),
    ]);

    let sales = 0;
    let prevSales = 0;

    const byRetailer = new Map<string, { retailerId: string; retailerName: string; sales: number; ordersSet: Set<string> }>();
    const byProduct = new Map<string, { productName: string; sales: number; ordersSet: Set<string> }>();

    for (const o of orders) {
      const rid = String(o.retailerId);
      const rname = cleanStr(o.retailer?.name) || rid;

      const orderSales = (o.items || []).reduce((s, it) => s + num(it.amount), 0);
      sales += orderSales;

      const rr = byRetailer.get(rid) || { retailerId: rid, retailerName: rname, sales: 0, ordersSet: new Set<string>() };
      rr.sales += orderSales;
      rr.ordersSet.add(String(o.id));
      rr.retailerName = rname;
      byRetailer.set(rid, rr);

      for (const it of o.items || []) {
        const pn = cleanStr(it.productName) || "—";
        const pp = byProduct.get(pn) || { productName: pn, sales: 0, ordersSet: new Set<string>() };
        pp.sales += num(it.amount);
        pp.ordersSet.add(String(o.id));
        byProduct.set(pn, pp);
      }
    }

    for (const o of prevOrders) {
      prevSales += (o.items || []).reduce((s, it) => s + num(it.amount), 0);
    }

    const topRetailers = Array.from(byRetailer.values())
      .map((r) => ({ retailerId: r.retailerId, retailerName: r.retailerName, sales: Math.round(r.sales), orders: r.ordersSet.size }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    const topProducts = Array.from(byProduct.values())
      .filter((p) => p.productName !== "—")
      .map((p) => ({ productName: p.productName, sales: Math.round(p.sales), orders: p.ordersSet.size }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 10);

    const slowMovers = Array.from(byProduct.values())
      .filter((p) => p.productName !== "—")
      .map((p) => ({ productName: p.productName, sales: Math.round(p.sales), orders: p.ordersSet.size }))
      .sort((a, b) => a.sales - b.sales)
      .slice(0, 8);

    // simple plan
    const cityPlan = [
      { title: "Reactivate inactive retailers", targets: Math.min(5, Math.max(0, retailerCount - topRetailers.length)) },
      { title: "Upsell top 2 products in top retailers", targets: Math.min(5, topRetailers.length) },
      { title: "Revive 1 slow mover SKU with bundling", targets: 1 },
    ];

    return json(true, {
      city: cityName,
      mode,
      range: { from: from.toISOString(), to: to.toISOString() },
      filters: { distId: distId || null },

      kpis: {
        orders: orders.length,
        sales: Math.round(sales),
        activeRetailers: topRetailers.length,
        totalRetailers: retailerCount,
        growthPct: Number(pctChange(sales, prevSales).toFixed(2)),
      },

      topRetailers,
      topProducts,
      slowMovers,
      cityPlan,
    });
  } catch (e: any) {
    return json(false, { error: "INTERNAL_ERROR", detail: String(e?.message || e) }, 500);
  }
}