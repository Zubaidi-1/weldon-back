import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AddCartProduct, CartEntity } from './domain/entities/cart.entity';
import type { ICartRepository } from './domain/repositories/cart.repository';
import { CART_REPOSITORY } from './cart.repo.token';
import { CartWithTotals, SyncCartItem } from 'src/common/types/CartTypes';

@Injectable()
export class CartService {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: ICartRepository,
  ) {}

  async addToCart(
    product: AddCartProduct,
    userId?: number,
  ): Promise<CartEntity> {
    // ! adding to cart creates the cart
    // ! Carts can be created by guests ( no user id )

    // * Finding if cart exists
    const cart = await this.cartRepository.findCartByUserId(userId);

    // * If cart does not exist we create cart
    if (!cart) {
      // * Validate stock on empty cart
      await this.validateStock(product.productId, product.quantity);
      return await this.cartRepository.createCart(product, userId);
    }

    // * check if item already exists in cart
    const cartItem = cart.items.find(
      (item) => item.productId === product.productId,
    );

    // * if item exists, increment quantity
    if (cartItem) {
      // * Validate stock on product in cart
      await this.validateStock(
        product.productId,
        product.quantity,
        cartItem.quantity,
      );

      return await this.cartRepository.incrementCartItemQuantity(
        cart.cartId,
        cartItem.cartItemId,
        product.quantity,
      );
    }

    // * if item does not exist, create a new product record
    // * Validate stock product in cart
    await this.validateStock(product.productId, product.quantity);
    return await this.cartRepository.addCartItem(cart.cartId, product);
  }

  async getCart(userId: number): Promise<CartWithTotals | null> {
    const cart = await this.cartRepository.getCart(userId);

    if (!cart) return null;

    const itemsWithLinePrice = await Promise.all(
      cart.items.map(async (item) => {
        const stockQuantity =
          (await this.cartRepository.getProductStock(item.productId)) ?? 0;

        return {
          ...item,
          maxQuantity: Math.max(0, stockQuantity - 5),
          linePrice: Number(item.price) * item.quantity,
        };
      }),
    );

    const totalPrice = itemsWithLinePrice.reduce(
      (acc, curr) => acc + curr.linePrice,
      0,
    );

    return {
      ...cart,
      items: itemsWithLinePrice,
      noOfItems: cart.items.reduce((total, item) => total + item.quantity, 0),
      totalPrice,
    };
  }

  async removeProductFromCart(
    cartId: number,
    cartItemId: number,
    userId: number,
  ) {
    const cart = await this.getCart(userId);
    if (cartId !== cart?.cartId)
      throw new ForbiddenException('You are not allowed');
    return await this.cartRepository.deleteItemQuantity(cartItemId);
  }

  async decrementProductQuantity(
    userId: number,
    productId: number,
    decrementBy: number = 1,
  ) {
    const cart = await this.getCart(userId);
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }
    const product = cart.items.find((p) => p.productId === productId);
    if (!product) {
      throw new NotFoundException('Item is not cart');
    }
    if (product.quantity <= decrementBy) {
      return await this.removeProductFromCart(
        cart.cartId,
        product.cartItemId,
        userId,
      );
    }
    return await this.cartRepository.decrementCartItemQuantity(
      cart.cartId,
      product.cartItemId,
      decrementBy,
    );
  }
  async incrementProductQuantity(
    userId: number,
    cartId: number,
    cartItemId: number,
    productId: number,
    quantity: number = 1,
  ) {
    const cart = await this.getCart(userId);
    if (cartId !== cart?.cartId)
      throw new ForbiddenException('You are not allowed');
    const product = cart.items.find(
      (item) => item.cartItemId === cartItemId && item.productId === productId,
    );
    if (!product) {
      throw new NotFoundException('Item is not in cart');
    }
    await this.validateStock(product.productId, quantity, product.quantity);
    return this.cartRepository.incrementCartItemQuantity(
      cartId,
      cartItemId,
      quantity,
    );
  }

  async syncCart(userId: number, items: SyncCartItem[]) {
    const cart = await this.getCart(userId);
    if (!cart) return null;

    for (const cartItem of cart.items) {
      const syncedItem = items.find(
        (item) =>
          item.cartItemId === cartItem.cartItemId &&
          item.productId === cartItem.productId,
      );

      if (!syncedItem || syncedItem.quantity < 1) {
        await this.removeProductFromCart(
          cart.cartId,
          cartItem.cartItemId,
          userId,
        );
        continue;
      }

      if (syncedItem.quantity > cartItem.quantity) {
        await this.incrementProductQuantity(
          userId,
          cart.cartId,
          cartItem.cartItemId,
          cartItem.productId,
          syncedItem.quantity - cartItem.quantity,
        );
        continue;
      }

      if (syncedItem.quantity < cartItem.quantity) {
        await this.decrementProductQuantity(
          userId,
          cartItem.productId,
          cartItem.quantity - syncedItem.quantity,
        );
      }
    }

    return await this.getCart(userId);
  }

  async clearCart(userId: number): Promise<void> {
    await this.cartRepository.clearCart(userId);
  }

  private async validateStock(
    productId: number,
    wantedQuantity: number,
    currentQuantity: number = 0,
    stockBuffer: number = 5,
  ) {
    // * Current quantity represents the current quantity that might be in the cart
    // * Stock buffer is the number where stock gets treated as out of stock
    // * Wanted Quantity is the quantity newly added

    // * Find product stock
    const stockQuantity = await this.cartRepository.getProductStock(productId);

    // * Handle product doesn't exist
    if (stockQuantity === null) {
      throw new NotFoundException('Product not found');
    }

    const availableStock = stockQuantity - stockBuffer;

    // * throw on empty stock
    if (availableStock < 1) {
      throw new ForbiddenException('Item is out of stock');
    }

    const totalQuantity = currentQuantity + wantedQuantity;

    // * Throws if the user can decrease the quantity and still proceed
    if (totalQuantity > availableStock) {
      throw new ForbiddenException(
        `Please decrease quantity by ${totalQuantity - availableStock}`,
      );
    }
  }
}
