import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const JORDAN_GOVERNATES = [
  'Ajloun',
  'Amman',
  'Aqaba',
  'Balqa',
  'Irbid',
  'Jerash',
  'Karak',
  "Ma'an",
  'Madaba',
  'Mafraq',
  'Tafilah',
  'Zarqa',
] as const;

export class UserProfileDto {
  @IsIn(JORDAN_GOVERNATES)
  governate!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  address!: string;
}
