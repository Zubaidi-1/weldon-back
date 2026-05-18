import { Decimal } from '@prisma/client/runtime/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNumber,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_STATUS,
  type ProductCategory,
  type ProductStatus,
} from 'src/common/types/ProductTypes';

export class CreateProductDto {
  @IsString()
  @MinLength(3, { message: 'Product Name must be at least 3 charachters' })
  @MaxLength(70, { message: 'Product Name must be 70 charachters at max' })
  productName!: string;
  @IsIn(PRODUCT_CATEGORIES) productCategory!: ProductCategory;

  @IsIn(PRODUCT_STATUS) productStatus!: ProductStatus;
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'Price should be like 20.00' })
  productPrice!: Decimal;

  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 0 },
    { message: 'Product size should not have decimals' },
  )
  productSize!: number;

  @IsString()
  @MinLength(3, { message: 'Product Sku must be at least 3 charachters' })
  @MaxLength(20, { message: 'Product Name must be 20 charachters at max' })
  productSku!: string;

  @IsString()
  @MinLength(20, {
    message: 'Product description must be at least 20 charachters',
  })
  @MaxLength(2000, {
    message: 'Product description must be 2000 charachters at max',
  })
  productDescription!: string;

  @IsNumber(
    { maxDecimalPlaces: 0 },
    { message: 'Stock should not have decimals' },
  )
  @Type(() => Number)
  stockQuantity!: number;
}

// ! Product image is validated in the controller
