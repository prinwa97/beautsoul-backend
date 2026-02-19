import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

async function assertUnderSalesManager(meId: string, user: any) {
  const distributorId = user?.distributorId ? String(user.distributorId) : null;

  if (distributorId) {
    const ok = await prisma.distributor.findFirst({
      where: { id: distributorId, salesManagerId: meId } as any,
      select: { id: true },
    });
    return !!ok;
  }

  const r = await prisma.retailer.findFirst({
    where: { userId: user.id } as any,
    select: { distributorId: true },
  });
  if (!r?.distributorId) return false;

  const ok2 = await prisma.distributor.findFirst({
    where: { id: r.distributorId, salesManagerId: meId } as any,
    select: { id: true },
  });
  return !!ok2;
}

export async function POST(req: Request) {
  try {
    const me: any = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (String(me.role || "") !== "SALES_MANAGER") return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });

    const userId = cleanStr(body.userId);
    const newPassword = cleanStr(body.newPassword);

    if (!userId) return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ ok: false, error: "newPassword min 6 required" }, { status: 400 });
    }

    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, distributorId: true, phone: true, role: true, code: true, name: true },
    });
    if (!u) return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });

    const allowed = await assertUnderSalesManager(me.id, u);
    if (!allowed) return NextResponse.json({ ok: false, error: "NOT_ALLOWED" }, { status: 403 });

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return NextResponse.json({
      ok: true,
      userId: u.id,
      loginPhone: u.phone,
      code: u.code,
      role: u.role,
      name: u.name,
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "SERVER_ERROR", message: String(e?.message || e) }, { status: 500 });
  }
}
