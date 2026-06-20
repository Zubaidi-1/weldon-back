import { OrderStatus } from 'src/generated/prisma/enums';

export type OrderProduct = {
  orderItemId: number;
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
  productName?: string;
  productImage?: string | null;
  productPrice?: number;
  quantity: number;
  size?: number;
};

export type CreateOrderInput = Omit<
  OrderEntity,
  | 'orderId'
  | 'canceled'
  | 'orderStatus'
  | 'products'
  | 'couponDiscount'
  | 'couponCode'
  | 'createdAt'
  | 'updatedAt'
> & {
  products: CreateOrderProduct[];
  couponCode?: string;
};

export type CreateOrderDetails = Omit<CreateOrderInput, 'userId'> & {
  products?: CreateOrderProduct[];
  couponCode?: string;
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
    public couponCode: string | null,
    public couponDiscount: number,

    public canceled: boolean,
    public orderStatus: OrderStatus,

    // products
    public products: OrderProduct[],

    // dates
    public createdAt: Date,
    public updatedAt: Date,
  ) {}
}
