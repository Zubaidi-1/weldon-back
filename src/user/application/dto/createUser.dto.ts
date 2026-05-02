import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  // * Email validation

  @IsEmail()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  email!: string;

  // * Name Validation
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  @MinLength(3)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;

  // * Phone number validation
  @IsPhoneNumber()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phoneNumber!: string;
  // * Password Validation
  @MinLength(8)
  @MaxLength(24)

  // at least one lowercase letter
  @Matches(/[a-z]/, {
    message: 'password must contain at least one lowercase letter',
  })

  // at least one uppercase letter
  @Matches(/[A-Z]/, {
    message: 'password must contain at least one uppercase letter',
  })

  // at least one number
  @Matches(/[0-9]/, { message: 'password must contain at least one number' })

  // at least one symbol
  @Matches(/[^A-Za-z0-9]/, {
    message: 'password must contain at least one symbol',
  })
  password!: string;
}
