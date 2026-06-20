-- CreateEnum
CREATE TYPE "PromotionType" AS ENUM ('SALE', 'COUPON');

-- AlterTable
ALTER TABLE "Discount"
ADD COLUMN "promotionType" "PromotionType" NOT NULL DEFAULT 'SALE',
ADD COLUMN "couponCode" TEXT,
ADD COLUMN "minimumOrderTotal" DECIMAL(10,2),
ADD COLUMN "usageLimit" INTEGER,
ADD COLUMN "usedCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Discount_couponCode_key" ON "Discount"("couponCode");

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "couponCode" TEXT,
ADD COLUMN "couponDiscount" DECIMAL(10,2) NOT NULL DEFAULT 0;
