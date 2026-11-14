-- Despacho comercial y recepción efectiva: independientes de los traspasos internos.
CREATE TABLE "ClientShipment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "originId" TEXT NOT NULL,
  "custodian" TEXT NOT NULL,
  "reference" TEXT,
  "dispatchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dispatchedBy" TEXT NOT NULL,
  CONSTRAINT "ClientShipment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClientShipment_orderId_dispatchedAt_idx" ON "ClientShipment"("orderId", "dispatchedAt");
ALTER TABLE "ClientShipment" ADD CONSTRAINT "ClientShipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientShipment" ADD CONSTRAINT "ClientShipment_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ClientShipmentLine" (
  "id" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "orderLineId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  CONSTRAINT "ClientShipmentLine_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClientShipmentLine_shipmentId_orderLineId_key" ON "ClientShipmentLine"("shipmentId", "orderLineId");
ALTER TABLE "ClientShipmentLine" ADD CONSTRAINT "ClientShipmentLine_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "ClientShipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientShipmentLine" ADD CONSTRAINT "ClientShipmentLine_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ClientReception" (
  "id" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "receiverName" TEXT NOT NULL,
  "observedAt" TIMESTAMP(3) NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "recordedBy" TEXT NOT NULL,
  "notes" TEXT,
  "evidenceRef" TEXT,
  CONSTRAINT "ClientReception_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ClientReception_shipmentId_recordedAt_idx" ON "ClientReception"("shipmentId", "recordedAt");
ALTER TABLE "ClientReception" ADD CONSTRAINT "ClientReception_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "ClientShipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "ClientReceptionLine" (
  "id" TEXT NOT NULL,
  "receptionId" TEXT NOT NULL,
  "shipmentLineId" TEXT NOT NULL,
  "accepted" INTEGER NOT NULL,
  "rejected" INTEGER NOT NULL,
  CONSTRAINT "ClientReceptionLine_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ClientReceptionLine_receptionId_shipmentLineId_key" ON "ClientReceptionLine"("receptionId", "shipmentLineId");
ALTER TABLE "ClientReceptionLine" ADD CONSTRAINT "ClientReceptionLine_receptionId_fkey" FOREIGN KEY ("receptionId") REFERENCES "ClientReception"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ClientReceptionLine" ADD CONSTRAINT "ClientReceptionLine_shipmentLineId_fkey" FOREIGN KEY ("shipmentLineId") REFERENCES "ClientShipmentLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
