-- CreateEnum
CREATE TYPE "AssignmentEventType" AS ENUM ('ASSIGN', 'REASSIGN', 'UNASSIGN');

-- CreateTable
CREATE TABLE "RetailerAssignmentActive" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "foUserId" TEXT NOT NULL,
    "distributorId" TEXT NOT NULL,
    "assignedByUserId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,

    CONSTRAINT "RetailerAssignmentActive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailerAssignmentHistory" (
    "id" TEXT NOT NULL,
    "retailerId" TEXT NOT NULL,
    "fromFoUserId" TEXT,
    "toFoUserId" TEXT,
    "distributorId" TEXT,
    "eventType" "AssignmentEventType" NOT NULL,
    "reason" TEXT,
    "actorUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetailerAssignmentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RetailerAssignmentActive_retailerId_key" ON "RetailerAssignmentActive"("retailerId");

-- CreateIndex
CREATE INDEX "RetailerAssignmentActive_foUserId_idx" ON "RetailerAssignmentActive"("foUserId");

-- CreateIndex
CREATE INDEX "RetailerAssignmentActive_distributorId_idx" ON "RetailerAssignmentActive"("distributorId");

-- CreateIndex
CREATE INDEX "RetailerAssignmentHistory_retailerId_createdAt_idx" ON "RetailerAssignmentHistory"("retailerId", "createdAt");

-- CreateIndex
CREATE INDEX "RetailerAssignmentHistory_distributorId_createdAt_idx" ON "RetailerAssignmentHistory"("distributorId", "createdAt");

-- CreateIndex
CREATE INDEX "RetailerAssignmentHistory_actorUserId_createdAt_idx" ON "RetailerAssignmentHistory"("actorUserId", "createdAt");

-- AddForeignKey
ALTER TABLE "RetailerAssignmentActive" ADD CONSTRAINT "RetailerAssignmentActive_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerAssignmentActive" ADD CONSTRAINT "RetailerAssignmentActive_foUserId_fkey" FOREIGN KEY ("foUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerAssignmentActive" ADD CONSTRAINT "RetailerAssignmentActive_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerAssignmentHistory" ADD CONSTRAINT "RetailerAssignmentHistory_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerAssignmentHistory" ADD CONSTRAINT "RetailerAssignmentHistory_fromFoUserId_fkey" FOREIGN KEY ("fromFoUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerAssignmentHistory" ADD CONSTRAINT "RetailerAssignmentHistory_toFoUserId_fkey" FOREIGN KEY ("toFoUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerAssignmentHistory" ADD CONSTRAINT "RetailerAssignmentHistory_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "Distributor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailerAssignmentHistory" ADD CONSTRAINT "RetailerAssignmentHistory_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
