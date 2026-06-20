import { ProductCategory, ProductStatus } from 'src/common/types/ProductTypes';
import { Decimal } from 'src/generated/prisma/internal/prismaNamespace';

export class ProductEntity {
  constructor(
    public productId: number,

    public productName: string,

    public productSubTitle: string | null,

    public stockQuantity: number,

    public productCategory: ProductCategory[],

    public productPrice: Decimal,

    public productSize: number,

    public productDescription: string,

    public productSku: string,

    public productStatus: ProductStatus,

    public productImage: string,

    public productImages: string[] = [],

    public productShades: string[] = [],

    public createdAt?: Date,

    public updatedAt?: Date,
  ) {}
}
