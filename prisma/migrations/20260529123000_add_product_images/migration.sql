ALTER TABLE "Product" ADD COLUMN "productImages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "Product"
SET "productImages" = ARRAY["productImage"]
WHERE "productImage" IS NOT NULL
  AND cardinality("productImages") = 0;
