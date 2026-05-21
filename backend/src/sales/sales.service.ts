import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateSaleDto, CancelSaleDto } from './dto/sale.dto';

function mapSale(sale: any) {
  return {
    id: sale.id,
    tenantId: sale.tenantId,
    date: sale.date,
    total: Number(sale.total),
    paymentMethod: sale.paymentMethod,
    status: sale.status,
    notes: sale.notes,
    cancelReason: sale.cancelReason,
    createdBy: sale.createdBy,
    createdByEmail: sale.createdByUser?.email,
    createdAt: sale.createdAt,
    updatedAt: sale.updatedAt,
    items: sale.items?.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product?.name,
      qty: item.qty,
      priceSell: Number(item.priceSell),
    })),
  };
}

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
  ) {}

  // ─── GET /api/sales ──────────────────────────────────────────────────────────
  async findAll(
    tenantId: string,
    startDate?: string,
    endDate?: string,
    paymentMethod?: string,
    status?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = { tenantId };

    if (paymentMethod) where.paymentMethod = paymentMethod;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [sales, total] = await Promise.all([
      this.prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
        include: {
          createdByUser: { select: { email: true } },
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      }),
      this.prisma.sale.count({ where }),
    ]);

    return {
      data: sales.map(mapSale),
      total,
      page,
      limit,
    };
  }

  // ─── GET /api/sales/:id ──────────────────────────────────────────────────────
  async findOne(tenantId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        createdByUser: { select: { email: true } },
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    });
    if (!sale) throw new NotFoundException('Vente non trouvée');
    return mapSale(sale);
  }

  // ─── POST /api/sales ─────────────────────────────────────────────────────────
  async create(tenantId: string, userId: string, dto: CreateSaleDto) {
    // Vérifier les stocks pour chaque produit
    for (const item of dto.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId, isActive: true },
      });
      if (!product) {
        throw new NotFoundException(`Produit ${item.productId} non trouvé`);
      }
      if (product.qty < item.qty) {
        throw new BadRequestException(
          `Stock insuffisant pour ${product.name}: disponible ${product.qty}, demandé ${item.qty}`,
        );
      }
    }

    // Calculer le total
    const total = dto.items.reduce(
      (sum, item) => sum + item.qty * item.priceSell,
      0,
    );

    // Transaction: créer la vente + décrémenter les stocks
    const sale = await this.prisma.$transaction(async (tx) => {
      const newSale = await tx.sale.create({
        data: {
          tenantId,
          total,
          paymentMethod: dto.paymentMethod,
          status: 'COMPLETED',
          notes: dto.notes ?? null,
          createdBy: userId,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              qty: item.qty,
              priceSell: item.priceSell,
            })),
          },
        },
        include: {
          createdByUser: { select: { email: true } },
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      });

      // Décrémenter les stocks
      for (const item of dto.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { qty: { decrement: item.qty } },
        });
      }

      return newSale;
    });

    await this.activityLogs.log(tenantId, userId, 'CREATE', 'sale', sale.id);

    return mapSale(sale);
  }

  // ─── POST /api/sales/:id/cancel ──────────────────────────────────────────────
  async cancel(tenantId: string, userId: string, id: string, dto: CancelSaleDto) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('Vente non trouvée');
    if (sale.status !== 'COMPLETED') {
      throw new BadRequestException(
        'Seule une vente COMPLETED peut être annulée',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Annuler la vente
      await tx.sale.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelReason: dto.reason,
        },
      });

      // Réintégrer le stock
      for (const item of sale.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { qty: { increment: item.qty } },
        });
      }
    });

    await this.activityLogs.log(tenantId, userId, 'CANCEL', 'sale', id, {
      reason: dto.reason,
    });

    return this.findOne(tenantId, id);
  }
}
