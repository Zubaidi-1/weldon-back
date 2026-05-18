/*
  Warnings:

  - The values [HI] on the enum `productStatus` will be removed. If these variants are still used in the database, this will fail.
  - Changed the type of `productCategory` on the `Product` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('MELA_WHITE', 'ESSENTIAL', 'HYDRATING', 'REGULATING', 'SENSITIVE', 'BEAUTY_ELEMENTS', 'VITALITY', 'BODY_SCIENCE', 'HAIR', 'MEN');

-- AlterEnum
BEGIN;
CREATE TYPE "productStatus_new" AS ENUM ('ACTIVE', 'DRAFT', 'OUT_OF_STOCK');
ALTER TABLE "Product" ALTER COLUMN "productStatus" TYPE "productStatus_new" USING ("productStatus"::text::"productStatus_new");
ALTER TYPE "productStatus" RENAME TO "productStatus_old";
ALTER TYPE "productStatus_new" RENAME TO "productStatus";
DROP TYPE "public"."productStatus_old";
COMMIT;

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "productCategory",
ADD COLUMN     "productCategory" "ProductCategory" NOT NULL;

-- DropEnum
DROP TYPE "productCategory";
