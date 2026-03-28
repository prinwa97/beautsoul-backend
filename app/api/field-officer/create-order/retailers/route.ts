import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SortKey =
  | "RECENT"
  | "OLDEST"
  | "AMOUNT_HIGH"
  | "AMOUNT_LOW"
  | "NAME_AZ";

/* ---------------- helpers ---------------- */

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function asInt(v: any, def = 200) {
  const n = Math.floor(Number(v || 0));
  return Number.isFinite(n) && n > 0 ? n : def;
}

function safeSortKey(v: string): SortKey {
  const s = cleanStr(v).toUpperCase();
  if (s === "RECENT") return "RECENT";
  if (s === "OLDEST") return "OLDEST";
  if (s === "AMOUNT_HIGH") return "AMOUNT_HIGH";
  if (s === "AMOUNT_LOW") return "AMOUNT_LOW";
  if (s === "NAME_AZ") return "NAME_AZ";
  return "RECENT";
}

function sortRows(rows: any[], sort: SortKey) {
  const r = [...rows];

  if (sort === "NAME_AZ")
    return r.sort((a, b) => String(a.name).localeCompare(String(b.name)));

  if (sort === "OLDEST")
    return r.sort(
      (a, b) =>
        +new Date(a.lastOrderAt || 0) - +new Date(b.lastOrderAt || 0)
    );

  if (sort === "AMOUNT_HIGH")
    return r.sort(
      (a, b) => Number(b.lastOrderAmount || 0) - Number(a.lastOrderAmount || 0)
    );

  if (sort === "AMOUNT_LOW")
    return r.sort(
      (a, b) => Number(a.lastOrderAmount || 0) - Number(b.lastOrderAmount || 0)
    );

  return r.sort(
    (a, b) =>
      +new Date(b.lastOrderAt || 0) - +new Date(a.lastOrderAt || 0)
  );
}

/* ---------------- ROUTE ---------------- */

export async function GET(req: Request) {
  try {
    const u: any = await getSessionUser();

    if (!u)
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 }
      );

    if (String(u.role).toUpperCase() !== "FIELD_OFFICER") {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    const distributorId = String(u.distributorId || "");
    if (!distributorId) {
      return NextResponse.json(
        { ok: false, error: "Missing distributorId in session" },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);

    const q = cleanStr(searchParams.get("q"));
    const takeRaw = asInt(searchParams.get("take"), 200);
    const take = Math.min(500, Math.max(1, takeRaw));
    const sort = safeSortKey(searchParams.get("sort") || "");

    /* ---------------- RETAILERS ---------------- */

    const retailers = await prisma.retailer.findMany({
      where: {
        distributorId,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { city: { contains: q, mode: "insensitive" } },
                { phone: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        city: true,
        phone: true,
      },
      orderBy: { name: "asc" },
      take,
    });

    const retailerIds = retailers.map((r) => r.id);

    if (!retailerIds.length) {
      return NextResponse.json({ ok: true, rows: [] });
    }

    /* ---------------- LAST ORDER DATE ---------------- */

    const lastOrderAgg = await prisma.order.groupBy({
      by: ["retailerId"],
      where: {
        retailerId: { in: retailerIds },
        distributorId,
      },
      _max: {
        createdAt: true,
      },
    });

    const lastAtMap = new Map<string, Date>();

    for (const r of lastOrderAgg) {
      if (r._max?.createdAt) {
        lastAtMap.set(String(r.retailerId), r._max.createdAt);
      }
    }

    /* ---------------- LAST ORDER STATUS + AMOUNT ---------------- */

    const latestOrders = await prisma.order.findMany({
      where: {
        distributorId,
        OR: lastOrderAgg
          .filter((r) => r._max?.createdAt)
          .map((r) => ({
            retailerId: r.retailerId,
            createdAt: r._max.createdAt!,
          })),
      },
      select: {
        retailerId: true,
        status: true,
        totalAmount: true,
      },
    });

    const lastStatusMap = new Map<string, string>();
    const lastAmountMap = new Map<string, number>();

    for (const o of latestOrders) {
      const rid = String(o.retailerId);

      lastStatusMap.set(rid, String(o.status || ""));
      lastAmountMap.set(rid, Number(o.totalAmount || 0));
    }

    /* ---------------- PENDING ORDERS ---------------- */

    const pendingStatuses = ["SUBMITTED", "CONFIRMED"] as any[];

    const pendingByRetailer = await prisma.order.groupBy({
      by: ["retailerId"],
      where: {
        retailerId: { in: retailerIds },
        distributorId,
        status: { in: pendingStatuses },
      },
      _count: { _all: true },
    });

    const pendingMap = new Map<string, number>();

    for (const x of pendingByRetailer) {
      pendingMap.set(String(x.retailerId), Number(x._count?._all || 0));
    }

    /* ---------------- FINAL ROW BUILD ---------------- */

    const rows = retailers.map((r) => {
      const rid = String(r.id);

      return {
        retailerId: rid,
        name: r.name,
        city: r.city ?? null,
        phone: r.phone ?? null,

        lastOrderAt: lastAtMap.get(rid)?.toISOString() || null,
        lastOrderAmount: lastAmountMap.get(rid) || 0,
        lastOrderStatus: lastStatusMap.get(rid) || null,

        pendingOrders: pendingMap.get(rid) || 0,
      };
    });

    const sorted = sortRows(rows, sort);

    return NextResponse.json({
      ok: true,
      rows: sorted,
    });
  } catch (e: any) {
    console.error("FO create-order retailers error:", e);

    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}