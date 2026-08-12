-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "CollectionCaseStatus" AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'CONTACTED',
    'PROMISED',
    'RESOLVED',
    'NO_RESPONSE',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CollectionContactChannel" AS ENUM (
    'PHONE',
    'WHATSAPP',
    'EMAIL',
    'SMS',
    'IN_PERSON',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CollectionContactOutcome" AS ENUM (
    'NO_ANSWER',
    'ANSWERED',
    'REQUESTED_DEADLINE',
    'DISPUTED',
    'PROMISED_PAYMENT',
    'PAID',
    'INVALID_NUMBER',
    'INVALID_EMAIL',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentPromiseStatus" AS ENUM (
    'PENDING',
    'KEPT',
    'OVERDUE',
    'CANCELLED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CollectionNextAction" AS ENUM (
    'CALL',
    'WHATSAPP',
    'EMAIL',
    'WAIT_PAYMENT',
    'CHECK_PROMISE',
    'NEGOTIATE',
    'CLOSE',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "collection_cases" (
    "id" TEXT NOT NULL,
    "sequentialId" SERIAL NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "CollectionCaseStatus" NOT NULL DEFAULT 'PENDING',
    "assigneeId" TEXT,
    "nextAction" "CollectionNextAction",
    "nextActionAt" TIMESTAMP(3),
    "nextActionNotes" TEXT,
    "priorityScore" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collection_cases_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "collection_items" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "receivableId" TEXT NOT NULL,
    "includedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "collection_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "collection_contacts" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "channel" "CollectionContactChannel" NOT NULL,
    "outcome" "CollectionContactOutcome" NOT NULL,
    "contactedAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "payment_promises" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "promisedAmount" DECIMAL(18,4) NOT NULL,
    "promisedDate" DATE NOT NULL,
    "status" "PaymentPromiseStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_promises_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "collection_audit_logs" (
    "id" TEXT NOT NULL,
    "caseId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "amount" DECIMAL(18,4),
    "message" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "collection_cases_sequentialId_key" ON "collection_cases"("sequentialId");
CREATE INDEX IF NOT EXISTS "collection_cases_customerId_status_idx" ON "collection_cases"("customerId", "status");
CREATE INDEX IF NOT EXISTS "collection_cases_assigneeId_status_idx" ON "collection_cases"("assigneeId", "status");
CREATE INDEX IF NOT EXISTS "collection_cases_status_nextActionAt_idx" ON "collection_cases"("status", "nextActionAt");
CREATE INDEX IF NOT EXISTS "collection_cases_priorityScore_idx" ON "collection_cases"("priorityScore");

CREATE UNIQUE INDEX IF NOT EXISTS "collection_items_caseId_receivableId_key" ON "collection_items"("caseId", "receivableId");
CREATE INDEX IF NOT EXISTS "collection_items_receivableId_idx" ON "collection_items"("receivableId");

CREATE INDEX IF NOT EXISTS "collection_contacts_caseId_contactedAt_idx" ON "collection_contacts"("caseId", "contactedAt");
CREATE INDEX IF NOT EXISTS "collection_contacts_actorId_idx" ON "collection_contacts"("actorId");

CREATE INDEX IF NOT EXISTS "payment_promises_caseId_status_idx" ON "payment_promises"("caseId", "status");
CREATE INDEX IF NOT EXISTS "payment_promises_promisedDate_status_idx" ON "payment_promises"("promisedDate", "status");
CREATE INDEX IF NOT EXISTS "payment_promises_createdById_idx" ON "payment_promises"("createdById");

CREATE INDEX IF NOT EXISTS "collection_audit_logs_caseId_createdAt_idx" ON "collection_audit_logs"("caseId", "createdAt");
CREATE INDEX IF NOT EXISTS "collection_audit_logs_actorId_idx" ON "collection_audit_logs"("actorId");

-- AddForeignKey
DO $$ BEGIN
  ALTER TABLE "collection_cases" ADD CONSTRAINT "collection_cases_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "collection_cases" ADD CONSTRAINT "collection_cases_assigneeId_fkey"
    FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "collection_cases" ADD CONSTRAINT "collection_cases_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_caseId_fkey"
    FOREIGN KEY ("caseId") REFERENCES "collection_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "collection_items" ADD CONSTRAINT "collection_items_receivableId_fkey"
    FOREIGN KEY ("receivableId") REFERENCES "account_receivables"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "collection_contacts" ADD CONSTRAINT "collection_contacts_caseId_fkey"
    FOREIGN KEY ("caseId") REFERENCES "collection_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "collection_contacts" ADD CONSTRAINT "collection_contacts_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "payment_promises" ADD CONSTRAINT "payment_promises_caseId_fkey"
    FOREIGN KEY ("caseId") REFERENCES "collection_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "payment_promises" ADD CONSTRAINT "payment_promises_createdById_fkey"
    FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "collection_audit_logs" ADD CONSTRAINT "collection_audit_logs_caseId_fkey"
    FOREIGN KEY ("caseId") REFERENCES "collection_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "collection_audit_logs" ADD CONSTRAINT "collection_audit_logs_actorId_fkey"
    FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
