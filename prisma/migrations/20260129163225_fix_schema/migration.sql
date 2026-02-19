-- AlterTable
ALTER TABLE "StockLot" ADD COLUMN     "mfgDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProductCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "barcode" TEXT,
    "hsn" TEXT,
    "mrp" DOUBLE PRECISION,
    "salePrice" DOUBLE PRECISION,
    "gstRate" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductCatalog_name_key" ON "ProductCatalog"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCatalog_barcode_key" ON "ProductCatalog"("barcode");

-- CreateIndex
CREATE INDEX "ProductCatalog_isActive_idx" ON "ProductCatalog"("isActive");

-- CreateIndex
CREATE INDEX "ProductCatalog_name_idx" ON "ProductCatalog"("name");
