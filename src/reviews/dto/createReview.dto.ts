import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export default class createReviewDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  review!: string;

  @IsInt()
  productId!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  stars!: number;
}
