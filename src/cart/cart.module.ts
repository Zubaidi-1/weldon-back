import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CART_REPOSITORY } from './cart.repo.token';
import { CartPrismaRepository } from './infrastructure/prisma/cart.prisma.repository';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DiscountsModule } from 'src/discounts/discounts.module';

@Module({
  controllers: [CartController],
  imports: [PrismaModule, DiscountsModule],
  providers: [
    CartService,
    {
      provide: CART_REPOSITORY,
      useClass: CartPrismaRepository,
    },
  ],
  exports: [CartService],
})
export class CartModule {}
