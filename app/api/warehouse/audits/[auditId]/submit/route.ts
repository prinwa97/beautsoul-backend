// app/api/warehouse/audits/[auditId]/submit/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWarehouse } from "@/lib/warehouse/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function getRoleFromAuth(auth: any): string | null {
  // different projects return role in different places
  return (
    auth?.user?.role ||
    auth?.role ||
    auth?.session?.role ||
    auth?.data?.user?.role ||
    null
  );
}

function getUserIdFromAuth(auth: any): string | null {
  return (
    auth?.userId ||
    auth?.user?.id ||
    auth?.session?.userId ||
    auth?.data?.user?.id ||
    null
  );
}

export async function POST(
  _req: Request,
  ctx: { params: Promise<{ auditId: string }> }
) {
  // ✅ auth (no args, because requireWarehouse expects 0 args)
  const auth = await requireWarehouse();
  if (!auth?.ok) {
    return jsonError(auth?.error || "Unauthorized", (auth as any)?.status || 401);
  }

  // ✅ role guard
  const role = getRoleFromAuth(auth);
  if (!role || !["WAREHOUSE_MANAGER", "ADMIN"].includes(role)) {
    return jsonError("Forbidden", 403);
  }

  try {
    const { auditId } = await ctx.params;
    if (!auditId) return jsonError("auditId missing", 400);

    const audit = await prisma.stockAudit.findUnique({
      where: { id: auditId },
      include: { lines: true },
    });

    if (!audit) return jsonError("Audit not found", 404);
    if (audit.status === "APPROVED") return jsonError("Already approved", 400);

    // ✅ Ensure every line has physicalQty (no partial submission)
    const pending = audit.lines.filter((l) => l.physicalQty === null);
    if (pending.length) {
      return jsonError(`Pending physical qty on ${pending.length} lines`, 400);
    }

    // ✅ Ensure mismatch lines have reason/remarks
    const bad = audit.lines.filter(
      (l) => (l.diffQty || 0) !== 0 && (!l.reason || !l.remarks)
    );
    if (bad.length) {
      return jsonError(`Reason/remarks missing on ${bad.length} mismatch lines`, 400);
    }

    const updated = await prisma.stockAudit.update({
      where: { id: auditId },
      data: {
        status: "SUBMITTED",
        submittedByUserId: getUserIdFromAuth(auth),
      },
      select: { id: true, status: true },
    });

    return NextResponse.json({ ok: true, updated });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}