import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './application/dto/createUser.dto';
import { type Request, type Response } from 'express';
import { OptionalAuthGuard } from 'src/auth/guard/optional-auth.guard';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';
import type { AuthPayload } from 'src/auth/types/auth-payload.type';
import { UserProfileDto } from './application/dto/userProfile.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Post('create-user')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return await this.userService.register(createUserDto);
  }

  @UseGuards(OptionalAuthGuard)
  @Get('me')
  async getMe(@Req() req: Request) {
    return await this.userService.getMe(req['user']);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: Request) {
    return await this.userService.getProfile(req['user'] as AuthPayload);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async upsertProfile(
    @Body() profile: UserProfileDto,
    @Req() req: Request,
  ) {
    return await this.userService.upsertProfile(
      req['user'] as AuthPayload,
      profile,
    );
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    try {
      await this.userService.verifyUser(token);

      // success → redirect to login
      return res.redirect('http://localhost:3000/auth/login?verified=true');
    } catch (e) {
      // failure → still redirect to login
      return res.redirect('http://localhost:3000/auth/login?verified=false');
    }
  }
}
