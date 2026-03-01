-- CreateEnum
CREATE TYPE "SalesTaskType" AS ENUM ('REACTIVATE_RETAILER', 'UPSELL_PRODUCTS', 'CITY_FOCUS', 'SLOW_MOVER_REVIVAL', 'NEW_RETAILER_CONVERSION', 'INVESTIGATE_DROP');

-- CreateEnum
CREATE TYPE "SalesTaskStatus" AS ENUM ('OPEN', 'DONE', 'OVERDUE', 'BLOCKED_REMARKS', 'RESCHEDULED');

-- CreateTable
CREATE TABLE "RetailerTransferBatch" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "fromFoUserId" TEXT NOT NULL,
    "toFoUserId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "note" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DONE',
    "transferred" INTEGER NOT NULL DEFAULT 0,
    "historyCreated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailerTransferBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerTransferBatchItem" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailerTransferBatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesManagerTask" (
    "id" TEXT NOT NULL,
    "salesManagerId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "type" "SalesTaskType" NOT NULL,
    "title" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 2,
    "dueAt" TIMESTAMP(3),
    "status" "SalesTaskStatus" NOT NULL DEFAULT 'OPEN',
    "retailerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "productNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "city" TEXT,
    "distributorId" TEXT,
    "aiReason" TEXT,
    "expectedImpactMin" INTEGER,
    "expectedImpactMax" INTEGER,
    "remarkQuality" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesManagerTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesManagerTaskRemark" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "remarkText" TEXT NOT NULL,
    "qualityScore" INTEGER NOT NULL DEFAULT 0,
    "aiFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesManagerTaskRemark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesManagerDailyClose" (
    "id" TEXT NOT NULL,
    "salesManagerId" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "closingRemark" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "penaltiesApplied" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesManagerDailyClose_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RetailerTransferBatchItem_batchId_retailerId_key" ON "RetailerTransferBatchItem"("batchId", "retailerId");

-- CreateIndex
CREATE INDEX "SalesManagerTask_salesManagerId_day_idx" ON "SalesManagerTask"("salesManagerId", "day");

-- CreateIndex
CREATE INDEX "SalesManagerTask_salesManagerId_status_idx" ON "SalesManagerTask"("salesManagerId", "status");

-- CreateIndex
CREATE INDEX "SalesManagerTaskRemark_taskId_idx" ON "SalesManagerTaskRemark"("taskId");

-- CreateIndex
CREATE INDEX "SalesManagerDailyClose_salesManagerId_day_idx" ON "SalesManagerDailyClose"("salesManagerId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "SalesManagerDailyClose_salesManagerId_day_key" ON "SalesManagerDailyClose"("salesManagerId", "day");

-- AddForeignKey
ALTER TABLE "RetailerTransferBatch" ADD CONSTRAINT "RetailerTransferBatch_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerTransferBatch" ADD CONSTRAINT "RetailerTransferBatch_fromFoUserId_fkey" FOREIGN KEY ("fromFoUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerTransferBatch" ADD CONSTRAINT "RetailerTransferBatch_toFoUserId_fkey" FOREIGN KEY ("toFoUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerTransferBatchItem" ADD CONSTRAINT "RetailerTransferBatchItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "RetailerTransferBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesManagerTaskRemark" ADD CONSTRAINT "SalesManagerTaskRemark_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "SalesManagerTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;
