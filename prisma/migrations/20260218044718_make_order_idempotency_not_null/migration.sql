/*
  Warnings:

  - A unique constraint covering the columns `[idempotencyKey]` on the table `OrderRequestLog` will be added. If there are existing duplicate values, this will fail.
  - Made the column `idempotencyKey` on table `OrderRequestLog` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "OrderRequestLog" ALTER COLUMN "idempotencyKey" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "OrderRequestLog_idempotencyKey_key" ON "OrderRequestLog"("idempotencyKey");
