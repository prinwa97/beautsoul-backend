import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { lookupPincode, normalizePin, normText } from "@/lib/pincode";
import { cookies } from "next/headers";
import { apiHandler } from "@/lib/api-handler";
import { badRequest, conflict, forbidden, unauthorized } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- helpers ---------------- */

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
    const exists = await prisma.user.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!exists) return code;
  }

  return prefix + Date.now().toString().slice(-10);
}

function parseLegacySessionUser(raw: string | undefined) {
  if (!raw) return null;

  try {
    const txt =
      raw.startsWith("%7B") || raw.includes("%22")
        ? decodeURIComponent(raw)
        : raw;

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

export const POST = apiHandler(async function POST(request: Request) {
  const me: any = await getMe();

  if (!me || !me.id) {
    throw unauthorized("Unauthorized");
  }

  if (String(me.role || "").toUpperCase() !== "SALES_MANAGER") {
    throw forbidden("Forbidden");
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    throw badRequest("INVALID_JSON");
  }

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
    throw badRequest("distributorId, name and phone are required");
  }

  if (phoneNorm.length !== 10) {
    throw badRequest("Phone must be 10 digits");
  }

  if (!password || password.length < 6) {
    throw badRequest("Password required (min 6 characters)");
  }

  // ✅ distributor must belong to this sales manager
  const dist = await prisma.distributor.findFirst({
    where: { id: distributorId, salesManagerId: me.id },
    select: { id: true, name: true },
  });

  if (!dist) {
    throw forbidden("Invalid distributor (not under this sales manager)");
  }

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
  const existsUser = await prisma.user.findUnique({
    where: { phone: phoneNorm },
    select: { id: true },
  });

  if (existsUser) {
    throw conflict("User with this phone already exists");
  }

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
    select: {
      id: true,
      phone: true,
      code: true,
      distributorId: true,
    },
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
});