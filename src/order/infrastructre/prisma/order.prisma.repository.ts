import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateOrderInput,
  OrderEntity,
} from 'src/order/domain/entities/order.entity';
import {
  IOrderRepository,
  PaginatedOrders,
} from 'src/order/domain/repositories/order.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  OrderStatus,
  productStatus as ProductStatusEnum,
} from 'src/generated/prisma/enums';
import { ProductEntity } from 'src/product/domain/entities/product.entity';
import { Prisma } from 'src/generated/prisma/client';

@Injectable()
export class OrderPrismaRepository implements IOrderRepository {
  constructor(private prisma: PrismaService) {}

  private toOrderEntity(order: {
    orderId: number;
    userId: number | null;
    orderEmail: string;
    orderPhoneNumber: string;
    orderFirstName: string;
    orderLastName: string;
    orderGovernate: string;
    orderAddress: string;
    canceled: boolean;
    orderStatus: OrderEntity['orderStatus'];
    orderLine: {
      createdAt: Date;
      updatedAt: Date;
      products: {
        cartItemId: number;
        productId: number;
        productName: string;
        productImage: string | null;
        price: unknown;
        quantity: number;
        productSize: number;
      }[];
    } | null;
  }): OrderEntity {
    return new OrderEntity(
      order.orderId,
      order.userId,
      order.orderEmail,
      order.orderPhoneNumber,
      order.orderFirstName,
      order.orderLastName,
      order.orderGovernate,
      order.orderAddress,
      order.canceled,
      order.orderStatus,
      order.orderLine?.products.map((product) => ({
        productId: product.productId,
        productName: product.productName,
        productImage: product.productImage,
        productPrice: Number(product.price),
        quantity: product.quantity,
        size: product.productSize,
        cartItemId: product.cartItemId,
        lineTotal: Number(product.price) * product.quantity,
      })) ?? [],
      order.orderLine?.createdAt ?? new Date(),
      order.orderLine?.updatedAt ?? new Date(),
    );
  }

  async createOrder(order: CreateOrderInput): Promise<OrderEntity> {
    const existingCartItems = order.products.filter(
      (product) => product.cartItemId !== undefined,
    );
    const guestCartItems = order.products.filter(
      (product) => product.cartItemId === undefined,
    );

    const createdOrder = await this.prisma.order.create({
      data: {
        userId: order.userId,
        orderEmail: order.orderEmail,
        orderPhoneNumber: order.orderPhoneNumber,
        orderFirstName: order.orderFirstName,
        orderLastName: order.orderLastName,
        orderGovernate: order.orderGovernate,
        orderAddress: order.orderAddress,

        orderLine: {
          create: {
            products: {
              connect: existingCartItems.map((product) => ({
                cartItemId: product.cartItemId!,
              })),
              create: guestCartItems.map((product) => ({
                productId: product.productId,
                productName: product.productName,
                productImage: product.productImage,
                price: product.productPrice,
                productSize: product.size,
                quantity: product.quantity,
              })),
            },
          },
        },
      },
      include: {
        orderLine: {
          include: {
            products: true,
          },
        },
      },
    });

    return this.toOrderEntity(createdOrder);
  }

  async checkStock(productId: number, stockBuffer: number = 5) {
    const product = await this.prisma.product.findUnique({
      where: { productId },
      select: { stockQuantity: true },
    });
    if (!product) return null;
    return Number(product.stockQuantity - stockBuffer);
  }

  async decrementStock(
    products: {
      productId: number;
      quantity: number;
    }[],
  ) {
    return await this.prisma.$transaction(async (tx) => {
      const updatedProducts: ProductEntity[] = [];

      for (const product of products) {
        const updatedProduct = await tx.product.update({
          where: {
            productId: product.productId,
          },
          data: {
            stockQuantity: {
              decrement: product.quantity,
            },
          },
        });

        if (updatedProduct.stockQuantity <= 5) {
          updatedProducts.push(
            await tx.product.update({
              where: { productId: product.productId },
              data: { productStatus: ProductStatusEnum.OUT_OF_STOCK },
            }),
          );
          continue;
        }

        updatedProducts.push(updatedProduct);
      }

      return updatedProducts;
    });
  }
  async getOrders(
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedOrders> {
    const safePage = Math.max(page, 1);

    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const skip = (safePage - 1) * safeLimit;

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        skip,
        take: safeLimit,

        orderBy: {
          orderId: 'desc',
        },

        include: {
          orderLine: {
            include: {
              products: true,
            },
          },
        },
      }),

      this.prisma.order.count(),
    ]);

    return {
      orders: orders.map((order) => this.toOrderEntity(order)),
      total,
      page: safePage,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async updateOrderStatus(
    orderId: number,
    status: OrderStatus,
  ): Promise<OrderEntity> {
    try {
      const order = await this.prisma.order.update({
        where: { orderId },
        data: {
          orderStatus: status,
          canceled: status === OrderStatus.CANCELLED,
        },
        include: {
          orderLine: {
            include: {
              products: true,
            },
          },
        },
      });

      return this.toOrderEntity(order);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new NotFoundException('Order not found');
      }

      throw error;
    }
  }
}
