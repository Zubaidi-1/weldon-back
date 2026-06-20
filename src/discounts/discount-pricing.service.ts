import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import {
  DiscountScope,
  DiscountType,
  PromotionType,
} from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';

type PriceableProduct = {
  productId: number;
  productPrice: Prisma.Decimal | number;
  productCategory: string[];
};

export type CouponLineProduct = PriceableProduct & {
  quantity: number;
};

const activeDiscountInclude = {
  products: {
    select: {
      productId: true,
    },
  },
} satisfies Prisma.DiscountInclude;

@Injectable()
export class DiscountPricingService {
  constructor(private readonly prisma: PrismaService) {}

  async getDiscountedPriceForProduct(product: PriceableProduct) {
    const discounts = await this.getActiveDiscounts();

    return this.getBestDiscountedPrice(product, discounts);
  }

  async getDiscountedPricesForProducts(products: PriceableProduct[]) {
    if (products.length === 0) return new Map<number, number>();

    const discounts = await this.getActiveDiscounts();

    return new Map(
      products.map((product) => [
        product.productId,
        this.getBestDiscountedPrice(product, discounts),
      ]),
    );
  }

  async getCouponPreview(couponCode: string, products: CouponLineProduct[]) {
    const coupon = await this.getActiveCoupon(couponCode);
    const salePrices = await this.getDiscountedPricesForProducts(products);

    return this.applyCouponToProducts(coupon, products, salePrices);
  }

  async redeemCoupon(couponCode: string, products: CouponLineProduct[]) {
    const coupon = await this.getActiveCoupon(couponCode);
    const salePrices = await this.getDiscountedPricesForProducts(products);
    const preview = this.applyCouponToProducts(coupon, products, salePrices);

    await this.prisma.discount.update({
      where: { discountId: coupon.discountId },
      data: { usedCount: { increment: 1 } },
    });

    return preview;
  }

  private async getActiveDiscounts() {
    const now = new Date();

    return await this.prisma.discount.findMany({
      where: {
        isActive: true,
        promotionType: PromotionType.SALE,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: activeDiscountInclude,
    });
  }

  private async getActiveCoupon(couponCode: string) {
    const code = this.normalizeCouponCode(couponCode);
    const now = new Date();

    const coupon = await this.prisma.discount.findUnique({
      where: { couponCode: code },
      include: activeDiscountInclude,
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (
      coupon.promotionType !== PromotionType.COUPON ||
      !coupon.isActive ||
      (coupon.startsAt && coupon.startsAt > now) ||
      (coupon.endsAt && coupon.endsAt < now)
    ) {
      throw new BadRequestException('Coupon is not active');
    }

    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    return coupon;
  }

  private applyCouponToProducts(
    coupon: Prisma.DiscountGetPayload<{ include: typeof activeDiscountInclude }>,
    products: CouponLineProduct[],
    salePrices: Map<number, number>,
  ) {
    const lines = products.map((product) => {
      const unitPrice = salePrices.get(product.productId) ?? Number(product.productPrice);
      const lineTotal = unitPrice * product.quantity;

      return {
        product,
        unitPrice,
        lineTotal,
        applies: this.discountAppliesToProduct(coupon, product),
      };
    });
    const subtotal = lines.reduce((total, line) => total + line.lineTotal, 0);
    const eligibleTotal = lines
      .filter((line) => line.applies)
      .reduce((total, line) => total + line.lineTotal, 0);

    if (coupon.minimumOrderTotal && subtotal < Number(coupon.minimumOrderTotal)) {
      throw new BadRequestException(
        `Coupon requires a minimum order total of ${Number(coupon.minimumOrderTotal).toFixed(2)}`,
      );
    }

    if (eligibleTotal <= 0) {
      throw new BadRequestException('Coupon does not apply to these products');
    }

    const couponDiscount = this.getDiscountAmount(eligibleTotal, coupon);
    const discountRatio = couponDiscount / eligibleTotal;
    const linePrices = new Map<number, number>();

    for (const line of lines) {
      if (!line.applies) {
        linePrices.set(line.product.productId, line.unitPrice);
        continue;
      }

      const discountedLineTotal = line.lineTotal - line.lineTotal * discountRatio;
      const discountedUnitPrice = discountedLineTotal / line.product.quantity;
      linePrices.set(line.product.productId, Number(discountedUnitPrice.toFixed(2)));
    }

    return {
      couponCode: coupon.couponCode!,
      discountId: coupon.discountId,
      discountName: coupon.name,
      couponDiscount: Number(couponDiscount.toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      total: Number(Math.max(0, subtotal - couponDiscount).toFixed(2)),
      linePrices,
    };
  }

  private getBestDiscountedPrice(
    product: PriceableProduct,
    discounts: Array<
      Prisma.DiscountGetPayload<{ include: typeof activeDiscountInclude }>
    >,
  ) {
    const originalPrice = Number(product.productPrice);
    const applicableDiscounts = discounts.filter((discount) =>
      this.discountAppliesToProduct(discount, product),
    );

    if (applicableDiscounts.length === 0) return originalPrice;

    return applicableDiscounts
      .map((discount) => ({
        discount,
        price: this.applyDiscount(originalPrice, discount),
      }))
      .sort((a, b) => {
        if (b.discount.priority !== a.discount.priority) {
          return b.discount.priority - a.discount.priority;
        }

        return a.price - b.price;
      })[0].price;
  }

  private discountAppliesToProduct(
    discount: Prisma.DiscountGetPayload<{ include: typeof activeDiscountInclude }>,
    product: PriceableProduct,
  ) {
    if (discount.discountScope === DiscountScope.STORE) return true;

    if (discount.discountScope === DiscountScope.CATEGORY) {
      return discount.discountCategories.some((category) =>
        product.productCategory.includes(category),
      );
    }

    return discount.products.some(
      (discountProduct) => discountProduct.productId === product.productId,
    );
  }

  private applyDiscount(
    originalPrice: number,
    discount: Prisma.DiscountGetPayload<{ include: typeof activeDiscountInclude }>,
  ) {
    const value = Number(discount.discountValue);

    if (discount.discountType === DiscountType.PERCENTAGE) {
      return Math.max(0, originalPrice - originalPrice * (value / 100));
    }

    return Math.max(0, originalPrice - value);
  }

  private getDiscountAmount(
    total: number,
    discount: Prisma.DiscountGetPayload<{ include: typeof activeDiscountInclude }>,
  ) {
    const value = Number(discount.discountValue);

    if (discount.discountType === DiscountType.PERCENTAGE) {
      return Math.min(total, total * (value / 100));
    }

    return Math.min(total, value);
  }

  private normalizeCouponCode(couponCode: string) {
    return couponCode.trim().toUpperCase();
  }
}
