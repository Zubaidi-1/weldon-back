import { CartItem } from 'src/generated/prisma/client';
import { AddCartProduct, CartEntity } from '../entities/cart.entity';

export interface ICartRepository {
  findCartByUserId(userId?: number): Promise<CartEntity | null>;
  createCart(product: AddCartProduct, userId?: number): Promise<CartEntity>;
  incrementCartItemQuantity(
    cartId: number,
    cartItemId: number,
    quantity: number,
  ): Promise<CartEntity>;
  addCartItem(cartId: number, product: AddCartProduct): Promise<CartEntity>;
  getProductStock(productId: number): Promise<number | null>;
  getCart(userId: number): Promise<CartEntity | null>;
  decrementCartItemQuantity(
    cartId: number,
    cartItemId: number,
    quantity: number,
  ): Promise<CartEntity>;
  deleteItemQuantity(cartItemId: number): Promise<CartItem>;
  clearCart(userId: number): Promise<void>;
}
