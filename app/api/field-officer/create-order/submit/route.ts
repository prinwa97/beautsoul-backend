import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CreateItem = {
  productName: string;
  qty: number;
  rate: number;
  amount: number;
};

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status, headers: { "cache-control": "no-store" } });
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : "";
}

function asInt(v: any, def = 0) {
  const n = Math.floor(Number(v ?? def));
  return Number.isFinite(n) ? n : def;
}

function makeClientRequestHash(retailerId: string, items: Array<{ productName: string; qty: number; rate: number }>) {
  const norm = [...items]
    .map((x) => ({
      productName: cleanStr(x.productName),
      qty: asInt(x.qty),
      rate: Number(x.rate || 0),
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName));

  const payload = JSON.stringify({ retailerId: cleanStr(retailerId), items: norm });
  return crypto.createHash("sha256").update(payload).digest("hex");
}

function isPrismaUniqueError(e: any) {
  return e?.code === "P2002";
}

async function genOrderNo() {
  const y = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `FO-${y}-${rand}`;
}

export async function POST(req: Request) {
  let body: any = null;

  try {
    const u: any = await getSessionUser();
    if (!u) return jsonError("Unauthorized", 401);
    if (String(u.role || "").toUpperCase() !== "FIELD_OFFICER") return jsonError("Forbidden", 403);

    const distributorId = u.distributorId ? String(u.distributorId) : "";
    if (!distributorId) return jsonError("Missing distributorId in session", 400);

    body = await req.json().catch(() => null);
    if (!body) return jsonError("Invalid JSON body", 400);

    const retailerId = cleanStr(body.retailerId);

    // ✅ IMPORTANT: idempotencyKey must NEVER be null now (DB NOT NULL)
    let idempotencyKey = cleanStr(body.idempotencyKey);
    if (!idempotencyKey) {
      // fallback: server-generated (still unique)
      idempotencyKey = crypto.randomUUID();
    }

    const deviceId = cleanStr(body.deviceId) || null;
    const appVersion = cleanStr(body.appVersion) || null;

    const itemsRaw: any[] = Array.isArray(body.items) ? body.items : [];
    if (!retailerId) return jsonError("retailerId required", 400);
    if (!itemsRaw.length) return jsonError("items required", 400);

    const retailer = await prisma.retailer.findFirst({
      where: { id: retailerId, distributorId },
      select: { id: true },
    });
    if (!retailer) return jsonError("Retailer not found / not in your distributor", 404);

    const items: CreateItem[] = itemsRaw.map((it: any) => {
      const productName = cleanStr(it.productName);
      const qty = asInt(it.qty, 0);
      const rate = Number(it.rate ?? 0);
      return { productName, qty, rate, amount: qty * rate };
    });

    if (items.some((x: CreateItem) => !x.productName || x.qty <= 0 || !Number.isFinite(x.rate) || x.rate < 0)) {
      return jsonError("Invalid items (productName/qty/rate)", 400);
    }

    // ✅ FAST DEDUPE CHECK
    const existing = await prisma.order.findUnique({
      where: { idempotencyKey },
      select: { id: true, orderNo: true },
    });

    if (existing) {
      return NextResponse.json(
        { ok: true, deduped: true, orderId: existing.id, orderNo: existing.orderNo },
        { headers: { "cache-control": "no-store" } }
      );
    }

    const clientRequestHash = makeClientRequestHash(retailerId, items);

    // ✅ CREATE ORDER (transaction safe)
    const created = await prisma.$transaction(async (tx) => {
      const orderNo = await genOrderNo();
      const totalAmount = items.reduce((s, x) => s + x.amount, 0);

      return tx.order.create({
        data: {
          orderNo,
          distributorId,
          retailerId,
          status: "SUBMITTED",
          totalAmount,
          paidAmount: 0,

          idempotencyKey, // ✅ NOT NULL safe
          clientRequestHash,
          deviceId,
          appVersion,
          requestReceivedAt: new Date(),

          items: {
            create: items.map((x) => ({
              productName: x.productName,
              qty: x.qty,
              rate: x.rate,
              amount: x.amount,
            })),
          },
        },
        select: { id: true, orderNo: true },
      });
    });

    return NextResponse.json(
      { ok: true, deduped: false, orderId: created.id, orderNo: created.orderNo },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e: any) {
    // ✅ UNIQUE CONSTRAINT RECOVERY (idempotencyKey already created by another tap)
    if (isPrismaUniqueError(e)) {
      const key = cleanStr(body?.idempotencyKey);
      if (key) {
        const existing = await prisma.order.findUnique({
          where: { idempotencyKey: key },
          select: { id: true, orderNo: true },
        });
        if (existing) {
          return NextResponse.json(
            { ok: true, deduped: true, orderId: existing.id, orderNo: existing.orderNo },
            { headers: { "cache-control": "no-store" } }
          );
        }
      }
    }

    console.error("FO create-order submit error:", e);
    return jsonError(e?.message || "Server error", 500);
  }
}
