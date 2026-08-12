-- AlterTable
ALTER TABLE "sale_carts" ADD COLUMN "cartDiscountManual" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "sale_cart_items" ADD COLUMN "lineDiscountManual" BOOLEAN NOT NULL DEFAULT false;

-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('PERCENT', 'FIXED', 'PROMO_PRICE', 'MIN_PURCHASE');

-- CreateEnum
CREATE TYPE "PromotionScope" AS ENUM ('ALL', 'PRODUCTS', 'CATEGORIES', 'BRANDS');

-- CreateEnum
CREATE TYPE "PromotionStacking" AS ENUM ('STACKABLE', 'EXCLUSIVE');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PromotionTargetKind" AS ENUM ('PRODUCT', 'CATEGORY', 'BRAND');

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "PromotionType" NOT NULL,
    "scope" "PromotionScope" NOT NULL DEFAULT 'ALL',
    "stacking" "PromotionStacking" NOT NULL DEFAULT 'EXCLUSIVE',
    "status" "PromotionStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" INTEGER NOT NULL DEFAULT 100,
    "percentOff" DECIMAL(18,4),
    "amountOff" DECIMAL(18,4),
    "promoPrice" DECIMAL(18,4),
    "minCartValue" DECIMAL(18,4),
    "minQuantity" DECIMAL(18,4),
    "maxQtyPerSale" DECIMAL(18,4),
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_targets" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "kind" "PromotionTargetKind" NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_audit_logs" (
    "id" TEXT NOT NULL,
    "promotionId" TEXT,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotion_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_cart_applied_promotions" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "promotionId" TEXT NOT NULL,
    "lineId" TEXT,
    "amount" DECIMAL(18,4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sale_cart_applied_promotions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promotions_status_idx" ON "promotions"("status");

-- CreateIndex
CREATE INDEX "promotions_startsAt_endsAt_idx" ON "promotions"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "promotions_priority_idx" ON "promotions"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_targets_promotionId_kind_targetId_key" ON "promotion_targets"("promotionId", "kind", "targetId");

-- CreateIndex
CREATE INDEX "promotion_targets_targetId_idx" ON "promotion_targets"("targetId");

-- CreateIndex
CREATE INDEX "promotion_audit_logs_promotionId_idx" ON "promotion_audit_logs"("promotionId");

-- CreateIndex
CREATE INDEX "promotion_audit_logs_actorId_idx" ON "promotion_audit_logs"("actorId");

-- CreateIndex
CREATE INDEX "promotion_audit_logs_createdAt_idx" ON "promotion_audit_logs"("createdAt");

-- CreateIndex
CREATE INDEX "sale_cart_applied_promotions_cartId_idx" ON "sale_cart_applied_promotions"("cartId");

-- CreateIndex
CREATE INDEX "sale_cart_applied_promotions_promotionId_idx" ON "sale_cart_applied_promotions"("promotionId");

-- AddForeignKey
ALTER TABLE "promotion_targets" ADD CONSTRAINT "promotion_targets_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_audit_logs" ADD CONSTRAINT "promotion_audit_logs_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_audit_logs" ADD CONSTRAINT "promotion_audit_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_cart_applied_promotions" ADD CONSTRAINT "sale_cart_applied_promotions_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "sale_carts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_cart_applied_promotions" ADD CONSTRAINT "sale_cart_applied_promotions_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
