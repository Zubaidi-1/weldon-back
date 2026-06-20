import { Decimal } from '@prisma/client/runtime/client';

export type CartProduct = {
  cartItemId: number;
  cartId: number | null;
  productId: number;
  product?: {
    productName: string;
    productPrice: Decimal;
    productSize: number;
    productImage: string | null;
    stockQuantity: number;
    productCategory: string[];
  };
  productName: string;
  productSize: number;
  price: Decimal;
  quantity: number;
  productImage: string | null;
  maxQuantity?: number;
  createdAt: Date;
  updatedAt: Date;
};

export type AddCartProduct = Omit<
  CartProduct,
  'cartItemId' | 'cartId' | 'createdAt' | 'updatedAt'
>;

export class CartEntity {
  cartId: number;
  userId: number | null;
  createdAt: Date;
  updatedAt: Date;
  items: CartProduct[];

  constructor(cart: {
    cartId: number;
    userId: number | null;
    createdAt: Date;
    updatedAt: Date;
    items: CartProduct[];
  }) {
    this.cartId = cart.cartId;
    this.userId = cart.userId;
    this.createdAt = cart.createdAt;
    this.updatedAt = cart.updatedAt;
    this.items = cart.items;
  }
}
