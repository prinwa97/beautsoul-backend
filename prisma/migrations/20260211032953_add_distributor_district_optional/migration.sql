-- AlterTable
ALTER TABLE "Distributor" ADD COLUMN     "district" TEXT;

-- CreateIndex
CREATE INDEX "InvoiceItem_productName_idx" ON "InvoiceItem"("productName");

-- CreateIndex
CREATE INDEX "Order_distributorId_idx" ON "Order"("distributorId");

-- CreateIndex
CREATE INDEX "Order_retailerId_idx" ON "Order"("retailerId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "OrderItem_productName_idx" ON "OrderItem"("productName");
