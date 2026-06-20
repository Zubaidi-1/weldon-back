import { Module } from '@nestjs/common';
import { MailerModule } from 'src/mailer/mailer.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DiscountsController } from './discounts.controller';
import { DiscountsService } from './discounts.service';
import { DiscountPricingService } from './discount-pricing.service';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [PrismaModule, MailerModule, NotificationsModule],
  controllers: [DiscountsController],
  providers: [DiscountsService, DiscountPricingService],
  exports: [DiscountPricingService],
})
export class DiscountsModule {}
