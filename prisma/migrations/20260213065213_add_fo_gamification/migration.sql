-- CreateEnum
CREATE TYPE "RewardRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FULFILLED');

-- CreateTable
CREATE TABLE "FoMonthlyTarget" (
    "id" TEXT NOT NULL,
    "foUserId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "targetAmt" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoMonthlyTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoPointsLedger" (
    "id" TEXT NOT NULL,
    "foUserId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT,
    "refType" TEXT,
    "refId" TEXT,
    "metaJson" JSONB,

    CONSTRAINT "FoPointsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardCatalog" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "pointsCost" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardRedeemRequest" (
    "id" TEXT NOT NULL,
    "foUserId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "status" "RewardRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RewardRedeemRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FoMonthlyTarget_monthKey_idx" ON "FoMonthlyTarget"("monthKey");

-- CreateIndex
CREATE INDEX "FoMonthlyTarget_foUserId_idx" ON "FoMonthlyTarget"("foUserId");

-- CreateIndex
CREATE UNIQUE INDEX "FoMonthlyTarget_foUserId_monthKey_key" ON "FoMonthlyTarget"("foUserId", "monthKey");

-- CreateIndex
CREATE INDEX "FoPointsLedger_foUserId_date_idx" ON "FoPointsLedger"("foUserId", "date");

-- CreateIndex
CREATE INDEX "FoPointsLedger_refType_refId_idx" ON "FoPointsLedger"("refType", "refId");

-- CreateIndex
CREATE INDEX "RewardCatalog_active_idx" ON "RewardCatalog"("active");

-- CreateIndex
CREATE INDEX "RewardRedeemRequest_foUserId_createdAt_idx" ON "RewardRedeemRequest"("foUserId", "createdAt");

-- CreateIndex
CREATE INDEX "RewardRedeemRequest_status_idx" ON "RewardRedeemRequest"("status");

-- CreateIndex
CREATE INDEX "RewardRedeemRequest_rewardId_idx" ON "RewardRedeemRequest"("rewardId");

-- AddForeignKey
ALTER TABLE "FoMonthlyTarget" ADD CONSTRAINT "FoMonthlyTarget_foUserId_fkey" FOREIGN KEY ("foUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoPointsLedger" ADD CONSTRAINT "FoPointsLedger_foUserId_fkey" FOREIGN KEY ("foUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedeemRequest" ADD CONSTRAINT "RewardRedeemRequest_foUserId_fkey" FOREIGN KEY ("foUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardRedeemRequest" ADD CONSTRAINT "RewardRedeemRequest_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "RewardCatalog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
