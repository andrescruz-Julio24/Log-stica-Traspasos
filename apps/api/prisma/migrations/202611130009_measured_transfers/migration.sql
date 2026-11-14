CREATE TABLE "MeasuredTransferLine" (
 "id" TEXT NOT NULL, "transferId" TEXT NOT NULL, "productId" TEXT NOT NULL,
 "unit" "InventoryBaseUnit" NOT NULL,
 "requested" DECIMAL(18,3) NOT NULL, "reserved" DECIMAL(18,3) NOT NULL DEFAULT 0,
 "dispatched" DECIMAL(18,3) NOT NULL DEFAULT 0, "accepted" DECIMAL(18,3) NOT NULL DEFAULT 0,
 "blocked" DECIMAL(18,3) NOT NULL DEFAULT 0, "estimatedPackages" INTEGER,
 "averageWeightKg" DECIMAL(18,3),
 CONSTRAINT "MeasuredTransferLine_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MeasuredTransferLine_transferId_productId_key" ON "MeasuredTransferLine"("transferId","productId");
ALTER TABLE "MeasuredTransferLine" ADD CONSTRAINT "MeasuredTransferLine_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MeasuredTransferLine" ADD CONSTRAINT "MeasuredTransferLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "MeasuredDispatch" (
 "id" TEXT NOT NULL, "transferId" TEXT NOT NULL, "lineId" TEXT NOT NULL,
 "quantity" DECIMAL(18,3) NOT NULL, "custodian" TEXT NOT NULL,
 "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "dispatchedBy" TEXT NOT NULL,
 CONSTRAINT "MeasuredDispatch_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MeasuredDispatch_transferId_dispatchedAt_idx" ON "MeasuredDispatch"("transferId","dispatchedAt");
ALTER TABLE "MeasuredDispatch" ADD CONSTRAINT "MeasuredDispatch_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MeasuredDispatch" ADD CONSTRAINT "MeasuredDispatch_lineId_fkey" FOREIGN KEY ("lineId") REFERENCES "MeasuredTransferLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE TABLE "MeasuredReceipt" (
 "id" TEXT NOT NULL, "dispatchId" TEXT NOT NULL,
 "presented" DECIMAL(18,3) NOT NULL, "accepted" DECIMAL(18,3) NOT NULL,
 "blocked" DECIMAL(18,3) NOT NULL,
 "observedAt" TIMESTAMP(3) NOT NULL,
 "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "receivedBy" TEXT NOT NULL,
 "notes" TEXT, "evidenceRef" TEXT, CONSTRAINT "MeasuredReceipt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MeasuredReceipt_dispatchId_receivedAt_idx" ON "MeasuredReceipt"("dispatchId","receivedAt");
ALTER TABLE "MeasuredReceipt" ADD CONSTRAINT "MeasuredReceipt_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "MeasuredDispatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
