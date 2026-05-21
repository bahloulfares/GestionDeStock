import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityLogsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Enregistre une entrée dans les logs d'activité.
   * Utilisable par tous les autres services.
   */
  async log(
    tenantId: string,
    userId: string,
    action: string,
    entityType: string,
    entityId?: string,
    metadata?: Record<string, any>,
  ) {
    return this.prisma.activityLog.create({
      data: {
        tenantId,
        userId,
        action,
        entityType,
        entityId: entityId ?? undefined,
        metadata: metadata ?? undefined,
      },
    });
  }

  // ─── GET /api/activity-logs ──────────────────────────────────────────────────
  async findAll(
    tenantId: string,
    page: number,
    limit: number,
    entityType?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const where: any = { tenantId };

    if (entityType) where.entityType = entityType;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { email: true },
          },
        },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      data: data.map((log) => ({
        id: log.id,
        tenantId: log.tenantId,
        userId: log.userId,
        userEmail: log.user.email,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
        createdAt: log.createdAt,
      })),
      total,
      page,
      limit,
    };
  }
}
