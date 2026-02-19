import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isWarehouseRole(role: unknown) {
  const r = String(role || "").toUpperCase();
  return r.includes("WAREHOUSE") || r.includes("STORE") || r === "ADMIN";
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function startOfNextMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 1);
}

export async function GET() {
  try {
    const me: any = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!isWarehouseRole(me?.role)) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const now = new Date();
    const m0s = startOfMonth(now);
    const m0e = startOfNextMonth(now);
    const m1s = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const m1e = startOfMonth(now);

    // MTD Sales (pcs + amount) from InvoiceItem + Invoice
    const mtdItems = await prisma.invoiceItem.aggregate({
      where: { invoice: { createdAt: { gte: m0s, lt: m0e } } },
      _sum: { qty: true, amount: true },
    });

    const lastMonthItems = await prisma.invoiceItem.aggregate({
      where: { invoice: { createdAt: { gte: m1s, lt: m1e } } },
      _sum: { qty: true, amount: true },
    });

    const mtdQty = Number(mtdItems._sum.qty || 0);
    const mtdAmt = Number(mtdItems._sum.amount || 0);

    const lmQty = Number(lastMonthItems._sum.qty || 0);
    const lmAmt = Number(lastMonthItems._sum.amount || 0);

    const growthQtyPct = lmQty > 0 ? ((mtdQty - lmQty) / lmQty) * 100 : null;
    const growthAmtPct = lmAmt > 0 ? ((mtdAmt - lmAmt) / lmAmt) * 100 : null;

    // Company OnHand (pcs)
    const onHand = await prisma.stockLot.groupBy({
      by: ["productName"],
      where: { ownerType: "COMPANY" },
      _sum: { qtyOnHandPcs: true },
    });
    const totalOnHandPcs = onHand.reduce((a, x) => a + Number(x._sum.qtyOnHandPcs || 0), 0);

    // Committed outbound (not packed yet) -> inbound orders still requiring company stock soon
    const committed = await prisma.inboundOrderItem.aggregate({
      where: {
        inboundOrder: { status: { in: ["CREATED", "CONFIRMED", "PAYMENT_VERIFIED"] } },
      },
      _sum: { orderedQtyPcs: true },
    });
    const committedPcs = Number(committed._sum.orderedQtyPcs || 0);

    // Low stock SKU count (threshold 20 pcs)
    const lowStockCount = onHand.filter((x) => Number(x._sum.qtyOnHandPcs || 0) <= 20).length;

    return NextResponse.json({
      ok: true,
      cards: {
        mtdQty,
        mtdAmt,
        growthQtyPct,
        growthAmtPct,
        totalOnHandPcs,
        committedPcs,
        lowStockCount,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: String(e?.message || e || "Server error") }, { status: 500 });
  }
}
