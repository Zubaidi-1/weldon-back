-- AlterTable
ALTER TABLE "CartItem" ADD COLUMN     "orderLineId" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "firstName" TEXT,
ADD COLUMN     "lastName" TEXT;

UPDATE "User"
SET
    "firstName" = split_part("name", ' ', 1),
    "lastName" = COALESCE(
        NULLIF(trim(substr("name", length(split_part("name", ' ', 1)) + 2)), ''),
        split_part("name", ' ', 1)
    );

ALTER TABLE "User" ALTER COLUMN "firstName" SET NOT NULL,
ALTER COLUMN "lastName" SET NOT NULL;

-- CreateTable
CREATE TABLE "Order" (
    "orderId" SERIAL NOT NULL,
    "userId" INTEGER,
    "orderPhoneNumber" TEXT NOT NULL,
    "orderFirstName" TEXT NOT NULL,
    "orderLastName" TEXT NOT NULL,
    "orderGovernate" TEXT NOT NULL,
    "orderAddress" TEXT NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" SERIAL NOT NULL,
    "orderId" INTEGER NOT NULL,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrderLine_orderId_key" ON "OrderLine"("orderId");

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("orderId") ON DELETE RESTRICT ON UPDATE CASCADE;
