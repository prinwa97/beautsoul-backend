import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { lookupPincode, normalizePin, normText } from "@/lib/pincode";

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

export async function POST(request: Request) {
  try {
    const me: any = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (!me.id) return NextResponse.json({ ok: false, error: "Session user id missing" }, { status: 401 });
    if (me.role !== "SALES_MANAGER") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });

    const distributorId = cleanStr(body.distributorId);
    const name = cleanStr(body.name);
    const phoneNorm = normalizePhone(body.phone || "");
    const address = cleanStr(body.address);
    const gstValue = (body.gstin ?? body.gst ?? "").toString().trim(); // optional
    const password = cleanStr(body.password);

    const pincode = normalizePin(body.pincode ?? body.pin ?? "");

    let city = normText(body.city);
    let district = normText(body.district);
    let state = normText(body.state);

    if (!distributorId || !name || !phoneNorm) {
      return NextResponse.json(
        { ok: false, error: "distributorId, name and phone are required" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ ok: false, error: "Password required (min 6 characters)" }, { status: 400 });
    }

    // ✅ distributor must belong to this sales manager
    const dist = await prisma.distributor.findFirst({
      where: { id: distributorId, salesManagerId: me.id } as any,
      select: { id: true },
    });
    if (!dist) {
      return NextResponse.json(
        { ok: false, error: "Invalid distributor (not under this sales manager)" },
        { status: 403 }
      );
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
      return NextResponse.json(
        { ok: false, error: "Pincode required OR (city and state required)" },
        { status: 400 }
      );
    }

    // ✅ phone unique in User table
    const existsUser = await prisma.user.findFirst({ where: { phone: phoneNorm }, select: { id: true } });
    if (existsUser) {
      return NextResponse.json({ ok: false, error: "User with this phone already exists" }, { status: 409 });
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
        select: { id: true, phone: true, code: true },
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
        select: { id: true },
      });

      return { retailerId: retailer.id, retailerCode: user.code, userId: user.id, loginPhone: user.phone };
    });

    return NextResponse.json({ ok: true, ...result, auto: { pincode, city, district, state } });
  } catch (e: any) {
    if (String(e?.code) === "P2002") {
      return NextResponse.json({ ok: false, error: "DUPLICATE", message: "Duplicate unique value" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
