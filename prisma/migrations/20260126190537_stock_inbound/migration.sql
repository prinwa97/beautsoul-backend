/*
  Warnings:

  - Added the required column `batchNo` to the `InvoiceItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `expiryDate` to the `InvoiceItem` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('COMPANY', 'DISTRIBUTOR', 'RETAILER');

-- CreateEnum
CREATE TYPE "InboundOrderStatus" AS ENUM ('CREATED', 'CONFIRMED', 'PACKED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReceiveStatus" AS ENUM ('RECEIVED', 'PARTIAL_RECEIVED');

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "batchNo" TEXT NOT NULL,
ADD COLUMN     "expiryDate" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "InventoryBatch" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "qty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerStockBatch" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "batchNo" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "qty" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailerStockBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockLot" (
    "id" TEXT NOT NULL,
    "ownerType" "OwnerType" NOT NULL,
    "ownerId" TEXT,
    "batchNo" TEXT,
    "expDate" TIMESTAMP(3),
    "qtyOnHandPcs" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "productName" TEXT NOT NULL,

    CONSTRAINT "StockLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundOrder" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "forDistributorId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "status" "InboundOrderStatus" NOT NULL DEFAULT 'CREATED',
    "expectedAt" TIMESTAMP(3),
    "trackingCarrier" TEXT,
    "trackingNo" TEXT,
    "trackingUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundOrderItem" (
    "id" TEXT NOT NULL,
    "inboundOrderId" TEXT NOT NULL,
    "orderedQtyPcs" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,

    CONSTRAINT "InboundOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundReceive" (
    "id" TEXT NOT NULL,
    "inboundOrderId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "status" "ReceiveStatus" NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedByUserId" TEXT NOT NULL,

    CONSTRAINT "InboundReceive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundReceiveItem" (
    "id" TEXT NOT NULL,
    "inboundReceiveId" TEXT NOT NULL,
    "orderedQtyPcs" INTEGER NOT NULL,
    "receivedQtyPcs" INTEGER NOT NULL,
    "shortQtyPcs" INTEGER NOT NULL,
    "productName" TEXT NOT NULL,

    CONSTRAINT "InboundReceiveItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryBatch_distributorId_idx" ON "InventoryBatch"("distributorId");

-- CreateIndex
CREATE INDEX "InventoryBatch_expiryDate_idx" ON "InventoryBatch"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBatch_distributorId_productName_batchNo_key" ON "InventoryBatch"("distributorId", "productName", "batchNo");

-- CreateIndex
CREATE INDEX "RetailerStockBatch_retailerId_idx" ON "RetailerStockBatch"("retailerId");

-- CreateIndex
CREATE INDEX "RetailerStockBatch_expiryDate_idx" ON "RetailerStockBatch"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "RetailerStockBatch_retailerId_productName_batchNo_key" ON "RetailerStockBatch"("retailerId", "productName", "batchNo");

-- CreateIndex
CREATE INDEX "StockLot_ownerType_ownerId_productName_idx" ON "StockLot"("ownerType", "ownerId", "productName");

-- CreateIndex
CREATE INDEX "StockLot_expDate_idx" ON "StockLot"("expDate");

-- CreateIndex
CREATE UNIQUE INDEX "InboundOrder_orderNo_key" ON "InboundOrder"("orderNo");

-- CreateIndex
CREATE INDEX "InboundOrder_forDistributorId_status_createdAt_idx" ON "InboundOrder"("forDistributorId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "InboundOrderItem_inboundOrderId_idx" ON "InboundOrderItem"("inboundOrderId");

-- CreateIndex
CREATE INDEX "InboundReceive_distributorId_receivedAt_idx" ON "InboundReceive"("distributorId", "receivedAt");

-- CreateIndex
CREATE INDEX "InboundReceiveItem_inboundReceiveId_idx" ON "InboundReceiveItem"("inboundReceiveId");

-- AddForeignKey
ALTER TABLE "InboundOrder" ADD CONSTRAINT "InboundOrder_forDistributorId_fkey" FOREIGN KEY ("forDistributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundOrder" ADD CONSTRAINT "InboundOrder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundOrderItem" ADD CONSTRAINT "InboundOrderItem_inboundOrderId_fkey" FOREIGN KEY ("inboundOrderId") REFERENCES "InboundOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundReceive" ADD CONSTRAINT "InboundReceive_inboundOrderId_fkey" FOREIGN KEY ("inboundOrderId") REFERENCES "InboundOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundReceive" ADD CONSTRAINT "InboundReceive_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundReceive" ADD CONSTRAINT "InboundReceive_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundReceiveItem" ADD CONSTRAINT "InboundReceiveItem_inboundReceiveId_fkey" FOREIGN KEY ("inboundReceiveId") REFERENCES "InboundReceive"("id") ON DELETE CASCADE ON UPDATE CASCADE;
