-- CreateTable
CREATE TABLE "DistributorProductRate" (
    "id" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "saleRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DistributorProductRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DistributorProductRate_distributorId_idx" ON "DistributorProductRate"("distributorId");

-- CreateIndex
CREATE INDEX "DistributorProductRate_productName_idx" ON "DistributorProductRate"("productName");

-- CreateIndex
CREATE UNIQUE INDEX "DistributorProductRate_distributorId_productName_key" ON "DistributorProductRate"("distributorId", "productName");
