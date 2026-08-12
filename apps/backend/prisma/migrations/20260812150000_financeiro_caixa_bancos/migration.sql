-- AlterEnum
ALTER TYPE "BankAccountKind" ADD VALUE 'SAVINGS';
ALTER TYPE "BankAccountKind" ADD VALUE 'PAYMENT';

-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "agency" TEXT;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "accountDigit" TEXT;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "bank_accounts" ADD COLUMN IF NOT EXISTS "createdById" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "bank_account_audit_logs" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" DECIMAL(18,4),
    "message" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_account_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "bank_account_audit_logs_bankAccountId_createdAt_idx" ON "bank_account_audit_logs"("bankAccountId", "createdAt");
CREATE INDEX IF NOT EXISTS "bank_account_audit_logs_actorId_idx" ON "bank_account_audit_logs"("actorId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "bank_account_audit_logs" ADD CONSTRAINT "bank_account_audit_logs_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "bank_account_audit_logs" ADD CONSTRAINT "bank_account_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
