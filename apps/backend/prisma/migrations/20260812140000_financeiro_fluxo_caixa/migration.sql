-- CreateEnum
CREATE TYPE "BankAccountKind" AS ENUM ('CASH', 'CHECKING', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "CashFlowDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "CashFlowKind" AS ENUM ('RECEIPT', 'PAYMENT', 'MANUAL', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "CashFlowStatus" AS ENUM ('REALIZED', 'REVERSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CashFlowOrigin" AS ENUM ('SALE', 'PURCHASE', 'RECEIVABLE', 'PAYABLE', 'TRANSFER', 'MANUAL', 'OTHER');

-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN "kind" "BankAccountKind" NOT NULL DEFAULT 'OTHER';

-- CreateTable
CREATE TABLE "cash_flow_movements" (
    "id" TEXT NOT NULL,
    "sequentialId" SERIAL NOT NULL,
    "direction" "CashFlowDirection" NOT NULL,
    "kind" "CashFlowKind" NOT NULL,
    "status" "CashFlowStatus" NOT NULL DEFAULT 'REALIZED',
    "amount" DECIMAL(18,4) NOT NULL,
    "occurredAt" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "categoryId" TEXT,
    "costCenterId" TEXT,
    "origin" "CashFlowOrigin" NOT NULL DEFAULT 'MANUAL',
    "originRef" TEXT,
    "receivableMovementId" TEXT,
    "payableMovementId" TEXT,
    "transferGroupId" TEXT,
    "notes" TEXT,
    "operatorId" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "reversesMovementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_flow_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_flow_audit_logs" (
    "id" TEXT NOT NULL,
    "movementId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" DECIMAL(18,4),
    "message" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_flow_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "cash_flow_movements_sequentialId_key" ON "cash_flow_movements"("sequentialId");
CREATE UNIQUE INDEX "cash_flow_movements_receivableMovementId_key" ON "cash_flow_movements"("receivableMovementId");
CREATE UNIQUE INDEX "cash_flow_movements_payableMovementId_key" ON "cash_flow_movements"("payableMovementId");
CREATE UNIQUE INDEX "cash_flow_movements_idempotencyKey_key" ON "cash_flow_movements"("idempotencyKey");
CREATE INDEX "cash_flow_movements_occurredAt_idx" ON "cash_flow_movements"("occurredAt");
CREATE INDEX "cash_flow_movements_bankAccountId_occurredAt_idx" ON "cash_flow_movements"("bankAccountId", "occurredAt");
CREATE INDEX "cash_flow_movements_direction_status_idx" ON "cash_flow_movements"("direction", "status");
CREATE INDEX "cash_flow_movements_kind_status_idx" ON "cash_flow_movements"("kind", "status");
CREATE INDEX "cash_flow_movements_origin_idx" ON "cash_flow_movements"("origin");
CREATE INDEX "cash_flow_movements_categoryId_idx" ON "cash_flow_movements"("categoryId");
CREATE INDEX "cash_flow_movements_costCenterId_idx" ON "cash_flow_movements"("costCenterId");
CREATE INDEX "cash_flow_movements_transferGroupId_idx" ON "cash_flow_movements"("transferGroupId");
CREATE INDEX "cash_flow_movements_operatorId_idx" ON "cash_flow_movements"("operatorId");
CREATE INDEX "cash_flow_audit_logs_movementId_createdAt_idx" ON "cash_flow_audit_logs"("movementId", "createdAt");
CREATE INDEX "cash_flow_audit_logs_actorId_idx" ON "cash_flow_audit_logs"("actorId");

-- ForeignKeys
ALTER TABLE "cash_flow_movements" ADD CONSTRAINT "cash_flow_movements_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_flow_movements" ADD CONSTRAINT "cash_flow_movements_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_flow_movements" ADD CONSTRAINT "cash_flow_movements_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_flow_movements" ADD CONSTRAINT "cash_flow_movements_receivableMovementId_fkey" FOREIGN KEY ("receivableMovementId") REFERENCES "receivable_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_flow_movements" ADD CONSTRAINT "cash_flow_movements_payableMovementId_fkey" FOREIGN KEY ("payableMovementId") REFERENCES "payable_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_flow_movements" ADD CONSTRAINT "cash_flow_movements_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cash_flow_movements" ADD CONSTRAINT "cash_flow_movements_reversesMovementId_fkey" FOREIGN KEY ("reversesMovementId") REFERENCES "cash_flow_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_flow_audit_logs" ADD CONSTRAINT "cash_flow_audit_logs_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "cash_flow_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "cash_flow_audit_logs" ADD CONSTRAINT "cash_flow_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
