import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function requireWarehouseOrAdmin() {
  const u: any = await getSessionUser();
  if (!u) return { ok: false as const, status: 401 as const, error: "Unauthorized" };

  const role = String(u.role || "").toUpperCase();
  const allowed = new Set(["ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE", "STORE_MANAGER"]);
  if (!allowed.has(role)) return { ok: false as const, status: 403 as const, error: "Forbidden" };

  return { ok: true as const, user: u };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ auditId: string }> }
) {
  try {
    const auth = await requireWarehouseOrAdmin();
    if (!auth.ok) return jsonError(auth.error, auth.status);

    // ✅ Next.js 16 + correct param name for folder [auditId]
    const { auditId } = await ctx.params;
    const id = String(auditId || "").trim();
    if (!id) return jsonError("Missing auditId", 400);

    // NOTE:
    // Abhi aapka logic inboundOrder fetch karta hai.
    // Isliye same query rakhi hai, but id = auditId (route param) use ho raha hai.
    const order = await prisma.inboundOrder.findUnique({
      where: { id },
      include: {
        distributor: { select: { id: true, name: true, city: true, state: true } },
        items: {
          select: {
            id: true,
            productName: true,
            orderedQtyPcs: true,
            rate: true,
            batchNo: true,
            mfgDate: true,
            expiryDate: true,
          },
        },
      },
    });

    if (!order) return jsonError("Order not found", 404);

    return NextResponse.json({ ok: true, order });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}