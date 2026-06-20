ALTER TYPE "ProductCategory" ADD VALUE 'AMPOULE';
ALTER TYPE "ProductCategory" ADD VALUE 'DRY_SKIN';

ALTER TABLE "Product"
ALTER COLUMN "productCategory" TYPE "ProductCategory"[]
USING ARRAY["productCategory"];

ALTER TABLE "Product"
ALTER COLUMN "productCategory" SET DEFAULT ARRAY[]::"ProductCategory"[];
