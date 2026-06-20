import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/createProduct.dto';
import { type IProductRepository } from './domain/repositories/product.repository';
import { PRODUCT_REPOSITORY } from './product.repo.token';
import { ProductCategory } from 'src/generated/prisma/enums';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { unlink } from 'fs/promises';
import { basename, join } from 'path';

@Injectable()
export class ProductService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: IProductRepository,
  ) {}
  // Create product
  async createProduct(product: CreateProductDto, productImages: string[]) {
    try {
      if (productImages.length === 0) {
        throw new BadRequestException('At least one product image is required');
      }

      const createdProduct = await this.productRepo.createProduct(
        product,
        productImages,
      );

      if (!createdProduct) {
        throw new BadRequestException('Failed to create product');
      }

      return createdProduct;
    } catch (error: unknown) {
      // Prisma unique constraint example
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new BadRequestException('A product with this SKU already exists');
      }

      // Prisma foreign key example
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new BadRequestException('Invalid related data');
      }

      // Already a Nest exception
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        error instanceof Error
          ? `Failed to add product: ${error.message}`
          : 'Failed to add product',
      );
    }
  }

  // get product by id
  async getProductById(productId: number) {
    try {
      return await this.productRepo.getProductById(productId);
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Failed to fetch product ${productId}: ${this.getErrorMessage(error)}`,
      );
    }
  }

  // get product by category
  async getProductByCategory(productCategory: ProductCategory) {
    try {
      return await this.productRepo.getProductByCategory(productCategory);
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Failed to fetch ${productCategory}'s products: ${this.getErrorMessage(error)}`,
      );
    }
  }

  // Search bar (search by name)
  async getProductsByProductName(productName: string) {
    try {
      return await this.productRepo.getProductByName(productName);
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Failed to fetch product ${productName}: ${this.getErrorMessage(error)}`,
      );
    }
  }

  // Get all products

  async getAllProducts(limit?: number) {
    try {
      const productLimit =
        limit && Number.isFinite(limit) && limit > 0
          ? Math.floor(limit)
          : undefined;

      return await this.productRepo.getAllProducts(productLimit);
    } catch (error: unknown) {
      throw new InternalServerErrorException(
        `Failed to fetch products: ${this.getErrorMessage(error)}`,
      );
    }
  }

  async getStoreProducts() {
    return await this.getAllProducts(6);
  }

  async deleteProduct(productId: number) {
    try {
      return this.productRepo.deleteProduct(productId);
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('This product does not exist');
        }
      }
      throw new InternalServerErrorException('An error has occured.');
    }
  }
  async updateProduct(
    productId: number,
    product: CreateProductDto,
    productImages: string[] = [],
    imagesToDelete?: string | string[],
  ) {
    try {
      const existingProduct = await this.productRepo.getProductById(productId);

      if (!existingProduct) {
        throw new NotFoundException('This product does not exist');
      }

      const deleteList = this.normalizeImagesToDelete(imagesToDelete);
      const deleteSet = new Set(deleteList);
      const existingImages =
        existingProduct.productImages.length > 0
          ? existingProduct.productImages
          : [existingProduct.productImage];
      const removedExistingImages = existingImages.filter((image) =>
        deleteSet.has(image),
      );

      const nextProductImages = [
        ...existingImages.filter((image) => !deleteSet.has(image)),
        ...productImages,
      ];

      if (nextProductImages.length === 0) {
        throw new BadRequestException('Product must have at least one image');
      }

      const updatedProduct = await this.productRepo.editProduct(
        productId,
        product,
        nextProductImages,
      );

      await this.deleteProductImageFiles(removedExistingImages);

      return updatedProduct;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException('An error has occured.');
    }
  }

  private normalizeImagesToDelete(imagesToDelete?: string | string[]) {
    if (!imagesToDelete) return [];

    const imageValues = Array.isArray(imagesToDelete)
      ? imagesToDelete
      : [imagesToDelete];

    return imageValues
      .flatMap((image) => {
        if (!image) return [];

        try {
          const parsed = JSON.parse(image) as unknown;
          if (Array.isArray(parsed)) {
            return parsed.filter((value): value is string => {
              return typeof value === 'string' && value.length > 0;
            });
          }
        } catch {
          return image.split(',');
        }

        return [image];
      })
      .map((image) => image.trim())
      .filter((image) => image.length > 0);
  }

  private async deleteProductImageFiles(productImages: string[]) {
    await Promise.allSettled(
      productImages
        .filter((image) => image.startsWith('/uploads/products/'))
        .map((image) => {
          const filePath = join(
            process.cwd(),
            'uploads',
            'products',
            basename(image),
          );

          return unlink(filePath);
        }),
    );
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error';
  }
}
