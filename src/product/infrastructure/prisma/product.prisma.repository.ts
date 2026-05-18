import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
  ProductCategory,
  productStatus as ProductStatusEnum,
} from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { ProductEntity } from 'src/product/domain/entities/product.entity';
import { IProductRepository } from 'src/product/domain/repositories/product.repository';

@Injectable()
export class ProductPrismaRepository implements IProductRepository {
  constructor(private prisma: PrismaService) {}

  async createProduct(
    product: Omit<ProductEntity, 'productId' | 'productImage'>,
    productImage: string,
  ): Promise<ProductEntity> {
    console.log(product);
    return await this.prisma.product.create({
      data: {
        productName: product.productName,
        productCategory: product.productCategory,
        productStatus: product.productStatus,
        productDescription: product.productDescription,
        productImage: productImage,
        productSku: product.productSku,
        productPrice: product.productPrice,
        productSize: product.productSize,
        stockQuantity: product.stockQuantity,
      },
    });
  }
  async getAllProducts(): Promise<ProductEntity[]> {
    return await this.prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProductById(productId: number): Promise<ProductEntity | null> {
    return await this.prisma.product.findUnique({ where: { productId } });
  }

  // For search bar
  async getProductByName(productName: string): Promise<ProductEntity[] | null> {
    return await this.prisma.product.findMany({
      where: {
        productName: {
          contains: productName,
          mode: 'insensitive',
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // get product by category

  async getProductByCategory(
    productCategory: ProductCategory,
  ): Promise<ProductEntity[] | null> {
    return await this.prisma.product.findMany({
      where: { productCategory },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteProduct(productId: number): Promise<ProductEntity> {
    return this.prisma.product.delete({ where: { productId } });
  }

  async editProduct(
    productId: number,
    product: Omit<ProductEntity, 'productImage' | 'productId'>,
    productImage?: string,
  ): Promise<ProductEntity> {
    const productStatus =
      product.stockQuantity <= 5
        ? ProductStatusEnum.OUT_OF_STOCK
        : product.productStatus;

    return await this.prisma.product.update({
      where: { productId },
      data: {
        ...product,
        productStatus,
        ...(productImage ? { productImage } : {}),
      },
    });
  }
}
