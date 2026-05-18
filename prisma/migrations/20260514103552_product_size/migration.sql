/*
  Warnings:

  - You are about to drop the column `image` on the `CartItem` table. All the data in the column will be lost.
  - You are about to drop the column `size` on the `CartItem` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[cartId,productId,productSize]` on the table `CartItem` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productSize` to the `CartItem` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "CartItem_cartId_productId_size_key";

-- AlterTable
ALTER TABLE "CartItem" DROP COLUMN "image",
DROP COLUMN "size",
ADD COLUMN     "productImage" TEXT,
ADD COLUMN     "productSize" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_productSize_key" ON "CartItem"("cartId", "productId", "productSize");
