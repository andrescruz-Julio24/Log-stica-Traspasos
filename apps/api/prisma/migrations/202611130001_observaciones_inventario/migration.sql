-- Observaciones de inventario: referencias de Excel separadas de mediciones verificadas.
CREATE TYPE "InventoryObservationSource" AS ENUM ('PAPER', 'EXCEL', 'DIGITAL');
CREATE TYPE "InventoryObservationMethod" AS ENUM ('COUNT', 'WEIGHT', 'ESTIMATE');
CREATE TYPE "InventoryObservationStatus" AS ENUM ('REFERENCE', 'VERIFIED');

CREATE TABLE "InventoryObservation" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "quantity" DECIMAL(18,3) NOT NULL,
  "unit" TEXT NOT NULL,
  "source" "InventoryObservationSource" NOT NULL,
  "method" "InventoryObservationMethod" NOT NULL,
  "status" "InventoryObservationStatus" NOT NULL DEFAULT 'REFERENCE',
  "reference" TEXT,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedBy" TEXT NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "verifiedBy" TEXT,
  "stockPhysicalSnapshot" INTEGER,
  CONSTRAINT "InventoryObservation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "InventoryObservation_locationId_recordedAt_idx" ON "InventoryObservation"("locationId", "recordedAt");
CREATE INDEX "InventoryObservation_productId_recordedAt_idx" ON "InventoryObservation"("productId", "recordedAt");
ALTER TABLE "InventoryObservation" ADD CONSTRAINT "InventoryObservation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "InventoryObservation" ADD CONSTRAINT "InventoryObservation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
