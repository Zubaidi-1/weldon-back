import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ORDER_REPOSITORY } from './order.repo.token';
import { type IOrderRepository } from './domain/repositories/order.repository';
import { CartService } from 'src/cart/cart.service';
import {
  CreateOrderDetails,
  OrderEntity,
} from './domain/entities/order.entity';
import { PaginatedOrders } from './domain/repositories/order.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderStatus } from 'src/generated/prisma/enums';

type OrderEmailType =
  | 'ORDER_CANCELLED'
  | 'ORDER_CONFIRMED'
  | 'ORDER_SHIPPED'
  | 'ORDER_DELIVERED'
  | 'ORDER_CREATED';

const statusEmailEvents: Partial<Record<OrderStatus, OrderEmailType>> = {
  [OrderStatus.CONFIRMED]: 'ORDER_CONFIRMED',
  [OrderStatus.SHIPPED]: 'ORDER_SHIPPED',
  [OrderStatus.DELIVERED]: 'ORDER_DELIVERED',
  [OrderStatus.CANCELLED]: 'ORDER_CANCELLED',
};

@Injectable()
export class OrderService {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepo: IOrderRepository,
    private readonly cartService: CartService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createOrder(
    userId: number | null,
    orderDetails: CreateOrderDetails,
    userEmail?: string,
  ): Promise<OrderEntity> {
    const orderEmail = this.normalizeOrderEmail(
      userEmail ?? orderDetails.orderEmail,
    );
    const products = userId
      ? await this.getUserCartProducts(userId)
      : orderDetails.products;

    if (!products || products.length === 0) {
      throw new NotFoundException('Cart is empty');
    }

    for (const product of products) {
      await this.checkStock(
        product.productId,
        product.productName,
        product.quantity,
      );
    }

    const order = await this.orderRepo.createOrder({
      ...orderDetails,
      orderEmail,
      userId,
      products,
    });

    if (order) {
      this.eventEmitter.emit('order.created', {
        event: 'ORDER_CREATED',
        email: order.orderEmail,
        name: `${order.orderFirstName} ${order.orderLastName}`.trim(),
        orderId: order.orderId,
      });
    }
    await this.orderRepo.decrementStock(
      products.map((product) => ({
        productId: product.productId,
        quantity: product.quantity,
      })),
    );

    if (userId) {
      await this.cartService.clearCart(userId);
    }

    return order;
  }

  private normalizeOrderEmail(email?: string) {
    const normalizedEmail = email?.trim().toLowerCase();

    if (
      !normalizedEmail ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      throw new BadRequestException('A valid email is required');
    }

    return normalizedEmail;
  }

  async getOrders(page?: number, limit?: number): Promise<PaginatedOrders> {
    return await this.orderRepo.getOrders(page, limit);
  }

  async updateOrderStatus(
    orderId: number,
    status: OrderStatus,
  ): Promise<OrderEntity> {
    if (!Object.values(OrderStatus).includes(status)) {
      throw new BadRequestException('Invalid order status');
    }

    const order = await this.orderRepo.updateOrderStatus(orderId, status);

    const emailEvent = statusEmailEvents[status];

    if (emailEvent) {
      this.eventEmitter.emit('order.status.updated', {
        event: emailEvent,
        email: order.orderEmail,
        name: `${order.orderFirstName} ${order.orderLastName}`.trim(),
        orderId: order.orderId,
      });
    }

    return order;
  }

  async cancelOrder(userId: number, orderId: number) {
    if (!userId || !orderId) {
      throw new ForbiddenException('No order found');
    }

    const order = await this.orderRepo.getOrderByIds(orderId, userId);

    if (!order) {
      throw new ForbiddenException('No order found');
    }

    const ONE_HOUR = 60 * 60 * 1000;

    if (Date.now() - order.createdAt.getTime() >= ONE_HOUR) {
      throw new ForbiddenException("Can't cancel order now");
    }

    return await this.updateOrderStatus(orderId, 'CANCELLED');
  }
  async getUserOrders(email: string) {
    return await this.orderRepo.findOrdersByEmail(email);
  }
  private async getUserCartProducts(userId: number) {
    const cart = await this.cartService.getCart(userId);

    if (!cart || cart.items.length === 0) return [];

    return cart.items.map((product) => ({
      cartItemId: product.cartItemId,
      productId: product.productId,
      productName: product.productName,
      productImage: product.productImage,
      productPrice: Number(product.price),
      quantity: product.quantity,
      size: product.productSize,
    }));
  }

  private async checkStock(
    productId: number,
    productName: string,
    quantity: number,
  ) {
    const stock = await this.orderRepo.checkStock(productId);
    if (stock === null) throw new NotFoundException('Item not found');
    if (stock < quantity) {
      throw new ForbiddenException(`${productName} is out of stock`);
    }

    return stock;
  }
}
