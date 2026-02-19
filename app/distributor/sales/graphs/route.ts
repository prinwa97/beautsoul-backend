// app/distributor/sales/graphs/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function clamp(n: number, a: number, b: number) {
  return Math.min(Math.max(n, a), b);
}
function toInt(v: string | null, def: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
}
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * ✅ GET distributor sales graphs (based on Invoice + InvoiceItem)
 * URL: /distributor/sales/graphs?days=30
 */
export async function GET(req: Request) {
  let distributorId = "";
  try {
    distributorId = await requireDistributorId();
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED", message: String(e?.message || "Unauthorized") },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const days = clamp(toInt(searchParams.get("days"), 30), 7, 365);

  const since = startOfDay(new Date());
  since.setDate(since.getDate() - (days - 1));

  try {
    // ✅ Trend: per-day total sales (Invoice.totalAmount)
    // NOTE: schema me distributorId OR forDistributorId me se koi ek use ho sakta hai, isliye OR rakha hai
    const trendRows = await prisma.$queryRaw<
      Array<{ d: string; amount: number }>
    >`
      SELECT
        to_char(date_trunc('day', i."createdAt"), 'YYYY-MM-DD') AS d,
        COALESCE(SUM(COALESCE(i."totalAmount", 0)), 0)          AS amount
      FROM "Invoice" i
      WHERE
        (i."distributorId" = ${distributorId} OR i."forDistributorId" = ${distributorId})
        AND i."createdAt" >= ${since}
      GROUP BY 1
      ORDER BY 1 ASC
    `;

    // ✅ Top Products: InvoiceItem based aggregation
    // Safer: amount column ho to use, warna qty*rate
    const topRows = await prisma.$queryRaw<
      Array<{ productName: string; amount: number; qty: number }>
    >`
      SELECT
        COALESCE(ii."productName", 'Unknown') AS "productName",
        COALESCE(SUM(COALESCE(ii."amount", (COALESCE(ii."qty",0) * COALESCE(ii."rate",0)))), 0) AS amount,
        COALESCE(SUM(COALESCE(ii."qty",0)), 0) AS qty
      FROM "InvoiceItem" ii
      JOIN "Invoice" i ON i."id" = ii."invoiceId"
      WHERE
        (i."distributorId" = ${distributorId} OR i."forDistributorId" = ${distributorId})
        AND i."createdAt" >= ${since}
      GROUP BY 1
      ORDER BY amount DESC
      LIMIT 10
    `;

    const trend = trendRows.map((r) => ({
      date: r.d,
      amount: Math.round(Number(r.amount || 0)),
    }));

    const topProducts = topRows.map((r) => ({
      productName: String(r.productName || "Unknown"),
      amount: Math.round(Number(r.amount || 0)),
      qty: Number(r.qty || 0),
    }));

    return NextResponse.json({ ok: true, days, since, trend, topProducts });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || "Server error") },
      { status: 500 }
    );
  }
}