-- AlterTable
ALTER TABLE "InventoryBatch" ADD COLUMN     "mfgDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "InvoiceItem" ADD COLUMN     "mfgDate" TIMESTAMP(3);
