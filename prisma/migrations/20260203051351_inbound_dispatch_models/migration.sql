-- CreateTable
CREATE TABLE "InboundDispatch" (
    "id" TEXT NOT NULL,
    "inboundOrderId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "dispatchDate" TIMESTAMP(3) NOT NULL,
    "shippingMode" "ShippingMode" NOT NULL,
    "carrierName" TEXT NOT NULL,
    "trackingNo" TEXT NOT NULL,
    "lrNo" TEXT,
    "parcels" INTEGER NOT NULL DEFAULT 1,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InboundDispatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboundDispatchItem" (
    "id" TEXT NOT NULL,
    "inboundDispatchId" TEXT NOT NULL,
    "inboundOrderItemId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "orderedQtyPcs" INTEGER NOT NULL,
    "dispatchQtyPcs" INTEGER NOT NULL,
    "batchNo" TEXT NOT NULL,
    "mfgDate" TIMESTAMP(3) NOT NULL,
    "expiryDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundDispatchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InboundDispatch_inboundOrderId_createdAt_idx" ON "InboundDispatch"("inboundOrderId", "createdAt");

-- CreateIndex
CREATE INDEX "InboundDispatch_trackingNo_idx" ON "InboundDispatch"("trackingNo");

-- CreateIndex
CREATE INDEX "InboundDispatchItem_inboundDispatchId_idx" ON "InboundDispatchItem"("inboundDispatchId");

-- CreateIndex
CREATE INDEX "InboundDispatchItem_inboundOrderItemId_idx" ON "InboundDispatchItem"("inboundOrderItemId");

-- AddForeignKey
ALTER TABLE "InboundDispatch" ADD CONSTRAINT "InboundDispatch_inboundOrderId_fkey" FOREIGN KEY ("inboundOrderId") REFERENCES "InboundOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundDispatch" ADD CONSTRAINT "InboundDispatch_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboundDispatchItem" ADD CONSTRAINT "InboundDispatchItem_inboundDispatchId_fkey" FOREIGN KEY ("inboundDispatchId") REFERENCES "InboundDispatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
