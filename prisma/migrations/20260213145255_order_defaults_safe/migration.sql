/*
  Warnings:

  - A unique constraint covering the columns `[gst]` on the table `Distributor` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "SalesTarget" (
    "id" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "targetAmount" INTEGER NOT NULL,
    "assignedById" TEXT,
    "fieldOfficerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesTarget_month_fieldOfficerId_key" ON "SalesTarget"("month", "fieldOfficerId");

-- CreateIndex
CREATE UNIQUE INDEX "Distributor_gst_key" ON "Distributor"("gst");
