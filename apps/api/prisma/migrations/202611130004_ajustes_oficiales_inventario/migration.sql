-- Aplicación oficial de un conteo digital: evidencia, causal, versión y actor.
ALTER TABLE "InventoryObservation" ADD COLUMN "stockVersionSnapshot" INTEGER;
ALTER TABLE "InventoryObservation" ADD COLUMN "appliedAt" TIMESTAMP(3);
ALTER TABLE "InventoryObservation" ADD COLUMN "appliedBy" TEXT;
ALTER TABLE "InventoryObservation" ADD COLUMN "appliedReason" TEXT;
ALTER TABLE "InventoryObservation" ADD COLUMN "appliedPhysical" INTEGER;
