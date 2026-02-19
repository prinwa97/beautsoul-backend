import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireWarehouse } from "@/lib/warehouse/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(msg: string, status = 400) {
  return NextResponse.json({ ok: false, error: msg }, { status });
}

function eq(a: any, b: any) {
  const x = String(a ?? "").trim();
  const y = String(b ?? "").trim();
  return x === y;
}

export async function POST(_: Request, ctx: { params: Promise<{ auditId: string }> }) {
  const auth = await requireWarehouse();
  if (!auth.ok) return jsonError(auth.error || "Unauthorized", (auth as any).status || 401);

  try {
    const { auditId } = await ctx.params;
    if (!auditId) return jsonError("auditId missing", 400);

    const warehouseId = (process.env.DEFAULT_WAREHOUSE_ID || "MAIN").trim();

    const audit = await prisma.stockAudit.findUnique({
      where: { id: auditId },
      include: { lines: true },
    });
    if (!audit) return jsonError("Audit not found", 404);
    if (audit.status !== "SUBMITTED") return jsonError("Only SUBMITTED audit can be approved", 400);

    const updated = await prisma.$transaction(async (tx) => {
      // Apply adjustments line by line where diff != 0
      let applied = 0;

      for (const l of audit.lines) {
        const diff = Number(l.diffQty || 0);
        if (!diff) continue;

        // Update stockLot: find matching product+batch
        const lot = await tx.stockLot.findFirst({
          where: {
            ownerType: "COMPANY",
            productName: l.productName,
            // batch optional match
            ...(l.batchNo ? { batchNo: l.batchNo } : {}),
          },
          select: { id: true, qtyOnHandPcs: true },
        });

        if (!lot) {
          // If lot missing, create new lot (for EXCESS) OR error (your policy)
          // I am keeping it safe: create only if diff > 0, else error.
          if (diff < 0) {
            throw new Error(`StockLot not found for SHORT: ${l.productName} / ${l.batchNo || "-"}`);
          }
          const created = await tx.stockLot.create({
            data: {
              ownerType: "COMPANY",
              productName: l.productName,
              batchNo: l.batchNo || null,
              mfgDate: l.mfgDate || null,
              expDate: l.expDate || null,
              qtyOnHandPcs: diff,
            } as any,
            select: { id: true },
          });

          await tx.inventoryAdjustmentTxn.create({
            data: {
              warehouseId,
              refType: "AUDIT",
              refId: auditId,
              productName: l.productName,
              batchNo: l.batchNo || null,
              deltaQty: diff,
              reason: l.reason ? String(l.reason) : null,
              notes: l.remarks || null,
              actorUserId: (auth as any).userId || null,
            },
          });

          applied++;
          continue;
        }

        const newQty = Number(lot.qtyOnHandPcs || 0) + diff;
        if (newQty < 0) throw new Error(`Negative stock not allowed: ${l.productName} / ${l.batchNo || "-"}`);

        await tx.stockLot.update({
          where: { id: lot.id },
          data: { qtyOnHandPcs: newQty },
        });

        await tx.inventoryAdjustmentTxn.create({
          data: {
            warehouseId,
            refType: "AUDIT",
            refId: auditId,
            productName: l.productName,
            batchNo: l.batchNo || null,
            deltaQty: diff,
            reason: l.reason ? String(l.reason) : null,
            notes: l.remarks || null,
            actorUserId: (auth as any).userId || null,
          },
        });

        applied++;
      }

      const hdr = await tx.stockAudit.update({
        where: { id: auditId },
        data: {
          status: "APPROVED",
          approvedByUserId: (auth as any).userId || null,
        },
        select: { id: true, status: true },
      });

      return { applied, hdr };
    });

    return NextResponse.json({ ok: true, ...updated });
  } catch (e: any) {
    return jsonError(e?.message || "Server error", 500);
  }
}
