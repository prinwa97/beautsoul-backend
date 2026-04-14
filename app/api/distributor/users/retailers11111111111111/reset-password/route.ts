import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { requireRole } from "@/lib/session/guards";

/**
 * POST /api/distributor/retailers/reset-password
 * Body: { retailerId: string }
 * Returns: { tempPassword }
 */
export async function POST(req: Request) {
  const me = await requireRole(["DISTRIBUTOR"]);
  if (me.role !== "DISTRIBUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const retailerId = String(body.retailerId || "").trim();

  if (!retailerId) {
    return NextResponse.json({ error: "retailerId required" }, { status: 400 });
  }

  const retailer = await prisma.retailer.findFirst({
    where: { id: retailerId, distributorId: me.distributorId },
    select: { userId: true },
  });

  if (!retailer) {
    return NextResponse.json({ error: "Retailer not found" }, { status: 404 });
  }

  const tempPassword = `BS@${Math.floor(100000 + Math.random() * 900000)}`;
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.user.update({
    where: { id: retailer.userId },
    data: { passwordHash },
  });

  return NextResponse.json({ ok: true, tempPassword });
}
