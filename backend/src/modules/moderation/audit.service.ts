import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Persisted, queryable log of every privileged admin/staff action.
 * Writes are best-effort and must never break the calling operation.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: {
    adminId: string;
    action: string;
    targetType: string;
    targetId?: string | null;
    details?: any;
    ipAddress?: string | null;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          adminId: params.adminId || 'SYSTEM',
          action: params.action,
          targetType: params.targetType,
          targetId: params.targetId ?? null,
          details:
            params.details === undefined || params.details === null
              ? null
              : typeof params.details === 'string'
                ? params.details
                : JSON.stringify(params.details),
          ipAddress: params.ipAddress ?? null,
        },
      });
    } catch {
      // Audit logging must never throw into the main request path.
    }
  }

  async list(params: {
    page?: number;
    limit?: number;
    action?: string;
    adminId?: string;
    targetType?: string;
  }) {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(params.limit) || 50));
    const where: any = {};
    if (params.action) where.action = params.action;
    if (params.adminId) where.adminId = params.adminId;
    if (params.targetType) where.targetType = params.targetType;

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Enrich with admin display names
    const adminIds = Array.from(new Set(logs.map((l) => l.adminId).filter(Boolean)));
    const admins = adminIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: adminIds } },
          select: { id: true, username: true, displayName: true },
        })
      : [];
    const adminMap = new Map(admins.map((a) => [a.id, a]));

    return {
      logs: logs.map((l) => ({
        ...l,
        adminName: adminMap.get(l.adminId)?.displayName || adminMap.get(l.adminId)?.username || l.adminId,
        details: this.safeParse(l.details),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  private safeParse(value: string | null) {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
}
