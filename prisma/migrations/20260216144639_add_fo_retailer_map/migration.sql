-- CreateTable
CREATE TABLE "FieldOfficerRetailerMap" (
    "id" TEXT NOT NULL,
    "foUserId" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "distributorId" TEXT,
    "assignedByUserId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "note" TEXT,

    CONSTRAINT "FieldOfficerRetailerMap_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FieldOfficerRetailerMap_foUserId_isActive_idx" ON "FieldOfficerRetailerMap"("foUserId", "isActive");

-- CreateIndex
CREATE INDEX "FieldOfficerRetailerMap_retailerId_isActive_idx" ON "FieldOfficerRetailerMap"("retailerId", "isActive");

-- CreateIndex
CREATE INDEX "FieldOfficerRetailerMap_distributorId_isActive_idx" ON "FieldOfficerRetailerMap"("distributorId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "FieldOfficerRetailerMap_foUserId_retailerId_key" ON "FieldOfficerRetailerMap"("foUserId", "retailerId");

-- AddForeignKey
ALTER TABLE "FieldOfficerRetailerMap" ADD CONSTRAINT "FieldOfficerRetailerMap_foUserId_fkey" FOREIGN KEY ("foUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldOfficerRetailerMap" ADD CONSTRAINT "FieldOfficerRetailerMap_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldOfficerRetailerMap" ADD CONSTRAINT "FieldOfficerRetailerMap_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
