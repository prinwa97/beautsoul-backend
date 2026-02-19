import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session/guards";
import type { UserStatus } from "@prisma/client";

/**
 * PATCH /api/distributor/field-officers/:foId
 * Body: { name?, phone?, city?, state?, status? ("ACTIVE"|"INACTIVE") }
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ foId: string }> }
) {
  const me = await requireRole(["DISTRIBUTOR"]);

  if (me.role !== "DISTRIBUTOR") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ✅ Next.js 16 fix
  const { foId } = await ctx.params;

  const body = await req.json().catch(() => ({}));

  // FO must belong to same distributor
  const fo = await prisma.user.findFirst({
    where: {
      id: foId,
      role: "FIELD_OFFICER",
      distributorId: me.distributorId,
    },
    select: { id: true },
  });

  if (!fo) {
    return NextResponse.json(
      { error: "Field Officer not found" },
      { status: 404 }
    );
  }

  const data: any = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.phone === "string") data.phone = body.phone.trim();
  if (typeof body.city === "string") data.city = body.city.trim();
  if (typeof body.state === "string") data.state = body.state.trim();

  if (body.status === "ACTIVE" || body.status === "INACTIVE") {
    data.status = body.status as UserStatus;
  }

  const updated = await prisma.user.update({
    where: { id: foId },
    data,
  });

  return NextResponse.json({ ok: true, fieldOfficer: updated });
}