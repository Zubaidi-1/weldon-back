import { Injectable } from '@nestjs/common';
import {
  AddCartProduct,
  CartEntity,
} from 'src/cart/domain/entities/cart.entity';
import { ICartRepository } from 'src/cart/domain/repositories/cart.repository';
import { CartItem } from 'src/generated/prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CartPrismaRepository implements ICartRepository {
  constructor(private prisma: PrismaService) {}

  async findCartByUserId(userId?: number): Promise<CartEntity | null> {
    if (!userId) return null;

    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return cart ? new CartEntity(cart) : null;
  }

  async createCart(
    product: AddCartProduct,
    userId?: number,
  ): Promise<CartEntity> {
    const cart = await this.prisma.cart.create({
      data: {
        userId: userId ?? null,
        items: {
          create: {
            price: product.price,
            productName: product.productName,
            productSize: product.productSize,
            productId: product.productId,
            productImage: product.productImage,
            quantity: product.quantity,
          },
        },
      },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return new CartEntity(cart);
  }

  async incrementCartItemQuantity(
    cartId: number,
    cartItemId: number,
    quantity: number,
  ): Promise<CartEntity> {
    const cart = await this.prisma.cart.update({
      where: {
        cartId,
      },
      data: {
        items: {
          update: {
            where: {
              cartItemId,
            },
            data: {
              quantity: {
                increment: quantity,
              },
            },
          },
        },
      },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return new CartEntity(cart);
  }
  async decrementCartItemQuantity(
    cartId: number,
    cartItemId: number,
    quantity: number,
  ): Promise<CartEntity> {
    const cart = await this.prisma.cart.update({
      where: {
        cartId,
      },
      data: {
        items: {
          update: {
            where: {
              cartItemId,
            },
            data: {
              quantity: {
                decrement: quantity,
              },
            },
          },
        },
      },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return new CartEntity(cart);
  }

  async deleteItemQuantity(cartItemId: number): Promise<CartItem> {
    return await this.prisma.cartItem.delete({ where: { cartItemId } });
  }
  async addCartItem(
    cartId: number,
    product: AddCartProduct,
  ): Promise<CartEntity> {
    const cart = await this.prisma.cart.update({
      where: {
        cartId,
      },
      data: {
        items: {
          create: {
            price: product.price,
            productName: product.productName,
            productSize: product.productSize,
            productId: product.productId,
            productImage: product.productImage,
            quantity: product.quantity,
          },
        },
      },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return new CartEntity(cart);
  }

  async getProductStock(productId: number): Promise<number | null> {
    const product = await this.prisma.product.findUnique({
      where: { productId },
      select: { stockQuantity: true },
    });

    return product?.stockQuantity ?? null;
  }

  async getCart(userId: number): Promise<CartEntity | null> {
    return await this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
  }

  async clearCart(userId: number): Promise<void> {
    await this.prisma.cartItem.updateMany({
      where: {
        cart: { userId },
      },
      data: {
        cartId: null,
      },
    });
  }
}
