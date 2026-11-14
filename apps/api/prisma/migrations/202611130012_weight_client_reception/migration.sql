CREATE TABLE "WeightClientReception" (
  "id" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "receiverName" TEXT NOT NULL,
  "acceptedKg" DECIMAL(18,3) NOT NULL,
  "rejectedKg" DECIMAL(18,3) NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedBy" TEXT NOT NULL,
  "notes" TEXT,
  "evidenceRef" TEXT,
  CONSTRAINT "WeightClientReception_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WeightClientReception_shipmentId_key" ON "WeightClientReception"("shipmentId");
ALTER TABLE "WeightClientReception" ADD CONSTRAINT "WeightClientReception_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "WeightShipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
