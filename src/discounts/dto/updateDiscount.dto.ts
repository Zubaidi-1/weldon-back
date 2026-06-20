import { PartialType } from '@nestjs/mapped-types';
import { CreateDiscountDto } from './createDiscount.dto';

export class UpdateDiscountDto extends PartialType(CreateDiscountDto) {}
