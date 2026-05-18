import { ProductCategory } from 'src/generated/prisma/enums';
import { ProductEntity } from '../entities/product.entity';

export interface IProductRepository {
  createProduct(
    product: Omit<ProductEntity, 'productId' | 'productImage'>,
    productImage: string,
  ): Promise<ProductEntity>;

  getAllProducts(): Promise<ProductEntity[]>;
  getProductById(productId: number): Promise<ProductEntity | null>;
  getProductByName(productName: string): Promise<ProductEntity[] | null>;
  getProductByCategory(
    productCategory: ProductCategory,
  ): Promise<ProductEntity[] | null>;
  deleteProduct(productId: number): Promise<ProductEntity>;
  editProduct(
    productId: number,
    product: Omit<ProductEntity, 'productImage' | 'productId'>,
    productImage?: string,
  ): Promise<ProductEntity>;
}
