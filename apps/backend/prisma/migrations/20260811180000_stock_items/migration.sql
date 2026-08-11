-- CreateEnum
CREATE TYPE "StockItemStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "StockItemType" AS ENUM ('PRODUCT', 'RAW_MATERIAL', 'PACKAGING', 'SERVICE', 'OTHER');

-- CreateTable
CREATE TABLE "stock_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_brands" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_brands_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units_of_measure" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "units_of_measure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_items" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "status" "StockItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "itemType" "StockItemType" NOT NULL DEFAULT 'PRODUCT',
    "categoryId" TEXT,
    "brandId" TEXT,
    "locationId" TEXT,
    "measureUnitId" TEXT,
    "purchaseUnitId" TEXT,
    "saleUnitId" TEXT,
    "purchaseToMeasureFactor" DECIMAL(18,6),
    "saleToMeasureFactor" DECIMAL(18,6),
    "trackStock" BOOLEAN NOT NULL DEFAULT true,
    "minStock" DECIMAL(18,4),
    "maxStock" DECIMAL(18,4),
    "currentStock" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "trackLot" BOOLEAN NOT NULL DEFAULT false,
    "trackExpiry" BOOLEAN NOT NULL DEFAULT false,
    "costPrice" DECIMAL(18,4),
    "salePrice" DECIMAL(18,4),
    "ncm" TEXT,
    "cest" TEXT,
    "origin" TEXT,
    "defaultCfop" TEXT,
    "fiscalUnit" TEXT,
    "complementaryDescription" TEXT,
    "notes" TEXT,
    "manufacturer" TEXT,
    "mainSupplier" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_categories_name_key" ON "stock_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "stock_brands_name_key" ON "stock_brands"("name");

-- CreateIndex
CREATE UNIQUE INDEX "stock_locations_name_key" ON "stock_locations"("name");

-- CreateIndex
CREATE UNIQUE INDEX "units_of_measure_code_key" ON "units_of_measure"("code");

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_code_key" ON "stock_items"("code");

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_sku_key" ON "stock_items"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "stock_items_barcode_key" ON "stock_items"("barcode");

-- CreateIndex
CREATE INDEX "stock_items_description_idx" ON "stock_items"("description");

-- CreateIndex
CREATE INDEX "stock_items_status_idx" ON "stock_items"("status");

-- CreateIndex
CREATE INDEX "stock_items_itemType_idx" ON "stock_items"("itemType");

-- CreateIndex
CREATE INDEX "stock_items_categoryId_idx" ON "stock_items"("categoryId");

-- CreateIndex
CREATE INDEX "stock_items_brandId_idx" ON "stock_items"("brandId");

-- CreateIndex
CREATE INDEX "stock_items_locationId_idx" ON "stock_items"("locationId");

-- CreateIndex
CREATE INDEX "stock_items_measureUnitId_idx" ON "stock_items"("measureUnitId");

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "stock_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "stock_brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "stock_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_measureUnitId_fkey" FOREIGN KEY ("measureUnitId") REFERENCES "units_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_purchaseUnitId_fkey" FOREIGN KEY ("purchaseUnitId") REFERENCES "units_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_saleUnitId_fkey" FOREIGN KEY ("saleUnitId") REFERENCES "units_of_measure"("id") ON DELETE SET NULL ON UPDATE CASCADE;
