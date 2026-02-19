-- Fix drift: add missing payment/dispatch fields to InboundOrder

ALTER TABLE "InboundOrder"
  ADD COLUMN IF NOT EXISTS "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
  ADD COLUMN IF NOT EXISTS "paymentMode" "PaymentMode",
  ADD COLUMN IF NOT EXISTS "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "utrNo" TEXT,
  ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paymentRemarks" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentEnteredByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "paymentVerified" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "paymentVerifiedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "paymentVerifiedByUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "dispatchedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "dispatchedByUserId" TEXT;
