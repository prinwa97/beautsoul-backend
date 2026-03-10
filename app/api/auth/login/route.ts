import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { writeSession } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePhone(input: string) {
  const digits = String(input || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length > 10 && digits.startsWith("91")) return digits.slice(-10);
  if (digits.length === 10) return digits;
  return digits.slice(-10);
}

function upper(v: unknown) {
  return String(v ?? "").trim().toUpperCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));

    const rawPhone = String(body.phone || "").trim();
    const phone = normalizePhone(rawPhone);
    const password = String(body.password || "").trim();

    if (!phone || phone.length !== 10 || !password) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_INPUT",
          message: "Phone (10 digit) and password required",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phone },
          { phone: rawPhone },
          { phone: `+91${phone}` },
          { phone: `91${phone}` },
        ],
      },
      select: {
        id: true,
        role: true,
        phone: true,
        passwordHash: true,
        distributorId: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: "USER_NOT_FOUND",
          message: "User not found",
        },
        { status: 404 }
      );
    }

    const st = upper(user.status);
    if (st && st !== "ACTIVE") {
      return NextResponse.json(
        {
          ok: false,
          error: "ACCOUNT_INACTIVE",
          message: "Your account is inactive. Please contact admin.",
        },
        { status: 403 }
      );
    }

    if (!user.passwordHash || typeof user.passwordHash !== "string") {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_PASSWORD",
          message: "Invalid password",
        },
        { status: 401 }
      );
    }

    const passwordOk = await bcrypt.compare(password, user.passwordHash);
    if (!passwordOk) {
      return NextResponse.json(
        {
          ok: false,
          error: "INVALID_PASSWORD",
          message: "Invalid password",
        },
        { status: 401 }
      );
    }

    let retailerId: string | null = null;

    if (upper(user.role) === "RETAILER") {
      const retailer = await prisma.retailer.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      retailerId = retailer?.id ?? null;
    }

    const sessionUser = {
      id: user.id,
      role: String(user.role),
      distributorId: user.distributorId ?? null,
      retailerId,
    };

    await writeSession({
      userId: sessionUser.id,
      role: sessionUser.role,
      distributorId: sessionUser.distributorId,
      retailerId: sessionUser.retailerId,
    });

    return NextResponse.json({
      ok: true,
      user: sessionUser,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Login failed";

    return NextResponse.json(
      {
        ok: false,
        error: "SERVER_ERROR",
        message,
      },
      { status: 500 }
    );
  }
}