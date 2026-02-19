import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asInt(v: any, def = 50) {
  const n = Math.floor(Number(v ?? def));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 200) : def;
}

async function requireFieldOfficer() {
  const u: any = await getSessionUser();
  if (!u) return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  const role = String(u.role || "").toUpperCase();
  if (role !== "FIELD_OFFICER") return { ok: false as const, status: 403 as const, error: "Only Field Officer allowed" };
  return { ok: true as const, user: u };
}

// GET /api/field-officer/ledger/retailer?retailerId=xxx&take=50
export async function GET(req: Request) {
  try {
    const auth = await requireFieldOfficer();
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const retailerId = String(searchParams.get("retailerId") || "").trim();
    const take = asInt(searchParams.get("take"), 50);

    if (!retailerId) return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });

    // ✅ FO distributor restriction (optional)
    const foDistributorId = auth.user?.distributorId ? String(auth.user.distributorId) : null;

    const retailer = await prisma.retailer.findUnique({
      where: { id: retailerId },
      select: { id: true, name: true, city: true, status: true, distributorId: true },
    });
    if (!retailer) return NextResponse.json({ ok: false, error: "Retailer not found" }, { status: 404 });

    if (foDistributorId && retailer.distributorId && String(retailer.distributorId) !== foDistributorId) {
      return NextResponse.json({ ok: false, error: "Forbidden: retailer not under your distributor" }, { status: 403 });
    }

    const invoices = await prisma.invoice.findMany({
      where: { retailerId },
      orderBy: { createdAt: "desc" },
      take,
      select: {
        id: true,
        invoiceNo: true,
        createdAt: true,
        totalAmount: true,
        paymentStatus: true,
        paidAmount: true,
        utrNo: true,
        remarks: true,
        items: {
          select: {
            id: true,
            productName: true,
            qty: true,
            rate: true,
            amount: true,
            batchNo: true,
            expiryDate: true,
          },
        },
      },
    });

    const payments = await prisma.retailerLedger.findMany({
      where: { retailerId, type: "CREDIT" },
      orderBy: { date: "desc" },
      take: 200,
      select: {
        id: true,
        date: true,
        amount: true,
        reference: true,
        narration: true,
        type: true,
      },
    });

    const billedTotal = await prisma.invoice.aggregate({
      where: { retailerId },
      _sum: { totalAmount: true },
    });

    const collectedTotal = await prisma.retailerLedger.aggregate({
      where: { retailerId, type: "CREDIT" },
      _sum: { amount: true },
    });

    const billed = Number(billedTotal._sum.totalAmount || 0);
    const collected = Number(collectedTotal._sum.amount || 0);
    const pending = Math.max(billed - collected, 0);

    return NextResponse.json({
      ok: true,
      retailer,
      totals: { billed, collected, pending },
      invoices,
      payments,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
