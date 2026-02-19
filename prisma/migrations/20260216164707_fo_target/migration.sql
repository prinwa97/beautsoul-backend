-- CreateTable
CREATE TABLE "FieldOfficerTarget" (
    "id" TEXT NOT NULL,
    "foUserId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "locked" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldOfficerTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FieldOfficerTarget_foUserId_monthKey_key" ON "FieldOfficerTarget"("foUserId", "monthKey");
