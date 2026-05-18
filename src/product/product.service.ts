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
import { updateProductDto } from './dto/updateProduct';

@Injectable()
export class ProductService {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepo: IProductRepository,
  ) {}
  // Create product
  async createProduct(product: CreateProductDto, productImage: string) {
    try {
      const createdProduct = await this.productRepo.createProduct(
        product,
        productImage,
      );

      if (!createdProduct) {
        throw new BadRequestException('Failed to create product');
      }

      return createdProduct;
    } catch (error: any) {
      // Prisma unique constraint example
      if (error?.code === 'P2002') {
        throw new BadRequestException('A product with this SKU already exists');
      }

      // Prisma foreign key example
      if (error?.code === 'P2003') {
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
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to fetch product ${productId}: ${error.message}`,
      );
    }
  }

  // get product by category
  async getProductByCategory(productCategory: ProductCategory) {
    try {
      return await this.productRepo.getProductByCategory(productCategory);
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to fetch ${productCategory}'s products: ${error.message}`,
      );
    }
  }

  // Search bar (search by name)
  async getProductsByProductName(productName: string) {
    try {
      return await this.productRepo.getProductByName(productName);
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to fetch product ${productName}: ${error.message}`,
      );
    }
  }

  // Get all products

  async getAllProducts() {
    try {
      return await this.productRepo.getAllProducts();
    } catch (error: any) {
      throw new InternalServerErrorException(
        `Failed to fetch products: ${error.message}`,
      );
    }
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
    productImage?: string,
  ) {
    try {
      return await this.productRepo.editProduct(
        productId,
        product,
        productImage,
      );
    } catch (error) {
      throw new InternalServerErrorException('An error has occured.');
    }
  }
}
