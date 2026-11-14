ALTER TABLE "Incident" ADD COLUMN "supplierReceiptId" TEXT;
ALTER TABLE "Incident" ADD COLUMN "supplierInspectionLineId" TEXT;
CREATE INDEX "Incident_supplierReceiptId_status_idx" ON "Incident"("supplierReceiptId","status");
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_supplierReceiptId_fkey" FOREIGN KEY ("supplierReceiptId") REFERENCES "SupplierReceipt"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_supplierInspectionLineId_fkey" FOREIGN KEY ("supplierInspectionLineId") REFERENCES "SupplierInspectionLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
