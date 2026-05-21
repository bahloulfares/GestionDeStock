import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateInventorySessionDto } from './dto/inventory.dto';

function mapSession(session: any) {
  return {
    id: session.id,
    tenantId: session.tenantId,
    date: session.date,
    notes: session.notes,
    createdBy: session.createdBy,
    createdAt: session.createdAt,
    items: session.items?.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product?.name,
      qtySystem: item.qtySystem,
      qtyPhysical: item.qtyPhysical,
      difference: item.difference,
      comment: item.comment,
    })),
  };
}

@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
  ) {}

  // ─── GET /api/inventory ──────────────────────────────────────────────────────
  async findAll(tenantId: string) {
    const sessions = await this.prisma.inventorySession.findMany({
      where: { tenantId },
      orderBy: { date: 'desc' },
      include: {
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    });
    return sessions.map(mapSession);
  }

  // ─── GET /api/inventory/:id ──────────────────────────────────────────────────
  async findOne(tenantId: string, id: string) {
    const session = await this.prisma.inventorySession.findFirst({
      where: { id, tenantId },
      include: {
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    });
    if (!session) throw new NotFoundException('Session d\'inventaire non trouvée');
    return mapSession(session);
  }

  // ─── POST /api/inventory ─────────────────────────────────────────────────────
  async create(
    tenantId: string,
    userId: string,
    dto: CreateInventorySessionDto,
  ) {
    // Récupérer les quantités système actuelles de chaque produit
    const productData: Array<{
      productId: string;
      qtySystem: number;
      qtyPhysical: number;
      difference: number;
      comment?: string;
    }> = [];

    for (const item of dto.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId, isActive: true },
      });
      if (!product) {
        throw new NotFoundException(`Produit ${item.productId} non trouvé`);
      }

      const difference = item.qtyPhysical - product.qty;

      // Si différence != 0, un commentaire est obligatoire
      if (difference !== 0 && !item.comment) {
        throw new BadRequestException(
          `Un commentaire est obligatoire pour le produit ${product.name} (différence: ${difference})`,
        );
      }

      productData.push({
        productId: item.productId,
        qtySystem: product.qty,
        qtyPhysical: item.qtyPhysical,
        difference,
        comment: item.comment,
      });
    }

    // Transaction: créer la session + corriger les stocks
    const session = await this.prisma.$transaction(async (tx) => {
      const newSession = await tx.inventorySession.create({
        data: {
          tenantId,
          notes: dto.notes ?? null,
          createdBy: userId,
          items: {
            create: productData.map((d) => ({
              productId: d.productId,
              qtySystem: d.qtySystem,
              qtyPhysical: d.qtyPhysical,
              difference: d.difference,
              comment: d.comment ?? null,
            })),
          },
        },
        include: {
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      });

      // Mettre à jour les quantités produits
      for (const d of productData) {
        await tx.product.update({
          where: { id: d.productId },
          data: { qty: d.qtyPhysical },
        });
      }

      return newSession;
    });

    await this.activityLogs.log(
      tenantId,
      userId,
      'INVENTORY',
      'inventory_session',
      session.id,
      { itemCount: dto.items.length },
    );

    return mapSession(session);
  }
}
