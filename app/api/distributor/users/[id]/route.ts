import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function cleanString(v: unknown) {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s === "" ? null : s;
}

// ✅ Next.js 15+ params Promise
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id?: string }> }
) {
  try {
    const me = await getSessionUser();

    if (!me || me.role !== "DISTRIBUTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const distributorId = me.distributorId;
    if (!distributorId) {
      return NextResponse.json(
        { error: "DistributorId missing in session. Re-login." },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const type = body?.type;

    const { id } = await ctx.params;
    const targetId: string | undefined = id || body?.id;

    if (!targetId) {
      return NextResponse.json({ error: "ID missing" }, { status: 400 });
    }

    // ---------- RETAILER ----------
    if (type === "RETAILER") {
      const retailer = await prisma.retailer.findFirst({
        where: { id: targetId, distributorId },
        select: { id: true, userId: true },
      });

      if (!retailer) {
        return NextResponse.json(
          { error: `Retailer not found for this distributor. Got id: ${targetId}` },
          { status: 404 }
        );
      }

      const updated = await prisma.retailer.update({
        where: { id: retailer.id },
        data: {
          name: cleanString(body.name) ?? undefined,
          phone: cleanString(body.phone) ?? undefined,
          gst: cleanString(body.gst) ?? undefined,
          address: cleanString(body.address) ?? undefined,
          city: cleanString(body.city) ?? undefined,
          district: cleanString(body.district) ?? undefined,
          state: cleanString(body.state) ?? undefined,
          pincode: cleanString(body.pincode) ?? undefined,
          status: body.status ?? undefined,
        },
        select: {
          id: true,
          userId: true,
          name: true,
          phone: true,
          gst: true,
          address: true,
          city: true,
          district: true,
          state: true,
          pincode: true,
          status: true,
        },
      });

      // optional sync with user table
      await prisma.user.update({
        where: { id: updated.userId },
        data: {
          name: cleanString(body.name) ?? undefined,
          phone: cleanString(body.phone) ?? undefined,
          address: cleanString(body.address) ?? undefined,
          city: cleanString(body.city) ?? undefined,
          district: cleanString(body.district) ?? undefined,
          state: cleanString(body.state) ?? undefined,
          pincode: cleanString(body.pincode) ?? undefined,
        },
      });

      return NextResponse.json({ ok: true, updated });
    }

    // ---------- FIELD OFFICER ----------
    if (type === "FIELD_OFFICER") {
      const fo = await prisma.user.findFirst({
        where: { id: targetId, role: "FIELD_OFFICER", distributorId },
        select: { id: true },
      });

      if (!fo) {
        return NextResponse.json(
          { error: "Field officer not found" },
          { status: 404 }
        );
      }

      const updated = await prisma.user.update({
        where: { id: targetId },
        data: {
          name: cleanString(body.name) ?? undefined,
          code: cleanString(body.code) ?? undefined,
          phone: cleanString(body.phone) ?? undefined,
          address: cleanString(body.address) ?? undefined,
          city: cleanString(body.city) ?? undefined,
          district: cleanString(body.district) ?? undefined,
          state: cleanString(body.state) ?? undefined,
          pincode: cleanString(body.pincode) ?? undefined,
          status: body.status ?? undefined,
        },
        select: {
          id: true,
          name: true,
          code: true,
          phone: true,
          address: true,
          city: true,
          district: true,
          state: true,
          pincode: true,
          status: true,
        },
      });

      return NextResponse.json({ ok: true, updated });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  } catch (e: any) {
    console.error("PATCH /api/distributor/users/[id] error:", e);
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}