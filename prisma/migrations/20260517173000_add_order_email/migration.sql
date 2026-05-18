-- AlterTable
ALTER TABLE "Order" ADD COLUMN "orderEmail" TEXT;

UPDATE "Order"
SET "orderEmail" = 'unknown@example.com'
WHERE "orderEmail" IS NULL;

ALTER TABLE "Order" ALTER COLUMN "orderEmail" SET NOT NULL;
