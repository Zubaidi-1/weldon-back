import { IsNumber } from 'class-validator';
import { CreateProductDto } from './createProduct.dto';

export class updateProductDto extends CreateProductDto {
  @IsNumber()
  productId!: number;
}
