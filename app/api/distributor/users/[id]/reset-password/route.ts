import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

function cleanPassword(v: string) {
  return (v || "").trim();
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const me = await getSessionUser();
    if (!me || me.role !== "DISTRIBUTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const distributor = await prisma.distributor.findFirst({
      where: { userId: me.id },
      select: { id: true },
    });

    if (!distributor?.id) {
      return NextResponse.json(
        { error: "Distributor profile not found" },
        { status: 404 }
      );
    }

    // ✅ Next.js 16 fix
    const { id } = await ctx.params;

    const body = await req.json();
    const type: "RETAILER" | "FIELD_OFFICER" = body.type;
    const newPassword = cleanPassword(body.newPassword);

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    if (type === "FIELD_OFFICER") {
      const fo = await prisma.user.findFirst({
        where: {
          id,
          role: "FIELD_OFFICER",
          distributorId: distributor.id,
        },
        select: { id: true },
      });

      if (!fo) {
        return NextResponse.json(
          { error: "Field officer not found" },
          { status: 404 }
        );
      }

      await prisma.user.update({
        where: { id },
        data: { passwordHash },
      });

      return NextResponse.json({ ok: true });
    }

    if (type === "RETAILER") {
      const r = await prisma.retailer.findFirst({
        where: { id, distributorId: distributor.id },
        select: { id: true, userId: true },
      });

      if (!r?.userId) {
        return NextResponse.json(
          { error: "Retailer user not found" },
          { status: 404 }
        );
      }

      await prisma.user.update({
        where: { id: r.userId },
        data: { passwordHash },
      });

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}