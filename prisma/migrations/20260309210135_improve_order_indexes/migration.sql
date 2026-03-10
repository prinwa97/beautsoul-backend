-- DropIndex
DROP INDEX "Order_distributorId_idx";

-- DropIndex
DROP INDEX "Order_idempotencyKey_idx";

-- DropIndex
DROP INDEX "Order_retailerId_idx";

-- DropIndex
DROP INDEX "Order_status_idx";

-- AlterTable
ALTER TABLE "RetailerStockAuditItem" ADD COLUMN     "soldQty" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Order_distributorId_createdAt_idx" ON "Order"("distributorId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_retailerId_createdAt_idx" ON "Order"("retailerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");
