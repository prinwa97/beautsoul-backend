// app/api/sales-manager/user/users/list/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

export async function GET(req: Request) {
  try {
    const me: any = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (String(me.role || "") !== "SALES_MANAGER") {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const role = String(searchParams.get("role") || "ALL").toUpperCase(); // ALL | RETAILER | DISTRIBUTOR | FIELD_OFFICER
    const q = cleanStr(searchParams.get("q"))?.toLowerCase() || null;
    const take = Math.min(500, Math.max(10, Number(searchParams.get("take") || 200)));

    // ✅ distributors under this sales manager
    const dists = await prisma.distributor.findMany({
      where: { salesManagerId: me.id } as any,
      select: {
        id: true,
        name: true,
        code: true,
        city: true,
        state: true,
        status: true,
        createdAt: true,
        userId: true,
      },
      orderBy: { createdAt: "desc" },
      take: 2000,
    });

    const distIds = dists.map((d) => d.id);
    const distById = new Map(dists.map((d) => [d.id, d]));

    // helper filter
    const matches = (row: any) => {
      if (!q) return true;
      const blob = [
        row?.name,
        row?.phone,
        row?.code,
        row?.role,
        row?.status,
        row?.city,
        row?.state,
        // ❌ district removed (schema me nahi hai to TS error aata hai)
        row?.pincode,
        row?.address,
        row?.distributor?.name,
        row?.distributor?.code,
        row?.distributor?.city,
        row?.distributor?.state,
        row?.retailerId,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    };

    const out: any[] = [];

    // ✅ DISTRIBUTORS (User + Distributor)
    if (role === "ALL" || role === "DISTRIBUTOR") {
      const distUsers = await prisma.user.findMany({
        where: {
          role: "DISTRIBUTOR",
          distributorId: { in: distIds },
        } as any,
        select: {
          id: true,
          code: true,
          name: true,
          phone: true,
          status: true,
          city: true,
          // district may or may not exist on User; remove if your User model doesn't have it
          district: true as any,
          state: true,
          pincode: true,
          address: true,
          distributorId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 2000,
      });

      for (const u of distUsers as any[]) {
        const d = u.distributorId ? distById.get(u.distributorId) : null;

        const row = {
          id: u.id,
          role: "DISTRIBUTOR",
          name: u.name,
          phone: u.phone,
          code: u.code,
          status: u.status,
          city: u.city,
          district: u.district ?? null,
          state: u.state,
          pincode: u.pincode,
          address: u.address,
          createdAt: u.createdAt,
          distributor: d
            ? { id: d.id, name: d.name, code: d.code, city: d.city, state: d.state, status: d.status }
            : null,
        };

        if (matches(row)) out.push(row);
      }
    }

    // ✅ FIELD OFFICERS (User + Distributor)
    if (role === "ALL" || role === "FIELD_OFFICER") {
      const foUsers = await prisma.user.findMany({
        where: {
          role: "FIELD_OFFICER",
          distributorId: { in: distIds },
        } as any,
        select: {
          id: true,
          code: true,
          name: true,
          phone: true,
          status: true,
          city: true,
          district: true as any,
          state: true,
          pincode: true,
          address: true,
          distributorId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
      });

      for (const u of foUsers as any[]) {
        const d = u.distributorId ? distById.get(u.distributorId) : null;

        const row = {
          id: u.id,
          role: "FIELD_OFFICER",
          name: u.name,
          phone: u.phone,
          code: u.code,
          status: u.status,
          city: u.city,
          district: u.district ?? null,
          state: u.state,
          pincode: u.pincode,
          address: u.address,
          createdAt: u.createdAt,
          distributor: d
            ? { id: d.id, name: d.name, code: d.code, city: d.city, state: d.state, status: d.status }
            : null,
        };

        if (matches(row)) out.push(row);
      }
    }

    // ✅ RETAILERS (Retailer + User(join via map) + Distributor(from distById))
    if (role === "ALL" || role === "RETAILER") {
      const retailers = await prisma.retailer.findMany({
        where: { distributorId: { in: distIds } } as any,
        select: {
          id: true,
          name: true,
          phone: true,
          city: true,
          state: true,
          pincode: true,
          address: true,
          status: true,
          createdAt: true,
          userId: true,
          distributorId: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5000,
      });

      const userIds = Array.from(new Set(retailers.map((r) => r.userId).filter(Boolean)));
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } } as any,
        select: { id: true, code: true, phone: true, status: true, createdAt: true },
        take: 10000,
      });
      const userById = new Map(users.map((u) => [u.id, u]));

      for (const r of retailers as any[]) {
        const u = r.userId ? userById.get(r.userId) : null;
        const d = r.distributorId ? distById.get(r.distributorId) : null;

        const row = {
          id: r.userId, // we edit/reset via User.id
          role: "RETAILER",
          name: r.name,
          phone: u?.phone || r.phone,
          code: u?.code || null,

          // ✅ IMPORTANT: show INACTIVE if user is inactive
          status: u?.status || r.status,

          city: r.city,
          state: r.state,
          pincode: r.pincode,
          address: r.address,
          createdAt: r.createdAt,
          retailerId: r.id,
          distributor: d
            ? { id: d.id, name: d.name, code: d.code, city: d.city, state: d.state, status: d.status }
            : null,
        };

        if (matches(row)) out.push(row);
      }
    }

    // sort newest first
    out.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      ok: true,
      rows: out.slice(0, take),
      counts: { distributors: dists.length },
    });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}