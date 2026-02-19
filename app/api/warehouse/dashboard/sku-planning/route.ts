import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isWarehouseRole(role: unknown) {
  const r = String(role || "").toUpperCase();
  return r.includes("WAREHOUSE") || r.includes("STORE") || r === "ADMIN";
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

type MonthKey = "m2" | "m1" | "m0"; // m2=2 months ago, m1=last month, m0=this month
function wma(m0: number, m1: number, m2: number) {
  // WMA = 0.5*m0 + 0.3*m1 + 0.2*m2
  return 0.5 * m0 + 0.3 * m1 + 0.2 * m2;
}

export async function GET(req: Request) {
  try {
    const me: any = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!isWarehouseRole(me?.role)) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const safetyPct = Math.min(0.5, Math.max(0, Number(url.searchParams.get("safetyPct") || 0.15))); // default 15%

    const now = new Date();

    const m0s = monthStart(now);
    const m0e = addMonths(m0s, 1);

    const m1s = addMonths(m0s, -1);
    const m1e = m0s;

    const m2s = addMonths(m0s, -2);
    const m2e = m1s;

    // 1) Sales per SKU per month (qty)
    async function groupSKU(start: Date, end: Date) {
      const g = await prisma.invoiceItem.groupBy({
        by: ["productName"],
        where: { invoice: { createdAt: { gte: start, lt: end } } },
        _sum: { qty: true, amount: true },
      });
      const map = new Map<string, { qty: number; amount: number }>();
      for (const r of g) {
        map.set(String(r.productName), {
          qty: Number(r._sum.qty || 0),
          amount: Number(r._sum.amount || 0),
        });
      }
      return map;
    }

    const m0 = await groupSKU(m0s, m0e);
    const m1 = await groupSKU(m1s, m1e);
    const m2 = await groupSKU(m2s, m2e);

    // 2) Company stock on hand per SKU
    const onHand = await prisma.stockLot.groupBy({
      by: ["productName"],
      where: { ownerType: "COMPANY" },
      _sum: { qtyOnHandPcs: true },
    });
    const onHandMap = new Map<string, number>();
    for (const r of onHand) onHandMap.set(String(r.productName), Number(r._sum.qtyOnHandPcs || 0));

    // 3) Committed outbound (not packed yet) per SKU
    const committed = await prisma.inboundOrderItem.groupBy({
      by: ["productName"],
      where: { inboundOrder: { status: { in: ["CREATED", "CONFIRMED", "PAYMENT_VERIFIED"] } } },
      _sum: { orderedQtyPcs: true },
    });
    const committedMap = new Map<string, number>();
    for (const r of committed) committedMap.set(String(r.productName), Number(r._sum.orderedQtyPcs || 0));

    // union of SKUs
    const all = new Set<string>();
    for (const k of m0.keys()) all.add(k);
    for (const k of m1.keys()) all.add(k);
    for (const k of m2.keys()) all.add(k);
    for (const k of onHandMap.keys()) all.add(k);
    for (const k of committedMap.keys()) all.add(k);

    const rows = Array.from(all).map((productName) => {
      const m0q = m0.get(productName)?.qty || 0;
      const m1q = m1.get(productName)?.qty || 0;
      const m2q = m2.get(productName)?.qty || 0;

      const forecast = Math.round(wma(m0q, m1q, m2q));
      const growthPct = m1q > 0 ? ((m0q - m1q) / m1q) * 100 : null;

      const onHandPcs = onHandMap.get(productName) || 0;
      const committedPcs = committedMap.get(productName) || 0;

      // free stock after considering near-term commitments
      const freeStock = Math.max(0, onHandPcs - committedPcs);

      const safety = Math.round(forecast * safetyPct);
      const suggestedOrderQty = Math.max(0, forecast + safety - freeStock);

      return {
        productName,
        m2Qty: m2q,
        m1Qty: m1q,
        m0Qty: m0q,
        forecastNextMonthQty: forecast,
        growthPct,
        onHandPcs,
        committedPcs,
        freeStock,
        safetyPcs: safety,
        suggestedOrderQty,
      };
    });

    // sort: highest suggested order first
    rows.sort((a, b) => b.suggestedOrderQty - a.suggestedOrderQty);

    // totals
    const totals = rows.reduce(
      (acc, r) => {
        acc.forecast += r.forecastNextMonthQty;
        acc.suggested += r.suggestedOrderQty;
        acc.onHand += r.onHandPcs;
        acc.committed += r.committedPcs;
        return acc;
      },
      { forecast: 0, suggested: 0, onHand: 0, committed: 0 }
    );

    return NextResponse.json({
      ok: true,
      safetyPct,
      totals,
      rows,
      range: {
        m2: { start: m2s, end: m2e },
        m1: { start: m1s, end: m1e },
        m0: { start: m0s, end: m0e },
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e || "Server error") }, { status: 500 });
  }
}
