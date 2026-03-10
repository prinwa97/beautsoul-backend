// /Users/beautsoul/Documents/beautsoul-app/beautsoul-backend/app/api/sales-manager/user/users/update/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { apiHandler } from "@/lib/api-handler";
import { badRequest, conflict, forbidden, notFound, unauthorized } from "@/lib/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- helpers ---------------- */

function normalizePhone(input: string) {
  const digits = (input || "").replace(/\D/g, "");
  const ten = digits.length >= 10 ? digits.slice(-10) : "";
  return ten;
}

function cleanStr(v: any) {
  const s = String(v ?? "").trim().replace(/\s+/g, " ");
  return s.length ? s : null;
}

function parseUserStatus(v: any): "ACTIVE" | "INACTIVE" | null {
  const s = String(v ?? "").trim().toUpperCase();
  if (!s) return null;
  if (s === "ACTIVE" || s === "INACTIVE") return s;
  return null;
}

// ✅ check distributor belongs to this sales manager
async function distributorUnderMe(meId: string, distributorId: string) {
  const ok = await prisma.distributor.findFirst({
    where: { id: distributorId, salesManagerId: meId } as any,
    select: { id: true },
  });
  return !!ok;
}

async function assertUnderSalesManager(meId: string, user: any) {
  const distributorId = user?.distributorId ? String(user.distributorId) : null;

  if (distributorId) {
    return distributorUnderMe(meId, distributorId);
  }

  // RETAILER: check retailer record distributorId
  const r = await prisma.retailer.findFirst({
    where: { userId: user.id } as any,
    select: { distributorId: true },
  });
  if (!r?.distributorId) return false;

  return distributorUnderMe(meId, String(r.distributorId));
}

/* ---------------- route ---------------- */

export const PATCH = apiHandler(async function PATCH(req: Request) {
  const me: any = await getSessionUser();

  if (!me) {
    throw unauthorized("Unauthorized");
  }

  if (String(me.role || "").toUpperCase() !== "SALES_MANAGER") {
    throw forbidden("Forbidden");
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    throw badRequest("INVALID_JSON");
  }

  const userId = cleanStr(body.userId);
  if (!userId) {
    throw badRequest("userId required");
  }

  // incoming optional distributorId (from edit modal)
  const distributorIdRaw = Object.prototype.hasOwnProperty.call(body, "distributorId")
    ? cleanStr(body.distributorId)
    : undefined;

  const nextDistributorId: string | null | undefined =
    distributorIdRaw === undefined ? undefined : distributorIdRaw; // undefined=no change, null=clear, string=set

  const status = Object.prototype.hasOwnProperty.call(body, "status")
    ? parseUserStatus(body.status)
    : null;

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      phone: true,
      distributorId: true,
    },
  });

  if (!u) {
    throw notFound("USER_NOT_FOUND");
  }

  // must already be under this sales manager (existing relation)
  const allowed = await assertUnderSalesManager(me.id, u);
  if (!allowed) {
    throw forbidden("NOT_ALLOWED");
  }

  const role = String(u.role || "").toUpperCase();

  // ✅ If distributor is being changed, ensure NEW distributor is also under this sales manager
  if (nextDistributorId !== undefined) {
    const canChange = role === "RETAILER" || role === "FIELD_OFFICER";

    if (!canChange) {
      throw badRequest("DISTRIBUTOR_CHANGE_NOT_ALLOWED");
    }

    if (nextDistributorId) {
      const ok = await distributorUnderMe(me.id, nextDistributorId);
      if (!ok) {
        throw forbidden("INVALID_DISTRIBUTOR");
      }
    }
  }

  const name = cleanStr(body.name);
  const phoneRaw = cleanStr(body.phone);
  const phone = phoneRaw ? normalizePhone(phoneRaw) : null;

  if (phoneRaw && (!phone || phone.length !== 10)) {
    throw badRequest("INVALID_PHONE");
  }

  const city = cleanStr(body.city);
  const district = cleanStr(body.district);
  const state = cleanStr(body.state);
  const pincode = cleanStr(body.pincode);
  const address = cleanStr(body.address);

  // phone uniqueness if changed
  if (phone && phone !== u.phone) {
    const exists = await prisma.user.findFirst({
      where: { phone },
      select: { id: true },
    });

    if (exists) {
      throw conflict("PHONE_EXISTS");
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    // ---------------- USER update (common) ----------------
    const userData: any = {
      ...(name ? { name } : {}),
      ...(phone ? { phone } : {}),
      city: city ?? null,
      district: district ?? null,
      state: state ?? null,
      pincode: pincode ?? null,
      address: address ?? null,
    };

    // ✅ status update on User (ACTIVE/INACTIVE)
    if (status) {
      userData.status = status;
    }

    // ✅ Field officer distributorId lives on USER
    if (role === "FIELD_OFFICER" && nextDistributorId !== undefined) {
      userData.distributorId = nextDistributorId; // null allowed
    }

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: userData,
      select: {
        id: true,
        name: true,
        phone: true,
        role: true,
        code: true,
        distributorId: true,
        status: true,
        city: true,
        district: true,
        state: true,
        pincode: true,
        address: true,
      } as any,
    });

    // ---------------- role sync ----------------

    if (role === "DISTRIBUTOR") {
      if (u.distributorId) {
        await tx.distributor.update({
          where: { id: u.distributorId },
          data: {
            ...(name ? { name } : {}),
            ...(phone ? { phone } : {}),
            city: city ?? undefined,
            district: district ?? undefined,
            state: state ?? undefined,
            pincode: pincode ?? undefined,
            address: address ?? undefined,
          } as any,
        });
      }
    }

    if (role === "RETAILER") {
      const r = await tx.retailer.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (!r?.id) {
        throw notFound("RETAILER_ROW_NOT_FOUND");
      }

      const retailerData: any = {
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {}),
        city: city ?? null,
        district: district ?? null,
        state: state ?? null,
        pincode: pincode ?? null,
        address: address ?? null,
      };

      // ✅ Retailer distributorId lives on RETAILER
      if (nextDistributorId !== undefined) {
        retailerData.distributorId = nextDistributorId; // null allowed
      }

      await tx.retailer.update({
        where: { id: r.id },
        data: retailerData,
      });
    }

    return updatedUser;
  });

  return NextResponse.json({
    ok: true,
    user: result,
  });
});