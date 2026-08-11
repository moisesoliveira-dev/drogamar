-- CreateEnum
CREATE TYPE "CustomerDocumentType" AS ENUM ('CPF', 'CNPJ', 'OTHER');

-- CreateEnum
CREATE TYPE "SaleCartStatus" AS ENUM ('OPEN', 'CHECKOUT_PENDING', 'CLOSED', 'CANCELLED');

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" "CustomerDocumentType",
    "document" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_carts" (
    "id" TEXT NOT NULL,
    "sequentialId" SERIAL NOT NULL,
    "status" "SaleCartStatus" NOT NULL DEFAULT 'OPEN',
    "operatorId" TEXT NOT NULL,
    "customerId" TEXT,
    "cartDiscount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "cartSurcharge" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "lastValidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_cart_items" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "unitPrice" DECIMAL(18,4) NOT NULL,
    "lineDiscount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "unitCode" TEXT,
    "productCode" TEXT NOT NULL,
    "productDescription" TEXT NOT NULL,
    "sku" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_cart_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customers_code_key" ON "customers"("code");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_document_idx" ON "customers"("document");

-- CreateIndex
CREATE INDEX "customers_active_idx" ON "customers"("active");

-- CreateIndex
CREATE UNIQUE INDEX "sale_carts_sequentialId_key" ON "sale_carts"("sequentialId");

-- CreateIndex
CREATE INDEX "sale_carts_operatorId_status_idx" ON "sale_carts"("operatorId", "status");

-- CreateIndex
CREATE INDEX "sale_carts_customerId_idx" ON "sale_carts"("customerId");

-- CreateIndex
CREATE INDEX "sale_carts_status_idx" ON "sale_carts"("status");

-- CreateIndex
CREATE INDEX "sale_cart_items_cartId_idx" ON "sale_cart_items"("cartId");

-- CreateIndex
CREATE INDEX "sale_cart_items_stockItemId_idx" ON "sale_cart_items"("stockItemId");

-- CreateIndex
CREATE UNIQUE INDEX "sale_cart_items_cartId_stockItemId_key" ON "sale_cart_items"("cartId", "stockItemId");

-- AddForeignKey
ALTER TABLE "sale_carts" ADD CONSTRAINT "sale_carts_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_carts" ADD CONSTRAINT "sale_carts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_cart_items" ADD CONSTRAINT "sale_cart_items_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "sale_carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_cart_items" ADD CONSTRAINT "sale_cart_items_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "stock_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
