import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateOrderInput,
  OrderEntity,
} from 'src/order/domain/entities/order.entity';
import {
  IOrderRepository,
  OrderSearchParams,
  PaginatedOrders,
} from 'src/order/domain/repositories/order.repository';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  OrderStatus,
  productStatus as ProductStatusEnum,
} from 'src/generated/prisma/enums';
import { ProductEntity } from 'src/product/domain/entities/product.entity';
import { Prisma } from 'src/generated/prisma/client';
import { DiscountPricingService } from 'src/discounts/discount-pricing.service';

@Injectable()
export class OrderPrismaRepository implements IOrderRepository {
  constructor(
    private prisma: PrismaService,
    private readonly discountPricingService: DiscountPricingService,
  ) {}

  private toOrderEntity(order: {
    orderId: number;
    userId: number | null;
    orderEmail: string;
    orderPhoneNumber: string;
    orderFirstName: string;
    orderLastName: string;
    orderGovernate: string;
    orderAddress: string;
    couponCode: string | null;
    couponDiscount: unknown;
    canceled: boolean;
    orderStatus: OrderEntity['orderStatus'];
    orderLine: {
      createdAt: Date;
      updatedAt: Date;
      products: {
        id: number;
        productId: number;
        productName: string;
        productImage: string | null;
        productPrice: unknown;
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
      order.couponCode,
      Number(order.couponDiscount),
      order.canceled,
      order.orderStatus,
      order.orderLine?.products.map((product) => ({
        productId: product.productId,
        productName: product.productName,
        productImage: product.productImage,
        productPrice: Number(product.productPrice),
        quantity: product.quantity,
        size: product.productSize,
        orderItemId: product.id,
        lineTotal: Number(product.productPrice) * product.quantity,
      })) ?? [],
      order.orderLine?.createdAt ?? new Date(),
      order.orderLine?.updatedAt ?? new Date(),
    );
  }

  async createOrder(order: CreateOrderInput): Promise<OrderEntity> {
    const productIds = [
      ...new Set(order.products.map((item) => item.productId)),
    ];
    const products = await this.prisma.product.findMany({
      where: {
        productId: {
          in: productIds,
        },
      },
      select: {
        productId: true,
        productName: true,
        productImage: true,
        productPrice: true,
        productSize: true,
        productCategory: true,
      },
    });
    const productsById = new Map(
      products.map((product) => [product.productId, product]),
    );

    for (const orderProduct of order.products) {
      if (!productsById.has(orderProduct.productId)) {
        throw new NotFoundException('Item not found');
      }
    }
    let discountedPrices =
      await this.discountPricingService.getDiscountedPricesForProducts(
        products.map((product) => ({
          productId: product.productId,
          productPrice: product.productPrice,
          productCategory: product.productCategory,
        })),
      );
    let couponCode: string | null = null;
    let couponDiscount = 0;

    if (order.couponCode) {
      const couponPreview = await this.discountPricingService.redeemCoupon(
        order.couponCode,
        products.map((product) => {
          const orderProduct = order.products.find(
            (item) => item.productId === product.productId,
          )!;

          return {
            productId: product.productId,
            productPrice: product.productPrice,
            productCategory: product.productCategory,
            quantity: orderProduct.quantity,
          };
        }),
      );

      discountedPrices = couponPreview.linePrices;
      couponCode = couponPreview.couponCode;
      couponDiscount = couponPreview.couponDiscount;
    }

    const createdOrder = await this.prisma.order.create({
      data: {
        userId: order.userId,
        orderEmail: order.orderEmail,
        orderPhoneNumber: order.orderPhoneNumber,
        orderFirstName: order.orderFirstName,
        orderLastName: order.orderLastName,
        orderGovernate: order.orderGovernate,
        orderAddress: order.orderAddress,
        couponCode,
        couponDiscount,

        orderLine: {
          create: {
            products: {
              create: order.products.map((product) => {
                const currentProduct = productsById.get(product.productId)!;

                return {
                  productId: currentProduct.productId,
                  productName: currentProduct.productName,
                  productImage: currentProduct.productImage,
                  productPrice:
                    discountedPrices.get(currentProduct.productId) ??
                    currentProduct.productPrice,
                  productSize: currentProduct.productSize,
                  quantity: product.quantity,
                };
              }),
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
  private buildOrderSearchWhere(search?: string): Prisma.OrderWhereInput {
    const normalizedSearch = search?.trim();

    if (!normalizedSearch) return {};

    const matchingStatuses = Object.values(OrderStatus).filter((status) =>
      status.toLowerCase().includes(normalizedSearch.toLowerCase()),
    );
    const orderId = Number(normalizedSearch);

    return {
      OR: [
        ...(Number.isInteger(orderId) && orderId > 0 ? [{ orderId }] : []),
        { orderEmail: { contains: normalizedSearch, mode: 'insensitive' } },
        {
          orderPhoneNumber: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          orderFirstName: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          orderLastName: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          orderGovernate: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        {
          orderAddress: {
            contains: normalizedSearch,
            mode: 'insensitive',
          },
        },
        ...(matchingStatuses.length > 0
          ? [{ orderStatus: { in: matchingStatuses } }]
          : []),
        {
          orderLine: {
            products: {
              some: {
                productName: {
                  contains: normalizedSearch,
                  mode: 'insensitive',
                },
              },
            },
          },
        },
      ],
    };
  }

  async getOrders(params: OrderSearchParams = {}): Promise<PaginatedOrders> {
    const { page = 1, limit = 10, search } = params;
    const safePage = Math.max(page, 1);

    const safeLimit = Math.min(Math.max(limit, 1), 50);

    const skip = (safePage - 1) * safeLimit;
    const where = this.buildOrderSearchWhere(search);

    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where,
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

      this.prisma.order.count({ where }),
    ]);

    return {
      orders: orders.map((order) => this.toOrderEntity(order)),
      total,
      page: safePage,
      limit: safeLimit,
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

  // gets orders by email
  async findOrdersByEmail(email: string): Promise<OrderEntity[]> {
    const orders = await this.prisma.order.findMany({
      where: { orderEmail: email },
      include: {
        orderLine: {
          include: {
            products: true,
          },
        },
      },
    });

    return orders.map((order) => this.toOrderEntity(order));
  }

  // cancel order
  async cancelOrder(userId: number, orderId: number) {
    const order = await this.prisma.order.update({
      where: { orderId, userId },
      data: { orderStatus: 'CANCELLED' },
      include: {
        orderLine: {
          include: {
            products: true,
          },
        },
      },
    });

    return this.toOrderEntity(order);
  }

  async getOrderByIds(
    orderId: number,
    userId: number,
  ): Promise<Omit<OrderEntity, 'products'> | null> {
    const order = await this.prisma.order.findFirst({
      where: { orderId, userId },
      include: {
        orderLine: {
          include: {
            products: true,
          },
        },
      },
    });

    return order ? this.toOrderEntity(order) : null;
  }

  // Gets all user orders by user ID
  async getOrderByUserId(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { orderLine: { include: { products: true } } },
    });

    return orders.map((order) => this.toOrderEntity(order));
  }
}
