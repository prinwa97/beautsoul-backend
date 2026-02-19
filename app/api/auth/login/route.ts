// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { writeSession } from "@/lib/session";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizePhone(input: string) {
  const digits = (input || "").replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) return digits.slice(-10);
  return digits.length === 10 ? digits : digits.slice(-10);
}

function upper(v: any) {
  return String(v ?? "").toUpperCase();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const phone = normalizePhone(body.phone);
    const password = String(body.password || "").trim();

    if (!phone || phone.length !== 10 || !password) {
      return NextResponse.json(
        { ok: false, error: "INVALID_INPUT", message: "Phone (10 digit) and password required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        role: true,
        passwordHash: true,
        distributorId: true,
        status: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "USER_NOT_FOUND", message: "User not found" },
        { status: 404 }
      );
    }

    // ✅ HARD BLOCK inactive users
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

    // ✅ passwordHash missing => treat as invalid
    if (!user.passwordHash) {
      return NextResponse.json(
        { ok: false, error: "INVALID_PASSWORD", message: "Invalid password" },
        { status: 401 }
      );
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { ok: false, error: "INVALID_PASSWORD", message: "Invalid password" },
        { status: 401 }
      );
    }

    // retailerId (only for RETAILER)
    let retailerId: string | null = null;
    if (upper(user.role) === "RETAILER") {
      const r = await prisma.retailer.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      retailerId = r?.id ?? null;
    }

    const sessionUser = {
      id: user.id,
      role: user.role,
      distributorId: user.distributorId ?? null,
      retailerId,
    };

    // ✅ Signed cookie (recommended)
    await writeSession({
      userId: sessionUser.id,
      role: sessionUser.role,
      distributorId: sessionUser.distributorId,
      retailerId: sessionUser.retailerId,
    } as any);

    // ✅ Legacy cookie for routes that still read session_user
    const cookieStore = await cookies();
    cookieStore.set("session_user", JSON.stringify(sessionUser), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/", // ✅ MOST IMPORTANT
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({ ok: true, user: sessionUser });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Login failed";
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: msg },
      { status: 500 }
    );
  }
}