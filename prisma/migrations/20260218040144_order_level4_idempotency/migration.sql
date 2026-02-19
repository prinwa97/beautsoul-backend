/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "appVersion" TEXT,
ADD COLUMN     "clientRequestHash" TEXT,
ADD COLUMN     "deviceId" TEXT,
ADD COLUMN     "idempotencyKey" TEXT,
ADD COLUMN     "requestReceivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "OrderRequestLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endpoint" TEXT NOT NULL,
    "requestId" TEXT,
    "idempotencyKey" TEXT,
    "clientRequestHash" TEXT,
    "userId" TEXT,
    "retailerId" TEXT,
    "distributorId" TEXT,
    "deviceId" TEXT,
    "result" TEXT NOT NULL,
    "orderId" TEXT,
    "error" TEXT,

    CONSTRAINT "OrderRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_idempotencyKey_idx" ON "Order"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Order_clientRequestHash_idx" ON "Order"("clientRequestHash");
