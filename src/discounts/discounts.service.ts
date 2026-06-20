import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { MailerService } from 'src/mailer/mailer.service';
import { Prisma } from 'src/generated/prisma/client';
import {
  DiscountScope,
  DiscountType,
  PromotionType,
} from 'src/generated/prisma/enums';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateDiscountDto } from './dto/createDiscount.dto';
import { UpdateDiscountDto } from './dto/updateDiscount.dto';
import { NotificationsService } from 'src/notifications/notifications.service';
import { DiscountPricingService } from './discount-pricing.service';
import { ValidateCouponDto } from './dto/validateCoupon.dto';

const NEW_SALE_WINDOW_HOURS = 24;
const ENDING_SOON_WINDOW_HOURS = 48;
const REMINDER_INTERVAL_MS = 6 * 60 * 60 * 1000;

type DiscountPayload = Omit<
  CreateDiscountDto,
  'startsAt' | 'endsAt' | 'couponCode' | 'minimumOrderTotal' | 'usageLimit'
> & {
  startsAt?: Date | null;
  endsAt?: Date | null;
  couponCode?: string | null;
  minimumOrderTotal?: number | Prisma.Decimal | null;
  usageLimit?: number | null;
};

const discountInclude = {
  products: {
    select: {
      productId: true,
      productName: true,
      productPrice: true,
      productCategory: true,
      productStatus: true,
    },
  },
} satisfies Prisma.DiscountInclude;

@Injectable()
export class DiscountsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DiscountsService.name);
  private reminderInterval?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
    private readonly notificationsService: NotificationsService,
    private readonly discountPricingService: DiscountPricingService,
  ) {}

  onModuleInit() {
    void this.sendSaleReminderEmails().catch((error: unknown) => {
      this.logger.error(
        `Failed to send sale reminders on startup: ${this.getErrorMessage(error)}`,
      );
    });

    this.reminderInterval = setInterval(() => {
      void this.sendSaleReminderEmails().catch((error: unknown) => {
        this.logger.error(
          `Failed to send scheduled sale reminders: ${this.getErrorMessage(error)}`,
        );
      });
    }, REMINDER_INTERVAL_MS);
  }

  onModuleDestroy() {
    if (this.reminderInterval) {
      clearInterval(this.reminderInterval);
    }
  }

  async getDiscounts() {
    return await this.prisma.discount.findMany({
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: discountInclude,
    });
  }

  async getActiveDiscounts() {
    const now = new Date();

    return await this.prisma.discount.findMany({
      where: {
        isActive: true,
        promotionType: PromotionType.SALE,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: discountInclude,
    });
  }

  async getDiscountById(discountId: number) {
    const discount = await this.prisma.discount.findUnique({
      where: { discountId },
      include: discountInclude,
    });

    if (!discount) {
      throw new NotFoundException('Discount not found');
    }

    return discount;
  }

  async createDiscount(discount: CreateDiscountDto) {
    const normalizedDiscount = this.normalizeDiscountPayload(discount);
    this.validateDiscount(normalizedDiscount);
    await this.validateProductTargets(normalizedDiscount);

    const createdDiscount = await this.prisma.discount.create({
      data: this.buildCreateDiscountData(normalizedDiscount),
      include: discountInclude,
    });

    if (
      createdDiscount.promotionType === PromotionType.SALE &&
      this.isSaleLive(createdDiscount)
    ) {
      await this.sendSaleReminderEmails();
    }

    return createdDiscount;
  }

  async updateDiscount(discountId: number, discount: UpdateDiscountDto) {
    const existingDiscount = await this.prisma.discount.findUnique({
      where: { discountId },
      include: { products: { select: { productId: true } } },
    });

    if (!existingDiscount) {
      throw new NotFoundException('Discount not found');
    }

    const nextDiscount = {
      name: discount.name ?? existingDiscount.name,
      discountValue:
        discount.discountValue ?? Number(existingDiscount.discountValue),
      discountType: discount.discountType ?? existingDiscount.discountType,
      discountScope: discount.discountScope ?? existingDiscount.discountScope,
      isActive: discount.isActive ?? existingDiscount.isActive,
      startsAt:
        discount.startsAt === undefined
          ? existingDiscount.startsAt
          : discount.startsAt,
      endsAt:
        discount.endsAt === undefined ? existingDiscount.endsAt : discount.endsAt,
      discountCategories:
        discount.discountCategories ?? existingDiscount.discountCategories,
      productIds:
        discount.productIds ??
        existingDiscount.products.map((product) => product.productId),
      priority: discount.priority ?? existingDiscount.priority,
      promotionType: discount.promotionType ?? existingDiscount.promotionType,
      couponCode:
        discount.couponCode === undefined
          ? existingDiscount.couponCode
          : discount.couponCode,
      minimumOrderTotal:
        discount.minimumOrderTotal === undefined
          ? existingDiscount.minimumOrderTotal
          : discount.minimumOrderTotal,
      usageLimit:
        discount.usageLimit === undefined
          ? existingDiscount.usageLimit
          : discount.usageLimit,
    };

    const normalizedDiscount = this.normalizeDiscountPayload(nextDiscount);
    this.validateDiscount(normalizedDiscount);
    await this.validateProductTargets(normalizedDiscount);

    return await this.prisma.discount.update({
      where: { discountId },
      data: this.buildUpdateDiscountData(normalizedDiscount),
      include: discountInclude,
    });
  }

  async deleteDiscount(discountId: number) {
    await this.getDiscountById(discountId);

    return await this.prisma.discount.delete({
      where: { discountId },
      include: discountInclude,
    });
  }

  async validateCoupon(coupon: ValidateCouponDto) {
    const products = await this.getCouponProducts(coupon.products ?? []);

    return await this.discountPricingService.getCouponPreview(
      coupon.couponCode,
      products,
    );
  }

  async sendSaleReminderEmails() {
    const recipients = await this.getSaleReminderRecipients();

    if (recipients.customerEmails.length === 0 && recipients.adminEmails.length === 0) {
      return {
        newSales: 0,
        endingSoonSales: 0,
        customerRecipients: 0,
        adminRecipients: 0,
      };
    }

    const now = new Date();
    const newSaleSince = this.addHours(now, -NEW_SALE_WINDOW_HOURS);
    const endingSoonUntil = this.addHours(now, ENDING_SOON_WINDOW_HOURS);

    const [newSales, endingSoonSales] = await this.prisma.$transaction([
      this.prisma.discount.findMany({
        where: {
          isActive: true,
          promotionType: PromotionType.SALE,
          newSaleNotifiedAt: null,
          OR: [
            { createdAt: { gte: newSaleSince } },
            { startsAt: { gte: newSaleSince, lte: now } },
          ],
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        include: discountInclude,
      }),
      this.prisma.discount.findMany({
        where: {
          isActive: true,
          promotionType: PromotionType.SALE,
          endingSoonNotifiedAt: null,
          endsAt: {
            gte: now,
            lte: endingSoonUntil,
          },
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        },
        orderBy: [{ endsAt: 'asc' }, { priority: 'desc' }],
        include: discountInclude,
      }),
    ]);

    if (newSales.length > 0) {
      await this.notifyNewSales(newSales);

      await this.sendDiscountGroupEmail({
        discounts: newSales,
        customerEmails: recipients.customerEmails,
        adminEmails: recipients.adminEmails,
        customerSubject: 'New sales are live',
        adminSubject: 'New sales reminder sent',
        title: 'New sales are live',
        intro: 'Fresh offers are now available in the store.',
      });

      await this.prisma.discount.updateMany({
        where: {
          discountId: {
            in: newSales.map((discount) => discount.discountId),
          },
        },
        data: {
          newSaleNotifiedAt: now,
        },
      });
    }

    if (endingSoonSales.length > 0) {
      await this.notifyEndingSoonSales(endingSoonSales);

      await this.sendDiscountGroupEmail({
        discounts: endingSoonSales,
        customerEmails: recipients.customerEmails,
        adminEmails: recipients.adminEmails,
        customerSubject: 'Sales ending soon',
        adminSubject: 'Ending soon sales reminder sent',
        title: 'Sales ending soon',
        intro: 'These offers are almost over.',
      });

      await this.prisma.discount.updateMany({
        where: {
          discountId: {
            in: endingSoonSales.map((discount) => discount.discountId),
          },
        },
        data: {
          endingSoonNotifiedAt: now,
        },
      });
    }

    return {
      newSales: newSales.length,
      endingSoonSales: endingSoonSales.length,
      customerRecipients: recipients.customerEmails.length,
      adminRecipients: recipients.adminEmails.length,
    };
  }

  private async getSaleReminderRecipients() {
    const [customers, admins] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: {
          role: 'USER',
          isBanned: false,
        },
        select: {
          email: true,
        },
      }),
      this.prisma.user.findMany({
        where: {
          role: 'ADMIN',
          isBanned: false,
        },
        select: {
          email: true,
        },
      }),
    ]);

    return {
      customerEmails: this.uniqueEmails(customers.map((customer) => customer.email)),
      adminEmails: this.uniqueEmails(admins.map((admin) => admin.email)),
    };
  }

  private async sendDiscountGroupEmail({
    discounts,
    customerEmails,
    adminEmails,
    customerSubject,
    adminSubject,
    title,
    intro,
  }: {
    discounts: Array<Prisma.DiscountGetPayload<{ include: typeof discountInclude }>>;
    customerEmails: string[];
    adminEmails: string[];
    customerSubject: string;
    adminSubject: string;
    title: string;
    intro: string;
  }) {
    if (customerEmails.length > 0) {
      await this.mailer.sendHtmlMail(
        customerEmails,
        customerSubject,
        this.buildDiscountReminderHtml(title, intro, discounts),
      );
    }

    if (adminEmails.length > 0) {
      await this.mailer.sendHtmlMail(
        adminEmails,
        adminSubject,
        this.buildDiscountReminderHtml(
          `Admin: ${title}`,
          `${intro} This reminder was sent to ${customerEmails.length} customers.`,
          discounts,
        ),
      );
    }
  }

  private buildDiscountReminderHtml(
    title: string,
    intro: string,
    discounts: Array<Prisma.DiscountGetPayload<{ include: typeof discountInclude }>>,
  ) {
    const storeUrl = process.env.FRONTEND_URL || process.env.API_URL || '';
    const rows = discounts
      .map((discount) => {
        const value = this.formatDiscountValue(
          Number(discount.discountValue),
          discount.discountType,
        );
        const target = this.formatDiscountTarget(discount);
        const endDate = discount.endsAt
          ? new Intl.DateTimeFormat('en', {
              dateStyle: 'medium',
              timeStyle: 'short',
            }).format(discount.endsAt)
          : 'No end date';

        return `
          <tr>
            <td style="padding:14px 0; border-bottom:1px solid #e2e8f0;">
              <p style="margin:0; color:#0f172a; font-size:16px; font-weight:700;">${discount.name}</p>
              <p style="margin:6px 0 0; color:#0089d3; font-size:15px; font-weight:700;">${value}</p>
              <p style="margin:6px 0 0; color:#475569; font-size:14px;">${target}</p>
              <p style="margin:6px 0 0; color:#64748b; font-size:13px;">Ends: ${endDate}</p>
            </td>
          </tr>
        `;
      })
      .join('');

    return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <title>${title}</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f4f8fb; font-family:Arial, sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:20px 0;">
      <tr>
        <td align="center">
          <table width="540" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:10px; padding:30px; border:1px solid #d8eaf4;">
            <tr>
              <td style="padding-bottom:16px;">
                <h2 style="margin:0; color:#0f172a; font-size:24px;">${title}</h2>
                <p style="margin:10px 0 0; color:#475569; font-size:15px; line-height:1.6;">${intro}</p>
              </td>
            </tr>

            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0">
                  ${rows}
                </table>
              </td>
            </tr>

            ${
              storeUrl
                ? `<tr>
                    <td align="center" style="padding:26px 0 8px;">
                      <a href="${storeUrl}" style="background-color:#0089d3; color:#ffffff; text-decoration:none; padding:12px 22px; border-radius:6px; font-size:15px; font-weight:700; display:inline-block;">Shop now</a>
                    </td>
                  </tr>`
                : ''
            }

            <tr>
              <td style="padding-top:18px; font-size:12px; color:#94a3b8; text-align:center;">
                <p style="margin:0;">&copy; ${new Date().getFullYear()} Your Company</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
  }

  private formatDiscountValue(value: number, type: DiscountType) {
    if (type === DiscountType.PERCENTAGE) {
      return `${value}% off`;
    }

    return `$${value.toFixed(2)} off`;
  }

  private formatDiscountTarget(
    discount: Prisma.DiscountGetPayload<{ include: typeof discountInclude }>,
  ) {
    if (discount.discountScope === DiscountScope.STORE) {
      return 'Applies to the whole store';
    }

    if (discount.discountScope === DiscountScope.CATEGORY) {
      return `Applies to: ${discount.discountCategories
        .map((category) => category.replaceAll('_', ' ').toLowerCase())
        .join(', ')}`;
    }

    return `Applies to: ${discount.products
      .map((product) => product.productName)
      .join(', ')}`;
  }

  private async notifyNewSales(
    discounts: Array<Prisma.DiscountGetPayload<{ include: typeof discountInclude }>>,
  ) {
    if (discounts.length === 0) return;

    await this.notificationsService.createForAll({
      type: 'DISCOUNTS',
      title: discounts.length === 1 ? 'New sale is live' : 'New sales are live',
      message:
        discounts.length === 1
          ? `${discounts[0].name} is now available.`
          : `${discounts.length} new sales are now available.`,
      data: {
        discountIds: discounts.map((discount) => discount.discountId),
        saleEvent: 'NEW_SALE',
      },
    });
  }

  private async notifyEndingSoonSales(
    discounts: Array<Prisma.DiscountGetPayload<{ include: typeof discountInclude }>>,
  ) {
    if (discounts.length === 0) return;

    await this.notificationsService.createForAll({
      type: 'DISCOUNTS',
      title:
        discounts.length === 1 ? 'Sale ending soon' : 'Sales ending soon',
      message:
        discounts.length === 1
          ? `${discounts[0].name} is ending soon.`
          : `${discounts.length} sales are ending soon.`,
      data: {
        discountIds: discounts.map((discount) => discount.discountId),
        saleEvent: 'ENDING_SOON',
      },
    });
  }

  private isSaleLive(
    discount: Prisma.DiscountGetPayload<{ include: typeof discountInclude }>,
  ) {
    const now = new Date();

    return (
      discount.isActive &&
      (!discount.startsAt || discount.startsAt <= now) &&
      (!discount.endsAt || discount.endsAt >= now)
    );
  }

  private addHours(date: Date, hours: number) {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }

  private uniqueEmails(emails: string[]) {
    return [...new Set(emails.filter((email) => email.trim().length > 0))];
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Unknown error';
  }

  private validateDiscount(discount: DiscountPayload) {
    if (
      discount.discountType === DiscountType.PERCENTAGE &&
      discount.discountValue > 100
    ) {
      throw new BadRequestException('Percentage discount cannot exceed 100');
    }

    if (discount.promotionType === PromotionType.COUPON && !discount.couponCode) {
      throw new BadRequestException('Coupon discounts require a coupon code');
    }

    if (discount.promotionType === PromotionType.SALE && discount.couponCode) {
      throw new BadRequestException('Sale discounts cannot have a coupon code');
    }

    if (
      discount.usageLimit &&
      discount.promotionType !== PromotionType.COUPON
    ) {
      throw new BadRequestException('Only coupon discounts can have a usage limit');
    }

    if (
      discount.startsAt &&
      discount.endsAt &&
      discount.startsAt > discount.endsAt
    ) {
      throw new BadRequestException('Discount start date must be before end date');
    }

    if (
      discount.discountScope === DiscountScope.PRODUCT &&
      (!discount.productIds || discount.productIds.length === 0)
    ) {
      throw new BadRequestException('Product discounts require productIds');
    }

    if (
      discount.discountScope === DiscountScope.CATEGORY &&
      (!discount.discountCategories || discount.discountCategories.length === 0)
    ) {
      throw new BadRequestException(
        'Category discounts require discountCategories',
      );
    }
  }

  private async validateProductTargets(discount: DiscountPayload) {
    const productIds = this.getDiscountProductIds(discount);
    const uniqueProductIds = [...new Set(productIds)];

    if (uniqueProductIds.length === 0) return;

    const productsCount = await this.prisma.product.count({
      where: {
        productId: {
          in: uniqueProductIds,
        },
      },
    });

    if (productsCount !== uniqueProductIds.length) {
      throw new BadRequestException('One or more products do not exist');
    }
  }

  private getDiscountProductIds(discount: DiscountPayload) {
    return discount.discountScope === DiscountScope.PRODUCT
      ? (discount.productIds ?? [])
      : [];
  }

  private getDiscountCategories(discount: DiscountPayload) {
    return discount.discountScope === DiscountScope.CATEGORY
      ? (discount.discountCategories ?? [])
      : [];
  }

  private buildCreateDiscountData(discount: DiscountPayload) {
    const productIds = [...new Set(this.getDiscountProductIds(discount))];

    return {
      name: discount.name,
      discountValue: discount.discountValue,
      discountType: discount.discountType,
      promotionType: discount.promotionType ?? PromotionType.SALE,
      couponCode: discount.couponCode ?? null,
      minimumOrderTotal: discount.minimumOrderTotal ?? null,
      usageLimit: discount.usageLimit ?? null,
      discountScope: discount.discountScope,
      isActive: discount.isActive ?? true,
      startsAt: discount.startsAt ?? null,
      endsAt: discount.endsAt ?? null,
      priority: discount.priority ?? 0,
      discountCategories: this.getDiscountCategories(discount),
      products: {
        connect: productIds.map((productId) => ({ productId })),
      },
    } satisfies Prisma.DiscountCreateInput;
  }

  private buildUpdateDiscountData(discount: DiscountPayload) {
    const productIds = [...new Set(this.getDiscountProductIds(discount))];

    return {
      name: discount.name,
      discountValue: discount.discountValue,
      discountType: discount.discountType,
      promotionType: discount.promotionType ?? PromotionType.SALE,
      couponCode: discount.couponCode ?? null,
      minimumOrderTotal: discount.minimumOrderTotal ?? null,
      usageLimit: discount.usageLimit ?? null,
      discountScope: discount.discountScope,
      isActive: discount.isActive ?? true,
      startsAt: discount.startsAt ?? null,
      endsAt: discount.endsAt ?? null,
      priority: discount.priority ?? 0,
      discountCategories: this.getDiscountCategories(discount),
      products: {
        set: productIds.map((productId) => ({ productId })),
      },
    } satisfies Prisma.DiscountUpdateInput;
  }

  private normalizeDiscountPayload(discount: DiscountPayload): DiscountPayload {
    const promotionType = discount.promotionType ?? PromotionType.SALE;

    return {
      ...discount,
      promotionType,
      couponCode:
        promotionType === PromotionType.COUPON
          ? discount.couponCode?.trim().toUpperCase()
          : undefined,
      minimumOrderTotal:
        promotionType === PromotionType.COUPON
          ? (discount.minimumOrderTotal ?? null)
          : undefined,
      usageLimit:
        promotionType === PromotionType.COUPON
          ? (discount.usageLimit ?? null)
          : undefined,
    };
  }

  private async getCouponProducts(
    products: NonNullable<ValidateCouponDto['products']>,
  ) {
    const productIds = [
      ...new Set(products.map((product) => product.productId)),
    ];

    if (productIds.length === 0) {
      throw new BadRequestException('Coupon validation requires products');
    }

    const dbProducts = await this.prisma.product.findMany({
      where: { productId: { in: productIds } },
      select: {
        productId: true,
        productPrice: true,
        productCategory: true,
      },
    });
    const productsById = new Map(
      dbProducts.map((product) => [product.productId, product]),
    );

    return products.map((product) => {
      const dbProduct = productsById.get(product.productId);

      if (!dbProduct) {
        throw new BadRequestException('One or more products do not exist');
      }

      return {
        productId: dbProduct.productId,
        productPrice: dbProduct.productPrice,
        productCategory: dbProduct.productCategory,
        quantity: product.quantity,
      };
    });
  }
}
