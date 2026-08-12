-- CreateEnum
CREATE TYPE "SupplierDocumentType" AS ENUM ('CPF', 'CNPJ', 'OTHER');

-- CreateEnum
CREATE TYPE "PayableOrigin" AS ENUM ('MANUAL', 'PURCHASE', 'PURCHASE_ORDER', 'CONTRACT', 'OTHER');

-- CreateEnum
CREATE TYPE "PayableStatus" AS ENUM ('OPEN', 'PARTIAL', 'SETTLED', 'CANCELLED', 'RENEGOTIATED');

-- CreateEnum
CREATE TYPE "PayableInstallmentStatus" AS ENUM ('OPEN', 'PARTIAL', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PayableMovementType" AS ENUM ('PAYMENT', 'REVERSAL');

-- CreateEnum
CREATE TYPE "PayableApprovalStatus" AS ENUM ('NONE', 'PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PayableScheduleStatus" AS ENUM ('SCHEDULED', 'EXECUTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" "SupplierDocumentType",
    "document" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_payables" (
    "id" TEXT NOT NULL,
    "sequentialId" SERIAL NOT NULL,
    "supplierId" TEXT NOT NULL,
    "origin" "PayableOrigin" NOT NULL DEFAULT 'MANUAL',
    "originRef" TEXT,
    "description" TEXT NOT NULL,
    "document" TEXT,
    "categoryId" TEXT,
    "issueDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "originalAmount" DECIMAL(18,4) NOT NULL,
    "discountAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "interestAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "fineAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "paidAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "status" "PayableStatus" NOT NULL DEFAULT 'OPEN',
    "approvalStatus" "PayableApprovalStatus" NOT NULL DEFAULT 'NONE',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
    "paymentMethodId" TEXT,
    "bankAccountId" TEXT,
    "costCenterId" TEXT,
    "installmentCount" INTEGER NOT NULL DEFAULT 1,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "renegotiatedFromId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "account_payables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payable_installments" (
    "id" TEXT NOT NULL,
    "payableId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "paidAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "discountAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "interestAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "fineAmount" DECIMAL(18,4) NOT NULL DEFAULT 0,
    "status" "PayableInstallmentStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payable_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payable_movements" (
    "id" TEXT NOT NULL,
    "payableId" TEXT NOT NULL,
    "installmentId" TEXT,
    "type" "PayableMovementType" NOT NULL,
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
    CONSTRAINT "payable_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payable_schedules" (
    "id" TEXT NOT NULL,
    "payableId" TEXT NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "paymentMethodId" TEXT,
    "bankAccountId" TEXT,
    "notes" TEXT,
    "status" "PayableScheduleStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "payable_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payable_approvals" (
    "id" TEXT NOT NULL,
    "payableId" TEXT NOT NULL,
    "status" "PayableApprovalStatus" NOT NULL,
    "amount" DECIMAL(18,4) NOT NULL,
    "reason" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payable_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payable_audit_logs" (
    "id" TEXT NOT NULL,
    "payableId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" DECIMAL(18,4),
    "message" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payable_audit_logs_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers"("code");
CREATE INDEX "suppliers_name_idx" ON "suppliers"("name");
CREATE INDEX "suppliers_document_idx" ON "suppliers"("document");
CREATE INDEX "suppliers_active_idx" ON "suppliers"("active");
CREATE UNIQUE INDEX "expense_categories_code_key" ON "expense_categories"("code");
CREATE UNIQUE INDEX "account_payables_sequentialId_key" ON "account_payables"("sequentialId");
CREATE INDEX "account_payables_supplierId_idx" ON "account_payables"("supplierId");
CREATE INDEX "account_payables_status_idx" ON "account_payables"("status");
CREATE INDEX "account_payables_approvalStatus_idx" ON "account_payables"("approvalStatus");
CREATE INDEX "account_payables_dueDate_idx" ON "account_payables"("dueDate");
CREATE INDEX "account_payables_origin_idx" ON "account_payables"("origin");
CREATE INDEX "account_payables_categoryId_idx" ON "account_payables"("categoryId");
CREATE INDEX "account_payables_document_idx" ON "account_payables"("document");
CREATE INDEX "account_payables_createdById_idx" ON "account_payables"("createdById");
CREATE UNIQUE INDEX "payable_installments_payableId_number_key" ON "payable_installments"("payableId", "number");
CREATE INDEX "payable_installments_dueDate_idx" ON "payable_installments"("dueDate");
CREATE INDEX "payable_installments_status_idx" ON "payable_installments"("status");
CREATE UNIQUE INDEX "payable_movements_idempotencyKey_key" ON "payable_movements"("idempotencyKey");
CREATE INDEX "payable_movements_payableId_createdAt_idx" ON "payable_movements"("payableId", "createdAt");
CREATE INDEX "payable_movements_installmentId_idx" ON "payable_movements"("installmentId");
CREATE INDEX "payable_movements_operatorId_idx" ON "payable_movements"("operatorId");
CREATE INDEX "payable_movements_type_idx" ON "payable_movements"("type");
CREATE INDEX "payable_schedules_payableId_scheduledDate_idx" ON "payable_schedules"("payableId", "scheduledDate");
CREATE INDEX "payable_schedules_status_idx" ON "payable_schedules"("status");
CREATE INDEX "payable_approvals_payableId_createdAt_idx" ON "payable_approvals"("payableId", "createdAt");
CREATE INDEX "payable_approvals_actorId_idx" ON "payable_approvals"("actorId");
CREATE INDEX "payable_audit_logs_payableId_createdAt_idx" ON "payable_audit_logs"("payableId", "createdAt");
CREATE INDEX "payable_audit_logs_actorId_idx" ON "payable_audit_logs"("actorId");

-- FKs
ALTER TABLE "account_payables" ADD CONSTRAINT "account_payables_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "account_payables" ADD CONSTRAINT "account_payables_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "account_payables" ADD CONSTRAINT "account_payables_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "finance_payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "account_payables" ADD CONSTRAINT "account_payables_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "account_payables" ADD CONSTRAINT "account_payables_costCenterId_fkey" FOREIGN KEY ("costCenterId") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "account_payables" ADD CONSTRAINT "account_payables_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "account_payables" ADD CONSTRAINT "account_payables_renegotiatedFromId_fkey" FOREIGN KEY ("renegotiatedFromId") REFERENCES "account_payables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payable_installments" ADD CONSTRAINT "payable_installments_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "account_payables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payable_movements" ADD CONSTRAINT "payable_movements_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "account_payables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payable_movements" ADD CONSTRAINT "payable_movements_installmentId_fkey" FOREIGN KEY ("installmentId") REFERENCES "payable_installments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payable_movements" ADD CONSTRAINT "payable_movements_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "finance_payment_methods"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payable_movements" ADD CONSTRAINT "payable_movements_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payable_movements" ADD CONSTRAINT "payable_movements_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payable_movements" ADD CONSTRAINT "payable_movements_reversesMovementId_fkey" FOREIGN KEY ("reversesMovementId") REFERENCES "payable_movements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payable_schedules" ADD CONSTRAINT "payable_schedules_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "account_payables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payable_approvals" ADD CONSTRAINT "payable_approvals_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "account_payables"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payable_approvals" ADD CONSTRAINT "payable_approvals_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payable_audit_logs" ADD CONSTRAINT "payable_audit_logs_payableId_fkey" FOREIGN KEY ("payableId") REFERENCES "account_payables"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payable_audit_logs" ADD CONSTRAINT "payable_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
