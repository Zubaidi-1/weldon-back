import { ProductCategory } from 'src/generated/prisma/enums';
import { ProductEntity } from '../entities/product.entity';

export type ProductWriteInput = Omit<
  ProductEntity,
  | 'productId'
  | 'productImage'
  | 'productImages'
  | 'productSubTitle'
  | 'productShades'
> & {
  productSubTitle?: string | null;
  productShades?: string[];
};

export interface IProductRepository {
  createProduct(
    product: ProductWriteInput,
    productImages: string[],
  ): Promise<ProductEntity>;

  getAllProducts(limit?: number): Promise<ProductEntity[]>;
  getProductById(productId: number): Promise<ProductEntity | null>;
  getProductByName(productName: string): Promise<ProductEntity[] | null>;
  getProductByCategory(
    productCategory: ProductCategory,
  ): Promise<ProductEntity[] | null>;
  deleteProduct(productId: number): Promise<ProductEntity>;
  editProduct(
    productId: number,
    product: ProductWriteInput,
    productImages?: string[],
  ): Promise<ProductEntity>;
}
