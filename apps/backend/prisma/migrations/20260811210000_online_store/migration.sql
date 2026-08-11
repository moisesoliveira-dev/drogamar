-- AlterEnum
ALTER TYPE "StockExportType" ADD VALUE 'ONLINE_STORE';

-- CreateEnum
CREATE TYPE "SalesChannelPlatform" AS ENUM ('GENERIC', 'CUSTOM');

-- CreateEnum
CREATE TYPE "SalesChannelConnectionStatus" AS ENUM ('DISCONNECTED', 'CONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "OnlineListingPublishStatus" AS ENUM ('NOT_PUBLISHED', 'PUBLISHED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "OnlineListingSyncStatus" AS ENUM ('SYNCED', 'PENDING', 'ERROR');

-- CreateEnum
CREATE TYPE "OnlineStoreSyncJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "sales_channels" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" "SalesChannelPlatform" NOT NULL DEFAULT 'GENERIC',
    "baseUrl" TEXT,
    "connectionStatus" "SalesChannelConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
    "credentialsHash" TEXT,
    "hasCredentials" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_store_listings" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "commercialName" TEXT,
    "shortDescription" TEXT,
    "storeDescription" TEXT,
    "storeCategory" TEXT,
    "tags" TEXT,
    "useErpPrice" BOOLEAN NOT NULL DEFAULT true,
    "priceOverride" DECIMAL(18,4),
    "promoPrice" DECIMAL(18,4),
    "promoStartsAt" TIMESTAMP(3),
    "promoEndsAt" TIMESTAMP(3),
    "publishStatus" "OnlineListingPublishStatus" NOT NULL DEFAULT 'NOT_PUBLISHED',
    "syncStatus" "OnlineListingSyncStatus" NOT NULL DEFAULT 'PENDING',
    "publishedStockQty" DECIMAL(18,4),
    "lastSyncedAt" TIMESTAMP(3),
    "lastErrorCode" TEXT,
    "lastErrorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "online_store_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "online_store_sync_jobs" (
    "id" TEXT NOT NULL,
    "sequentialId" SERIAL NOT NULL,
    "channelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "syncProducts" BOOLEAN NOT NULL DEFAULT true,
    "syncStock" BOOLEAN NOT NULL DEFAULT true,
    "syncPrices" BOOLEAN NOT NULL DEFAULT true,
    "status" "OnlineStoreSyncJobStatus" NOT NULL DEFAULT 'PENDING',
    "productsProcessed" INTEGER NOT NULL DEFAULT 0,
    "productsSuccess" INTEGER NOT NULL DEFAULT 0,
    "productsError" INTEGER NOT NULL DEFAULT 0,
    "stockUpdated" INTEGER NOT NULL DEFAULT 0,
    "pricesUpdated" INTEGER NOT NULL DEFAULT 0,
    "pendingCount" INTEGER NOT NULL DEFAULT 0,
    "summaryJson" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "online_store_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_channels_connectionStatus_idx" ON "sales_channels"("connectionStatus");

-- CreateIndex
CREATE INDEX "online_store_listings_publishStatus_idx" ON "online_store_listings"("publishStatus");

-- CreateIndex
CREATE INDEX "online_store_listings_syncStatus_idx" ON "online_store_listings"("syncStatus");

-- CreateIndex
CREATE INDEX "online_store_listings_itemId_idx" ON "online_store_listings"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "online_store_listings_channelId_itemId_key" ON "online_store_listings"("channelId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "online_store_sync_jobs_sequentialId_key" ON "online_store_sync_jobs"("sequentialId");

-- CreateIndex
CREATE INDEX "online_store_sync_jobs_channelId_createdAt_idx" ON "online_store_sync_jobs"("channelId", "createdAt");

-- CreateIndex
CREATE INDEX "online_store_sync_jobs_userId_idx" ON "online_store_sync_jobs"("userId");

-- CreateIndex
CREATE INDEX "online_store_sync_jobs_status_idx" ON "online_store_sync_jobs"("status");

-- AddForeignKey
ALTER TABLE "online_store_listings" ADD CONSTRAINT "online_store_listings_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "sales_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_store_listings" ADD CONSTRAINT "online_store_listings_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "stock_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_store_sync_jobs" ADD CONSTRAINT "online_store_sync_jobs_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "sales_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "online_store_sync_jobs" ADD CONSTRAINT "online_store_sync_jobs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
