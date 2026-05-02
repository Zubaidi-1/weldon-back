import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './application/dto/createUser.dto';
import { type Response } from 'express';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}
  @Post('create-user')
  async createUser(@Body() createUserDto: CreateUserDto) {
    return await this.userService.register(createUserDto);
  }
  @Get('verify-email')
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    try {
      await this.userService.verifyUser(token);

      // success → redirect to login
      return res.redirect('http://localhost:3000/login?verified=true');
    } catch (e) {
      // failure → still redirect to login
      return res.redirect('http://localhost:3000/login?verified=false');
    }
  }
}
