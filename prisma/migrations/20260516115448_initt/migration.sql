-- DropForeignKey
ALTER TABLE "CartItem" DROP CONSTRAINT "CartItem_cartId_fkey";

-- AlterTable
ALTER TABLE "CartItem" ALTER COLUMN "cartId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "canceled" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("cartId") ON DELETE SET NULL ON UPDATE CASCADE;
