import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function money(n: any) {
  const x = Number(n || 0);
  return Number.isFinite(x) ? x : 0;
}

export async function GET(req: Request) {
  try {
    const distributorId = await requireDistributorId();
    if (!distributorId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const retailerId = String(url.searchParams.get("retailerId") || "").trim();
    if (!retailerId) {
      return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });
    }

    // ✅ Security: retailer must belong to this distributor
    const retailer = await prisma.retailer.findFirst({
      where: { id: retailerId, distributorId },
      select: { id: true, name: true, phone: true, city: true, status: true },
    });

    if (!retailer) {
      return NextResponse.json({ ok: false, error: "Retailer not found" }, { status: 404 });
    }

    const [debitAgg, creditAgg] = await Promise.all([
      prisma.retailerLedger.aggregate({
        where: { distributorId, retailerId, type: "DEBIT" },
        _sum: { amount: true },
      }),
      prisma.retailerLedger.aggregate({
        where: { distributorId, retailerId, type: "CREDIT" },
        _sum: { amount: true },
      }),
    ]);

    const totalDebit = money(debitAgg._sum.amount);
    const totalCredit = money(creditAgg._sum.amount);
    const receivable = money(totalDebit - totalCredit);

    return NextResponse.json({
      ok: true,
      retailer,
      totals: {
        totalDebit,
        totalCredit,
        receivable, // ✅ UI yahi use kare
      },
    });
  } catch (e: any) {
    console.error("ledger summary error:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
