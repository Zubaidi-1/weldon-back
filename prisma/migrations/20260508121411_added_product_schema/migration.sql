/*
  Warnings:

  - A unique constraint covering the columns `[productSku]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `productSku` to the `Product` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "productSku" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Product_productSku_key" ON "Product"("productSku");
