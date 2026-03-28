-- DropIndex
DROP INDEX "Order_createdAt_idx";

-- DropIndex
DROP INDEX "Order_status_createdAt_idx";

-- CreateIndex
CREATE INDEX "Order_distributorId_idx" ON "Order"("distributorId");

-- CreateIndex
CREATE INDEX "Order_idempotencyKey_idx" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_retailerId_idx" ON "Order"("retailerId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_distributorId_retailerId_createdAt_idx" ON "Order"("distributorId", "retailerId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_distributorId_status_createdAt_idx" ON "Order"("distributorId", "status", "createdAt");
