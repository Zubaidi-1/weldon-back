import { IsEmail } from 'class-validator';

export class ForgotPasswordEmailDto {
  @IsEmail({}, { message: 'Invalid Email' })
  email!: string;
}
