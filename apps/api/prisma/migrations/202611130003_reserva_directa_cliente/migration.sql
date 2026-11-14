-- Reserva directa de inventario verificado en ubicación del pedido.
CREATE TABLE "LocalStockCommitment" (
  "id" TEXT NOT NULL,
  "orderLineId" TEXT NOT NULL,
  "stockId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "actor" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LocalStockCommitment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "LocalStockCommitment_orderLineId_createdAt_idx" ON "LocalStockCommitment"("orderLineId", "createdAt");
ALTER TABLE "LocalStockCommitment" ADD CONSTRAINT "LocalStockCommitment_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LocalStockCommitment" ADD CONSTRAINT "LocalStockCommitment_stockId_fkey" FOREIGN KEY ("stockId") REFERENCES "Stock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
