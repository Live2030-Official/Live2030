import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from './audit.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class ModerationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Paginated content queue for the admin moderation console.
   */
  async listContent(params: {
    type?: string;
    visibility?: string;
    search?: string;
    reportedOnly?: boolean;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 30));
    const where: any = {};
    if (params.type && ['PHOTO', 'VIDEO', 'REELS'].includes(params.type)) {
      where.type = params.type;
    }
    if (params.visibility && ['ACTIVE', 'HIDDEN', 'REMOVED'].includes(params.visibility)) {
      where.visibility = params.visibility;
    }
    if (params.search && params.search.trim()) {
      where.OR = [
        { caption: { contains: params.search.trim(), mode: 'insensitive' } },
        { author: { displayName: { contains: params.search.trim(), mode: 'insensitive' } } },
        { author: { username: { contains: params.search.trim(), mode: 'insensitive' } } },
      ];
    }

    if (params.reportedOnly) {
      const reports = await this.prisma.report.findMany({
        where: { targetType: 'POST', status: 'PENDING' },
        select: { targetId: true },
      });
      const reportedIds = Array.from(new Set(reports.map((r) => r.targetId)));
      where.id = { in: reportedIds.length ? reportedIds : ['__none__'] };
    }

    const [items, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
              isBanned: true,
              warningCount: true,
            },
          },
        },
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      items,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Hide a post (soft) — removed from public feeds but retained. */
  async hidePost(postId: string, adminId: string, reason?: string, ipAddress?: string) {
    return this.setVisibility(postId, 'HIDDEN', adminId, reason, ipAddress);
  }

  async restorePost(postId: string, adminId: string, ipAddress?: string) {
    return this.setVisibility(postId, 'ACTIVE', adminId, undefined, ipAddress);
  }

  async removePost(postId: string, adminId: string, reason?: string, ipAddress?: string) {
    return this.setVisibility(postId, 'REMOVED', adminId, reason, ipAddress);
  }

  private async setVisibility(
    postId: string,
    visibility: 'ACTIVE' | 'HIDDEN' | 'REMOVED',
    adminId: string,
    reason?: string,
    ipAddress?: string,
  ) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    const updated = await this.prisma.post.update({
      where: { id: postId },
      data: {
        visibility,
        moderatedById: adminId,
        moderatedAt: new Date(),
        moderationReason: reason || null,
      },
    });

    await this.audit.record({
      adminId,
      action: `POST_${visibility}`,
      targetType: 'POST',
      targetId: postId,
      details: { visibility, reason: reason || null },
      ipAddress,
    });

    return { success: true, post: updated };
  }

  async deletePost(postId: string, adminId: string, reason?: string, ipAddress?: string) {
    const post = await this.prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');
    await this.prisma.post.delete({ where: { id: postId } });
    await this.audit.record({
      adminId,
      action: 'POST_DELETE',
      targetType: 'POST',
      targetId: postId,
      details: { reason: reason || null },
      ipAddress,
    });
    return { success: true };
  }

  /** Issue a warning to a user; increments warningCount and notifies them. */
  async warnUser(userId: string, adminId: string, reason: string, details?: string, ipAddress?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (!reason || !reason.trim()) throw new BadRequestException('A warning reason is required');

    await this.prisma.userWarning.create({
      data: { userId, adminId, reason, details: details || null },
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { warningCount: { increment: 1 } },
    });

    await this.notifications.create({
      userId,
      type: 'WARNING',
      title: 'Community Guidelines Warning',
      body: reason,
      data: { reason, details: details || null },
    });

    await this.audit.record({
      adminId,
      action: 'USER_WARN',
      targetType: 'USER',
      targetId: userId,
      details: { reason: reason || null, details: details || null },
      ipAddress,
    });

    return { success: true };
  }

  async getWarnings(userId: string) {
    return this.prisma.userWarning.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // ---------------- Blocking ----------------

  async blockUser(blockerId: string, blockedId: string) {
    if (!blockerId || !blockedId || blockerId === blockedId) {
      throw new BadRequestException('Invalid block request');
    }
    await this.prisma.userBlock.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      create: { blockerId, blockedId },
      update: {},
    });
    return { success: true, blocked: true };
  }

  async unblockUser(blockerId: string, blockedId: string) {
    if (!blockerId || !blockedId) throw new BadRequestException('Invalid unblock request');
    await this.prisma.userBlock.deleteMany({ where: { blockerId, blockedId } });
    return { success: true, blocked: false };
  }

  async listBlocked(blockerId: string) {
    const blocks = await this.prisma.userBlock.findMany({
      where: { blockerId },
      orderBy: { createdAt: 'desc' },
    });
    const ids = blocks.map((b) => b.blockedId);
    const users = ids.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, username: true, displayName: true, avatarUrl: true, level: true, vipLevel: true },
        })
      : [];
    const map = new Map(users.map((u) => [u.id, u]));
    return blocks.map((b) => ({ ...b, user: map.get(b.blockedId) || null }));
  }

  async isBlockedEitherWay(a: string, b: string) {
    if (!a || !b) return false;
    const count = await this.prisma.userBlock.count({
      where: {
        OR: [
          { blockerId: a, blockedId: b },
          { blockerId: b, blockedId: a },
        ],
      },
    });
    return count > 0;
  }
}
