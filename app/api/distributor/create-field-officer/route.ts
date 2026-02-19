import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizePhone(input: string) {
  const digits = String(input ?? "").replace(/\D/g, "");
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function generateCode(prefix: string) {
  const n = Math.floor(10000000 + Math.random() * 90000000);
  return prefix + n;
}

function clean(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : undefined;
}

function parsePincode(v: any): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 6) return null;

  return digits;
}

export async function POST(req: Request) {
  let distributorId: string;

  try {
    distributorId = await requireDistributorId();
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: "UNAUTHORIZED", message: String(e?.message || "Unauthorized") },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));

    const name = clean(body.name);
    const phone = normalizePhone(body.phone);
    const password = String(body.password ?? "").trim();

    if (!password || password.length < 6) {
      return NextResponse.json({ ok: false, error: "Password (min 6 chars) required" }, { status: 400 });
    }

    if (!name || !phone || phone.length !== 10) {
      return NextResponse.json({ ok: false, error: "Name and 10-digit Phone required" }, { status: 400 });
    }

    const pincode = parsePincode(body.pincode);
    if (body.pincode && !pincode) {
      return NextResponse.json({ ok: false, error: "Valid 6-digit pincode required" }, { status: 400 });
    }

    const exists = await prisma.user.findFirst({ where: { phone }, select: { id: true } });
    if (exists) {
      return NextResponse.json({ ok: false, error: "Phone already exists" }, { status: 409 });
    }

    // ✅ ALWAYS auto-generate FO code, ignore body.code
    const code = generateCode("FO");
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        code,
        name,
        phone,
        passwordHash,
        role: "FIELD_OFFICER",
        status: "ACTIVE",
        distributorId,

        city: clean(body.city),
        district: clean(body.district),
        state: clean(body.state),
        address: clean(body.address),

        pincode: pincode ?? null,
      },
      select: {
        id: true,
        code: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, fieldOfficer: user }, { status: 201 });
  } catch (e: any) {
    console.error("create-field-officer error:", e);

    if (e?.code === "P2002") {
      return NextResponse.json(
        { ok: false, error: "Unique constraint failed", meta: e?.meta },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { ok: false, error: e?.message || "Server error", code: e?.code, meta: e?.meta },
      { status: 500 }
    );
  }
}