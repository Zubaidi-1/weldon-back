import { Transform } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsPhoneNumber,
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
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(30)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(30)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  lastName!: string;

  @IsPhoneNumber()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phoneNumber!: string;

  @IsIn(JORDAN_GOVERNATES)
  governate!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(200)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  address!: string;
}
