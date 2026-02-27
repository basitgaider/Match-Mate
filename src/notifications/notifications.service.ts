import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ERROR_MESSAGES } from '../constants/error-messages';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    options: { unreadOnly?: boolean; page?: number; limit?: number } = {},
  ) {
    const page = Math.max(1, options.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, options.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const where = { userId };
    if (options.unreadOnly) {
      Object.assign(where, { read: false });
    }

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return {
      data: notifications,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      unreadCount,
    };
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) {
      throw new NotFoundException(ERROR_MESSAGES.NOTIFICATIONS.NOT_FOUND);
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException(ERROR_MESSAGES.NOTIFICATIONS.NOT_FOUND);
    }
    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return { success: true };
  }

  /** Internal: create a notification (e.g. from other modules when profile viewed, etc.) */
  async create(params: {
    userId: string;
    title: string;
    body: string;
    image?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        body: params.body,
        image: params.image,
      },
    });
  }
}
