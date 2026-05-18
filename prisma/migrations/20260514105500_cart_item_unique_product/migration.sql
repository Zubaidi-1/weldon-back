-- One product has one size, so cart item identity is cart + product only.

DROP INDEX IF EXISTS "CartItem_cartId_productId_productSize_key";

CREATE UNIQUE INDEX "CartItem_cartId_productId_key" ON "CartItem"("cartId", "productId");
