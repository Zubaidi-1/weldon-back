import { ProductEntity } from 'src/product/domain/entities/product.entity';
import { CreateOrderInput, OrderEntity } from '../entities/order.entity';
import { OrderStatus } from 'src/generated/prisma/enums';

export type PaginatedOrders = {
  orders: OrderEntity[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type OrderSearchParams = {
  page?: number;
  limit?: number;
  search?: string;
};

export interface IOrderRepository {
  createOrder(order: CreateOrderInput): Promise<OrderEntity>;
  checkStock(productId: number, stockBuffer?: number): Promise<number | null>;
  decrementStock(
    products: { productId: number; quantity: number }[],
  ): Promise<ProductEntity[]>;
  getOrders(params?: OrderSearchParams): Promise<PaginatedOrders>;
  updateOrderStatus(orderId: number, status: OrderStatus): Promise<OrderEntity>;
  findOrdersByEmail(email: string): Promise<OrderEntity[]>;
  cancelOrder(
    userId: number,
    orderId: number,
  ): Promise<Omit<OrderEntity, 'products'>>;
  getOrderByIds(
    orderId: number,
    userId: number,
  ): Promise<Omit<OrderEntity, 'products'> | null>;
  getOrderByUserId(userId: number): Promise<Omit<OrderEntity, 'products'>[]>;
}
