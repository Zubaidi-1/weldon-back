import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from 'src/auth/auth.decorator';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';
import { RolesGuard } from 'src/auth/guard/role.guard';
import { CreateDiscountDto } from './dto/createDiscount.dto';
import { UpdateDiscountDto } from './dto/updateDiscount.dto';
import { ValidateCouponDto } from './dto/validateCoupon.dto';
import { DiscountsService } from './discounts.service';

@Controller('discounts')
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Get()
  async getDiscounts() {
    return await this.discountsService.getDiscounts();
  }

  @Get('active')
  async getActiveDiscounts() {
    return await this.discountsService.getActiveDiscounts();
  }

  @Post('validate-coupon')
  async validateCoupon(@Body() coupon: ValidateCouponDto) {
    return await this.discountsService.validateCoupon(coupon);
  }

  @Get(':discountId')
  async getDiscountById(
    @Param('discountId', ParseIntPipe) discountId: number,
  ) {
    return await this.discountsService.getDiscountById(discountId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  async createDiscount(@Body() discount: CreateDiscountDto) {
    return await this.discountsService.createDiscount(discount);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('send-reminders')
  async sendSaleReminders() {
    return await this.discountsService.sendSaleReminderEmails();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':discountId')
  async updateDiscount(
    @Param('discountId', ParseIntPipe) discountId: number,
    @Body() discount: UpdateDiscountDto,
  ) {
    return await this.discountsService.updateDiscount(discountId, discount);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':discountId')
  async deleteDiscount(@Param('discountId', ParseIntPipe) discountId: number) {
    return await this.discountsService.deleteDiscount(discountId);
  }
}
