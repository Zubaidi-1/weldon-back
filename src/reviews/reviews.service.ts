import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import CreateReviewDto from './dto/createReview.dto';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { NotificationsService } from 'src/notifications/notifications.service';

@Injectable()
export class ReviewsService {
  constructor(
    private prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createReview(createReview: CreateReviewDto, userId: number) {
    const product = await this.prisma.product.findUnique({
      where: {
        productId: createReview.productId,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const productReview = await this.prisma.review.findUnique({
      where: {
        userId_productId: {
          userId,
          productId: createReview.productId,
        },
      },
    });

    if (productReview) {
      throw new ConflictException('You already reviewed this product');
    }

    // has ordered the same product within the last 30 days?  : yes ? review is verified : no
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const hasOrderedProduct = await this.prisma.order.findFirst({
      where: {
        userId,
        orderStatus: 'DELIVERED',
        updatedAt: {
          gte: thirtyDaysAgo,
        },
        orderLine: {
          products: {
            some: {
              productId: createReview.productId,
            },
          },
        },
      },
    });
    try {
      const review = await this.prisma.review.create({
        data: {
          is_Verified_review: hasOrderedProduct ? true : false,
          userId,
          productId: createReview.productId,
          review: createReview.review,
          stars: createReview.stars,
        },
      });

      await this.notificationsService.createForAdmins({
        type: 'REVIEWS',
        title: 'New product review',
        message: `A new ${review.stars}-star review was added to ${product.productName}.`,
        data: {
          reviewId: review.reviewId,
          productId: product.productId,
          userId,
          stars: review.stars,
        },
      });

      return review;
    } catch (error) {
      if (
        error instanceof PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('You already reviewed this product');
      }

      throw error;
    }
  }

  async deleteReview(userId: number, reviewId: number, roleName: string) {
    const review = await this.prisma.review.findUnique({ where: { reviewId } });

    if (!review) throw new NotFoundException('Review not found');

    // The reviewer and the admin can remove these reviews
    if (review.userId !== userId && roleName !== 'ADMIN')
      throw new ForbiddenException(
        'You do not have permission to remove this review',
      );

    return await this.prisma.review.delete({ where: { reviewId } });
  }

  async getProductReviews(productId: number, page = 1, limit = 20) {
    const product = await this.prisma.product.findUnique({
      where: { productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const currentPage = Math.max(1, page);
    const pageSize = Math.min(Math.max(1, limit), 50);
    const skip = (currentPage - 1) * pageSize;

    const [reviews, ratingSummary, verifiedReviewsCount] =
      await this.prisma.$transaction([
      this.prisma.review.findMany({
        where: { productId },
        orderBy: { reviewId: 'desc' },
        skip,
        take: pageSize,
        select: {
          reviewId: true,
          review: true,
          stars: true,
          is_Verified_review: true,
          user: {
            select: {
              id: true,
              name: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      }),
      this.prisma.review.aggregate({
        where: { productId },
        _avg: { stars: true },
        _count: { stars: true },
      }),
      this.prisma.review.count({
        where: {
          productId,
          is_Verified_review: true,
        },
      }),
    ]);

    return {
      averageRating: ratingSummary._avg.stars ?? 0,
      ratingsCount: ratingSummary._count.stars,
      verifiedReviewsCount,
      page: currentPage,
      limit: pageSize,
      hasMore: skip + reviews.length < ratingSummary._count.stars,
      reviews,
    };
  }
}
