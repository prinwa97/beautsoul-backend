// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/api/sales-manager/user/create-retailer/route.ts

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

  if (!me.id) {
    throw unauthorized("Session user id missing");
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
  const phoneNorm = normalizePhone(body.phone || "");
  const address = cleanStr(body.address);
  const gstValue = String(body.gstin ?? body.gst ?? "").trim();
  const password = cleanStr(body.password);

  const pincode = normalizePin(body.pincode ?? body.pin ?? "");

  let city = normText(body.city);
  let district = normText(body.district);
  let state = normText(body.state);

  if (!distributorId || !name || !phoneNorm) {
    throw badRequest("distributorId, name and phone are required");
  }

  if (!password || password.length < 6) {
    throw badRequest("Password required (min 6 characters)");
  }

  // ✅ distributor must belong to this sales manager
  const dist = await prisma.distributor.findFirst({
    where: { id: distributorId, salesManagerId: me.id } as any,
    select: { id: true },
  });

  if (!dist) {
    throw forbidden("Invalid distributor (not under this sales manager)");
  }

  // ✅ If pincode provided, auto-fill when missing
  if (pincode && (!city || !state || !district)) {
    const pinRes = await lookupPincode(pincode);
    if (pinRes.ok) {
      city = city || pinRes.city;
      district = district || pinRes.district;
      state = state || pinRes.state;
    }
  }

  // ✅ Require location: pincode OR manual city+state
  if ((!pincode || !city || !state) && (!city || !state)) {
    throw badRequest("Pincode required OR (city and state required)");
  }

  // ✅ phone unique in User table
  const existsUser = await prisma.user.findFirst({
    where: { phone: phoneNorm },
    select: { id: true },
  });

  if (existsUser) {
    throw conflict("User with this phone already exists");
  }

  const retailerCode = genCode("BSR");
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await prisma.$transaction(async (tx) => {
    // 1) Create USER
    const user = await tx.user.create({
      data: {
        code: retailerCode,
        name,
        phone: phoneNorm,
        passwordHash,
        role: "RETAILER",
        distributorId,
        city: city || null,
        district: district || null,
        state: state || null,
        address: address || null,
        pincode: pincode || null,
      } as any,
      select: {
        id: true,
        code: true,
        phone: true,
        name: true,
        distributorId: true,
        city: true,
        district: true,
        state: true,
        pincode: true,
        address: true,
      },
    });

    // 2) Create RETAILER
    const retailer = await tx.retailer.create({
      data: {
        userId: user.id,
        name,
        phone: phoneNorm,
        gst: gstValue || null,
        address: address || null,
        city: city || null,
        district: district || null,
        state: state || null,
        pincode: pincode || null,
        distributorId,
        createdByRole: me.role,
        createdById: me.id,
      } as any,
      select: {
        id: true,
        userId: true,
        distributorId: true,
        name: true,
        phone: true,
        gst: true,
        address: true,
        city: true,
        district: true,
        state: true,
        pincode: true,
        status: true,
        createdAt: true,
      },
    });

    return { user, retailer };
  });

  return NextResponse.json({
    ok: true,
    retailerId: result.retailer.id,
    userId: result.user.id,
    retailerCode: result.user.code,
    loginPhone: result.user.phone,
    retailer: result.retailer,
    user: result.user,
    auto: { pincode, city, district, state },
  });
});