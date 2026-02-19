import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { lookupPincode, normalizePin, normText } from "@/lib/pincode";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- helpers ---------------- */

function jsonError(error: string, status = 400, extra?: any) {
  return NextResponse.json({ ok: false, error, ...(extra || {}) }, { status });
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim().replace(/\s+/g, " ");
  return s.length ? s : null;
}

function normalizePhone(input: string) {
  const digits = String(input || "").replace(/\D/g, "");
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  return last10;
}

function genCode(prefix: string) {
  return (
    prefix +
    Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, "0")
  );
}

async function createUniqueUserCode(prefix: string, tries = 7) {
  for (let i = 0; i < tries; i++) {
    const code = genCode(prefix);
    const exists = await prisma.user.findUnique({ where: { code }, select: { id: true } });
    if (!exists) return code;
  }
  return prefix + Date.now().toString().slice(-10);
}

function parseLegacySessionUser(raw: string | undefined) {
  if (!raw) return null;
  try {
    // legacy cookie is JSON, sometimes urlencoded
    const txt = raw.startsWith("%7B") || raw.includes("%22") ? decodeURIComponent(raw) : raw;
    const obj = JSON.parse(txt);
    if (!obj?.id || !obj?.role) return null;
    return {
      id: String(obj.id),
      role: String(obj.role),
      distributorId: obj.distributorId ? String(obj.distributorId) : null,
      retailerId: obj.retailerId ? String(obj.retailerId) : null,
    };
  } catch {
    return null;
  }
}

async function getMe() {
  // 1) primary session helper
  const me: any = await getSessionUser().catch(() => null);
  if (me?.id) return me;

  // 2) fallback legacy cookie
  const cookieStore = await cookies();
  const legacy = cookieStore.get("session_user")?.value;
  const parsed = parseLegacySessionUser(legacy);
  return parsed;
}

/* ---------------- route ---------------- */

export async function POST(request: Request) {
  try {
    const me: any = await getMe();
    if (!me || !me.id) return jsonError("Unauthorized", 401);
    if (me.role !== "SALES_MANAGER") return jsonError("Forbidden", 403);

    const body = await request.json().catch(() => null);
    if (!body) return jsonError("INVALID_JSON", 400);

    const distributorId = cleanStr(body.distributorId);
    const name = cleanStr(body.name);
    const address = cleanStr(body.address);

    const phoneNorm = normalizePhone(body.phone || "");
    const pincode = normalizePin(body.pincode ?? body.pin ?? "");

    let city = normText(body.city);
    let district = normText(body.district);
    let state = normText(body.state);

    const password = cleanStr(body.password);

    if (!distributorId || !name || !phoneNorm) {
      return jsonError("distributorId, name and phone are required", 400);
    }
    if (phoneNorm.length !== 10) return jsonError("Phone must be 10 digits", 400);
    if (!password || password.length < 6) return jsonError("Password required (min 6 characters)", 400);

    // ✅ distributor must belong to this sales manager
    const dist = await prisma.distributor.findFirst({
      where: { id: distributorId, salesManagerId: me.id },
      select: { id: true, name: true },
    });
    if (!dist) return jsonError("Invalid distributor (not under this sales manager)", 403);

    // ✅ If pincode provided, auto-fill missing city/district/state
    if (pincode && (!city || !state || !district)) {
      const pinRes = await lookupPincode(pincode);
      if (pinRes.ok) {
        city = city || pinRes.city;
        district = district || pinRes.district;
        state = state || pinRes.state;
      }
    }

    // ✅ phone must be unique
    const existsUser = await prisma.user.findUnique({ where: { phone: phoneNorm }, select: { id: true } });
    if (existsUser) return jsonError("User with this phone already exists", 409);

    const fieldOfficerCode = await createUniqueUserCode("BSF", 7);
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        code: fieldOfficerCode,
        name,
        phone: phoneNorm,
        passwordHash,
        role: "FIELD_OFFICER",
        status: "ACTIVE",
        distributorId,
        city: city || null,
        district: district || null,
        state: state || null,
        address: address || null,
        pincode: pincode || null,
      },
      select: { id: true, phone: true, code: true, distributorId: true },
    });

    return NextResponse.json({
      ok: true,
      fieldOfficer: {
        id: user.id,
        code: user.code,
        phone: user.phone,
        distributorId: user.distributorId,
      },
      auto: { pincode, city, district, state },
    });
  } catch (e: any) {
    if (String(e?.code) === "P2002") {
      const target = (e?.meta?.target || []) as string[] | string;
      const t = Array.isArray(target) ? target.join(",") : String(target || "");
      const msg =
        t.includes("phone") ? "User with this phone already exists" :
        t.includes("code") ? "Generated code duplicate, try again" :
        "Duplicate unique value";
      return jsonError("DUPLICATE", 409, { message: msg, target: t || undefined });
    }
    console.error("create-field-officer error:", e);
    return jsonError(e?.message || "Server error", 500);
  }
}