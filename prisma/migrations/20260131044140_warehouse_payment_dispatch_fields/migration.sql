-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE');

-- CreateEnum
CREATE TYPE "ShippingMode" AS ENUM ('COURIER', 'TRANSPORT');

-- AlterTable
ALTER TABLE "InboundOrder" ADD COLUMN     "courierName" TEXT,
ADD COLUMN     "dispatchDate" TIMESTAMP(3),
ADD COLUMN     "lrNo" TEXT,
ADD COLUMN     "shippingMode" "ShippingMode",
ADD COLUMN     "transportName" TEXT;

-- AlterTable
ALTER TABLE "InboundOrderItem" ADD COLUMN     "batchNo" TEXT,
ADD COLUMN     "expiryDate" TIMESTAMP(3),
ADD COLUMN     "mfgDate" TIMESTAMP(3),
ADD COLUMN     "rate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "paymentMode" "PaymentMode",
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "utrNo" TEXT;
