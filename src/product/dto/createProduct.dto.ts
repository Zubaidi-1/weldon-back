import { Decimal } from '@prisma/client/runtime/client';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsNumber,
  IsOptional,
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

function parseOptionalStringArray(value: unknown) {
  if (value === undefined || value === null || value === '') return undefined;

  const values = Array.isArray(value) ? value : [value];

  return values
    .flatMap((item) => {
      if (typeof item !== 'string') return [];

      try {
        const parsed = JSON.parse(item) as unknown;

        if (Array.isArray(parsed)) {
          return parsed.filter((shade): shade is string => {
            return typeof shade === 'string' && shade.trim().length > 0;
          });
        }
      } catch {
        return item.split(',');
      }

      return [item];
    })
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export class CreateProductDto {
  @IsString()
  @MinLength(3, { message: 'Product Name must be at least 3 charachters' })
  @MaxLength(70, { message: 'Product Name must be 70 charachters at max' })
  productName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(160, { message: 'Product subtitle must be 160 characters at max' })
  productSubTitle?: string;

  @Transform(({ value }: { value: unknown }) => parseOptionalStringArray(value))
  @IsIn(PRODUCT_CATEGORIES, { each: true })
  productCategory!: ProductCategory[];

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

  @IsOptional()
  imagesToDelete?: string | string[];

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => parseOptionalStringArray(value))
  @IsString({ each: true })
  productShades?: string[];
}

// ! Product image is validated in the controller
