import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from 'src/auth/guard/auth.guard';
import type { AuthPayload } from 'src/auth/types/auth-payload.type';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Req() req: Request,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    const user = req['user'] as AuthPayload;

    return await this.notificationsService.getUserNotifications(
      user.id,
      page,
      limit,
    );
  }

  @Patch(':notificationId/read')
  async markAsRead(
    @Req() req: Request,
    @Param('notificationId', ParseIntPipe) notificationId: number,
  ) {
    const user = req['user'] as AuthPayload;

    return await this.notificationsService.markAsRead(user.id, notificationId);
  }

  @Patch('read-all')
  async markAllAsRead(@Req() req: Request) {
    const user = req['user'] as AuthPayload;

    return await this.notificationsService.markAllAsRead(user.id);
  }
}
