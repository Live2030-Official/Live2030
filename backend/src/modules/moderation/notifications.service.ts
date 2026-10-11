import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SignalingGateway } from '../signaling/signaling.gateway';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: any;
}

/**
 * Central notification fan-out: persists to the Notification table and pushes
 * a `notification:new` realtime event to the recipient's personal socket room.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger('NotificationsService');

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => SignalingGateway))
    private readonly signalingGateway?: SignalingGateway,
  ) {}

  async create(input: CreateNotificationInput) {
    if (!input?.userId) return null;
    try {
      const notification = await this.prisma.notification.create({
        data: {
          userId: input.userId,
          type: input.type || 'SYSTEM',
          title: input.title,
          body: input.body || null,
          data: input.data ?? undefined,
        },
      });
      try {
        this.signalingGateway?.server
          ?.to(`user_${input.userId}`)
          .emit('notification:new', notification);
      } catch {}
      return notification;
    } catch (e: any) {
      this.logger.warn(`Failed to create notification for ${input.userId}: ${e?.message}`);
      return null;
    }
  }

  async createMany(inputs: CreateNotificationInput[]) {
    const results = [];
    for (const input of inputs) {
      results.push(await this.create(input));
    }
    return results;
  }

  async list(userId: string, page = 1, limit = 30, unreadOnly = false) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const where: any = { userId };
    if (unreadOnly) where.isRead = false;

    const [notifications, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      notifications,
      unreadCount,
      pagination: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) },
    };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({ where: { userId, isRead: false } });
    return { unreadCount: count };
  }

  async markRead(userId: string, id: string) {
    await this.prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
    return { success: true };
  }

  async markAllRead(userId: string) {
    const res = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { success: true, updated: res.count };
  }

  async broadcast(adminId: string, title: string, body?: string, type = 'SYSTEM', audience: 'ALL' | 'HOSTS' | 'USERS' = 'ALL') {
    const where: any = { isBanned: false };
    if (audience === 'HOSTS') where.role = 'HOST';
    if (audience === 'USERS') where.role = 'USER';

    const users = await this.prisma.user.findMany({ where, select: { id: true }, take: 5000 });

    // Use createMany for efficiency then push realtime events.
    await this.prisma.notification.createMany({
      data: users.map((u) => ({
        userId: u.id,
        type,
        title,
        body: body || null,
      })),
    });

    for (const u of users) {
      try {
        this.signalingGateway?.server?.to(`user_${u.id}`).emit('notification:new', {
          type,
          title,
          body,
          broadcast: true,
          createdAt: new Date().toISOString(),
        });
      } catch {}
    }

    return { success: true, recipients: users.length };
  }
}
