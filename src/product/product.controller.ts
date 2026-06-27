import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Express } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/createProduct.dto';
import { diskStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { extname, join } from 'path';
import { ProductCategory } from 'src/generated/prisma/enums';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { Roles } from 'src/auth/auth.decorator';

const productImageUploadOptions: MulterOptions = {
  storage: diskStorage({
    destination: join(process.cwd(), 'uploads', 'products'),
    filename: (req, file, cb) => {
      const uniqueName = `${Date.now()}-${Math.round(
        Math.random() * 1e9,
      )}${extname(file.originalname)}`;

      cb(null, uniqueName);
    },
  }),

  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.mimetype)) {
      return cb(
        new BadRequestException(
          'Invalid product image. Only jpg, jpeg, png, webp are allowed',
        ),
        false,
      );
    }

    cb(null, true);
  },

  limits: {
    fileSize: 20 * 1024 * 1024,
  },
};

type ProductImageFiles = {
  productImage?: Express.Multer.File[];
  productImages?: Express.Multer.File[];
};

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}
  @Get('all-products')
  async getAllProducts(@Query('limit') limit?: string) {
    return await this.productService.getAllProducts(
      limit ? Number(limit) : undefined,
    );
  }

  @Get('store-products')
  async getStoreProducts() {
    return await this.productService.getStoreProducts();
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('create-product')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'productImage', maxCount: 10 },
        { name: 'productImages', maxCount: 10 },
      ],
      productImageUploadOptions,
    ),
  )
  async createProduct(
    @Body() product: CreateProductDto,
    @UploadedFiles() files: ProductImageFiles = {},
  ) {
    const productImages = [
      ...(files.productImages ?? []),
      ...(files.productImage ?? []),
    ].map((file) => `/uploads/products/${file.filename}`);

    if (productImages.length === 0) {
      throw new BadRequestException('At least one product image is required');
    }

    return this.productService.createProduct(product, productImages);
  }

  @Get(':productId')
  async getProductById(@Param('productId') productId: string) {
    return await this.productService.getProductById(+productId);
  }
  @Get(':productCategory')
  async getProductByCategory(
    @Param('productCategory') productCategory: ProductCategory,
  ) {
    return await this.productService.getProductByCategory(productCategory);
  }

  @Get(':productName')
  async getProductByName(@Param('productName') productName: string) {
    return await this.productService.getProductsByProductName(productName);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('delete-product/:productId')
  async deleteProduct(@Param('productId') productId: string) {
    return await this.productService.deleteProduct(+productId);
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch('update-product/:productId')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'productImage', maxCount: 10 },
        { name: 'productImages', maxCount: 10 },
      ],
      productImageUploadOptions,
    ),
  )
  async updateProduct(
    @Param('productId') productId: string,
    @Body() product: CreateProductDto,
    @UploadedFiles() files: ProductImageFiles = {},
  ) {
    const productImages = [
      ...(files.productImages ?? []),
      ...(files.productImage ?? []),
    ].map((file) => `/uploads/products/${file.filename}`);

    return await this.productService.updateProduct(
      +productId,
      product,
      productImages,
      product.imagesToDelete,
    );
  }
}
