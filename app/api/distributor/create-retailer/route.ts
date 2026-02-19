import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function normalizePhone(input: string) {
  const digits = String(input ?? "").replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) return digits.slice(-10);
  return digits.slice(-10);
}

function generateCode(prefix: string) {
  const n = Math.floor(10000000 + Math.random() * 90000000);
  return prefix + n;
}

function clean(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : undefined;
}

// ✅ pincode String? (schema) — validate 6 digits if provided
function parsePincode(v: any): string | null {
  const raw = String(v ?? "").trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 6) return null;
  return digits;
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (session.role !== "DISTRIBUTOR") {
      return NextResponse.json({ ok: false, error: "Only Distributor allowed" }, { status: 403 });
    }

    const distributorId = session.distributorId;
    if (!distributorId) {
      return NextResponse.json(
        { ok: false, error: "DistributorId missing in session. Re-login." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));

    const name = clean(body.name);
    const phone = normalizePhone(body.phone);
    const password = String(body.password || "").trim();

    const city = clean(body.city);
    const district = clean(body.district); // ✅ ADDED
    const state = clean(body.state);

    if (!password || password.length < 6) {
      return NextResponse.json({ ok: false, error: "Password (min 6 chars) required" }, { status: 400 });
    }

    // (same rule as your old code)
    if (!name || !phone || phone.length !== 10 || !city || !state) {
      return NextResponse.json({ ok: false, error: "Name, Phone, City, State required" }, { status: 400 });
    }

    // ✅ pincode validation (optional)
    const pincode = parsePincode(body.pincode);
    if (body.pincode && !pincode) {
      return NextResponse.json({ ok: false, error: "Valid 6-digit pincode required" }, { status: 400 });
    }

    // phone unique
    const exists = await prisma.user.findUnique({ where: { phone }, select: { id: true } });
    if (exists) return NextResponse.json({ ok: false, error: "Phone already exists" }, { status: 409 });

    // ✅ Retailer code suggestion: RTL
    const code = generateCode("RTL");
    const passwordHash = await bcrypt.hash(password, 10);

    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          code,
          name,
          phone,
          passwordHash,
          role: "RETAILER",
          status: "ACTIVE",
          distributorId, // staff link

          city,
          district, // ✅ ADDED (User)
          state,

          address: clean(body.address),

          // schema: String?
          pincode: pincode ?? null,
        },
        select: { id: true, code: true, name: true, phone: true, city: true, district: true, state: true },
      });

      const retailer = await tx.retailer.create({
        data: {
          userId: user.id,
          name,
          phone,
          gst: clean(body.gst),

          address: clean(body.address),
          city,
          district, // ✅ ADDED (Retailer)
          state,

          pincode: pincode ?? null,

          status: body.status === "ACTIVE" ? "ACTIVE" : "PENDING",
          distributorId, // ✅ MOST IMPORTANT
          createdByRole: "DISTRIBUTOR",
          createdById: session.id,
          activatedByDistributorId: distributorId,
          activatedAt: new Date(),
        },
        select: {
          id: true,
          userId: true,
          distributorId: true,
          name: true,
          phone: true,
          status: true,
          createdAt: true,
        },
      });

      return { user, retailer };
    });

    return NextResponse.json(
      { ok: true, retailerId: created.retailer.id, userId: created.user.id, retailer: created.retailer },
      { status: 201 }
    );
  } catch (e: any) {
    console.error("create-retailer error:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "Server error", code: e?.code, meta: e?.meta },
      { status: 500 }
    );
  }
}