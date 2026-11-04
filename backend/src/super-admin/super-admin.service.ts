import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateTenantByAdminDto,
  RenewSubscriptionDto,
  ToggleBlockTenantDto,
} from './dto/super-admin.dto';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class SuperAdminService {
  constructor(private prisma: PrismaService) {}

  // ─── Statistiques globales (KPI pour le propriétaire de la plateforme) ─────
  async getDashboardStats() {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    const [totalTenants, allTenants, totalPayments, recentPayments] =
      await Promise.all([
        this.prisma.tenant.count(),
        this.prisma.tenant.findMany({
          select: {
            id: true,
            status: true,
            isBlocked: true,
            subscriptionExpiresAt: true,
          },
        }),
        this.prisma.tenantPayment.aggregate({
          _sum: { amount: true },
          _count: { id: true },
        }),
        this.prisma.tenantPayment.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { tenant: { select: { id: true, name: true } } },
        }),
      ]);

    let activeCount = 0;
    let trialCount = 0;
    let expiredCount = 0;
    let suspendedCount = 0;
    let expiringSoonCount = 0;

    for (const t of allTenants) {
      if (t.isBlocked) {
        suspendedCount++;
      } else if (new Date(t.subscriptionExpiresAt) < now) {
        expiredCount++;
      } else {
        if (t.status === 'TRIAL') {
          trialCount++;
        } else {
          activeCount++;
        }

        const exp = new Date(t.subscriptionExpiresAt);
        if (exp >= now && exp <= sevenDaysFromNow) {
          expiringSoonCount++;
        }
      }
    }

    return {
      totalTenants,
      activeCount,
      trialCount,
      expiredCount,
      suspendedCount,
      expiringSoonCount,
      totalRevenue: Number(totalPayments._sum.amount ?? 0),
      totalTransactions: totalPayments._count.id,
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        tenantId: p.tenantId,
        shopName: p.tenant.name,
        amount: Number(p.amount),
        durationMonths: p.durationMonths,
        paymentMethod: p.paymentMethod,
        date: p.createdAt,
      })),
    };
  }

  // ─── Liste de tous les clients (boutiques) ────────────────────────────────
  async findAllTenants(
    search?: string,
    statusFilter?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const now = new Date();

    if (statusFilter === 'SUSPENDED') {
      where.isBlocked = true;
    } else if (statusFilter === 'EXPIRED') {
      where.isBlocked = false;
      where.subscriptionExpiresAt = { lt: now };
    } else if (statusFilter === 'ACTIVE') {
      where.isBlocked = false;
      where.subscriptionExpiresAt = { gte: now };
      where.status = { not: 'TRIAL' };
    } else if (statusFilter === 'TRIAL') {
      where.isBlocked = false;
      where.subscriptionExpiresAt = { gte: now };
      where.status = 'TRIAL';
    }

    const skip = (page - 1) * limit;

    const [tenants, total] = await Promise.all([
      this.prisma.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              users: true,
              products: true,
              sales: true,
            },
          },
          payments: {
            select: { amount: true },
          },
        },
      }),
      this.prisma.tenant.count({ where }),
    ]);

    const items = tenants.map((t) => {
      const exp = new Date(t.subscriptionExpiresAt);
      const isExpired = exp < now;
      const daysLeft = Math.ceil(
        (exp.getTime() - now.getTime()) / (1000 * 3600 * 24),
      );
      const totalPaid = t.payments.reduce(
        (acc, p) => acc + Number(p.amount),
        0,
      );

      let computedStatus: string = t.status;
      if (t.isBlocked) {
        computedStatus = 'SUSPENDED';
      } else if (isExpired) {
        computedStatus = 'EXPIRED';
      }

      return {
        id: t.id,
        name: t.name,
        email: t.email,
        phone: t.phone,
        plan: t.plan,
        status: computedStatus,
        rawStatus: t.status,
        isBlocked: t.isBlocked,
        blockReason: t.blockReason,
        subscriptionExpiresAt: t.subscriptionExpiresAt,
        daysLeft: Math.max(0, daysLeft),
        isExpiringSoon: !isExpired && daysLeft <= 7,
        counts: {
          users: t._count.users,
          products: t._count.products,
          sales: t._count.sales,
        },
        totalRevenue: totalPaid,
        createdAt: t.createdAt,
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── Détail d'une boutique avec historique ────────────────────────────────
  async findOneTenant(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
          },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            products: true,
            sales: true,
            suppliers: true,
            purchaseOrders: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Boutique introuvable');
    }

    const now = new Date();
    const exp = new Date(tenant.subscriptionExpiresAt);
    const isExpired = exp < now;
    const daysLeft = Math.ceil(
      (exp.getTime() - now.getTime()) / (1000 * 3600 * 24),
    );

    return {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      plan: tenant.plan,
      status: tenant.isBlocked
        ? 'SUSPENDED'
        : isExpired
          ? 'EXPIRED'
          : tenant.status,
      isBlocked: tenant.isBlocked,
      blockReason: tenant.blockReason,
      subscriptionExpiresAt: tenant.subscriptionExpiresAt,
      daysLeft: Math.max(0, daysLeft),
      isExpiringSoon: !isExpired && daysLeft <= 7,
      counts: tenant._count,
      users: tenant.users,
      payments: tenant.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        durationMonths: p.durationMonths,
        startDate: p.startDate,
        endDate: p.endDate,
        paymentMethod: p.paymentMethod,
        notes: p.notes,
        createdAt: p.createdAt,
      })),
      createdAt: tenant.createdAt,
    };
  }

  // ─── Création manuelle d'une boutique par le Super Admin ──────────────────
  async createTenant(dto: CreateTenantByAdminDto, superAdminId: string) {
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { email: dto.email },
    });
    if (existingTenant) {
      throw new ConflictException('Une boutique avec cet email existe déjà');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { email: dto.adminEmail },
    });
    if (existingUser) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà');
    }

    const passwordHash = await bcrypt.hash(dto.adminPassword, BCRYPT_ROUNDS);

    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + dto.durationMonths);

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: dto.name,
          email: dto.email,
          phone: dto.phone,
          plan: dto.plan,
          status: dto.plan === 'TRIAL' ? 'TRIAL' : 'ACTIVE',
          subscriptionExpiresAt: expiresAt,
        },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.adminEmail,
          passwordHash,
          role: 'ADMIN',
          isActive: true,
          isVerified: true,
        },
      });

      // Si un paiement a été encaissé lors de la création
      if (dto.amount && dto.amount > 0) {
        await tx.tenantPayment.create({
          data: {
            tenantId: tenant.id,
            amount: dto.amount,
            durationMonths: dto.durationMonths,
            startDate: now,
            endDate: expiresAt,
            paymentMethod: dto.paymentMethod || 'CASH',
            notes: 'Paiement initial lors de la création',
            recordedBy: superAdminId,
          },
        });
      }

      return { tenant, user };
    });

    return {
      message: 'Boutique cliente créée avec succès',
      tenantId: result.tenant.id,
      adminEmail: result.user.email,
      expiresAt,
    };
  }

  // ─── Renouveler / Prolonger l'abonnement d'un client (+1 mois, +1 an...) ──
  async renewSubscription(
    tenantId: string,
    dto: RenewSubscriptionDto,
    superAdminId: string,
  ) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Boutique introuvable');
    }

    const now = new Date();
    const currentExpiry = new Date(tenant.subscriptionExpiresAt);

    // Si la date actuelle est encore valide, on prolonge à partir de l'ancienne date
    // Si l'abonnement était expiré, on repart d'aujourd'hui
    const baseDate = currentExpiry > now ? currentExpiry : now;
    const newExpiry = new Date(baseDate);
    newExpiry.setMonth(newExpiry.getMonth() + dto.durationMonths);

    // Déterminer le plan en fonction de la durée (>= 12 mois -> YEARLY, sinon MONTHLY)
    const newPlan = dto.durationMonths >= 12 ? 'YEARLY' : 'MONTHLY';

    await this.prisma.$transaction(async (tx) => {
      // 1. Mettre à jour le tenant
      await tx.tenant.update({
        where: { id: tenantId },
        data: {
          status: 'ACTIVE',
          plan: newPlan,
          subscriptionExpiresAt: newExpiry,
          isBlocked: false,
          blockReason: null,
        },
      });

      // 2. Enregistrer la transaction financière
      await tx.tenantPayment.create({
        data: {
          tenantId,
          amount: dto.amount,
          durationMonths: dto.durationMonths,
          startDate: baseDate,
          endDate: newExpiry,
          paymentMethod: dto.paymentMethod,
          notes: dto.notes,
          recordedBy: superAdminId,
        },
      });
    });

    return {
      message: `Abonnement prolongé de ${dto.durationMonths} mois avec succès !`,
      tenantId,
      newExpiresAt: newExpiry,
      status: 'ACTIVE',
    };
  }

  // ─── Suspendre ou Réactiver une boutique ──────────────────────────────────
  async toggleBlock(tenantId: string, dto: ToggleBlockTenantDto) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Boutique introuvable');
    }

    const updated = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        isBlocked: dto.isBlocked,
        blockReason: dto.isBlocked
          ? dto.blockReason || 'Suspendu par le propriétaire'
          : null,
        status: dto.isBlocked ? 'SUSPENDED' : 'ACTIVE',
      },
    });

    return {
      message: dto.isBlocked
        ? "La boutique a été suspendue. L'accès est désormais bloqué pour tous ses utilisateurs."
        : 'La boutique a été réactivée avec succès.',
      tenantId: updated.id,
      isBlocked: updated.isBlocked,
      status: updated.status,
    };
  }

  // ─── Consulter les détails d'abonnement pour la boutique connectée ─────────
  async getMySubscription(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        payments: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Boutique introuvable');
    }

    const now = new Date();
    const exp = new Date(tenant.subscriptionExpiresAt);
    const isExpired = exp < now;
    const daysLeft = Math.ceil(
      (exp.getTime() - now.getTime()) / (1000 * 3600 * 24),
    );

    return {
      shopName: tenant.name,
      email: tenant.email,
      phone: tenant.phone,
      plan: tenant.plan,
      status: tenant.isBlocked
        ? 'SUSPENDED'
        : isExpired
          ? 'EXPIRED'
          : tenant.status,
      isBlocked: tenant.isBlocked,
      blockReason: tenant.blockReason,
      expiresAt: tenant.subscriptionExpiresAt,
      daysLeft: Math.max(0, daysLeft),
      isExpired,
      isExpiringSoon: !isExpired && daysLeft <= 7,
      recentPayments: tenant.payments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        durationMonths: p.durationMonths,
        startDate: p.startDate,
        endDate: p.endDate,
        paymentMethod: p.paymentMethod,
        date: p.createdAt,
      })),
      supportContact: {
        phone: '+216 22 000 000',
        whatsapp: '+216 22 000 000',
        rib: '08 000 0000000000000 00 (BIAT / Post)',
        d17: '22 000 000',
      },
    };
  }

  async resetUserPassword(
    tenantId: string,
    userId: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) {
      throw new NotFoundException(
        'Utilisateur introuvable dans cette boutique.',
      );
    }
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
    // Révoquer toutes les sessions actives de cet utilisateur par sécurité
    try {
      await this.prisma.tokenStore.updateMany({
        where: { userId },
        data: { revoked: true },
      });
    } catch (_e) {
      // tokenStore may not exist in all schemas — ignore
    }
    return { message: 'Mot de passe réinitialisé avec succès.' };
  }
}
