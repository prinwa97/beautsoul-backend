import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWarehouse } from "@/lib/warehouse/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toInt(v: string | null, def: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : def;
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function parseDate(v: any) {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function statusFromAuth(auth: any) {
  const s = Number(auth?.status);
  return Number.isFinite(s) && s >= 100 ? s : 401;
}

function forbidden() {
  return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
}

function isAllowedRole(role: any) {
  return role === "WAREHOUSE_MANAGER" || role === "ADMIN";
}

/**
 * ✅ GET = list company stock lots
 * URL: /api/warehouse/stock-in?take=200
 */
export async function GET(req: Request) {
  const auth = await requireWarehouse(); // ✅ no args (fixes TS)
  if (!auth?.ok) {
    return NextResponse.json(
      { ok: false, error: auth?.error || "UNAUTHORIZED" },
      { status: statusFromAuth(auth) }
    );
  }

  // ✅ role gate (WAREHOUSE_MANAGER / ADMIN)
  if (!isAllowedRole((auth as any).role)) return forbidden();

  const url = new URL(req.url);
  const take = Math.min(Math.max(toInt(url.searchParams.get("take"), 200), 1), 500);

  try {
    const items = await prisma.stockLot.findMany({
      where: { ownerType: "COMPANY", ownerId: null },
      orderBy: { createdAt: "desc" },
      take,
    });

    return NextResponse.json({ ok: true, items, take });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: String(e?.message || "Server error") },
      { status: 500 }
    );
  }
}

/**
 * ✅ POST = add new batch (every time NEW batchNo)
 * URL: /api/warehouse/stock-in
 */
export async function POST(req: Request) {
  const auth = await requireWarehouse(); // ✅ no args (fixes TS)
  if (!auth?.ok) {
    return NextResponse.json(
      { ok: false, error: auth?.error || "UNAUTHORIZED" },
      { status: statusFromAuth(auth) }
    );
  }

  // ✅ role gate (WAREHOUSE_MANAGER / ADMIN)
  if (!isAllowedRole((auth as any).role)) return forbidden();

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const productName = cleanStr(body.productName);
    const batchNo = cleanStr(body.batchNo);

    const qtyNum = Number(body.qty ?? 0);
    const qty = Number.isFinite(qtyNum) ? Math.floor(qtyNum) : 0;

    const mfgDate = parseDate(body.mfgDate);
    const expDate = parseDate(body.expDate);

    if (!productName) return NextResponse.json({ ok: false, error: "productName required" }, { status: 400 });
    if (!batchNo) return NextResponse.json({ ok: false, error: "batchNo required" }, { status: 400 });
    if (!expDate) return NextResponse.json({ ok: false, error: "Invalid expDate" }, { status: 400 });
    if (qty <= 0) return NextResponse.json({ ok: false, error: "qty must be > 0" }, { status: 400 });

    // optional: expDate must be after mfgDate if both exist
    if (mfgDate && expDate.getTime() <= mfgDate.getTime()) {
      return NextResponse.json({ ok: false, error: "expDate must be after mfgDate" }, { status: 400 });
    }

    const row = await prisma.stockLot.create({
      data: {
        ownerType: "COMPANY",
        ownerId: null,
        productName,
        batchNo,
        mfgDate,
        expDate,
        qtyOnHandPcs: qty,
      },
    });

    return NextResponse.json({ ok: true, stock: row }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || "");

    if (msg.includes("P2002") || msg.toLowerCase().includes("unique")) {
      return NextResponse.json(
        { ok: false, error: "Batch No already exists. New batch number use karo." },
        { status: 409 }
      );
    }

    return NextResponse.json({ ok: false, error: msg || "Server error" }, { status: 500 });
  }
}

/**
 * ✅ PATCH = FIX wrong productName for an existing lot
 * URL: /api/warehouse/stock-in
 * Body: { id: "...", productName: "Correct Name" }
 */
export async function PATCH(req: Request) {
  const auth = await requireWarehouse();
  if (!auth?.ok) {
    return NextResponse.json(
      { ok: false, error: auth?.error || "UNAUTHORIZED" },
      { status: statusFromAuth(auth) }
    );
  }

  if (!isAllowedRole((auth as any).role)) return forbidden();

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const id = cleanStr(body.id);
    const productName = cleanStr(body.productName);

    if (!id) return NextResponse.json({ ok: false, error: "id required" }, { status: 400 });
    if (!productName) return NextResponse.json({ ok: false, error: "productName required" }, { status: 400 });

    // Optional safety: ensure lot exists
    const exists = await prisma.stockLot.findUnique({ where: { id }, select: { id: true } });
    if (!exists) return NextResponse.json({ ok: false, error: "Stock lot not found" }, { status: 404 });

    const row = await prisma.stockLot.update({
      where: { id },
      data: { productName },
    });

    return NextResponse.json({ ok: true, stock: row }, { status: 200 });
  } catch (e: any) {
    const msg = String(e?.message || "");
    return NextResponse.json({ ok: false, error: msg || "Server error" }, { status: 500 });
  }
}
