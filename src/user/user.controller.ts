import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Post,
  Query,
  Req,
  Res,
  Put,
  UseGuards,
  Param,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './application/dto/createUser.dto';
import { type Request, type Response } from 'express';
import { OptionalAuthGuard } from 'src/auth/guard/optional-auth.guard';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';
import type { AuthPayload } from 'src/auth/types/auth-payload.type';
import { UserProfileDto } from './application/dto/userProfile.dto';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { Roles } from 'src/auth/auth.decorator';

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
  async upsertProfile(@Body() profile: UserProfileDto, @Req() req: Request) {
    return await this.userService.upsertProfile(
      req['user'] as AuthPayload,
      profile,
    );
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    const frontendUrl =
      process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';

    try {
      await this.userService.verifyUser(token);

      // success → redirect to login
      return res.redirect(`${frontendUrl}/auth/login?verified=true`);
    } catch (e) {
      // failure → still redirect to login
      return res.redirect(`${frontendUrl}/auth/login?verified=false`);
    }
  }
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('ban-user/:userId')
  async banUser(@Req() req: Request, @Param('userId') userId: number) {
    return await this.userService.banUsers(+userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('all-users')
  async getAllUsers(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
    @Query('role') role?: 'ADMIN' | 'USER',
    @Query('banStatus') banStatus?: 'ACTIVE' | 'BANNED',
    @Query('verificationStatus')
    verificationStatus?: 'VERIFIED' | 'UNVERIFIED',
  ) {
    return await this.userService.getAllUsers({
      page,
      limit,
      search,
      role,
      banStatus,
      verificationStatus,
    });
  }
}
