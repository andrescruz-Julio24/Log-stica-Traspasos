-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "presentation" TEXT,
ADD COLUMN     "variant" TEXT;

-- AlterTable
ALTER TABLE "Stock" ADD COLUMN     "sourceCheckedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CustomerOrder" ADD COLUMN     "dueAt" TIMESTAMP(3),
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'NORMAL';

-- AlterTable
ALTER TABLE "Transfer" ADD COLUMN     "closedWithDifferences" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "unfulfilled" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Dispatch" ADD COLUMN     "custodian" TEXT,
ADD COLUMN     "inspectedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Receipt" ADD COLUMN     "dispatchId" TEXT;

-- AlterTable
ALTER TABLE "ReceiptLine" ADD COLUMN     "applied" JSONB,
ADD COLUMN     "reversed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Incident" ADD COLUMN     "blocking" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "custodian" TEXT,
ADD COLUMN     "dispatchId" TEXT,
ADD COLUMN     "evidence" TEXT,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "quantity" INTEGER,
ADD COLUMN     "resolution" TEXT,
ADD COLUMN     "sku" TEXT;

-- CreateTable
CREATE TABLE "DispatchAllocation" (
    "id" TEXT NOT NULL,
    "dispatchLineId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "accepted" INTEGER NOT NULL DEFAULT 0,
    "sequence" INTEGER NOT NULL,

    CONSTRAINT "DispatchAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExceptionRequest" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "requester" TEXT NOT NULL,
    "approver" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),

    CONSTRAINT "ExceptionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DispatchAllocation_dispatchLineId_sequence_key" ON "DispatchAllocation"("dispatchLineId", "sequence");

-- AddForeignKey
ALTER TABLE "Receipt" ADD CONSTRAINT "Receipt_dispatchId_fkey" FOREIGN KEY ("dispatchId") REFERENCES "Dispatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchAllocation" ADD CONSTRAINT "DispatchAllocation_dispatchLineId_fkey" FOREIGN KEY ("dispatchLineId") REFERENCES "DispatchLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispatchAllocation" ADD CONSTRAINT "DispatchAllocation_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
