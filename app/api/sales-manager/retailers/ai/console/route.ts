// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/api/sales-manager/retailers/ai/console/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* --------------------------------- utils --------------------------------- */
function json(ok: boolean, data: any, status = 200) {
  return NextResponse.json({ ok, ...data }, { status });
}

function isPrismaTableMissing(err: any) {
  return err?.code === "P2021" || String(err?.message || "").includes("does not exist");
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function num(v: any) {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
}

function clamp(n: number, a: number, b: number) {
  return Math.min(Math.max(n, a), b);
}

function normalizeRole(v: any) {
  return String(v ?? "")
    .trim()
    .toUpperCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
}

function boolFrom(v: any) {
  const s = String(v ?? "").toLowerCase().trim();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

/* ----------------------------- date helpers ----------------------------- */
// IST start-of-day
function startOfDayIST(d = new Date()) {
  const x = new Date(d);
  const ist = new Date(x.getTime() + 330 * 60 * 1000);
  const y = ist.getUTCFullYear();
  const m = ist.getUTCMonth();
  const day = ist.getUTCDate();
  const utc = new Date(Date.UTC(y, m, day, 0, 0, 0));
  return new Date(utc.getTime() - 330 * 60 * 1000);
}

function startOfMonthUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0));
}
function startOfYearUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), 0, 1, 0, 0, 0));
}

// FY: 1 Apr -> 31 Mar (IST-aligned, but returned as UTC Date)
function startOfFYUTC(now = new Date()) {
  // We align FY boundary based on IST date
  const istNow = new Date(now.getTime() + 330 * 60 * 1000);
  const y = istNow.getUTCFullYear();
  const m = istNow.getUTCMonth() + 1; // 1..12 in IST via UTC getters
  // FY starts Apr 1
  const fyStartYear = m >= 4 ? y : y - 1;
  return new Date(Date.UTC(fyStartYear, 3, 1, 0, 0, 0)); // Apr(3)
}

type Mode = "TODAY" | "MONTH" | "YEAR" | "CUSTOM";
function asMode(v: any): Mode {
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

function daysBetween(now: Date, past: Date) {
  const ms = now.getTime() - past.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function pctChange(curr: number, prev: number) {
  if (!prev) return curr ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

function orderSales(o: any) {
  if (o?.totalAmount != null) return num(o.totalAmount);
  return (o?.items || []).reduce((s: number, it: any) => s + num(it.amount), 0);
}

/* -------------------------- task enums + labels -------------------------- */
// matches prisma enum SalesTaskType (your project)
type SalesTaskTypeStrict =
  | "REACTIVATE_RETAILER"
  | "UPSELL_PRODUCTS"
  | "CITY_FOCUS"
  | "SLOW_MOVER_REVIVAL"
  | "NEW_RETAILER_CONVERSION"
  | "INVESTIGATE_DROP"
  | "DAILY_CLOSE";

function taskType(t: string): SalesTaskTypeStrict {
  const x = String(t || "").toUpperCase().trim();
  if (x === "UPSELL") return "UPSELL_PRODUCTS";
  if (x === "PRODUCT_REVIVAL") return "SLOW_MOVER_REVIVAL";
  if (x === "SLOW_MOVER") return "SLOW_MOVER_REVIVAL";
  if (x === "UPSELL_PRODUCTS") return "UPSELL_PRODUCTS";
  if (x === "SLOW_MOVER_REVIVAL") return "SLOW_MOVER_REVIVAL";
  if (x === "REACTIVATE_RETAILER") return "REACTIVATE_RETAILER";
  if (x === "CITY_FOCUS") return "CITY_FOCUS";
  if (x === "NEW_RETAILER_CONVERSION") return "NEW_RETAILER_CONVERSION";
  if (x === "INVESTIGATE_DROP") return "INVESTIGATE_DROP";
  return "DAILY_CLOSE";
}

function taskTypeLabel(t: any) {
  const x = String(t || "").toUpperCase();
  if (x === "REACTIVATE_RETAILER") return "Reactivate Inactive Retailers";
  if (x === "UPSELL_PRODUCTS") return "Upsell: Push Best Products";
  if (x === "SLOW_MOVER_REVIVAL") return "Slow Mover Revival";
  if (x === "DAILY_CLOSE") return "Daily Closing (Mandatory)";
  if (x === "CITY_FOCUS") return "City Focus";
  if (x === "NEW_RETAILER_CONVERSION") return "New Retailer Conversion";
  if (x === "INVESTIGATE_DROP") return "Investigate Sales Drop";
  return x.replaceAll("_", " ");
}

function simpleReason(type: any, raw?: any) {
  const t = String(type || "").toUpperCase();
  const r = cleanStr(raw);

  const looksOld =
    r.includes("→") ||
    r.toLowerCase().includes("sku") ||
    r.toLowerCase().includes("quick wins") ||
    r.toLowerCase().includes("retailer-fit") ||
    r.toLowerCase().includes("recency") ||
    r.toLowerCase().includes("zero-order") ||
    r.toLowerCase().includes("inactivity");

  if (!r || looksOld) {
    if (t === "REACTIVATE_RETAILER") {
      return "These retailers are inactive (zero orders or no order in 30+ days). Restart ordering with 1–2 easy-win fast movers.";
    }
    if (t === "UPSELL_PRODUCTS") {
      return "Retailer-specific upsell: push 2–4 highest-opportunity products (gap + city demand + basket affinity), only if in stock.";
    }
    if (t === "SLOW_MOVER_REVIVAL") {
      return "Revive slow movers by removing blockers (margin/price/awareness/expiry) and bundling with fast movers (affinity based).";
    }
    return "This task is generated by AI based on your sales + inventory signals.";
  }

  return r;
}

/* ----------------------------- UPDATED TARGET TYPE ----------------------------- */
type TaskTarget = {
  retailerId: string;
  retailerName: string;
  distributorName: string;
  city: string;

  lastOrderAt: string | null;
  lastOrderAmount: number | null;

  personalizedReason: string;
  recommendedProducts?: Array<{
    productName: string;
    score: number;
    confidence: number;
    expectedImpactMin: number;
    expectedImpactMax: number;
    reasons: string[];
    psychology: string;
    script: string;
    stock?: { available: boolean; qty: number | null; note?: string };
  }>;
};

function buildScripts(products: string[], aiReason: string) {
  const p3 = (products || []).filter(Boolean).slice(0, 3).join(", ");
  const callScript = `Hi, order update.\nSuggested: ${p3 || "Top SKUs"}\nReason: ${aiReason || "AI insight"}\nCan we confirm order today?`;
  const visitScript = `Visit: check stock + pitch.\nSuggested: ${p3 || "Top SKUs"}\nGoal: order today.\nReason: ${aiReason || "AI insight"}`;
  return { callScript, visitScript };
}

/* --------------------- inventory delegate (dynamic) ---------------------- */
function pickStockLotDelegate(pr: any) {
  const candidates = ["stockLot", "stocklot", "inventoryBatch", "inventoryLot"];
  for (const k of candidates) {
    if (pr?.[k] && typeof pr[k]?.findMany === "function") return { key: k, delegate: pr[k] };
  }
  for (const k of Object.keys(pr || {})) {
    if (!pr?.[k] || typeof pr[k]?.findMany !== "function") continue;
    const lk = k.toLowerCase();
    if (lk.includes("stock") && (lk.includes("lot") || lk.includes("batch"))) return { key: k, delegate: pr[k] };
  }
  return null;
}

/* ----------------------- Level-4 engine primitives ----------------------- */
type RetailerType = "SAFE_PLAYER" | "EXPERIMENTER" | "BULK_BUYER" | "FAST_ROTATOR" | "DECLINING";

function computeConsistencyScore(orderDatesDesc: Date[]) {
  const dates = orderDatesDesc
    .filter((d) => d && Number.isFinite(new Date(d).getTime()))
    .map((d) => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime()); // oldest->newest
  if (dates.length <= 2) return 65;

  const gaps: number[] = [];
  for (let i = 1; i < dates.length; i++) {
    const g = Math.max(0, Math.floor((dates[i].getTime() - dates[i - 1].getTime()) / (1000 * 60 * 60 * 24)));
    gaps.push(g);
  }
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const variance = gaps.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, gaps.length - 1);
  const sd = Math.sqrt(variance);
  const cv = mean ? sd / mean : 0;
  const score = 100 - clamp(cv * 80, 0, 100);
  return Math.round(score);
}

function decideRetailerType(args: {
  recencyDays: number;
  frequency90: number;
  aov90: number;
  variety90: number;
  trendDown: boolean;
}) {
  const { recencyDays, frequency90, aov90, variety90, trendDown } = args;

  if (recencyDays >= 45 && trendDown) return "DECLINING" as RetailerType;
  if (variety90 >= 10) return "EXPERIMENTER" as RetailerType;
  if (frequency90 <= 2 && aov90 >= 6000) return "BULK_BUYER" as RetailerType;
  if (frequency90 >= 6) return "FAST_ROTATOR" as RetailerType;
  return "SAFE_PLAYER" as RetailerType;
}

function psychLine(rt: RetailerType) {
  if (rt === "SAFE_PLAYER") return "SAFE_PLAYER: low-risk trial + social proof + loss aversion";
  if (rt === "EXPERIMENTER") return "EXPERIMENTER: new launch + early-adopter benefit";
  if (rt === "BULK_BUYER") return "BULK_BUYER: combo/carton + scheme + margin+rotation";
  if (rt === "FAST_ROTATOR") return "FAST_ROTATOR: fast repeat SKU + attach one add-on";
  return "DECLINING: easy win (top 1–2) + relationship + restart";
}

function scriptFor(rt: RetailerType, retailerTop: string | null, productName: string, reasonLine: string) {
  const opening =
    rt === "DECLINING"
      ? `Sir aapka order thoda gap me aa raha hai — main easy win se help kar deta.`
      : `Sir aapka ${retailerTop || "top product"} ka rotation achha hai.`;

  const proof =
    rt === "SAFE_PLAYER"
      ? `City me "${productName}" ka repeat strong chal raha hai.`
      : rt === "EXPERIMENTER"
      ? `"${productName}" me naya demand trend aa raha hai.`
      : rt === "BULK_BUYER"
      ? `"${productName}" combo me margin + rotation better banega.`
      : rt === "FAST_ROTATOR"
      ? `"${productName}" ke saath add-on attach karke bill value badh jaati hai.`
      : `Main aapko fast movers ke saath "${productName}" ka quick trial suggest kar raha hoon.`;

  const offer =
    rt === "SAFE_PLAYER"
      ? `2 pcs trial rakh lo, move na ho to next order me adjust kar denge.`
      : rt === "EXPERIMENTER"
      ? `Chhota trial + feedback: aap first batch rakh lo.`
      : rt === "BULK_BUYER"
      ? `Carton/Combo plan: main scheme laga ke deta hoon.`
      : rt === "FAST_ROTATOR"
      ? `Refill ke saath 1 attach add kar dein?`
      : `Aaj 1–2 easy SKUs add kar dete hain — restart ho jayega.`;

  return `${opening}\n${proof}\nReason: ${reasonLine}\nOffer: ${offer}\nClose: Aaj ke order me add kar dein?`;
}

/* ----------------------- Level-4 engine compute ----------------------- */
type EngineTarget = {
  retailerId: string;
  retailerName: string;
  city: string;

  dna: {
    retailerType: RetailerType;
    recencyDays: number;
    frequency90: number;
    monetary90: number;
    aov90: number;
    variety90: number;
    consistencyScore: number;
  };

  topSelling: Array<{ productName: string; sales: number; orders: number; qty: number }>;

  gaps: Array<{
    productName: string;
    gapType: "MISSING_90D" | "DROPPING" | "UNDER_PENETRATED";
    gapStrength: number;
    why: string[];
    evidence: {
      cityAdoptionRate: number;
      cityMomentum: number;
      lastBoughtDaysAgo: number | null;
      retailerShareOfWallet: number;
    };
  }>;

  recommendations: Array<{
    productName: string;
    score: number;
    confidence: number;
    expectedImpactMin: number;
    expectedImpactMax: number;
    reasons: string[];
    psychology: string;
    script: string;
    stock: { available: boolean; qty: number | null; note?: string };
  }>;
};

function expectedImpactFromAov(aov90: number, confidence: number) {
  const base = Math.max(1200, aov90 || 0);
  const k = clamp(confidence / 100, 0.25, 0.95);
  const min = Math.round(base * 0.35 * k);
  const max = Math.round(base * 1.1 * k);
  return { min, max };
}

/* --------------------------------- handler --------------------------------- */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const debugAuth = boolFrom(process.env.DEBUG_AUTH) || url.searchParams.get("debug") === "1";

    /* ------------------------------ auth ------------------------------ */
    // Normal session
    const session: any = await getSessionUser().catch(() => null);

    // Header fallback (DEV only usage)
    const h = new Headers(req.headers);
    const headerUserId = cleanStr(h.get("x-user-id"));
    const headerUserRole = normalizeRole(h.get("x-user-role"));

    const sessionRole = normalizeRole(session?.role);
    const sessionId = cleanStr(session?.id);

    const userId = sessionId || headerUserId;
    const role = sessionRole || headerUserRole;

    if (debugAuth) {
      console.log("[AI_CONSOLE] debugAuth=1");
      console.log("[AI_CONSOLE] session =", session);
      console.log("[AI_CONSOLE] sessionRole =", sessionRole, "sessionId =", sessionId);
      console.log("[AI_CONSOLE] headerUserId =", headerUserId, "headerUserRole =", headerUserRole);
      console.log("[AI_CONSOLE] resolved role =", role, "resolved userId =", userId);
    }

    if (!userId) {
      return json(
        false,
        {
          error: "UNAUTHORIZED",
          message: "No session user found (cookie missing) and no x-user-id header provided.",
          ...(debugAuth ? { debug: { session: session ? { id: sessionId, role: sessionRole } : null, headerUserId, headerUserRole } } : {}),
        },
        401
      );
    }

    if (role !== "SALES_MANAGER" && role !== "ADMIN") {
      return json(
        false,
        {
          error: "FORBIDDEN",
          message: `Role not allowed: ${role || "UNKNOWN"}`,
          ...(debugAuth ? { debug: { session: session ? { id: sessionId, role: sessionRole } : null, headerUserId, headerUserRole } } : {}),
        },
        403
      );
    }

    const salesManagerId = userId;

    const sm = await prisma.user.findUnique({
      where: { id: salesManagerId },
      select: { id: true, role: true },
    });

    if (!sm) {
      return json(
        false,
        { error: "SESSION_USER_NOT_IN_DB", salesManagerId, ...(debugAuth ? { debug: { role, sessionRole, headerUserRole } } : {}) },
        401
      );
    }

    // DB role check (extra safety)
    const dbRole = normalizeRole(sm.role);
    if (dbRole !== "SALES_MANAGER" && dbRole !== "ADMIN") {
      return json(
        false,
        { error: "FORBIDDEN", message: `DB role not allowed: ${dbRole}`, ...(debugAuth ? { debug: { dbRole, role } } : {}) },
        403
      );
    }

    /* ------------------------------ params ------------------------------ */
    const mode = asMode(url.searchParams.get("mode"));
    const distId = cleanStr(url.searchParams.get("distId"));
    const city = cleanStr(url.searchParams.get("city"));
    const limit = Math.max(5, Math.min(50, Number(url.searchParams.get("limit") || 10)));

    /* ------------------------------ range (UI analytics) ------------------------------ */
    const now = new Date();
    let rangeFrom: Date;
    let rangeTo: Date;

    if (mode === "TODAY") {
      rangeFrom = startOfDayIST(now);
      rangeTo = new Date(rangeFrom.getTime() + 24 * 60 * 60 * 1000);
    } else if (mode === "YEAR") {
      // If UI sends from/to, prefer it; else FY default
      const f = parseYMD(url.searchParams.get("from"));
      const t = parseYMD(url.searchParams.get("to"));
      if (f && t) {
        rangeFrom = f;
        rangeTo = new Date(t.getTime() + 24 * 60 * 60 * 1000);
      } else {
        rangeFrom = startOfFYUTC(now);
        rangeTo = new Date();
      }
    } else if (mode === "CUSTOM") {
      const f = parseYMD(url.searchParams.get("from"));
      const t = parseYMD(url.searchParams.get("to"));
      if (!f || !t) return json(false, { error: "INVALID_RANGE", message: "CUSTOM requires from & to" }, 400);
      rangeFrom = f;
      rangeTo = new Date(t.getTime() + 24 * 60 * 60 * 1000);
    } else if (mode === "MONTH") {
      const f = parseYMD(url.searchParams.get("from"));
      const t = parseYMD(url.searchParams.get("to"));
      if (f && t) {
        rangeFrom = f;
        rangeTo = new Date(t.getTime() + 24 * 60 * 60 * 1000);
      } else {
        rangeFrom = startOfMonthUTC(new Date());
        rangeTo = new Date();
      }
    } else {
      rangeFrom = startOfMonthUTC(new Date());
      rangeTo = new Date();
    }

    const spanMs = rangeTo.getTime() - rangeFrom.getTime();
    const prevFrom = new Date(rangeFrom.getTime() - spanMs);
    const prevTo = new Date(rangeFrom.getTime());

    /* ------------------------------ Level-4 fixed 90D range ------------------------------ */
    const engineDays = 90;
    const engineTo = new Date();
    const engineFrom = new Date(engineTo.getTime() - engineDays * 24 * 60 * 60 * 1000);
    const enginePrevFrom = new Date(engineFrom.getTime() - engineDays * 24 * 60 * 60 * 1000);
    const enginePrevTo = new Date(engineFrom.getTime());

    const day = startOfDayIST(new Date());

    /* ------------------------- base where for analytics orders (curr + prev) ------------------------- */
    const baseWhere: any = { createdAt: { gte: rangeFrom, lt: rangeTo } };
    const baseWherePrev: any = { createdAt: { gte: prevFrom, lt: prevTo } };

    if (distId || city) {
      baseWhere.retailer = {};
      baseWherePrev.retailer = {};
      if (distId) {
        baseWhere.retailer.distributorId = distId;
        baseWherePrev.retailer.distributorId = distId;
      }
      if (city) {
        baseWhere.retailer.city = city;
        baseWherePrev.retailer.city = city;
      }
    }

    const TAKE = 7000;
    const [orders, prevOrders] = await Promise.all([
      prisma.order.findMany({
        where: baseWhere,
        select: {
          id: true,
          createdAt: true,
          totalAmount: true,
          retailerId: true,
          retailer: { select: { name: true, city: true, distributor: { select: { name: true } } } },
          items: { select: { productName: true, qty: true, amount: true } },
        },
        orderBy: { createdAt: "desc" },
        take: TAKE,
      }),
      prisma.order.findMany({
        where: baseWherePrev,
        select: {
          id: true,
          createdAt: true,
          totalAmount: true,
          retailerId: true,
          retailer: { select: { name: true, city: true, distributor: { select: { name: true } } } },
          items: { select: { productName: true, qty: true, amount: true } },
        },
        orderBy: { createdAt: "desc" },
        take: TAKE,
      }),
    ]);

    /* ------------------------------ leaderboards aggregations ------------------------------ */
    const rCurr = new Map<string, { name: string; dist: string; city: string; orders: number; sales: number; last: Date }>();
    const rPrev = new Map<string, number>();

    const cCurr = new Map<string, { orders: number; sales: number }>();
    const cPrev = new Map<string, number>();

    const pCurr = new Map<string, { ordersSet: Set<string>; retailersSet: Set<string>; qty: number; sales: number }>();
    const pPrev = new Map<string, number>();

    for (const o of orders) {
      const sales = orderSales(o);
      const rid = String(o.retailerId);
      const rname = cleanStr(o.retailer?.name) || rid;
      const rcity = cleanStr(o.retailer?.city) || "—";
      const rdist = cleanStr(o.retailer?.distributor?.name) || "—";

      const x = rCurr.get(rid) || { name: rname, dist: rdist, city: rcity, orders: 0, sales: 0, last: new Date(0) };
      x.orders += 1;
      x.sales += sales;
      if (o.createdAt && new Date(o.createdAt).getTime() > x.last.getTime()) x.last = new Date(o.createdAt);
      x.name = rname;
      x.city = rcity;
      x.dist = rdist;
      rCurr.set(rid, x);

      const cx = cCurr.get(rcity) || { orders: 0, sales: 0 };
      cx.orders += 1;
      cx.sales += sales;
      cCurr.set(rcity, cx);

      for (const it of o.items || []) {
        const pn = cleanStr(it.productName) || "—";
        const px = pCurr.get(pn) || { ordersSet: new Set<string>(), retailersSet: new Set<string>(), qty: 0, sales: 0 };
        px.ordersSet.add(String(o.id));
        px.retailersSet.add(rid);
        px.qty += num(it.qty);
        px.sales += num(it.amount);
        pCurr.set(pn, px);
      }
    }

    for (const o of prevOrders) {
      const sales = orderSales(o);
      const rid = String(o.retailerId);
      rPrev.set(rid, (rPrev.get(rid) || 0) + sales);

      const rcity = cleanStr(o.retailer?.city) || "—";
      cPrev.set(rcity, (cPrev.get(rcity) || 0) + sales);

      for (const it of o.items || []) {
        const pn = cleanStr(it.productName) || "—";
        pPrev.set(pn, (pPrev.get(pn) || 0) + num(it.amount));
      }
    }

    type AggRetailer = {
      retailerId: string;
      retailerName: string;
      distributorName: string;
      city: string;
      orders: number;
      sales: number;
      lastOrderAt: string | null;
      growthPct: number;
    };

    type AggCity = { city: string; orders: number; sales: number; growthPct: number };
    type AggProduct = { productName: string; orders: number; qty: number; sales: number; repeat: number; growthPct: number };
    type SlowMover = { city: string; productName: string; orders: number; sales: number };

    const topRetailers: AggRetailer[] = Array.from(rCurr.entries())
      .map(([rid, v]) => {
        const prev = rPrev.get(rid) || 0;
        return {
          retailerId: rid,
          retailerName: v.name,
          distributorName: v.dist,
          city: v.city,
          orders: v.orders,
          sales: Math.round(v.sales),
          lastOrderAt: v.last.getTime() ? v.last.toISOString() : null,
          growthPct: Number(pctChange(v.sales, prev).toFixed(2)),
        };
      })
      .sort((a, b) => b.sales - a.sales)
      .slice(0, Math.max(limit, 20));

    const topCities: AggCity[] = Array.from(cCurr.entries())
      .map(([c, v]) => {
        const prev = cPrev.get(c) || 0;
        return { city: c, orders: v.orders, sales: Math.round(v.sales), growthPct: Number(pctChange(v.sales, prev).toFixed(2)) };
      })
      .filter((x) => x.city !== "—")
      .sort((a, b) => b.sales - a.sales)
      .slice(0, limit);

    const topProducts: AggProduct[] = Array.from(pCurr.entries())
      .map(([p, v]) => {
        const prev = pPrev.get(p) || 0;
        return {
          productName: p,
          orders: v.ordersSet.size,
          qty: Math.round(v.qty),
          sales: Math.round(v.sales),
          repeat: v.retailersSet.size,
          growthPct: Number(pctChange(v.sales, prev).toFixed(2)),
        };
      })
      .filter((x) => x.productName !== "—")
      .sort((a, b) => b.sales - a.sales)
      .slice(0, limit);

    const cityProduct = new Map<string, { city: string; productName: string; ordersSet: Set<string>; sales: number }>();
    for (const o of orders) {
      const rcity = cleanStr(o.retailer?.city) || "—";
      for (const it of o.items || []) {
        const pn = cleanStr(it.productName) || "—";
        const key = `${rcity}|||${pn}`;
        const x = cityProduct.get(key) || { city: rcity, productName: pn, ordersSet: new Set<string>(), sales: 0 };
        x.ordersSet.add(String(o.id));
        x.sales += num(it.amount);
        cityProduct.set(key, x);
      }
    }
    const slowMoversByCity: SlowMover[] = Array.from(cityProduct.values())
      .filter((x) => x.city !== "—" && x.productName !== "—")
      .map((x) => ({ city: x.city, productName: x.productName, orders: x.ordersSet.size, sales: Math.round(x.sales) }))
      .sort((a, b) => a.sales - b.sales)
      .slice(0, limit);

    const topCityName = topCities[0]?.city || null;
    const topProductName = topProducts[0]?.productName || null;

    /* ------------------------------ risk retailers ------------------------------ */
    const retailerScope: any = {};
    if (distId) retailerScope.distributorId = distId;
    if (city) retailerScope.city = city;

    const zeroOrderRetailers = await prisma.retailer.findMany({
      where: { ...retailerScope, orders: { none: {} } },
      select: { id: true, name: true, city: true },
      take: 20,
    });

    const orderWhereAllTime: any = {};
    if (distId || city) {
      orderWhereAllTime.retailer = {};
      if (distId) orderWhereAllTime.retailer.distributorId = distId;
      if (city) orderWhereAllTime.retailer.city = city;
    }

    const lastOrders = await prisma.order.groupBy({
      by: ["retailerId"],
      where: orderWhereAllTime,
      _max: { createdAt: true },
      orderBy: { _max: { createdAt: "asc" } },
      take: 80,
    });

    const now2 = new Date();
    const oldOrderIds = lastOrders
      .map((x) => ({
        retailerId: String(x.retailerId),
        lastAt: x._max?.createdAt ? new Date(x._max.createdAt as any) : null,
      }))
      .filter((x) => x.lastAt && daysBetween(now2, x.lastAt) >= 30)
      .slice(0, 40)
      .map((x) => x.retailerId);

    const oldOrderRetailers =
      oldOrderIds.length > 0
        ? await prisma.retailer.findMany({
            where: { id: { in: oldOrderIds } },
            select: { id: true, name: true, city: true },
            take: 40,
          })
        : [];

    const riskRetailersMerged: Array<{ id: string; name: string; city: string }> = [];
    const seen = new Set<string>();

    for (const r of zeroOrderRetailers) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        riskRetailersMerged.push({ id: r.id, name: cleanStr((r as any).name) || r.id, city: cleanStr((r as any).city) || "—" });
      }
    }
    for (const r of oldOrderRetailers) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        riskRetailersMerged.push({ id: r.id, name: cleanStr((r as any).name) || r.id, city: cleanStr((r as any).city) || "—" });
      }
    }

    /* ------------------------------ Level-4 engine (90 days + inventory YES) ------------------------------ */
    const candidateRetailerIdsSet = new Set<string>();
    for (const r of topRetailers.slice(0, 40)) candidateRetailerIdsSet.add(r.retailerId);
    for (const r of riskRetailersMerged.slice(0, 30)) candidateRetailerIdsSet.add(r.id);
    const candidateRetailerIds = Array.from(candidateRetailerIdsSet).slice(0, 60);

    const retailerRows = await prisma.retailer.findMany({
      where: { id: { in: candidateRetailerIds }, ...(distId ? { distributorId: distId } : {}), ...(city ? { city } : {}) },
      select: { id: true, name: true, city: true, distributor: { select: { name: true } } },
      take: 200,
    });

    const retailerIndex = new Map<string, { id: string; name: string; city: string; distributorName: string }>();
    for (const r of retailerRows) {
      retailerIndex.set(String(r.id), {
        id: String(r.id),
        name: cleanStr(r.name) || String(r.id),
        city: cleanStr(r.city) || "—",
        distributorName: cleanStr((r as any)?.distributor?.name) || "—",
      });
    }
    const engineRetailerIds = Array.from(retailerIndex.keys()).slice(0, 60);

    /* -------------------- last order info for these retailers -------------------- */
    const lastOrderInfo = new Map<string, { at: string | null; amount: number | null }>();
    if (engineRetailerIds.length) {
      const lastOrderAgg = await prisma.order.groupBy({
        by: ["retailerId"],
        where: { retailerId: { in: engineRetailerIds } },
        _max: { createdAt: true },
      });

      const lookup = new Map<string, Date>();
      for (const row of lastOrderAgg as any[]) {
        const rid = String(row?.retailerId || "");
        const dt = row?._max?.createdAt ? new Date(row._max.createdAt as any) : null;
        if (rid && dt) lookup.set(rid, dt);
      }

      const lastOrdersRows = await prisma.order.findMany({
        where: {
          OR: Array.from(lookup.entries()).map(([rid, dt]) => ({
            retailerId: rid,
            createdAt: dt,
          })),
        },
        select: { retailerId: true, createdAt: true, totalAmount: true, items: { select: { amount: true } } },
        take: 5000,
      });

      for (const o of lastOrdersRows) {
        const rid = String(o.retailerId || "");
        if (!rid || lastOrderInfo.has(rid)) continue;
        const amt =
          o?.totalAmount != null ? num(o.totalAmount) : (o?.items || []).reduce((s: number, it: any) => s + num(it.amount), 0);
        lastOrderInfo.set(rid, {
          at: o.createdAt ? new Date(o.createdAt).toISOString() : null,
          amount: Number.isFinite(amt) ? Math.round(amt) : null,
        });
      }
    }

    /* -------------------- city retailer counts -------------------- */
    const cityCounts = await prisma.retailer
      .groupBy({
        by: ["city"],
        where: { ...(distId ? { distributorId: distId } : {}), ...(city ? { city } : {}) },
        _count: { _all: true },
      })
      .catch(async () => []);

    const cityRetailerCount = new Map<string, number>();
    for (const row of cityCounts as any[]) {
      const c = cleanStr(row?.city) || "—";
      const n = Number(row?._count?._all ?? 0);
      if (c && c !== "—") cityRetailerCount.set(c, n);
    }

    /* -------------------- orders 90d for candidates (curr + prev90) -------------------- */
    const TAKE90 = 15000;
    const [o90, o90prev] = await Promise.all([
      prisma.order.findMany({
        where: { createdAt: { gte: engineFrom, lt: engineTo }, retailerId: { in: engineRetailerIds } },
        select: {
          id: true,
          createdAt: true,
          totalAmount: true,
          retailerId: true,
          retailer: { select: { city: true, name: true } },
          items: { select: { productName: true, qty: true, amount: true } },
        },
        orderBy: { createdAt: "desc" },
        take: TAKE90,
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: enginePrevFrom, lt: enginePrevTo }, retailerId: { in: engineRetailerIds } },
        select: { id: true, createdAt: true, retailerId: true, retailer: { select: { city: true } }, items: { select: { productName: true, amount: true } } },
        orderBy: { createdAt: "desc" },
        take: TAKE90,
      }),
    ]);

    /* -------------------- inventory YES -------------------- */
    const pr: any = prisma as any;
    const stockFound = pickStockLotDelegate(pr);
    let stockModelKey: string | null = null;
    let inventoryEnabled = false;

    const stockByRetailerProduct = new Map<string, Map<string, number>>();
    const stockNameByKey = new Map<string, string>();

    if (stockFound) {
      stockModelKey = stockFound.key;
      const Stock: any = stockFound.delegate;

      const stockRows = await Stock.findMany({
        where: { ownerType: "RETAILER", ownerId: { in: engineRetailerIds } },
        select: { ownerId: true, productName: true, qtyOnHandPcs: true, qty: true, quantity: true },
        take: 50000,
      }).catch(async () => []);

      if (Array.isArray(stockRows)) {
        inventoryEnabled = true;
        for (const r of stockRows as any[]) {
          const rid = cleanStr(r?.ownerId);
          if (!rid) continue;
          const pn = cleanStr(r?.productName);
          if (!pn) continue;
          const key = pn.toLowerCase();
          const q = num(r?.qtyOnHandPcs ?? r?.qty ?? r?.quantity ?? 0);
          const m = stockByRetailerProduct.get(rid) || new Map<string, number>();
          m.set(key, (m.get(key) || 0) + q);
          stockByRetailerProduct.set(rid, m);
          if (!stockNameByKey.get(key)) stockNameByKey.set(key, pn);
        }
      }
    }

    /* -------------------- stats maps -------------------- */
    const retailerStats = new Map<
      string,
      {
        sales: number;
        ordersSet: Set<string>;
        orderDates: Date[];
        prod: Map<string, { productName: string; sales: number; qty: number; ordersSet: Set<string>; lastBoughtAt: Date | null }>;
      }
    >();

    const cityStats = new Map<string, Map<string, { productName: string; sales: number; ordersSet: Set<string>; retailersSet: Set<string> }>>();
    const cityProdPrevSales = new Map<string, number>();
    const pair = new Map<string, number>();

    for (const o of o90) {
      const rid = String(o.retailerId);
      const rcity = cleanStr(o.retailer?.city) || retailerIndex.get(rid)?.city || "—";

      const agg =
        retailerStats.get(rid) ||
        ({
          sales: 0,
          ordersSet: new Set<string>(),
          orderDates: [],
          prod: new Map(),
        } as any);

      const os = orderSales(o);
      agg.sales += os;
      agg.ordersSet.add(String(o.id));
      if (o.createdAt) agg.orderDates.push(new Date(o.createdAt));

      const uniqueProducts = new Set<string>();

      for (const it of o.items || []) {
        const pn = cleanStr(it.productName);
        if (!pn) continue;
        const key = pn.toLowerCase();
        uniqueProducts.add(key);

        const p =
          agg.prod.get(key) ||
          ({
            productName: pn,
            sales: 0,
            qty: 0,
            ordersSet: new Set<string>(),
            lastBoughtAt: null,
          } as any);

        p.productName = pn;
        p.sales += num(it.amount);
        p.qty += num(it.qty);
        p.ordersSet.add(String(o.id));
        const ca = o.createdAt ? new Date(o.createdAt) : null;
        if (ca && (!p.lastBoughtAt || ca.getTime() > p.lastBoughtAt.getTime())) p.lastBoughtAt = ca;
        agg.prod.set(key, p);

        const cm = cityStats.get(rcity) || new Map();
        const cp =
          cm.get(key) ||
          ({
            productName: pn,
            sales: 0,
            ordersSet: new Set<string>(),
            retailersSet: new Set<string>(),
          } as any);
        cp.productName = pn;
        cp.sales += num(it.amount);
        cp.ordersSet.add(String(o.id));
        cp.retailersSet.add(rid);
        cm.set(key, cp);
        cityStats.set(rcity, cm);
      }

      const list = Array.from(uniqueProducts);
      for (let i = 0; i < list.length; i++) {
        for (let j = 0; j < list.length; j++) {
          if (i === j) continue;
          const k = `${list[i]}|||${list[j]}`;
          pair.set(k, (pair.get(k) || 0) + 1);
        }
      }

      retailerStats.set(rid, agg);
    }

    for (const o of o90prev) {
      const rid = String(o.retailerId);
      const rcity = cleanStr(o.retailer?.city) || retailerIndex.get(rid)?.city || "—";
      for (const it of o.items || []) {
        const pn = cleanStr(it.productName);
        if (!pn) continue;
        const key = pn.toLowerCase();
        const ck = `${rcity}|||${key}`;
        cityProdPrevSales.set(ck, (cityProdPrevSales.get(ck) || 0) + num(it.amount));
      }
    }

    function cityTopProducts(cityName: string, topN = 12) {
      const cm = cityStats.get(cityName);
      if (!cm) return [];
      return Array.from(cm.entries())
        .map(([k, v]) => ({ key: k, productName: v.productName, sales: v.sales, orders: v.ordersSet.size, retailers: v.retailersSet.size }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, topN);
    }

    function cityMomentum(cityName: string, productKey: string) {
      const cm = cityStats.get(cityName);
      const curr = cm?.get(productKey)?.sales || 0;
      const prev = cityProdPrevSales.get(`${cityName}|||${productKey}`) || 0;
      const g = pctChange(curr, prev);
      return clamp(g, -100, 200);
    }

    function cityAdoptionRate(cityName: string, productKey: string) {
      const cm = cityStats.get(cityName);
      const buyers = cm?.get(productKey)?.retailersSet?.size || 0;
      const total = cityRetailerCount.get(cityName) || Math.max(1, buyers);
      return total ? buyers / total : 0;
    }

    function affinityTopB(fromProductKey: string, topN = 6) {
      const out: Array<{ toKey: string; strength: number }> = [];
      for (const [k, v] of pair.entries()) {
        const [a, b] = k.split("|||");
        if (a !== fromProductKey) continue;
        out.push({ toKey: b, strength: v });
      }
      out.sort((x, y) => y.strength - x.strength);
      return out.slice(0, topN);
    }

    /* -------------------- compute targets -------------------- */
    const level4Targets: EngineTarget[] = [];

    for (const rid of engineRetailerIds) {
      const meta = retailerIndex.get(rid);
      if (!meta) continue;

      const stats = retailerStats.get(rid);
      const ordersCount = stats?.ordersSet.size || 0;
      const sales90 = stats?.sales || 0;
      const aov90 = ordersCount ? sales90 / ordersCount : 0;
      const variety90 = stats ? stats.prod.size : 0;

      let lastAt: Date | null = null;
      if (stats?.orderDates?.length) {
        lastAt = stats.orderDates.reduce((a, b) => (a.getTime() > b.getTime() ? a : b));
      }
      const recencyDays = lastAt ? daysBetween(new Date(), lastAt) : 999;

      let last30 = 0;
      let prev30 = 0;
      if (stats?.orderDates?.length) {
        const cutoff30 = new Date(engineTo.getTime() - 30 * 24 * 60 * 60 * 1000);
        const cutoff60 = new Date(engineTo.getTime() - 60 * 24 * 60 * 60 * 1000);

        for (const o of o90) {
          if (String(o.retailerId) !== rid) continue;
          const d = o.createdAt ? new Date(o.createdAt) : null;
          if (!d) continue;
          const s = orderSales(o);
          if (d >= cutoff30) last30 += s;
          else if (d >= cutoff60 && d < cutoff30) prev30 += s;
        }
      }
      const trendDown = prev30 > 0 && last30 < prev30 * 0.7;

      const consistencyScore = computeConsistencyScore(stats?.orderDates || []);
      const retailerType = decideRetailerType({ recencyDays, frequency90: ordersCount, aov90, variety90, trendDown });

      const topSelling = stats
        ? Array.from(stats.prod.values())
            .map((p) => ({ productName: p.productName, sales: Math.round(p.sales), orders: p.ordersSet.size, qty: Math.round(p.qty), lastBoughtAt: p.lastBoughtAt }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 6)
        : [];

      const retailerTopKey = topSelling[0]?.productName ? topSelling[0].productName.toLowerCase() : null;

      const cTop = cityTopProducts(meta.city, 14);
      const affinity = retailerTopKey ? affinityTopB(retailerTopKey, 8) : [];
      const candidateKeys = new Set<string>();
      for (const x of cTop) candidateKeys.add(x.key);
      for (const a of affinity) candidateKeys.add(a.toKey);

      const citySlow = cityTopProducts(meta.city, 999).sort((a, b) => a.sales - b.sales).slice(0, 6);
      for (const x of citySlow) candidateKeys.add(x.key);

      const gaps: EngineTarget["gaps"] = [];
      const scored: EngineTarget["recommendations"] = [];

      const totalRetailerSales = Math.max(1, sales90);

      for (const key of candidateKeys) {
        const cityCM = cityStats.get(meta.city);
        const cityProd = cityCM?.get(key);
        const productName = cityProd?.productName || stockNameByKey.get(key) || key;

        const rp = stats?.prod.get(key);
        const retailerSales90 = rp?.sales || 0;
        const retailerOrders90 = rp?.ordersSet?.size || 0;
        const lastBoughtDaysAgo = rp?.lastBoughtAt ? daysBetween(new Date(), rp.lastBoughtAt) : null;
        const shareOfWallet = retailerSales90 / totalRetailerSales;

        const adoption = cityAdoptionRate(meta.city, key);
        const momentum = cityMomentum(meta.city, key);

        let gapType: "MISSING_90D" | "DROPPING" | "UNDER_PENETRATED" | null = null;
        let gapStrength = 0;
        const why: string[] = [];

        if (retailerOrders90 === 0 && adoption >= 0.12 && (cityProd?.sales || 0) > 0) {
          gapType = "MISSING_90D";
          gapStrength = clamp(Math.round(10 + adoption * 20 + Math.max(0, momentum) * 0.05), 0, 30);
          why.push("City adoption is high but retailer never bought (90d)");
        } else if (lastBoughtDaysAgo != null && lastBoughtDaysAgo >= 50 && retailerOrders90 > 0) {
          gapType = "DROPPING";
          gapStrength = clamp(Math.round(12 + Math.min(18, lastBoughtDaysAgo / 3)), 0, 30);
          why.push(`Retailer stopped buying (last bought ${lastBoughtDaysAgo}d ago)`);
        } else if (adoption >= 0.18 && shareOfWallet <= 0.03 && retailerOrders90 >= 1) {
          gapType = "UNDER_PENETRATED";
          gapStrength = clamp(Math.round(10 + adoption * 15), 0, 30);
          why.push("Retailer share is low vs city adoption");
        }

        const strongSeller = retailerOrders90 >= 3 && shareOfWallet >= 0.18;
        if (strongSeller) continue;

        let stockQty: number | null = null;
        let stockAvailable = true;
        let stockNote = "";

        if (inventoryEnabled) {
          const m = stockByRetailerProduct.get(rid);
          stockQty = m ? num(m.get(key) || 0) : 0;
          stockAvailable = stockQty > 0;
          stockNote = stockAvailable ? "In stock" : "Out of stock (system)";
          if (!stockAvailable) continue; // hard reject
        } else {
          stockQty = null;
          stockAvailable = true;
          stockNote = "Stock model not available";
        }

        let affinityScore = 0;
        if (retailerTopKey) {
          const k2 = `${retailerTopKey}|||${key}`;
          const cnt = pair.get(k2) || 0;
          affinityScore = clamp(Math.round((cnt / 10) * 15), 0, 15);
        }

        const cityMomentumScore = clamp(Math.round(((momentum + 100) / 300) * 20), 0, 20);

        const aovBandOk = aov90 >= 1200;
        const categorySimilarity = clamp(Math.round((affinityScore / 15) * 60 + (stats?.prod.has(key) ? 40 : 0)), 0, 100);
        const retailerFitScore = clamp(Math.round((aovBandOk ? 12 : 6) + (categorySimilarity / 100) * 13), 0, 25);

        const stabilityScore =
          retailerType === "SAFE_PLAYER" ? 6 : retailerType === "EXPERIMENTER" ? 9 : retailerType === "DECLINING" ? 5 : 7;

        const gapScore = gapType ? gapStrength : 0;

        const finalScore = clamp(Math.round(gapScore + retailerFitScore + cityMomentumScore + affinityScore + stabilityScore), 0, 100);

        const conf = clamp(
          Math.round(
            (gapType ? 50 : 32) +
              gapScore * 0.6 +
              affinityScore * 1.0 +
              (momentum > 0 ? 8 : 0) +
              (inventoryEnabled ? 6 : 0) -
              (retailerType === "DECLINING" ? 8 : 0)
          ),
          35,
          95
        );

        const reasons: string[] = [];
        if (gapType === "MISSING_90D") reasons.push("Gap: Missing in last 90d");
        if (gapType === "DROPPING") reasons.push("Gap: Dropping (stopped buying)");
        if (gapType === "UNDER_PENETRATED") reasons.push("Gap: Under-penetrated vs city");
        if (momentum > 0) reasons.push("City momentum positive");
        if (affinityScore >= 6 && retailerTopKey) {
          const topName = topSelling[0]?.productName || "Top SKU";
          reasons.push(`Affinity: ${topName} → ${productName} pairing strong`);
        }
        if (inventoryEnabled) reasons.push("Stock available (system)");

        const psych = psychLine(retailerType);
        const reasonLine = reasons.slice(0, 3).join(" | ") || "AI recommendation";
        const script = scriptFor(retailerType, topSelling[0]?.productName || null, productName, reasonLine);

        const impact = expectedImpactFromAov(aov90, conf);

        if (gapType) {
          gaps.push({
            productName,
            gapType,
            gapStrength,
            why: why.length ? why : ["Gap detected"],
            evidence: {
              cityAdoptionRate: Number(adoption.toFixed(3)),
              cityMomentum: Number(momentum.toFixed(2)),
              lastBoughtDaysAgo,
              retailerShareOfWallet: Number(shareOfWallet.toFixed(3)),
            },
          });
        }

        scored.push({
          productName,
          score: finalScore,
          confidence: conf,
          expectedImpactMin: impact.min,
          expectedImpactMax: impact.max,
          reasons: reasons.length ? reasons : ["AI recommendation based on sales + city demand"],
          psychology: psych,
          script,
          stock: { available: stockAvailable, qty: stockQty, note: stockNote },
        });
      }

      scored.sort((a, b) => b.score - a.score);

      let finalRecs = scored.slice(0, 4);
      if (retailerType === "SAFE_PLAYER") {
        const missing = finalRecs.filter((r) => r.reasons.some((x) => x.toLowerCase().includes("missing")));
        if (missing.length > 1) {
          const keep1 = missing[0];
          finalRecs = [keep1, ...finalRecs.filter((r) => r !== keep1 && !r.reasons.some((x) => x.toLowerCase().includes("missing")))].slice(0, 3);
        } else {
          finalRecs = finalRecs.slice(0, 3);
        }
      }

      if (ordersCount === 0) {
        const cTop2 = cityTopProducts(meta.city, 6);
        const list: EngineTarget["recommendations"] = [];
        for (const x of cTop2) {
          const m = stockByRetailerProduct.get(rid);
          const stockQty2 = inventoryEnabled ? num(m?.get(x.key) || 0) : null;
          const ok = inventoryEnabled ? (stockQty2 || 0) > 0 : true;
          if (!ok) continue;

          list.push({
            productName: x.productName,
            score: 72,
            confidence: 70,
            expectedImpactMin: 1200,
            expectedImpactMax: 4200,
            reasons: ["Retailer is inactive / zero orders", "City fast mover", inventoryEnabled ? "Stock available (system)" : "Stock check pending"],
            psychology: psychLine("DECLINING"),
            script: scriptFor("DECLINING", null, x.productName, "Restart with fast mover (city)"),
            stock: { available: true, qty: stockQty2, note: inventoryEnabled ? "In stock (system)" : "Stock model not available" },
          });

          if (list.length >= 2) break;
        }
        finalRecs = list;
      }

      gaps.sort((a, b) => b.gapStrength - a.gapStrength);

      level4Targets.push({
        retailerId: rid,
        retailerName: meta.name,
        city: meta.city,
        dna: {
          retailerType,
          recencyDays,
          frequency90: ordersCount,
          monetary90: Math.round(sales90),
          aov90: Math.round(aov90),
          variety90,
          consistencyScore,
        },
        topSelling: topSelling.map((x) => ({ productName: x.productName, sales: x.sales, orders: x.orders, qty: x.qty })),
        gaps: gaps.slice(0, 6),
        recommendations: finalRecs,
      });
    }

    level4Targets.sort((a, b) => (b.recommendations[0]?.score || 0) - (a.recommendations[0]?.score || 0));

    /* ------------------------------ insights ------------------------------ */
    const insights: any[] = [];
    if (riskRetailersMerged.length) {
      insights.push({
        id: "ins_risk_30d",
        type: "RISK_ALERT",
        title: `${riskRetailersMerged.length} retailers inactive / no orders (risk)`,
        summary: "Reactivate these retailers with a quick call/visit and recommend best-selling products.",
        evidence: riskRetailersMerged.slice(0, 5).map((r) => ({ kind: "RETAILER", id: r.id, label: r.name, metric: r.city })),
        actions: [{ type: "CREATE_TASKS", label: "Create reactivation tasks" }],
      });
    }

    /* ------------------------------ today plan seed (NO DAILY_CLOSE) ------------------------------ */
    let existingCount = 0;
    try {
      existingCount = await prisma.salesManagerTask.count({ where: { salesManagerId, day } });
    } catch (e: any) {
      if (isPrismaTableMissing(e)) return json(true, { aiEnabled: false, reason: "TASK_TABLE_MISSING" }, 200);
      throw e;
    }

    let created = false;

    const reactivationTargets = level4Targets.filter((t) => t.dna.recencyDays >= 30 || t.dna.frequency90 === 0).slice(0, 20);
    const upsellTargets = level4Targets.filter((t) => t.dna.recencyDays < 30 && t.recommendations.length).slice(0, 18);
    const slowMoverTargets = level4Targets.filter((t) => t.gaps.some((g) => g.gapType === "UNDER_PENETRATED" || g.gapType === "DROPPING")).slice(0, 18);

    const topProductNamesForTasks = topProducts.map((p) => p.productName).filter(Boolean).slice(0, 4);
    const slowProductNamesForTasks = (topCityName
      ? slowMoversByCity.filter((x) => x.city === topCityName).map((x) => x.productName)
      : slowMoversByCity.map((x) => x.productName)
    )
      .filter(Boolean)
      .slice(0, 4);

    const riskRetailerIdsForTasks = riskRetailersMerged.map((r) => r.id).slice(0, 20);

    if (existingCount === 0) {
      await prisma.salesManagerTask.createMany({
        data: [
          {
            salesManagerId,
            day,
            distributorId: distId || null,
            type: taskType("REACTIVATE_RETAILER"),
            title: "Reactivate: priority retailers (Level-4)",
            priority: 1,
            city: topCityName,
            retailerIds: riskRetailerIdsForTasks as any,
            productNames: topProductNamesForTasks as any,
            aiReason: simpleReason("REACTIVATE_RETAILER", null),
            expectedImpactMin: 5000,
            expectedImpactMax: 20000,
          },
          {
            salesManagerId,
            day,
            distributorId: distId || null,
            type: taskType("UPSELL_PRODUCTS"),
            title: "Upsell: retailer-specific recommendations (Level-4)",
            priority: 2,
            city: topCityName,
            productNames: topProductNamesForTasks as any,
            aiReason: simpleReason("UPSELL_PRODUCTS", null),
            expectedImpactMin: 3000,
            expectedImpactMax: 15000,
          },
          {
            salesManagerId,
            day,
            distributorId: distId || null,
            type: taskType("SLOW_MOVER_REVIVAL"),
            title: "Slow mover revival: blockers + bundling (Level-4)",
            priority: 3,
            city: topCityName,
            productNames: slowProductNamesForTasks as any,
            aiReason: simpleReason("SLOW_MOVER_REVIVAL", null),
            expectedImpactMin: 2000,
            expectedImpactMax: 12000,
          },
        ],
        skipDuplicates: true,
      });
      created = true;
    }

    const todayPlanRaw = await prisma.salesManagerTask.findMany({
      where: { salesManagerId, day },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
      include: { remarks: true },
    });

    function toTaskTargets(list: EngineTarget[], why: string): TaskTarget[] {
      return list.map((t) => {
        const meta = retailerIndex.get(t.retailerId);
        const last = lastOrderInfo.get(t.retailerId);

        return {
          retailerId: t.retailerId,
          retailerName: meta?.name || t.retailerName,
          distributorName: meta?.distributorName || "—",
          city: meta?.city || t.city || "—",
          lastOrderAt: last?.at ?? null,
          lastOrderAmount: last?.amount ?? null,
          personalizedReason: why,
          recommendedProducts: t.recommendations.slice(0, 4).map((r) => ({
            productName: r.productName,
            score: r.score,
            confidence: r.confidence,
            expectedImpactMin: r.expectedImpactMin,
            expectedImpactMax: r.expectedImpactMax,
            reasons: r.reasons,
            psychology: r.psychology,
            script: r.script,
            stock: r.stock,
          })),
        };
      });
    }

    const taskTargetsMap = new Map<string, TaskTarget[]>();
    taskTargetsMap.set(
      "REACTIVATE_RETAILER",
      toTaskTargets(reactivationTargets, "Inactive / high gap. Restart with 1–2 easy-win fast movers (only if stock available).")
    );
    taskTargetsMap.set(
      "UPSELL_PRODUCTS",
      toTaskTargets(upsellTargets, "High potential retailer. Push top 2–4 products: gaps + city demand + basket affinity (stock-checked).")
    );
    taskTargetsMap.set(
      "SLOW_MOVER_REVIVAL",
      toTaskTargets(slowMoverTargets, "Revive slow movers using blocker questions + bundling with fast movers (affinity-based, stock-checked).")
    );

    const todayPlan = (todayPlanRaw || [])
      .filter((t: any) => normalizeRole(t.type) !== "DAILY_CLOSE")
      .map((t: any) => {
        const typeKey = normalizeRole(t.type);
        const reasonUi = simpleReason(t.type, t.aiReason);

        const products = Array.isArray(t.productNames) ? t.productNames.filter(Boolean) : [];
        const cityName = cleanStr(t.city) || topCityName || "";

        const targets = taskTargetsMap.get(typeKey) || [];

        const scripts = buildScripts(products, reasonUi);
        const detail = {
          objective:
            typeKey === "REACTIVATE_RETAILER"
              ? "Re-activate inactive retailers and restart ordering"
              : typeKey === "UPSELL_PRODUCTS"
              ? "Increase sales using retailer-specific best opportunities"
              : typeKey === "SLOW_MOVER_REVIVAL"
              ? "Revive slow moving products by removing blockers"
              : "Execute task",
          why: reasonUi,
          how:
            typeKey === "REACTIVATE_RETAILER"
              ? "Call/visit targets, confirm stock availability, suggest 1–2 fast movers, and close a small order today."
              : typeKey === "UPSELL_PRODUCTS"
              ? "Call targets, pitch recommended products with proof (gap + city + affinity), and confirm order today."
              : typeKey === "SLOW_MOVER_REVIVAL"
              ? "Ask blockers: margin/price/awareness/expiry/returns. Bundle with fast mover and take trial order."
              : "Follow task instructions",
          blockerQuestions:
            typeKey === "SLOW_MOVER_REVIVAL"
              ? ["Margin issue?", "Customer demand low?", "Price resistance?", "Expiry fear?", "Scheme needed?", "Display/visibility missing?", "Any return/damage complaints?"]
              : [],
          city: cityName || null,
          products,
          scripts,
          targetsCount: targets.length,
        };

        return {
          ...t,
          typeKey: t.type,
          type: taskTypeLabel(t.type),
          aiReasonRaw: t.aiReason,
          aiReason: reasonUi,
          targets,
          detail,
        };
      });

    const totalTasks = todayPlan.length;
    const doneTasks = todayPlan.filter((t: any) => normalizeRole(t.status) === "DONE").length;
    const openCount = totalTasks - doneTasks;

    const executiveBrief = [
      { id: "brief_today_plan", type: "TODAY_PLAN", title: `Today: ${openCount} tasks pending.`, count: openCount },
      {
        id: "brief_top_city",
        type: "TOP_CITY",
        title: `Best city today: ${topCityName || "—"}`,
        count: topCities[0]?.sales || 0,
        city: topCityName || "—",
      },
      {
        id: "brief_top_product",
        type: "TOP_PRODUCT",
        title: `Best-selling product: ${topProductName || "—"}`,
        count: topProducts[0]?.sales || 0,
        productName: topProductName || "—",
      },
      { id: "brief_risk", type: "RISK_ALERT", title: `Risk: ${riskRetailersMerged.length} retailers inactive / no orders`, count: riskRetailersMerged.length },
      { id: "brief_level4", type: "AI_LEVEL4", title: `Level-4 Engine: ${level4Targets.length} retailers analyzed (90d)`, count: level4Targets.length },
    ];

    // ✅ NEW: proof/explainability reasons (for View Proof modal Top Reasons)
    const topCity = topCities[0] || null;
    const topProduct = topProducts[0] || null;

    const proofReasons: string[] = [];
    proofReasons.push(`Today Plan: ${openCount} tasks pending out of ${totalTasks}.`);

    if (topCity) {
      proofReasons.push(
        `Top City: ${topCity.city} (Sales ₹${Math.round(topCity.sales)} from ${topCity.orders} orders, growth ${Number(topCity.growthPct || 0).toFixed(2)}%).`
      );
    } else {
      proofReasons.push(`Top City: — (no city sales in selected range).`);
    }

    if (topProduct) {
      proofReasons.push(
        `Top Product: ${topProduct.productName} (Sales ₹${Math.round(topProduct.sales)} • Orders ${topProduct.orders} • Qty ${topProduct.qty} • Repeat buyers ${topProduct.repeat}, growth ${Number(topProduct.growthPct || 0).toFixed(2)}%).`
      );
    } else {
      proofReasons.push(`Top Product: — (no product sales in selected range).`);
    }

    if (riskRetailersMerged.length) {
      proofReasons.push(
        `Risk rule: retailers with (A) zero orders OR (B) last order >= 30 days ago. Found: ${riskRetailersMerged.length}.`
      );
    } else {
      proofReasons.push(`Risk rule: zero orders OR last order >= 30 days ago. Found: 0.`);
    }

    proofReasons.push(`Level-4: ${level4Targets.length} retailers analyzed using last 90 days orders.`);
    proofReasons.push(
      inventoryEnabled
        ? `Inventory: enabled (${stockModelKey}) — out-of-stock recommendations are hard-rejected.`
        : `Inventory: disabled — stock model not found; recommendations are sales-only.`
    );

    // ✅ NEW: structured proof (UI can use later)
    const proof = {
      ranges: {
        mode,
        current: { from: rangeFrom.toISOString(), to: rangeTo.toISOString() },
        previous: { from: prevFrom.toISOString(), to: prevTo.toISOString() },
      },
      topCity: topCity
        ? { city: topCity.city, orders: topCity.orders, sales: Math.round(topCity.sales), growthPct: Number(topCity.growthPct || 0) }
        : null,
      topProduct: topProduct
        ? {
            productName: topProduct.productName,
            orders: topProduct.orders,
            qty: topProduct.qty,
            sales: Math.round(topProduct.sales),
            repeat: topProduct.repeat,
            growthPct: Number(topProduct.growthPct || 0),
          }
        : null,
      riskSample: riskRetailersMerged.slice(0, 10),
      inventory: { enabled: inventoryEnabled, stockModelKey: stockModelKey || null },
      engine: { days: engineDays, from: engineFrom.toISOString(), to: engineTo.toISOString() },
      counts: {
        ordersInRange: orders.length,
        prevOrdersInRange: prevOrders.length,
        engineOrders90: o90.length,
        enginePrevOrders90: o90prev.length,
      },
    };

    return json(true, {
      aiEnabled: true,
      day,
      mode,
      range: { from: rangeFrom.toISOString(), to: rangeTo.toISOString() },
      engineRange: { from: engineFrom.toISOString(), to: engineTo.toISOString(), days: engineDays },
      filters: { distId: distId || null, city: city || null },
      inventory: {
        enabled: inventoryEnabled,
        stockModelKey,
        note: inventoryEnabled ? "Out-of-stock products are hard-rejected from recommendations." : "Stock model not found; recommendations are sales-only.",
      },
      executiveBrief,
      todayPlan,
      leaderboards: { topRetailers: topRetailers.slice(0, limit), topCities, topProducts, slowMoversByCity },
      level4: { targets: level4Targets.slice(0, 40) },
      insights,

      // ✅ UPDATED: View Proof will show these in "Top Reasons"
      performance: { score: 0, total: totalTasks, done: doneTasks, openCount, reasons: proofReasons },

      // ✅ NEW: extra structured proof (optional for UI)
      proof,

      debug: debugAuth
        ? {
            auth: { role, sessionRole, headerUserRole, userId },
            ordersInRange: orders.length,
            prevOrdersInRange: prevOrders.length,
            engineOrders90: o90.length,
            enginePrevOrders90: o90prev.length,
            created,
          }
        : {
            ordersInRange: orders.length,
            prevOrdersInRange: prevOrders.length,
            engineOrders90: o90.length,
            enginePrevOrders90: o90prev.length,
            created,
          },
    });
  } catch (e: any) {
    if (isPrismaTableMissing(e)) return json(true, { aiEnabled: false, reason: "TASK_TABLE_MISSING" }, 200);
    return json(false, { error: "INTERNAL_ERROR", detail: String(e?.message || e) }, 500);
  }
}