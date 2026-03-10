import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { lookupPincode, normalizePin, normText } from "@/lib/pincode";
import { apiHandler } from "@/lib/api-handler";
import { badRequest, conflict, forbidden, unauthorized } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePhone(input: string) {
  const digits = (input || "").replace(/\D/g, "");
  return digits.length === 10 ? digits : digits.slice(-10);
}

function genCode(prefix: string) {
  return (
    prefix +
    Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, "0")
  );
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim().replace(/\s+/g, " ");
  return s.length ? s : null;
}

export const POST = apiHandler(async function POST(request: Request) {
  const me: any = await getSessionUser();

  if (!me) {
    throw unauthorized("Unauthorized");
  }

  if (String(me.role || "").toUpperCase() !== "SALES_MANAGER") {
    throw forbidden("Forbidden");
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    throw badRequest("INVALID_JSON");
  }

  const name = cleanStr(body.name);
  const phone = cleanStr(body.phone);
  const password = cleanStr(body.password);

  const gstValue = String(body.gstin ?? body.gst ?? "").trim();
  const pincode = normalizePin(body.pincode ?? body.pin ?? "");

  // ✅ Optional manual inputs (will auto-fill if pincode present)
  let city = normText(body.city);
  let district = normText(body.district);
  let state = normText(body.state);

  if (!name || !phone) {
    throw badRequest("Name and phone are required");
  }

  if (!gstValue) {
    throw badRequest("GST is required");
  }

  if (!password || String(password).trim().length < 6) {
    throw badRequest("Password required (min 6 characters)");
  }

  // ✅ If pincode provided, auto-fill city/district/state when missing
  if (pincode && (!city || !state || !district)) {
    const pinRes = await lookupPincode(pincode);
    if (pinRes.ok) {
      city = city || pinRes.city;
      district = district || pinRes.district;
      state = state || pinRes.state;
    }
  }

  // ✅ Enforce location after auto-fill attempt
  if (!city || !state) {
    throw badRequest("Pincode required OR (city and state required)");
  }

  const phoneNorm = normalizePhone(phone);
  const cleanName = String(name).trim();

  // ✅ Existing user check (unique phone)
  const exists = await prisma.user.findFirst({
    where: { phone: phoneNorm },
    select: { id: true },
  });

  if (exists) {
    throw conflict("User with this phone already exists");
  }

  const distributorCode = genCode("BSD");
  const passwordHash = await bcrypt.hash(String(password).trim(), 10);

  // ✅ Create distributor + user in transaction
  const result = await prisma.$transaction(async (tx) => {
    const distributor = await tx.distributor.create({
      data: {
        name: cleanName,
        phone: phoneNorm,
        city,
        district: district || null,
        state,
        pincode: pincode || null,
        code: distributorCode,
        gst: gstValue,
        salesManagerId: me.id,
      } as any,
      select: { id: true },
    });

    const user = await tx.user.create({
      data: {
        name: cleanName,
        phone: phoneNorm,
        role: "DISTRIBUTOR",
        code: distributorCode,
        distributorId: distributor.id,
        passwordHash,
        city: city || null,
        district: district || null,
        state: state || null,
        pincode: pincode || null,
      } as any,
      select: { id: true, phone: true, code: true },
    });

    await tx.distributor.update({
      where: { id: distributor.id },
      data: { userId: user.id },
    });

    return {
      distributorId: distributor.id,
      userId: user.id,
      loginPhone: user.phone,
      distributorCode: user.code,
    };
  });

  return NextResponse.json({
    ok: true,
    ...result,
  });
});