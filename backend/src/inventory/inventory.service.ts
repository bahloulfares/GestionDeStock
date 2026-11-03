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
    status: session.status,
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

    // Créer la session d'inventaire au statut DRAFT (sans modifier les stocks)
    const session = await this.prisma.inventorySession.create({
      data: {
        tenantId,
        notes: dto.notes ?? null,
        status: 'DRAFT',
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

  // ─── POST /api/inventory/:id/validate ────────────────────────────────────────
  async validate(tenantId: string, userId: string, id: string) {
    const session = await this.prisma.inventorySession.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });

    if (!session) throw new NotFoundException("Session d'inventaire non trouvée");
    if (session.status === 'VALIDATED') {
      throw new BadRequestException('Cette session a déjà été validée');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of session.items) {
        if (item.difference === 0) continue;

        // Vérifier que l'ajustement ne rendra pas qty négatif
        const product = await tx.product.findFirst({
          where: { id: item.productId },
          select: { qty: true, name: true },
        });
        const newQty = (product?.qty ?? 0) + item.difference;
        if (newQty < 0) {
          throw new BadRequestException(
            `L'ajustement pour "${product?.name}" résulterait en un stock négatif (${newQty})`,
          );
        }

        await tx.product.update({
          where: { id: item.productId },
          data: { qty: { increment: item.difference } },
        });
      }

      await tx.inventorySession.update({
        where: { id },
        data: { status: 'VALIDATED' },
      });
    });

    await this.activityLogs.log(
      tenantId,
      userId,
      'INVENTORY_VALIDATE',
      'inventory_session',
      id,
    );

    return this.findOne(tenantId, id);
  }
}
