// app/api/warehouse/inbound/[orderId]/process/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AllocationPayload = {
  productName: string;
  batchId: string; // stockLot.id
  qty: number;
  rate?: number | null;
};

function cleanStr(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function asInt(n: any) {
  const x = Math.floor(Number(n || 0));
  return Number.isFinite(x) ? x : 0;
}

async function requireWarehouseOrAdmin() {
  const u: any = await getSessionUser();
  if (!u) return { ok: false as const, status: 401 as const, error: "Unauthorized" };

  const role = String(u.role || "").toUpperCase();
  const allowed = new Set(["ADMIN", "WAREHOUSE_MANAGER", "WAREHOUSE", "STORE_MANAGER"]);
  if (!allowed.has(role)) {
    return { ok: false as const, status: 403 as const, error: `Forbidden for role: ${role}` };
  }
  return { ok: true as const, user: u };
}

type GroupKey = string; // `${productName}__${stockLotId}`

export async function POST(req: Request, ctx: { params: Promise<{ orderId: string }> }) {
  try {
    const auth = await requireWarehouseOrAdmin();
    if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

    const { orderId } = await ctx.params;
    if (!orderId) return NextResponse.json({ ok: false, error: "orderId missing" }, { status: 400 });

    const body = (await req.json().catch(() => null)) as any;
    const allocations: AllocationPayload[] = Array.isArray(body?.allocations) ? body.allocations : [];
    if (!allocations.length) {
      return NextResponse.json({ ok: false, error: "allocations required" }, { status: 400 });
    }

    for (const a of allocations) {
      if (!cleanStr(a?.productName)) {
        return NextResponse.json({ ok: false, error: "productName required" }, { status: 400 });
      }
      if (!cleanStr(a?.batchId)) {
        return NextResponse.json({ ok: false, error: "batchId required" }, { status: 400 });
      }
      if (asInt(a?.qty) <= 0) {
        return NextResponse.json({ ok: false, error: "qty must be > 0" }, { status: 400 });
      }
    }

    const order = await prisma.inboundOrder.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return NextResponse.json({ ok: false, error: "Order not found" }, { status: 404 });
    if (!order.paymentVerified) {
      return NextResponse.json({ ok: false, error: "Payment not verified" }, { status: 400 });
    }

    const distributorId = (order as any).forDistributorId || null;
    if (!distributorId) {
      return NextResponse.json(
        { ok: false, error: "forDistributorId missing on InboundOrder" },
        { status: 500 }
      );
    }

    // ✅ validate allocations match order qty per product
    const needByProduct = new Map<string, number>();
    for (const it of order.items) {
      const pn = String(it.productName || "").trim();
      needByProduct.set(pn, Math.max(0, asInt((it as any).orderedQtyPcs)));
    }

    const gotByProduct = new Map<string, number>();
    for (const a of allocations) {
      const pn = String(a.productName || "").trim();
      gotByProduct.set(pn, (gotByProduct.get(pn) || 0) + asInt(a.qty));
    }

    for (const [pn, need] of needByProduct.entries()) {
      const got = gotByProduct.get(pn) || 0;
      if (got !== need) {
        return NextResponse.json(
          { ok: false, error: `Allocation mismatch for ${pn}: got ${got}, need ${need}` },
          { status: 400 }
        );
      }
    }

    // ✅ group allocations by (productName + stockLotId)
    const grouped = new Map<GroupKey, { productName: string; stockLotId: string; qty: number; rate: number }>();
    for (const a of allocations) {
      const productName = String(a.productName || "").trim();
      const stockLotId = String(a.batchId || "").trim();
      const qty = asInt(a.qty);
      const rate = Number(a.rate || 0);
      const key = `${productName}__${stockLotId}`;

      const prev = grouped.get(key);
      if (prev) {
        prev.qty += qty;
        // keep last rate (optional)
        prev.rate = rate;
      } else {
        grouped.set(key, { productName, stockLotId, qty, rate });
      }
    }

    await prisma.$transaction(async (tx) => {
      const stockLotIds = Array.from(new Set(Array.from(grouped.values()).map((g) => g.stockLotId)));

      const lots = await tx.stockLot.findMany({
        where: {
          id: { in: stockLotIds },
          ownerType: "COMPANY",
          ownerId: null,
        },
        select: {
          id: true,
          productName: true,
          batchNo: true,
          mfgDate: true,
          expDate: true,
          qtyOnHandPcs: true,
        },
      });

      const lotById = new Map<string, (typeof lots)[number]>();
      for (const l of lots) lotById.set(String(l.id), l);

      const missingLots = stockLotIds.filter((id) => !lotById.has(String(id)));
      if (missingLots.length) throw new Error(`StockLot not found: ${missingLots.join(", ")}`);

      // overuse check per stockLot
      const usedByLot = new Map<string, number>();
      for (const g of grouped.values()) {
        usedByLot.set(g.stockLotId, (usedByLot.get(g.stockLotId) || 0) + g.qty);
      }

      for (const [lotId, used] of usedByLot.entries()) {
        const l = lotById.get(lotId)!;
        const avail = Math.max(0, asInt(l.qtyOnHandPcs));
        if (used > avail) throw new Error(`StockLot ${l.batchNo || lotId} overused: ${used} > ${avail}`);
      }

      // decrement company stock lots
      for (const [lotId, used] of usedByLot.entries()) {
        await tx.stockLot.update({
          where: { id: lotId },
          data: { qtyOnHandPcs: { decrement: used } },
        });
      }

      // ✅ create/update distributor InventoryBatch + Inventory aggregate (FIXED)
      for (const g of grouped.values()) {
        const l = lotById.get(g.stockLotId)!;

        const productName = String(g.productName || "").trim();
        const batchNo = String(l.batchNo || "").trim(); // StockLot.batchNo is optional in schema
        const expiryDate = l.expDate ? new Date(l.expDate) : null;

        // IMPORTANT: InventoryBatch.batchNo required + unique uses it -> empty will collide
        if (!batchNo) {
          throw new Error(`StockLot ${l.id} has missing batchNo for product "${productName}". BatchNo required.`);
        }
        // IMPORTANT: InventoryBatch.expiryDate required in schema
        if (!expiryDate || Number.isNaN(expiryDate.getTime())) {
          throw new Error(`StockLot ${l.id} has missing/invalid expDate for batch "${batchNo}". expDate required.`);
        }

        const mfgDate = l.mfgDate ? new Date(l.mfgDate) : null;
        if (mfgDate && Number.isNaN(mfgDate.getTime())) {
          throw new Error(`StockLot ${l.id} has invalid mfgDate`);
        }

        // guard: same unique batch should not have different expiry
        const existing = await tx.inventoryBatch.findUnique({
          where: {
            distributorId_productName_batchNo: {
              distributorId,
              productName,
              batchNo,
            },
          },
          select: { id: true, expiryDate: true },
        });

        if (existing && existing.expiryDate.getTime() !== expiryDate.getTime()) {
          throw new Error(
            `ExpiryDate mismatch for distributor batch: ${productName}/${batchNo}. Existing=${existing.expiryDate.toISOString()} Incoming=${expiryDate.toISOString()}`
          );
        }

        // ✅ FIX: upsert instead of create (avoids P2002)
        await tx.inventoryBatch.upsert({
          where: {
            distributorId_productName_batchNo: {
              distributorId,
              productName,
              batchNo,
            },
          },
          create: {
            distributorId,
            productName,
            batchNo,
            mfgDate,
            expiryDate,
            qty: g.qty,
          },
          update: {
            qty: { increment: g.qty },
            // keep dates consistent; set only if you want to refresh
            mfgDate: mfgDate ?? undefined,
            expiryDate: expiryDate ?? undefined,
          },
        });

        // ✅ FIX: Inventory aggregate: upsert (no updateMany + create)
        await tx.inventory.upsert({
          where: { distributorId_productName: { distributorId, productName } },
          create: { distributorId, productName, qty: g.qty },
          update: { qty: { increment: g.qty } },
        });
      }

      // ✅ mark order packed
      await tx.inboundOrder.update({
        where: { id: orderId },
        data: {
          status: "PACKED" as any,
          // packedAt / packedByUserId only add if fields exist in schema
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("WAREHOUSE PROCESS ERROR:", e);
    return NextResponse.json({ ok: false, error: String(e?.message || e || "Error") }, { status: 500 });
  }
}
