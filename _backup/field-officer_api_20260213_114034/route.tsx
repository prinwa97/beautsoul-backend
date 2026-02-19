import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getSessionUser() {
  const raw = cookies().get("session_user")?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const session = getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized (no session)" }, { status: 401 });
    }

    // ✅ FO / Distributor dono case handle
    const distributorId = session.distributorId || session?.distributor?.id || null;

    if (!distributorId) {
      return NextResponse.json(
        { error: "DistributorId missing (login/session issue)." },
        { status: 400 }
      );
    }

    const retailers = await prisma.retailer.findMany({
      where: {
        distributorId,
        // ✅ agar tumhare schema me isActive / isEnabled etc hai to uncomment:
        // isActive: true,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        city: true,
        phone: true,
        // isActive: true,
      },
    });

    // Dropdown ko simple shape do
    return NextResponse.json(
      retailers.map((r) => ({ id: r.id, name: r.name })),
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500 }
    );
  }
}
