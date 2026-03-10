// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/api/sales-manager/retailers/products/[productName]/drawer/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiHandler } from "@/lib/api-handler";
import { badRequest, forbidden, unauthorized } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export const GET = apiHandler(async function GET(
  req: Request,
  ctx: { params: Promise<{ productName: string }> }
) {
  const session: any = await getSessionUser();

  if (!session) {
    throw unauthorized("UNAUTHORIZED");
  }

  const role = String(session.role || "").toUpperCase();
  if (role !== "SALES_MANAGER" && role !== "ADMIN") {
    throw forbidden("FORBIDDEN");
  }

  const { productName } = await ctx.params;
  const prod = cleanStr(decodeURIComponent(productName || ""));

  if (!prod) {
    throw badRequest("INVALID_PRODUCT");
  }

  const url = new URL(req.url);
  const mode = asMode(url.searchParams.get("mode"));
  const distId = cleanStr(url.searchParams.get("distId"));
  const city = cleanStr(url.searchParams.get("city"));

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
    to = now;
  } else if (mode === "CUSTOM") {
    const f = parseYMD(url.searchParams.get("from"));
    const t = parseYMD(url.searchParams.get("to"));

    if (!f || !t) {
      throw badRequest("INVALID_RANGE");
    }

    from = f;
    to = new Date(t.getTime() + 24 * 60 * 60 * 1000);
  } else {
    from = startOfMonthUTC(new Date());
    to = now;
  }

  const spanMs = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - spanMs);
  const prevTo = new Date(from.getTime());

  const whereOrder: any = { createdAt: { gte: from, lt: to } };
  const wherePrev: any = { createdAt: { gte: prevFrom, lt: prevTo } };

  if (distId || city) {
    whereOrder.retailer = {};
    wherePrev.retailer = {};

    if (distId) {
      whereOrder.retailer.distributorId = distId;
      wherePrev.retailer.distributorId = distId;
    }

    if (city) {
      whereOrder.retailer.city = city;
      wherePrev.retailer.city = city;
    }
  }

  const TAKE = 6000;

  const [orders, prevOrders] = await Promise.all([
    prisma.order.findMany({
      where: whereOrder,
      select: {
        id: true,
        retailerId: true,
        retailer: { select: { name: true, city: true } },
        items: { select: { productName: true, qty: true, amount: true } },
      },
      orderBy: { createdAt: "desc" },
      take: TAKE,
    }),
    prisma.order.findMany({
      where: wherePrev,
      select: {
        id: true,
        items: { select: { productName: true, amount: true } },
      },
      orderBy: { createdAt: "desc" },
      take: TAKE,
    }),
  ]);

  // KPI for this product
  let sales = 0;
  let qty = 0;
  const ordersSet = new Set<string>();
  const retailersSet = new Set<string>();

  // top retailers + top cities
  const byRetailer = new Map<
    string,
    { retailerId: string; retailerName: string; city: string; sales: number; ordersSet: Set<string> }
  >();

  const byCity = new Map<
    string,
    { city: string; sales: number; ordersSet: Set<string> }
  >();

  // co-occurrence bundle pairs (within same order)
  const co = new Map<string, number>();

  // adoption gap helper: retailers who have orders in range but never bought this product
  const allRetailerSales = new Map<
    string,
    { retailerId: string; retailerName: string; city: string; sales: number }
  >();

  const buyers = new Set<string>();

  for (const o of orders) {
    const rid = String(o.retailerId);
    const rname = cleanStr(o.retailer?.name) || rid;
    const rcity = cleanStr(o.retailer?.city) || "—";

    // overall retailer sales (any product) for adoption gap ranking
    const orderTotal = (o.items || []).reduce((s, it) => s + num(it.amount), 0);
    const rr =
      allRetailerSales.get(rid) || {
        retailerId: rid,
        retailerName: rname,
        city: rcity,
        sales: 0,
      };

    rr.sales += orderTotal;
    rr.retailerName = rname;
    rr.city = rcity;
    allRetailerSales.set(rid, rr);

    // product match
    const matched = (o.items || []).filter((it) => cleanStr(it.productName) === prod);
    if (!matched.length) continue;

    buyers.add(rid);
    ordersSet.add(String(o.id));
    retailersSet.add(rid);

    for (const it of matched) {
      sales += num(it.amount);
      qty += num(it.qty);
    }

    const matchedSales = matched.reduce((s, it) => s + num(it.amount), 0);

    const br =
      byRetailer.get(rid) || {
        retailerId: rid,
        retailerName: rname,
        city: rcity,
        sales: 0,
        ordersSet: new Set<string>(),
      };

    br.sales += matchedSales;
    br.ordersSet.add(String(o.id));
    byRetailer.set(rid, br);

    const bc =
      byCity.get(rcity) || {
        city: rcity,
        sales: 0,
        ordersSet: new Set<string>(),
      };

    bc.sales += matchedSales;
    bc.ordersSet.add(String(o.id));
    byCity.set(rcity, bc);

    // bundle pairs: other products in same order
    for (const it of o.items || []) {
      const pn = cleanStr(it.productName);
      if (!pn || pn === prod) continue;
      co.set(pn, (co.get(pn) || 0) + num(it.amount));
    }
  }

  // prev sales for growth
  let prevSales = 0;
  for (const o of prevOrders) {
    for (const it of o.items || []) {
      if (cleanStr(it.productName) === prod) {
        prevSales += num(it.amount);
      }
    }
  }

  const topRetailers = Array.from(byRetailer.values())
    .map((x) => ({
      retailerId: x.retailerId,
      retailerName: x.retailerName,
      city: x.city,
      sales: Math.round(x.sales),
      orders: x.ordersSet.size,
    }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10);

  const topCities = Array.from(byCity.values())
    .map((x) => ({
      city: x.city,
      sales: Math.round(x.sales),
      orders: x.ordersSet.size,
    }))
    .filter((x) => x.city !== "—")
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 10);

  const adoptionGap = Array.from(allRetailerSales.values())
    .filter((r) => !buyers.has(r.retailerId))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 12)
    .map((r) => ({
      retailerId: r.retailerId,
      retailerName: r.retailerName,
      city: r.city,
      reason: "High buyer potential: active retailer but not buying this SKU",
    }));

  const bundlePairs = Array.from(co.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([productName, coSales]) => ({
      productName,
      liftPct: 0,
      coSales: Math.round(coSales),
    }));

  return NextResponse.json({
    ok: true,
    product: { name: prod },
    mode,
    range: { from: from.toISOString(), to: to.toISOString() },
    filters: { distId: distId || null, city: city || null },

    kpis: {
      orders: ordersSet.size,
      qty: Math.round(qty),
      sales: Math.round(sales),
      repeatRetailers: retailersSet.size,
      growthPct: Number(pctChange(sales, prevSales).toFixed(2)),
    },

    topRetailers,
    topCities,
    adoptionGap,
    bundlePairs,
  });
});