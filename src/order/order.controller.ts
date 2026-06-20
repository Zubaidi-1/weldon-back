import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { OptionalAuthGuard } from 'src/auth/guard/optional-auth.guard';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';
import type { AuthPayload } from 'src/auth/types/auth-payload.type';
import { OrderService } from './order.service';
import type { CreateOrderDetails } from './domain/entities/order.entity';
import { OrderStatus } from 'src/generated/prisma/enums';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { Roles } from 'src/auth/auth.decorator';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  async getOrders(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('search') search?: string,
  ) {
    return await this.orderService.getOrders({ page, limit, search });
  }

  @UseGuards(OptionalAuthGuard)
  @Post()
  async createOrder(@Body() order: CreateOrderDetails, @Req() req: Request) {
    const user = req['user'] as AuthPayload | undefined;

    return await this.orderService.createOrder(
      user?.id ?? null,
      order,
      user?.email,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':orderId/status')
  async updateOrderStatus(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: { orderStatus: OrderStatus },
    @Req() req: Request,
  ) {
    const user = req['user'] as AuthPayload;

    if (user.roleName !== 'ADMIN') {
      throw new ForbiddenException('Only admins can update order statuses');
    }

    return await this.orderService.updateOrderStatus(orderId, body.orderStatus);
  }
  @UseGuards(JwtAuthGuard)
  @Get('/user-orders-by-id')
  async getUserOrdersById(@Req() req: Request) {
    const user = req['user'] as AuthPayload;
    return await this.orderService.getUserOrdersById(user.id);
  }
  @UseGuards(JwtAuthGuard)
  @Get('/user-orders')
  async getUserOrdersByEmail(@Req() req: Request) {
    const user = req['user'] as AuthPayload;
    return await this.orderService.getUserOrdersByEmail(user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('cancel-order/:orderId')
  async cancelOrder(@Req() req: Request, @Param('orderId') orderId: string) {
    const user = req['user'] as AuthPayload;

    return await this.orderService.cancelOrder(user.id, Number(orderId));
  }
}
