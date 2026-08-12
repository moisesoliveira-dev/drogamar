-- CreateEnum
CREATE TYPE "SalePaymentMethod" AS ENUM ('CASH');

-- CreateEnum
CREATE TYPE "SalePaymentStatus" AS ENUM ('CONFIRMED', 'CANCELLED');

-- AlterTable
ALTER TABLE "sale_carts" ADD COLUMN "closedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "sale_receipts" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "sequentialId" INTEGER NOT NULL,
    "operatorId" TEXT NOT NULL,
    "customerId" TEXT,
    "subtotal" DECIMAL(18,4) NOT NULL,
    "discounts" DECIMAL(18,4) NOT NULL,
    "surcharges" DECIMAL(18,4) NOT NULL,
    "total" DECIMAL(18,4) NOT NULL,
    "amountPaid" DECIMAL(18,4) NOT NULL,
    "changeAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "idempotencyKey" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_payments" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "receiptId" TEXT,
    "method" "SalePaymentMethod" NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "tenderedAmount" DECIMAL(18,4),
    "changeAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "status" "SalePaymentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sale_receipts_cartId_key" ON "sale_receipts"("cartId");

-- CreateIndex
CREATE UNIQUE INDEX "sale_receipts_idempotencyKey_key" ON "sale_receipts"("idempotencyKey");

-- CreateIndex
CREATE INDEX "sale_receipts_operatorId_idx" ON "sale_receipts"("operatorId");

-- CreateIndex
CREATE INDEX "sale_receipts_sequentialId_idx" ON "sale_receipts"("sequentialId");

-- CreateIndex
CREATE INDEX "sale_receipts_closedAt_idx" ON "sale_receipts"("closedAt");

-- CreateIndex
CREATE INDEX "sale_payments_cartId_idx" ON "sale_payments"("cartId");

-- CreateIndex
CREATE INDEX "sale_payments_receiptId_idx" ON "sale_payments"("receiptId");

-- CreateIndex
CREATE INDEX "sale_payments_method_idx" ON "sale_payments"("method");

-- AddForeignKey
ALTER TABLE "sale_receipts" ADD CONSTRAINT "sale_receipts_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "sale_carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "sale_carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_payments" ADD CONSTRAINT "sale_payments_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "sale_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
