-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AuditMismatchType" AS ENUM ('SHORT', 'EXCESS', 'MATCH');

-- CreateEnum
CREATE TYPE "AuditReason" AS ENUM ('DAMAGE', 'EXPIRED_DISPOSAL', 'SPILLAGE', 'THEFT_LOSS', 'MIS_PICK_MIS_ISSUE', 'SUPPLIER_SHORT', 'RETURN_PENDING', 'DATA_ENTRY_ERROR', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditRootCause" AS ENUM ('PROCESS', 'DATA', 'HANDLING', 'SUPPLIER', 'OTHER');

-- CreateEnum
CREATE TYPE "AuditTaskStatus" AS ENUM ('OPEN', 'DONE');

-- CreateTable
CREATE TABLE "StockAudit" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "auditDate" TIMESTAMP(3) NOT NULL,
    "snapshotAt" TIMESTAMP(3) NOT NULL,
    "status" "AuditStatus" NOT NULL DEFAULT 'DRAFT',
    "totalSystemQty" INTEGER NOT NULL DEFAULT 0,
    "totalPhysicalQty" INTEGER NOT NULL DEFAULT 0,
    "totalVarianceQty" INTEGER NOT NULL DEFAULT 0,
    "investigationQtyThreshold" INTEGER NOT NULL DEFAULT 20,
    "investigationPctThreshold" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "createdByUserId" TEXT,
    "submittedByUserId" TEXT,
    "approvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAuditLine" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "batchNo" TEXT,
    "mfgDate" TIMESTAMP(3),
    "expDate" TIMESTAMP(3),
    "systemQty" INTEGER NOT NULL,
    "physicalQty" INTEGER,
    "diffQty" INTEGER,
    "mismatchType" "AuditMismatchType" NOT NULL DEFAULT 'MATCH',
    "reason" "AuditReason",
    "rootCause" "AuditRootCause",
    "remarks" TEXT,
    "needsInvestigation" BOOLEAN NOT NULL DEFAULT false,
    "isRepeatIssue" BOOLEAN NOT NULL DEFAULT false,
    "evidenceUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAuditLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAuditTask" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assignedToUserId" TEXT,
    "dueDate" TIMESTAMP(3),
    "status" "AuditTaskStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAuditTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAdjustmentTxn" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "refType" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "batchNo" TEXT,
    "deltaQty" INTEGER NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryAdjustmentTxn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockAudit_warehouseId_auditDate_idx" ON "StockAudit"("warehouseId", "auditDate");

-- CreateIndex
CREATE INDEX "StockAudit_status_idx" ON "StockAudit"("status");

-- CreateIndex
CREATE UNIQUE INDEX "StockAudit_warehouseId_monthKey_key" ON "StockAudit"("warehouseId", "monthKey");

-- CreateIndex
CREATE INDEX "StockAuditLine_auditId_idx" ON "StockAuditLine"("auditId");

-- CreateIndex
CREATE INDEX "StockAuditLine_productName_idx" ON "StockAuditLine"("productName");

-- CreateIndex
CREATE INDEX "StockAuditLine_mismatchType_idx" ON "StockAuditLine"("mismatchType");

-- CreateIndex
CREATE INDEX "StockAuditLine_needsInvestigation_idx" ON "StockAuditLine"("needsInvestigation");

-- CreateIndex
CREATE INDEX "StockAuditTask_auditId_idx" ON "StockAuditTask"("auditId");

-- CreateIndex
CREATE INDEX "StockAuditTask_status_idx" ON "StockAuditTask"("status");

-- CreateIndex
CREATE INDEX "InventoryAdjustmentTxn_warehouseId_createdAt_idx" ON "InventoryAdjustmentTxn"("warehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryAdjustmentTxn_refType_refId_idx" ON "InventoryAdjustmentTxn"("refType", "refId");

-- AddForeignKey
ALTER TABLE "StockAuditLine" ADD CONSTRAINT "StockAuditLine_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "StockAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAuditTask" ADD CONSTRAINT "StockAuditTask_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "StockAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
