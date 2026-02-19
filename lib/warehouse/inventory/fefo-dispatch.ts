// lib/warehouse/inventory/fefo-dispatch.ts
import type { PrismaClient } from "@prisma/client";

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function daysLeft(expiryDate: Date, now = new Date()) {
  const ms = startOfDay(expiryDate).getTime() - startOfDay(now).getTime();
  return Math.ceil(ms / 86400000);
}

type Entity = { entityType: "WAREHOUSE" | "DISTRIBUTOR"; entityId: string };

export async function fefoDeductProduct(params: {
  tx: PrismaClient; // transaction client
  entity: Entity;
  productId: string;
  productName: string;
  qty: number;

  refType: "ORDER" | "INVOICE" | "MANUAL";
  refId: string;

  actorUserId?: string | null;
  actorRole?: string | null;

  blockExpired?: boolean;
}) {
  const {
    tx,
    entity,
    productId,
    productName,
    qty,
    refType,
    refId,
    actorUserId,
    actorRole,
    blockExpired = true,
  } = params;

  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error(`Invalid qty for ${productName}`);
  }

  // 1) Snapshot check (fast gate)
  // NOTE: composite unique key is NOT available in Prisma client, so use findFirst
  const snap = await (tx as any).inventorySnapshot.findFirst({
    where: {
      entityType: entity.entityType as any,
      entityId: entity.entityId,
      productId,
    },
    select: { id: true, availableQty: true },
  });

  const available = Number(snap?.availableQty ?? 0);
  if (available < qty) {
    throw new Error(
      `Insufficient stock for ${productName}. Available=${available}, Need=${qty}`
    );
  }

  // 2) FEFO: expiry first, then no-expiry
  const expBatches = await (tx as any).inventoryBatch.findMany({
    where: {
      entityType: entity.entityType as any,
      entityId: entity.entityId,
      productId,
      qtyAvailable: { gt: 0 },
      expiryDate: { not: null },
    },
    orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
    select: { id: true, qtyAvailable: true, expiryDate: true },
  });

  const noExpBatches = await (tx as any).inventoryBatch.findMany({
    where: {
      entityType: entity.entityType as any,
      entityId: entity.entityId,
      productId,
      qtyAvailable: { gt: 0 },
      expiryDate: null,
    },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, qtyAvailable: true },
  });

  const batches: Array<{ id: string; qtyAvailable: number; expiryDate?: Date | null }> = [
    ...expBatches.map((b: any) => ({
      id: b.id,
      qtyAvailable: Number(b.qtyAvailable || 0),
      expiryDate: b.expiryDate,
    })),
    ...noExpBatches.map((b: any) => ({
      id: b.id,
      qtyAvailable: Number(b.qtyAvailable || 0),
      expiryDate: null,
    })),
  ];

  let remaining = qty;
  const maps: { batchId: string; qtyUsed: number }[] = [];
  const now = new Date();

  for (const b of batches) {
    if (remaining <= 0) break;

    const take = Math.min(remaining, Number(b.qtyAvailable || 0));
    if (take <= 0) continue;

    if (blockExpired && b.expiryDate) {
      const dl = daysLeft(b.expiryDate, now);
      if (dl < 0) {
        throw new Error(`Expired batch encountered for ${productName}. Dispatch blocked.`);
      }
    }

    await (tx as any).inventoryBatch.update({
      where: { id: b.id },
      data: { qtyAvailable: { decrement: take } },
    });

    maps.push({ batchId: b.id, qtyUsed: take });
    remaining -= take;
  }

  if (remaining > 0) {
    throw new Error(`Stock changed during dispatch for ${productName}. Retry.`);
  }

  // 3) Ledger txn
  const txn = await (tx as any).inventoryTxn.create({
    data: {
      entityType: entity.entityType as any,
      entityId: entity.entityId,
      productId,
      productName,
      type: "DISPATCH" as any,
      qtyChange: -qty,
      qtyReservedChange: 0,
      refType,
      refId,
      actorUserId: actorUserId || undefined,
      actorRole: actorRole || undefined,
    },
    select: { id: true },
  });

  // 4) Map txn -> batches
  if (maps.length) {
    await (tx as any).inventoryTxnBatchMap.createMany({
      data: maps.map((m) => ({
        txnId: txn.id,
        batchId: m.batchId,
        qtyUsed: m.qtyUsed,
      })),
    });
  }

  // 5) Snapshot update/create (manual upsert without composite unique)
  if (snap?.id) {
    await (tx as any).inventorySnapshot.update({
      where: { id: snap.id },
      data: {
        availableQty: { decrement: qty },
      },
    });
  } else {
    await (tx as any).inventorySnapshot.create({
      data: {
        entityType: entity.entityType as any,
        entityId: entity.entityId,
        productId,
        productName,
        availableQty: Math.max(0, available - qty),
        reservedQty: 0,
      },
    });
  }

  return { txnId: txn.id, maps };
}