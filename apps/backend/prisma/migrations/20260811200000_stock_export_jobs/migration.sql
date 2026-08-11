-- CreateEnum
CREATE TYPE "StockExportType" AS ENUM ('ITEMS', 'LOTS_EXPIRY', 'CURRENT_STOCK', 'CATEGORIES');

-- CreateEnum
CREATE TYPE "StockExportFormat" AS ENUM ('XLSX', 'CSV', 'PDF');

-- CreateEnum
CREATE TYPE "StockExportStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "stock_export_jobs" (
    "id" TEXT NOT NULL,
    "sequentialId" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "StockExportType" NOT NULL,
    "format" "StockExportFormat" NOT NULL,
    "status" "StockExportStatus" NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT NOT NULL,
    "storedPath" TEXT,
    "mimeType" TEXT,
    "fileSizeBytes" INTEGER,
    "recordCount" INTEGER,
    "filtersJson" JSONB NOT NULL,
    "columnsJson" JSONB NOT NULL,
    "sortBy" TEXT NOT NULL,
    "sortDir" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "downloadedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_export_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stock_export_jobs_sequentialId_key" ON "stock_export_jobs"("sequentialId");

-- CreateIndex
CREATE INDEX "stock_export_jobs_userId_createdAt_idx" ON "stock_export_jobs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "stock_export_jobs_status_idx" ON "stock_export_jobs"("status");

-- AddForeignKey
ALTER TABLE "stock_export_jobs" ADD CONSTRAINT "stock_export_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
