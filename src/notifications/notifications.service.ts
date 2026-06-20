import { Injectable } from '@nestjs/common';
import { Prisma } from 'src/generated/prisma/client';
import { NotificationAudience, NotificationType } from 'src/generated/prisma/enums';
import { SocketGateway } from 'src/gateway/gateway';
import { PrismaService } from 'src/prisma/prisma.service';

type NotificationInput = {
  type: NotificationType;
  title: string;
  message: string;
  data?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socketGateway: SocketGateway,
  ) {}

  async getUserNotifications(userId: number, page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const skip = (safePage - 1) * safeLimit;

    const [notifications, total, unreadCount] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: safeLimit,
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications,
      unreadCount,
      page: safePage,
      limit: safeLimit,
      hasMore: skip + notifications.length < total,
    };
  }

  async markAsRead(userId: number, notificationId: number) {
    await this.prisma.notification.updateMany({
      where: { userId, notificationId },
      data: { isRead: true },
    });

    return this.getUnreadCount(userId);
  }

  async markAllAsRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return { unreadCount: 0 };
  }

  async createForUser(userId: number, input: NotificationInput) {
    const notification = await this.prisma.notification.create({
      data: {
        ...input,
        audience: NotificationAudience.USER,
        userId,
      },
    });

    this.socketGateway.emitNotificationToUser(userId, notification);

    return notification;
  }

  async createForAdmins(input: NotificationInput) {
    const adminIds = await this.getRecipientIds({ role: 'ADMIN' });

    const notifications = await this.createForUsers(
      adminIds,
      NotificationAudience.ADMIN,
      input,
    );

    this.socketGateway.emitNotificationToAdmins({ ...input, audience: 'ADMIN' });

    return notifications;
  }

  async createForAll(input: NotificationInput) {
    const userIds = await this.getRecipientIds();
    const notifications = await this.createForUsers(
      userIds,
      NotificationAudience.ALL,
      input,
    );

    this.socketGateway.emitNotificationToAll({ ...input, audience: 'ALL' });

    return notifications;
  }

  private async getUnreadCount(userId: number) {
    const unreadCount = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { unreadCount };
  }

  private async getRecipientIds(filter: { role?: string } = {}) {
    const users = await this.prisma.user.findMany({
      where: {
        role: filter.role,
        isBanned: false,
      },
      select: { id: true },
    });

    return users.map((user) => user.id);
  }

  private async createForUsers(
    userIds: number[],
    audience: NotificationAudience,
    input: NotificationInput,
  ) {
    if (userIds.length === 0) return [];

    return await Promise.all(
      userIds.map((userId) =>
        this.prisma.notification.create({
          data: {
            ...input,
            audience,
            userId,
          },
        }),
      ),
    );
  }
}
