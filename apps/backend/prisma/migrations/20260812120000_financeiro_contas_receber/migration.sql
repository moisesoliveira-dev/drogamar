-- CreateEnum
CREATE TYPE "ReceivableOrigin" AS ENUM ('MANUAL', 'SALE', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "ReceivableStatus" AS ENUM ('OPEN', 'PARTIAL', 'SETTLED', 'CANCELLED', 'RENEGOTIATED');

-- CreateEnum
CREATE TYPE "ReceivableInstallmentStatus" AS ENUM ('OPEN', 'PARTIAL', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReceivableMovementType" AS ENUM ('RECEIPT', 'REVERSAL');

-- CreateTable
CREATE TABLE "finance_payment_methods" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "finance_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bankName" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_receivables" (
    "id" TEXT NOT NULL,
    "sequentialId" SERIAL NOT NULL,
    "customerId" TEXT NOT NULL,
    "origin" "ReceivableOrigin" NOT NULL DEFAULT 'MANUAL',
    "originRef" TEXT,
    "description" TEXT NOT NULL,
    "document" TEXT,
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "originalAmount" DECIMAL(18,4) NOT NULL,
    "discountAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "interestAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "fineAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "status" "ReceivableStatus" NOT NULL DEFAULT 'OPEN',
    "paymentMethodId" TEXT,
    "bankAccountId" TEXT,
    "costCenterId" TEXT,
    "installmentCount" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "renegotiatedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "account_receivables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivable_installments" (
    "id" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "paidAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "interestAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "fineAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "status" "ReceivableInstallmentStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "receivable_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivable_movements" (
    "id" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "installmentId" TEXT,
    "type" "ReceivableMovementType" NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "paidAt" DATE NOT NULL,
    "paymentMethodId" TEXT,
    "bankAccountId" TEXT,
    "interestAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "fineAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "operatorId" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "reversesMovementId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "receivable_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receivable_audit_logs" (
    "id" TEXT NOT NULL,
    "receivableId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" DECIMAL(18,4),
    "message" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "receivable_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "finance_payment_methods_code_key" ON "finance_payment_methods"("code");
CREATE UNIQUE INDEX "bank_accounts_code_key" ON "bank_accounts"("code");
CREATE UNIQUE INDEX "cost_centers_code_key" ON "cost_centers"("code");
CREATE UNIQUE INDEX "account_receivables_sequentialId_key" ON "account_receivables"("sequentialId");
CREATE INDEX "account_receivables_customerId_idx" ON "account_receivables"("customerId");
CREATE INDEX "account_receivables_status_idx" ON "account_receivables"("status");
CREATE INDEX "account_receivables_dueDate_idx" ON "account_receivables"("dueDate");
CREATE INDEX "account_receivables_origin_idx" ON "account_receivables"("origin");
CREATE INDEX "account_receivables_document_idx" ON "account_receivables"("document");
CREATE INDEX "account_receivables_createdById_idx" ON "account_receivables"("createdById");
CREATE UNIQUE INDEX "receivable_installments_receivableId_number_key" ON "receivable_installments"("receivableId", "number");
CREATE INDEX "receivable_installments_dueDate_idx" ON "receivable_installments"("dueDate");
CREATE INDEX "receivable_installments_status_idx" ON "receivable_installments"("status");
CREATE UNIQUE INDEX "receivable_movements_idempotencyKey_key" ON "receivable_movements"("idempotencyKey");
CREATE INDEX "receivable_movements_receivableId_createdAt_idx" ON "receivable_movements"("receivableId", "createdAt");
CREATE INDEX "receivable_movements_installmentId_idx" ON "receivable_movements"("installmentId");
CREATE INDEX "receivable_movements_operatorId_idx" ON "receivable_movements"("operatorId");
CREATE INDEX "receivable_movements_type_idx" ON "receivable_movements"("type");
CREATE INDEX "receivable_audit_logs_receivableId_createdAt_idx" ON "receivable_audit_logs"("receivableId", "createdAt");
CREATE INDEX "receivable_audit_logs_actorId_idx" ON "receivable_audit_logs"("actorId");

-- FKs
ALTER TABLE "account_receivables" ADD CONSTRAINT "account_receivables_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "account_receivables" ADD CONSTRAINT "account_receivables_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "finance_payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "account_receivables" ADD CONSTRAINT "account_receivables_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "account_receivables" ADD CONSTRAINT "account_receivables_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "account_receivables" ADD CONSTRAINT "account_receivables_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "account_receivables" ADD CONSTRAINT "account_receivables_renegotiatedFromId_fkey" FOREIGN KEY ("renegotiatedFromId") REFERENCES "account_receivables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "receivable_installments" ADD CONSTRAINT "receivable_installments_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "account_receivables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "receivable_movements" ADD CONSTRAINT "receivable_movements_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "account_receivables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "receivable_movements" ADD CONSTRAINT "receivable_movements_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "receivable_installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "receivable_movements" ADD CONSTRAINT "receivable_movements_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "finance_payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "receivable_movements" ADD CONSTRAINT "receivable_movements_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "receivable_movements" ADD CONSTRAINT "receivable_movements_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receivable_movements" ADD CONSTRAINT "receivable_movements_reversesMovementId_fkey" FOREIGN KEY ("reversesMovementId") REFERENCES "receivable_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "receivable_audit_logs" ADD CONSTRAINT "receivable_audit_logs_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "account_receivables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "receivable_audit_logs" ADD CONSTRAINT "receivable_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
