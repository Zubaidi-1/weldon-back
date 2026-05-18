import { OrderStatus } from 'src/generated/prisma/enums';

export type OrderProduct = {
  cartItemId: number;
  productId: number;
  productName: string;
  productImage: string | null;
  productPrice: number;
  quantity: number;
  size: number;
  lineTotal: number;
};

export type CreateOrderProduct = {
  cartItemId?: number;
  productId: number;
  productName: string;
  productImage: string | null;
  productPrice: number;
  quantity: number;
  size: number;
};

export type CreateOrderInput = Omit<
  OrderEntity,
  | 'orderId'
  | 'canceled'
  | 'orderStatus'
  | 'products'
  | 'createdAt'
  | 'updatedAt'
> & {
  products: CreateOrderProduct[];
};

export type CreateOrderDetails = Omit<CreateOrderInput, 'userId'> & {
  products?: CreateOrderProduct[];
};

export class OrderEntity {
  constructor(
    public orderId: number,
    public userId: number | null,

    // customer info
    public orderEmail: string,
    public orderPhoneNumber: string,
    public orderFirstName: string,
    public orderLastName: string,
    public orderGovernate: string,
    public orderAddress: string,

    public canceled: boolean,
    public orderStatus: OrderStatus,

    // products
    public products: OrderProduct[],

    // dates
    public createdAt: Date,
    public updatedAt: Date,
  ) {}
}
