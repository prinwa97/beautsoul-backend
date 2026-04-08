import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const me = await getSessionUser();

    if (!me || me.role !== "DISTRIBUTOR") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const distributorId = me.distributorId;
    if (!distributorId) {
      return NextResponse.json(
        { error: "DistributorId missing in session" },
        { status: 400 }
      );
    }

    // Retailers are in Retailer table
    const retailers = await prisma.retailer.findMany({
      where: { distributorId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        name: true,
        phone: true,
        gst: true,
        status: true,
        address: true,
        city: true,
        district: true,
        state: true,
        pincode: true,
        createdAt: true,
      },
    });

    // Field Officers are Users with role FIELD_OFFICER
    const fieldOfficers = await prisma.user.findMany({
      where: {
        role: "FIELD_OFFICER",
        distributorId,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        code: true,
        phone: true,
        status: true,
        address: true,
        city: true,
        district: true,
        state: true,
        pincode: true,
        createdAt: true,
      },
    });

    const retailersForUI = retailers.map((r) => ({
      type: "RETAILER",
      retailerId: r.id,
      userId: r.userId,
      name: r.name,
      phone: r.phone,
      gst: r.gst,
      status: r.status,
      address: r.address,
      city: r.city,
      district: r.district,
      state: r.state,
      pincode: r.pincode,
      createdAt: r.createdAt,
    }));

    const fieldOfficersForUI = fieldOfficers.map((u) => ({
      type: "FIELD_OFFICER",
      id: u.id,
      name: u.name,
      code: u.code,
      phone: u.phone,
      status: u.status,
      address: u.address,
      city: u.city,
      district: u.district,
      state: u.state,
      pincode: u.pincode,
      createdAt: u.createdAt,
    }));

    return NextResponse.json({
      distributorId,
      retailers: retailersForUI,
      fieldOfficers: fieldOfficersForUI,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}