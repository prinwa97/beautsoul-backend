import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asInt(v: any, d = 0) {
  const x = Math.floor(Number(v ?? d));
  return Number.isFinite(x) ? x : d;
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

type SortKey = "RECENT" | "OLDEST" | "HIGH" | "LOW" | "NAME_AZ";

export async function GET(req: Request) {
  try {
    const u: any = await getSessionUser();
    if (!u) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const role = String(u.role || "").toUpperCase();
    if (role !== "FIELD_OFFICER") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const distributorId = u.distributorId ? String(u.distributorId) : null;
    if (!distributorId) {
      return NextResponse.json({ ok: false, error: "Missing distributorId in session" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);

    const q = cleanStr(searchParams.get("q"));
    const take = Math.min(200, Math.max(20, asInt(searchParams.get("take"), 60)));
    const sort = (cleanStr(searchParams.get("sort")) || "RECENT") as SortKey;

    const whereRetailer: any = { distributorId };

    if (q) {
      whereRetailer.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }

    const retailers = await prisma.retailer.findMany({
      where: whereRetailer,
      select: {
        id: true,
        name: true,
        city: true,
        phone: true,
        createdAt: true,
      },
      take,
      orderBy: { name: "asc" },
    });

    const ids = retailers.map((r) => r.id);

    const grouped = ids.length
      ? await prisma.retailerLedger.groupBy({
          by: ["retailerId", "type"],
          where: {
            distributorId,
            retailerId: { in: ids },
          },
          _sum: { amount: true },
        })
      : [];

    const debitMap = new Map<string, number>();
    const creditMap = new Map<string, number>();

    for (const g of grouped as any[]) {
      const retailerId = String(g.retailerId);
      const amt = Number(g?._sum?.amount || 0);

      if (g.type === "DEBIT") {
        debitMap.set(retailerId, (debitMap.get(retailerId) || 0) + amt);
      } else if (g.type === "CREDIT") {
        creditMap.set(retailerId, (creditMap.get(retailerId) || 0) + amt);
      }
    }

    const lastDates = ids.length
      ? await prisma.retailerLedger.groupBy({
          by: ["retailerId"],
          where: {
            distributorId,
            retailerId: { in: ids },
          },
          _max: { date: true },
        })
      : [];

    const lastMap = new Map<string, string>();
    for (const row of lastDates as any[]) {
      if (row?._max?.date) {
        lastMap.set(String(row.retailerId), new Date(row._max.date).toISOString());
      }
    }

    const rows = retailers.map((r) => {
      const debit = debitMap.get(r.id) || 0;
      const credit = creditMap.get(r.id) || 0;
      const balance = debit - credit; // + = due, - = advance
      const lastLedgerAt = lastMap.get(r.id) || null;

      return {
        retailerId: r.id,
        name: r.name,
        city: r.city,
        phone: r.phone,
        balance,
        absBalance: Math.abs(balance),
        lastLedgerAt,
      };
    });

    rows.sort((a, b) => {
      if (sort === "NAME_AZ") return a.name.localeCompare(b.name);
      if (sort === "HIGH") return b.absBalance - a.absBalance;
      if (sort === "LOW") return a.absBalance - b.absBalance;

      const at = a.lastLedgerAt ? new Date(a.lastLedgerAt).getTime() : 0;
      const bt = b.lastLedgerAt ? new Date(b.lastLedgerAt).getTime() : 0;

      if (sort === "OLDEST") return at - bt;
      return bt - at;
    });

    return NextResponse.json({
      ok: true,
      rows,
      take,
      sort,
    });
  } catch (e: any) {
    console.error("FO collection retailers error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}