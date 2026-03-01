/*
  Warnings:

  - A unique constraint covering the columns `[salesManagerId,day,title]` on the table `SalesManagerTask` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
ALTER TYPE "SalesTaskType" ADD VALUE 'DAILY_CLOSE';

-- CreateIndex
CREATE UNIQUE INDEX "SalesManagerTask_salesManagerId_day_title_key" ON "SalesManagerTask"("salesManagerId", "day", "title");

-- AddForeignKey
ALTER TABLE "SalesManagerTask" ADD CONSTRAINT "SalesManagerTask_salesManagerId_fkey" FOREIGN KEY ("salesManagerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesManagerDailyClose" ADD CONSTRAINT "SalesManagerDailyClose_salesManagerId_fkey" FOREIGN KEY ("salesManagerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
