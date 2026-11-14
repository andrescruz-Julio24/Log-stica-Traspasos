CREATE TYPE "InventoryBaseUnit" AS ENUM ('PIEZA', 'KG', 'CAJA');
CREATE TYPE "SupplierReceiptStatus" AS ENUM ('OPEN', 'PARTIAL', 'INSPECTED');
ALTER TABLE "Product" ADD COLUMN "baseUnit" "InventoryBaseUnit" NOT NULL DEFAULT 'PIEZA';

CREATE TABLE "UnitStock" (
 "id" TEXT NOT NULL, "productId" TEXT NOT NULL, "locationId" TEXT NOT NULL,
 "unit" "InventoryBaseUnit" NOT NULL,
 "physical" DECIMAL(18,3) NOT NULL DEFAULT 0,
 "reserved" DECIMAL(18,3) NOT NULL DEFAULT 0,
 "blocked" DECIMAL(18,3) NOT NULL DEFAULT 0,
 "version" INTEGER NOT NULL DEFAULT 0,
 CONSTRAINT "UnitStock_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UnitStock_productId_locationId_key" ON "UnitStock"("productId", "locationId");
CREATE INDEX "UnitStock_locationId_unit_idx" ON "UnitStock"("locationId","unit");
ALTER TABLE "UnitStock" ADD CONSTRAINT "UnitStock_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UnitStock" ADD CONSTRAINT "UnitStock_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SupplierReceipt" (
 "id" TEXT NOT NULL, "supplier" TEXT NOT NULL, "reference" TEXT,
 "destinationId" TEXT NOT NULL, "status" "SupplierReceiptStatus" NOT NULL DEFAULT 'OPEN',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdBy" TEXT NOT NULL,
 CONSTRAINT "SupplierReceipt_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupplierReceipt_destinationId_createdAt_idx" ON "SupplierReceipt"("destinationId","createdAt");
ALTER TABLE "SupplierReceipt" ADD CONSTRAINT "SupplierReceipt_destinationId_fkey" FOREIGN KEY ("destinationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SupplierReceiptLine" (
 "id" TEXT NOT NULL, "receiptId" TEXT NOT NULL, "productId" TEXT NOT NULL,
 "unit" "InventoryBaseUnit" NOT NULL, "expected" DECIMAL(18,3) NOT NULL,
 "presented" DECIMAL(18,3) NOT NULL DEFAULT 0, "accepted" DECIMAL(18,3) NOT NULL DEFAULT 0,
 "blocked" DECIMAL(18,3) NOT NULL DEFAULT 0,
 CONSTRAINT "SupplierReceiptLine_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupplierReceiptLine_receiptId_productId_key" ON "SupplierReceiptLine"("receiptId","productId");
ALTER TABLE "SupplierReceiptLine" ADD CONSTRAINT "SupplierReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "SupplierReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierReceiptLine" ADD CONSTRAINT "SupplierReceiptLine_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SupplierInspection" (
 "id" TEXT NOT NULL, "receiptId" TEXT NOT NULL, "observedAt" TIMESTAMP(3) NOT NULL,
 "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "inspectedBy" TEXT NOT NULL,
 "notes" TEXT, "evidenceRef" TEXT, CONSTRAINT "SupplierInspection_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupplierInspection_receiptId_recordedAt_idx" ON "SupplierInspection"("receiptId","recordedAt");
ALTER TABLE "SupplierInspection" ADD CONSTRAINT "SupplierInspection_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "SupplierReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SupplierInspectionLine" (
 "id" TEXT NOT NULL, "inspectionId" TEXT NOT NULL, "receiptLineId" TEXT NOT NULL,
 "presented" DECIMAL(18,3) NOT NULL, "accepted" DECIMAL(18,3) NOT NULL,
 "blocked" DECIMAL(18,3) NOT NULL, CONSTRAINT "SupplierInspectionLine_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SupplierInspectionLine_inspectionId_receiptLineId_key" ON "SupplierInspectionLine"("inspectionId","receiptLineId");
ALTER TABLE "SupplierInspectionLine" ADD CONSTRAINT "SupplierInspectionLine_inspectionId_fkey" FOREIGN KEY ("inspectionId") REFERENCES "SupplierInspection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierInspectionLine" ADD CONSTRAINT "SupplierInspectionLine_receiptLineId_fkey" FOREIGN KEY ("receiptLineId") REFERENCES "SupplierReceiptLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "SupplierBlockedReturn" (
 "id" TEXT NOT NULL, "receiptLineId" TEXT NOT NULL, "quantity" DECIMAL(18,3) NOT NULL,
 "reason" TEXT NOT NULL, "returnedBy" TEXT NOT NULL,
 "returnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SupplierBlockedReturn_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SupplierBlockedReturn_receiptLineId_returnedAt_idx" ON "SupplierBlockedReturn"("receiptLineId","returnedAt");
ALTER TABLE "SupplierBlockedReturn" ADD CONSTRAINT "SupplierBlockedReturn_receiptLineId_fkey" FOREIGN KEY ("receiptLineId") REFERENCES "SupplierReceiptLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
