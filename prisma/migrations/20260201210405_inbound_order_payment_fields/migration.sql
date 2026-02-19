-- CreateIndex
CREATE INDEX "InboundOrder_paymentStatus_paymentVerified_idx" ON "InboundOrder"("paymentStatus", "paymentVerified");

-- CreateIndex
CREATE INDEX "InboundOrder_createdByUserId_idx" ON "InboundOrder"("createdByUserId");

-- AddForeignKey
ALTER TABLE "InboundOrder" ADD CONSTRAINT "InboundOrder_paymentEnteredByUserId_fkey" FOREIGN KEY ("paymentEnteredByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundOrder" ADD CONSTRAINT "InboundOrder_paymentVerifiedByUserId_fkey" FOREIGN KEY ("paymentVerifiedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundOrder" ADD CONSTRAINT "InboundOrder_dispatchedByUserId_fkey" FOREIGN KEY ("dispatchedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
