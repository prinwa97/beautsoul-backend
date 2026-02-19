/*
  Warnings:

  - A unique constraint covering the columns `[inboundReceiveId,productName]` on the table `InboundReceiveItem` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateTable
CREATE TABLE "RetailerLedger" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "LedgerType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "reference" TEXT,
    "narration" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailerLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RetailerLedger_distributorId_date_idx" ON "RetailerLedger"("distributorId", "date");

-- CreateIndex
CREATE INDEX "RetailerLedger_retailerId_date_idx" ON "RetailerLedger"("retailerId", "date");

-- CreateIndex
CREATE INDEX "RetailerLedger_type_idx" ON "RetailerLedger"("type");

-- CreateIndex
CREATE INDEX "Distributor_salesManagerId_idx" ON "Distributor"("salesManagerId");

-- CreateIndex
CREATE INDEX "InboundOrderItem_productName_idx" ON "InboundOrderItem"("productName");

-- CreateIndex
CREATE INDEX "InboundReceive_inboundOrderId_idx" ON "InboundReceive"("inboundOrderId");

-- CreateIndex
CREATE INDEX "InboundReceiveItem_productName_idx" ON "InboundReceiveItem"("productName");

-- CreateIndex
CREATE UNIQUE INDEX "InboundReceiveItem_inboundReceiveId_productName_key" ON "InboundReceiveItem"("inboundReceiveId", "productName");

-- CreateIndex
CREATE INDEX "Invoice_distributorId_idx" ON "Invoice"("distributorId");

-- CreateIndex
CREATE INDEX "Invoice_retailerId_idx" ON "Invoice"("retailerId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerLedger" ADD CONSTRAINT "RetailerLedger_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerLedger" ADD CONSTRAINT "RetailerLedger_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
