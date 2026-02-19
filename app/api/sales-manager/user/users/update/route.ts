import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ---------------- helpers ---------------- */

function normalizePhone(input: string) {
  const digits = (input || "").replace(/\D/g, "");
  // allow leading 91 etc
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
  // DISTRIBUTOR + FIELD_OFFICER have distributorId on user
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

export async function PATCH(req: Request) {
  try {
    const me: any = await getSessionUser();
    if (!me) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    if (String(me.role || "") !== "SALES_MANAGER")
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, error: "INVALID_JSON" }, { status: 400 });

    const userId = cleanStr(body.userId);
    if (!userId) return NextResponse.json({ ok: false, error: "userId required" }, { status: 400 });

    // incoming optional distributorId (from edit modal)
    const distributorIdRaw = body.hasOwnProperty("distributorId") ? cleanStr(body.distributorId) : undefined;
    const nextDistributorId: string | null | undefined =
      distributorIdRaw === undefined ? undefined : distributorIdRaw; // undefined=no change, null=clear, string=set

    const status = body.hasOwnProperty("status") ? parseUserStatus(body.status) : null;

    const u = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        phone: true,
        distributorId: true,
      },
    });
    if (!u) return NextResponse.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404 });

    // must already be under this sales manager (existing relation)
    const allowed = await assertUnderSalesManager(me.id, u);
    if (!allowed) return NextResponse.json({ ok: false, error: "NOT_ALLOWED" }, { status: 403 });

    const role = String(u.role || "").toUpperCase();

    // ✅ If distributor is being changed, ensure NEW distributor is also under this sales manager
    if (nextDistributorId !== undefined) {
      // only Retailer/FieldOfficer allow change
      const canChange = role === "RETAILER" || role === "FIELD_OFFICER";
      if (!canChange) {
        return NextResponse.json({ ok: false, error: "DISTRIBUTOR_CHANGE_NOT_ALLOWED" }, { status: 400 });
      }

      // if setting to some distributorId (not null), validate it belongs to this SM
      if (nextDistributorId) {
        const ok = await distributorUnderMe(me.id, nextDistributorId);
        if (!ok) return NextResponse.json({ ok: false, error: "INVALID_DISTRIBUTOR" }, { status: 403 });
      }
    }

    const name = cleanStr(body.name);
    const phoneRaw = cleanStr(body.phone);
    const phone = phoneRaw ? normalizePhone(phoneRaw) : null;

    if (phoneRaw && (!phone || phone.length !== 10)) {
      return NextResponse.json({ ok: false, error: "INVALID_PHONE" }, { status: 400 });
    }

    const city = cleanStr(body.city);
    const district = cleanStr(body.district);
    const state = cleanStr(body.state);
    const pincode = cleanStr(body.pincode);
    const address = cleanStr(body.address);

    // phone uniqueness if changed
    if (phone && phone !== u.phone) {
      const exists = await prisma.user.findFirst({ where: { phone }, select: { id: true } });
      if (exists) return NextResponse.json({ ok: false, error: "PHONE_EXISTS" }, { status: 409 });
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
        select: { id: true, name: true, phone: true, role: true, code: true, distributorId: true, status: true } as any,
      });

      // ---------------- role sync ----------------

      if (role === "DISTRIBUTOR") {
        // update distributor profile too
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
        const r = await tx.retailer.findFirst({ where: { userId }, select: { id: true } });
        if (!r?.id) {
          throw new Error("RETAILER_ROW_NOT_FOUND");
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

      // FIELD_OFFICER only user table is enough (already handled)

      return updatedUser;
    });

    return NextResponse.json({ ok: true, user: result });
  } catch (e: any) {
    if (String(e?.code) === "P2002") {
      return NextResponse.json({ ok: false, error: "DUPLICATE" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", message: String(e?.message || e) },
      { status: 500 }
    );
  }
}
