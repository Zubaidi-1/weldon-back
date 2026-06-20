import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import createReviewDto from './dto/createReview.dto';
import { type Request } from 'express';
import { AuthPayload } from 'src/auth/types/auth-payload.type';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}
  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(
    @Body() createReview: createReviewDto,
    @Req() req: Request,
  ) {
    const user = req['user'] as AuthPayload;

    return await this.reviewsService.createReview(createReview, user.id);
  }
  @Delete('/review/:reviewId')
  @UseGuards(JwtAuthGuard)
  async deleteReview(
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Req() req: Request,
  ) {
    const user = req['user'] as AuthPayload;

    return await this.reviewsService.deleteReview(
      user.id,
      reviewId,
      user.roleName,
    );
  }
  @Get('review/:productId')
  async getProductReviews(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return await this.reviewsService.getProductReviews(productId, page, limit);
  }
}
