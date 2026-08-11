-- CreateTable
CREATE TABLE "stock_lots" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "manufacturingDate" DATE,
    "expiryDate" DATE NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "locationId" TEXT,
    "enteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_lots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "stock_lots_expiryDate_idx" ON "stock_lots"("expiryDate");

-- CreateIndex
CREATE INDEX "stock_lots_itemId_idx" ON "stock_lots"("itemId");

-- CreateIndex
CREATE INDEX "stock_lots_locationId_idx" ON "stock_lots"("locationId");

-- CreateIndex
CREATE INDEX "stock_lots_lotNumber_idx" ON "stock_lots"("lotNumber");

-- CreateIndex
CREATE UNIQUE INDEX "stock_lots_itemId_lotNumber_key" ON "stock_lots"("itemId", "lotNumber");

-- AddForeignKey
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_lots" ADD CONSTRAINT "stock_lots_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "stock_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
