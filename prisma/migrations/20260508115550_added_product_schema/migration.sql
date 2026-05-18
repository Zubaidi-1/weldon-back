-- CreateEnum
CREATE TYPE "productCategory" AS ENUM ('HI');

-- CreateEnum
CREATE TYPE "productStatus" AS ENUM ('HI');

-- CreateEnum
CREATE TYPE "Roles" AS ENUM ('ADMIN', 'USER');

-- CreateTable
CREATE TABLE "Product" (
    "productId" SERIAL NOT NULL,
    "productName" TEXT NOT NULL,
    "productPrice" DECIMAL(65,30) NOT NULL,
    "stockQuantity" INTEGER NOT NULL,
    "productDescription" TEXT NOT NULL,
    "productCategory" "productCategory" NOT NULL,
    "productStatus" "productStatus" NOT NULL,
    "productImage" TEXT NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("productId")
);
