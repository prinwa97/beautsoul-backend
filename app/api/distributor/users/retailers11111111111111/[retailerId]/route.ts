import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireDistributorId } from "@/lib/session";
import type { RetailerStatus } from "@prisma/client";

/**
 * PATCH /api/distributor/retailers/:retailerId
 * Body: { name?, phone?, gst?, address?, city?, state?, pincode?, status? }
 */
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ retailerId: string }> }
) {
  try {
    // ✅ SINGLE SOURCE OF TRUTH
    const distributorId = await requireDistributorId();

    // ✅ Next.js 16 fix
    const { retailerId } = await ctx.params;

    const body = await req.json().catch(() => ({}));

    // ✅ ensure retailer belongs to this distributor
    const r = await prisma.retailer.findFirst({
      where: { id: retailerId, distributorId },
      select: { id: true },
    });

    if (!r) {
      return NextResponse.json(
        { error: "Retailer not found" },
        { status: 404 }
      );
    }

    const data: any = {};
    if (typeof body.name === "string") data.name = body.name.trim();
    if (typeof body.phone === "string") data.phone = body.phone.trim();
    if (typeof body.gst === "string") data.gst = body.gst.trim();
    if (typeof body.address === "string") data.address = body.address.trim();
    if (typeof body.city === "string") data.city = body.city.trim();
    if (typeof body.state === "string") data.state = body.state.trim();
    if (typeof body.pincode === "string") data.pincode = body.pincode.trim();

    if (body.status === "ACTIVE" || body.status === "PENDING") {
      data.status = body.status as RetailerStatus;

      if (body.status === "ACTIVE") {
        data.activatedByDistributorId = distributorId;
        data.activatedAt = new Date();
      } else {
        data.activatedByDistributorId = null;
        data.activatedAt = null;
      }
    }

    const updated = await prisma.retailer.update({
      where: { id: retailerId },
      data,
    });

    return NextResponse.json(
      { ok: true, retailer: updated },
      { status: 200 }
    );
  } catch (e: any) {
    const msg = String(e?.message || e || "Unauthorized");
    const isAuth =
      msg.toLowerCase().includes("unauthor") ||
      msg.toLowerCase().includes("session") ||
      msg.toLowerCase().includes("distributor");

    return NextResponse.json(
      { ok: false, error: msg },
      { status: isAuth ? 401 : 500 }
    );
  }
}