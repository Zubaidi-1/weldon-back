import { Module } from '@nestjs/common';
import { OrderService } from './order.service';
import { OrderController } from './order.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ORDER_REPOSITORY } from './order.repo.token';
import { OrderPrismaRepository } from './infrastructre/prisma/order.prisma.repository';
import { CartModule } from 'src/cart/cart.module';
import { DiscountsModule } from 'src/discounts/discounts.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  controllers: [OrderController],
  imports: [PrismaModule, CartModule, DiscountsModule, NotificationsModule],

  providers: [
    OrderService,
    {
      provide: ORDER_REPOSITORY,
      useClass: OrderPrismaRepository,
    },
  ],
})
export class OrderModule {}
