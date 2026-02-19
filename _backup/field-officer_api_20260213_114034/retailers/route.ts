import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asInt(v: any, def = 200) {
  const n = Math.floor(Number(v ?? def));
  return Number.isFinite(n) && n > 0 ? Math.min(n, 500) : def;
}

async function requireFieldOfficer() {
  const u: any = await getSessionUser();
  if (!u) return { ok: false as const, status: 401 as const, error: "Unauthorized" };
  const role = String(u.role || "").toUpperCase();
  if (role !== "FIELD_OFFICER") return { ok: false as const, status: 403 as const, error: "Only Field Officer allowed" };
  return { ok: true as const, user: u };
}

// GET /api/field-officer/collections/retailers?take=200
export async function GET(req: Request) {
  try {
    const auth = await requireFieldOfficer();
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const take = asInt(searchParams.get("take"), 200);

    /**
     * ✅ NOTE:
     * Pending amount invoice-wise ya total-wise aapke schema par depend karta hai.
     * Abhi: Retailer list basic + pendingAmount = 0 (ledger page se true pending nikalna best).
     * Aap ledger API set kar rahe ho, wahan final pending compute kar lena.
     */
    const retailers = await prisma.retailer.findMany({
      take,
      orderBy: { createdAt: "desc" as any },
      select: {
        id: true,
        name: true,
        city: true,
        status: true,
      },
    });

    const rows = retailers.map((r) => ({
      retailerId: r.id,
      name: r.name,
      city: r.city ?? null,
      status: (r as any).status ?? null,
      pendingAmount: 0,
      invoiceCount: 0,
      lastInvoiceAt: null,
    }));

    return NextResponse.json({ ok: true, retailers: rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
