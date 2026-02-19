-- CreateEnum
CREATE TYPE "InventoryTxnType" AS ENUM ('INBOUND', 'RESERVE', 'UNRESERVE', 'DISPATCH', 'RETURN', 'DAMAGE', 'ADJUSTMENT', 'TRANSFER_OUT', 'TRANSFER_IN');

-- CreateTable
CREATE TABLE "InventorySnapshot" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "availableQty" INTEGER NOT NULL DEFAULT 0,
    "reservedQty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventorySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTxn" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "distributorId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "type" "InventoryTxnType" NOT NULL,
    "qtyChange" INTEGER NOT NULL,
    "qtyReservedChange" INTEGER NOT NULL DEFAULT 0,
    "refType" TEXT,
    "refId" TEXT,
    "note" TEXT,
    "actorUserId" TEXT,
    "actorRole" TEXT,

    CONSTRAINT "InventoryTxn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryTxnBatchMap" (
    "id" TEXT NOT NULL,
    "txnId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "qtyUsed" INTEGER NOT NULL,

    CONSTRAINT "InventoryTxnBatchMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventorySnapshot_distributorId_idx" ON "InventorySnapshot"("distributorId");

-- CreateIndex
CREATE INDEX "InventorySnapshot_productName_idx" ON "InventorySnapshot"("productName");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySnapshot_distributorId_productName_key" ON "InventorySnapshot"("distributorId", "productName");

-- CreateIndex
CREATE INDEX "InventoryTxn_distributorId_createdAt_idx" ON "InventoryTxn"("distributorId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryTxn_refType_refId_idx" ON "InventoryTxn"("refType", "refId");

-- CreateIndex
CREATE INDEX "InventoryTxn_productName_createdAt_idx" ON "InventoryTxn"("productName", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryTxnBatchMap_batchId_idx" ON "InventoryTxnBatchMap"("batchId");

-- CreateIndex
CREATE INDEX "InventoryTxnBatchMap_txnId_idx" ON "InventoryTxnBatchMap"("txnId");

-- AddForeignKey
ALTER TABLE "InventoryTxnBatchMap" ADD CONSTRAINT "InventoryTxnBatchMap_txnId_fkey" FOREIGN KEY ("txnId") REFERENCES "InventoryTxn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryTxnBatchMap" ADD CONSTRAINT "InventoryTxnBatchMap_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "InventoryBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
