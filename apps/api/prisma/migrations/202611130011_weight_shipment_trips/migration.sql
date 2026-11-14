ALTER TABLE "WeightShipment" ADD COLUMN "tripId" TEXT;
ALTER TABLE "WeightShipment" ADD CONSTRAINT "WeightShipment_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;
