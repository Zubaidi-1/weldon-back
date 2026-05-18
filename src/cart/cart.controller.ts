import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';
import type { AuthPayload } from 'src/auth/types/auth-payload.type';
import { CartService } from './cart.service';
import type { AddCartProduct } from './domain/entities/cart.entity';
import {
  type SyncCartBody,
  type UpdateCartBody,
  type UpdateCartType,
} from 'src/common/types/CartTypes';

@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @UseGuards(JwtAuthGuard)
  @Post('add')
  async addToCart(@Body() product: AddCartProduct, @Req() req: Request) {
    const user = req['user'] as AuthPayload;

    return await this.cartService.addToCart(product, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getCart(@Req() req: Request) {
    const user = req['user'] as AuthPayload;
    return await this.cartService.getCart(user.id);
  }
  @UseGuards(JwtAuthGuard)
  @Patch('update-cart')
  async updateCart(
    @Query('updateType') updateType: UpdateCartType = 'DECREMENT',
    @Body() cart: UpdateCartBody,
    @Req() req: Request,
  ) {
    const user = req['user'] as AuthPayload;

    switch (updateType) {
      case 'INCREMENT':
        return await this.cartService.incrementProductQuantity(
          user.id,
          cart.cartId,
          cart.cartItemId,
          cart.productId,
          cart.itemQuantity,
        );
      case 'DECREMENT':
        return await this.cartService.decrementProductQuantity(
          user.id,
          cart.productId,
          cart.itemQuantity,
        );
      case 'REMOVE':
        return await this.cartService.removeProductFromCart(
          cart.cartId,
          cart.cartItemId,
          user.id,
        );
    }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('sync')
  async syncCart(@Body() body: SyncCartBody, @Req() req: Request) {
    const user = req['user'] as AuthPayload;

    return await this.cartService.syncCart(user.id, body.items);
  }
}
