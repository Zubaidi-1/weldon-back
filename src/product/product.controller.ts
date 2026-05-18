import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/createProduct.dto';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ProductCategory } from 'src/generated/prisma/enums';

@Controller('product')
export class ProductController {
  constructor(private readonly productService: ProductService) {}
  @Get('all-products')
  async getAllProducts() {
    return await this.productService.getAllProducts();
  }
  @Post('create-product')
  @UseInterceptors(
    FileInterceptor('productImage', {
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
    }),
  )
  async createProduct(
    @Body() product: CreateProductDto,
    @UploadedFile() productImage: Express.Multer.File,
  ) {
    if (!productImage) {
      throw new BadRequestException('Product image is required');
    }

    const imagePath = `/uploads/products/${productImage.filename}`;

    return this.productService.createProduct(product, imagePath);
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

  @Delete('delete-product/:productId')
  async deleteProduct(@Param('productId') productId: string) {
    return await this.productService.deleteProduct(+productId);
  }

  @Patch('update-product/:productId')
  @UseInterceptors(
    FileInterceptor('productImage', {
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
    }),
  )
  async updateProduct(
    @Param('productId') productId: string,
    @Body() product: CreateProductDto,
    @UploadedFile() productImage?: Express.Multer.File,
  ) {
    const imagePath = productImage
      ? `/uploads/products/${productImage.filename}`
      : undefined;

    return await this.productService.updateProduct(
      +productId,
      product,
      imagePath,
    );
  }
}
