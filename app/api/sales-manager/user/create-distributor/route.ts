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
    if (me.role !== "SALES_MANAGER") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });

    const name = cleanStr(body.name);
    const phone = cleanStr(body.phone);
    const password = cleanStr(body.password);

    const gstValue = (body.gstin ?? body.gst ?? "").toString().trim();
    const pincode = normalizePin(body.pincode ?? body.pin ?? "");

    // ✅ Optional manual inputs (will auto-fill if pincode present)
    let city = normText(body.city);
    let district = normText(body.district);
    let state = normText(body.state);

    if (!name || !phone) {
      return NextResponse.json({ ok: false, error: "Name and phone are required" }, { status: 400 });
    }

    if (!gstValue) {
      return NextResponse.json({ ok: false, error: "GST is required" }, { status: 400 });
    }

    if (!password || String(password).trim().length < 6) {
      return NextResponse.json({ ok: false, error: "Password required (min 6 characters)" }, { status: 400 });
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
      return NextResponse.json(
        { ok: false, error: "Pincode required OR (city and state required)" },
        { status: 400 }
      );
    }

    const phoneNorm = normalizePhone(phone);
    const cleanName = String(name).trim();

    // ✅ Existing user check (unique phone)
    const exists = await prisma.user.findFirst({ where: { phone: phoneNorm }, select: { id: true } });
    if (exists) {
      return NextResponse.json({ ok: false, error: "User with this phone already exists" }, { status: 409 });
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

      return { distributorId: distributor.id, userId: user.id, loginPhone: user.phone, distributorCode: user.code };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e: any) {
    // ✅ handle unique constraint (P2002)
    if (String(e?.code) === "P2002") {
      return NextResponse.json({ ok: false, error: "DUPLICATE", message: "Duplicate unique value" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}
