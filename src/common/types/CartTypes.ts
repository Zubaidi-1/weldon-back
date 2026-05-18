import { CartEntity } from 'src/cart/domain/entities/cart.entity';

export type CartItemWithLinePrice = CartEntity['items'][number] & {
  linePrice: number;
};

export type CartWithTotals = Omit<CartEntity, 'items'> & {
  items: CartItemWithLinePrice[];
  noOfItems: number;
  totalPrice: number;
};

export type UpdateCartType = 'DECREMENT' | 'INCREMENT' | 'REMOVE';

export type UpdateCartBody = {
  cartId: number;
  cartItemId: number;
  productId: number;
  itemQuantity?: number;
};

export type SyncCartItem = {
  cartItemId: number;
  productId: number;
  quantity: number;
};

export type SyncCartBody = {
  items: SyncCartItem[];
};
