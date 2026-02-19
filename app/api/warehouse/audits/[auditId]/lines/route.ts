import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWarehouse } from "@/lib/warehouse/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function asInt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function requireStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ auditId: string }> }
) {
  const auth: any = await requireWarehouse();
  if (!auth?.ok) {
    return jsonError(auth?.error || "Unauthorized", auth?.status || 401);
  }

  try {
    const { auditId } = await ctx.params;
    if (!auditId) return jsonError("auditId missing", 400);

    const body = await req.json().catch(() => null);
    if (!body || !Array.isArray(body.items)) return jsonError("items[] required", 400);

    const audit = await prisma.stockAudit.findUnique({
      where: { id: auditId },
      select: {
        id: true,
        status: true,
        investigationQtyThreshold: true,
        investigationPctThreshold: true,
      },
    });
    if (!audit) return jsonError("Audit not found", 404);
    if (audit.status === "APPROVED") return jsonError("Approved audit is locked", 400);

    const items = body.items as Array<any>;
    if (items.length > 5000) return jsonError("Too many items", 400);

    const qtyThreshold = Number(audit.investigationQtyThreshold ?? 20);
    const pctThreshold = Number(audit.investigationPctThreshold ?? 2.0);

    const updated = await prisma.$transaction(async (tx) => {
      let changed = 0;

      for (const it of items) {
        const lineId = requireStr(it.lineId);
        const physicalQty = asInt(it.physicalQty);

        if (!lineId) throw new Error("lineId missing");
        if (physicalQty === null || physicalQty < 0) {
          throw new Error("physicalQty must be >= 0 integer");
        }

        const line = await tx.stockAuditLine.findUnique({
          where: { id: lineId },
          select: { id: true, auditId: true, systemQty: true },
        });
        if (!line || line.auditId !== auditId) throw new Error("Invalid lineId");

        const systemQty = Number(line.systemQty || 0);
        const diffQty = physicalQty - systemQty;

        const mismatchType = diffQty === 0 ? "MATCH" : diffQty < 0 ? "SHORT" : "EXCESS";

        const reason = it.reason ? String(it.reason) : null;
        const rootCause = it.rootCause ? String(it.rootCause) : null;
        const remarks = it.remarks ? String(it.remarks).trim() : null;

        if (diffQty !== 0) {
          if (!reason) throw new Error("reason required for mismatch");
          if (!remarks || remarks.length < 3) throw new Error("remarks required for mismatch");
        }

        const abs = Math.abs(diffQty);
        const pct = systemQty > 0 ? (abs / systemQty) * 100 : abs > 0 ? 100 : 0;
        const needsInvestigation = abs >= qtyThreshold || pct >= pctThreshold;

        await tx.stockAuditLine.update({
          where: { id: lineId },
          data: {
            physicalQty,
            diffQty,
            mismatchType: mismatchType as any,
            reason: reason as any,
            rootCause: rootCause as any,
            remarks: remarks || null,
            needsInvestigation,
          },
        });

        changed++;
      }

      const agg = await tx.stockAuditLine.aggregate({
        where: { auditId },
        _sum: { systemQty: true, physicalQty: true, diffQty: true },
      });

      await tx.stockAudit.update({
        where: { id: auditId },
        data: {
          status: "IN_PROGRESS",
          totalSystemQty: Number(agg._sum.systemQty || 0),
          totalPhysicalQty: Number(agg._sum.physicalQty || 0),
          totalVarianceQty: Number(agg._sum.diffQty || 0),
        },
      });

      return { changed };
    });

    return NextResponse.json({ ok: true, ...updated });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}