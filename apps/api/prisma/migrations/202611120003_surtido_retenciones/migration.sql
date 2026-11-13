-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'BLOCKED';

-- AlterTable
ALTER TABLE "TransferLine" ADD COLUMN     "pickVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "picked" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "allocationId" TEXT,
ADD COLUMN     "assignedTo" TEXT,
ADD COLUMN     "disposition" TEXT,
ADD COLUMN     "returnedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Incident_allocationId_status_idx" ON "Incident"("allocationId", "status");

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_allocationId_fkey" FOREIGN KEY ("allocationId") REFERENCES "DispatchAllocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
