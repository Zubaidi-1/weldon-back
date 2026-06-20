import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  DiscountScope,
  DiscountType,
  PromotionType,
  ProductCategory,
} from 'src/generated/prisma/enums';

export class CreateDiscountDto {
  @IsString()
  @MinLength(3)
  @MaxLength(80)
  name!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  discountValue!: number;

  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @IsOptional()
  @IsEnum(PromotionType)
  promotionType?: PromotionType;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(32)
  couponCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minimumOrderTotal?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  usageLimit?: number;

  @IsEnum(DiscountScope)
  discountScope!: DiscountScope;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startsAt?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endsAt?: Date;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(ProductCategory, { each: true })
  discountCategories?: ProductCategory[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  productIds?: number[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000)
  priority?: number;
}
