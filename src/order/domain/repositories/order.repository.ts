import { ProductEntity } from 'src/product/domain/entities/product.entity';
import { CreateOrderInput, OrderEntity } from '../entities/order.entity';
import { OrderStatus } from 'src/generated/prisma/enums';

export type PaginatedOrders = {
  orders: OrderEntity[];
  total: number;
  page: number;
  totalPages: number;
};

export interface IOrderRepository {
  createOrder(order: CreateOrderInput): Promise<OrderEntity>;
  checkStock(productId: number, stockBuffer?: number): Promise<number | null>;
  decrementStock(
    products: { productId: number; quantity: number }[],
  ): Promise<ProductEntity[]>;
  getOrders(page?: number, limit?: number): Promise<PaginatedOrders>;
  updateOrderStatus(orderId: number, status: OrderStatus): Promise<OrderEntity>;
}
