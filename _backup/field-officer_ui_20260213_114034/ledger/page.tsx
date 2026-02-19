import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** ---------- helpers ---------- */
function cleanStr(v: string | null) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function asInt(v: string | null, def = 0) {
  const n = Math.floor(Number(v ?? def));
  return Number.isFinite(n) ? n : def;
}

function clamp(n: number, min: number, max: number) {
  const x = Number(n);
  if (!Number.isFinite(x)) return min;
  return Math.max(min, Math.min(max, x));
}

/** ---------- handler ---------- */
export async function GET(req: Request) {
  try {
    const u: any = await getSessionUser();
    if (!u) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const role = String(u.role || "").toUpperCase();
    const allowed = new Set(["FIELD_OFFICER", "DISTRIBUTOR", "SALES_MANAGER", "ADMIN"]);
    if (!allowed.has(role)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const retailerId = cleanStr(url.searchParams.get("retailerId"));
    if (!retailerId) {
      return NextResponse.json({ ok: false, error: "retailerId required" }, { status: 400 });
    }

    // pagination knobs
    const take = clamp(asInt(url.searchParams.get("take"), 60), 1, 200);
    const payTake = clamp(asInt(url.searchParams.get("payTake"), 60), 1, 200);

    // optional distributor scoping (important!)
    const distributorId =
      u.distributorId || u?.distributor?.id || u?.distributorProfile?.id || null;

    // ✅ Retailer access check
    const retailer = await prisma.retailer.findUnique({
      where: { id: retailerId },
      select: { id: true, name: true, city: true, status: true, distributorId: true },
    });

    if (!retailer) {
      return NextResponse.json({ ok: false, error: "Retailer not found" }, { status: 404 });
    }

    if (distributorId && retailer.distributorId && retailer.distributorId !== distributorId) {
      return NextResponse.json({ ok: false, error: "Retailer not in your distributor scope" }, { status: 403 });
    }

    // ✅ Invoices (with items)
    const invWhere: any = { retailerId };
    if (distributorId) invWhere.distributorId = distributorId;

    const invoicesRaw = await prisma.invoice.findMany({
      where: invWhere,
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
        invoiceItem: {
          select: {
            id: true,
            productName: true,
            qty: true,
            rate: true,
            amount: true,
            batchNo: true,
            expiryDate: true,
          },
          orderBy: { productName: "asc" },
        },
      },
    });

    const invoices = invoicesRaw.map((inv) => ({
      id: inv.id,
      invoiceNo: inv.invoiceNo || "",
      createdAt: inv.createdAt?.toISOString?.() || String(inv.createdAt),
      totalAmount: Number(inv.totalAmount || 0),
      paymentStatus: String(inv.paymentStatus || ""),
      paidAmount: Number(inv.paidAmount || 0),
      utrNo: inv.utrNo ?? null,
      remarks: inv.remarks ?? null,
      items: (inv.invoiceItem || []).map((it) => ({
        id: it.id,
        productName: it.productName,
        qty: Number(it.qty || 0),
        rate: Number(it.rate || 0),
        amount: Number(it.amount || 0),
        batchNo: it.batchNo ?? null,
        expiryDate: it.expiryDate ? it.expiryDate.toISOString?.() : null,
      })),
    }));

    // ✅ Payments from RetailerLedger (CREDIT)
    // If your ledger has "date" only, this is fine. If it has createdAt, you can use that instead.
    const ledWhere: any = { retailerId };
    if (distributorId) ledWhere.distributorId = distributorId;

    const paymentsRaw = await prisma.retailerLedger.findMany({
      where: {
        ...ledWhere,
        type: "CREDIT",
      },
      orderBy: { date: "desc" },
      take: payTake,
      select: {
        id: true,
        date: true,
        amount: true,
        reference: true,
        narration: true,
        type: true,
      },
    });

    const payments = paymentsRaw.map((p) => ({
      id: p.id,
      date: p.date?.toISOString?.() || String(p.date),
      amount: Number(p.amount || 0),
      reference: p.reference ?? null,
      narration: p.narration ?? null,
      type: String(p.type || "CREDIT"),
    }));

    // ✅ Totals
    // billed = sum(totalAmount)
    // collected = sum(paidAmount) OR sum(CREDIT)
    // pending = billed - collected (never negative)
    const billed = invoices.reduce((s, i) => s + (i.totalAmount || 0), 0);

    // IMPORTANT:
    // If your "paidAmount" is always synced, keep collected = sum(paidAmount).
    // If you want ledger to be source of truth, set collected = sum(payments.amount).
    const collectedFromInvoices = invoices.reduce((s, i) => s + (i.paidAmount || 0), 0);
    const collectedFromLedger = payments.reduce((s, p) => s + (p.amount || 0), 0);

    // ✅ choose one:
    const collected = collectedFromInvoices; // recommended (consistent with invoices UI)
    const pending = Math.max(0, billed - collected);

    return NextResponse.json({
      ok: true,
      retailer: { id: retailer.id, name: retailer.name, city: retailer.city ?? null, status: retailer.status ?? null },
      totals: { billed, collected, pending },
      invoices,
      payments,
      debug: {
        // optional: helps you verify mismatches quickly
        collectedFromInvoices,
        collectedFromLedger,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}