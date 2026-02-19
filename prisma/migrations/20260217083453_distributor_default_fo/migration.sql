/*
  Warnings:

  - A unique constraint covering the columns `[retailerId,isActive]` on the table `FieldOfficerRetailerMap` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "FieldOfficerRetailerMap_foUserId_retailerId_key";

-- AlterTable
ALTER TABLE "Distributor" ADD COLUMN     "defaultFoUserId" TEXT;

-- CreateIndex
CREATE INDEX "Distributor_defaultFoUserId_idx" ON "Distributor"("defaultFoUserId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldOfficerRetailerMap_retailerId_isActive_key" ON "FieldOfficerRetailerMap"("retailerId", "isActive");

-- CreateIndex
CREATE INDEX "FieldOfficerTarget_foUserId_monthKey_idx" ON "FieldOfficerTarget"("foUserId", "monthKey");

-- AddForeignKey
ALTER TABLE "Distributor" ADD CONSTRAINT "Distributor_defaultFoUserId_fkey" FOREIGN KEY ("defaultFoUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
