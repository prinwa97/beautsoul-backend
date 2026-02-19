-- CreateTable
CREATE TABLE "RetailerStockAudit" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "fieldOfficerId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "auditDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailerStockAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerStockAuditItem" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "batchNo" TEXT,
    "expiryDate" TIMESTAMP(3),
    "systemQty" INTEGER NOT NULL,
    "physicalQty" INTEGER NOT NULL,
    "variance" INTEGER NOT NULL,

    CONSTRAINT "RetailerStockAuditItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerStockSnapshot" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "batchNo" TEXT,
    "expiryDate" TIMESTAMP(3),
    "qty" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailerStockSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RetailerStockAudit_distributorId_retailerId_auditDate_idx" ON "RetailerStockAudit"("distributorId", "retailerId", "auditDate");

-- CreateIndex
CREATE INDEX "RetailerStockAudit_fieldOfficerId_auditDate_idx" ON "RetailerStockAudit"("fieldOfficerId", "auditDate");

-- CreateIndex
CREATE INDEX "RetailerStockAuditItem_auditId_idx" ON "RetailerStockAuditItem"("auditId");

-- CreateIndex
CREATE INDEX "RetailerStockAuditItem_productName_idx" ON "RetailerStockAuditItem"("productName");

-- CreateIndex
CREATE INDEX "RetailerStockSnapshot_distributorId_retailerId_idx" ON "RetailerStockSnapshot"("distributorId", "retailerId");

-- CreateIndex
CREATE INDEX "RetailerStockSnapshot_productName_idx" ON "RetailerStockSnapshot"("productName");

-- AddForeignKey
ALTER TABLE "RetailerStockAudit" ADD CONSTRAINT "RetailerStockAudit_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerStockAudit" ADD CONSTRAINT "RetailerStockAudit_fieldOfficerId_fkey" FOREIGN KEY ("fieldOfficerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerStockAuditItem" ADD CONSTRAINT "RetailerStockAuditItem_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "RetailerStockAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerStockSnapshot" ADD CONSTRAINT "RetailerStockSnapshot_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
