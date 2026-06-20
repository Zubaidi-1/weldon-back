import {
  Body,
  Controller,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { type Request, type Response } from 'express';
import { JwtAuthGuard } from './guard/auth.guard';
import { ResetPasswordDto } from './dto/resetPasswordDto';
import { ForgotPasswordEmailDto } from './dto/forgotPasswordEmailDto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('signin')
  async signin(
    @Body() data: { email: string; password: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, refreshToken, accessToken } = await this.authService.signin(
      data.email,
      data.password,
    );
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false, // true in production (https)
      sameSite: 'strict',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { accessToken, user };
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies['refreshToken'];

    const { accessToken, refreshToken: newRefreshToken } =
      await this.authService.refresh(refreshToken);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { accessToken };
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('/forgot-password-email')
  async sendResetPasswordEmail(@Body() email: ForgotPasswordEmailDto) {
    return await this.authService.forgotPasswordEmail(email.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('/forgot-password')
  async resetPassword(
    @Query('token') token: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    return await this.authService.forgotNewPassword(
      token,
      resetPasswordDto.password,
    );
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req['user'];

    const result = await this.authService.logout(user.email);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth/refresh',
    });

    return result;
  }
}
