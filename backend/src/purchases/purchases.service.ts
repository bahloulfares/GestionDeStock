import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreatePurchaseOrderDto } from './dto/purchase.dto';

function mapOrder(order: any) {
  const total = order.items
    ? order.items.reduce(
        (sum: number, item: any) => sum + Number(item.priceBuy) * item.qty,
        0,
      )
    : 0;

  return {
    id: order.id,
    tenantId: order.tenantId,
    supplierId: order.supplierId,
    supplierName: order.supplier?.name,
    date: order.date,
    invoiceNumber: order.invoiceNumber,
    status: order.status,
    notes: order.notes,
    createdBy: order.createdBy,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    total,
    items: order.items?.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      productName: item.product?.name,
      qty: item.qty,
      priceBuy: Number(item.priceBuy),
    })),
  };
}

@Injectable()
export class PurchasesService {
  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
  ) {}

  // ─── GET /api/purchase-orders ────────────────────────────────────────────────
  async findAll(
    tenantId: string,
    supplierId?: string,
    status?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = { tenantId };

    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { name: true } },
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return {
      data: orders.map(mapOrder),
      total,
      page,
      limit,
    };
  }

  // ─── GET /api/purchase-orders/:id ────────────────────────────────────────────
  async findOne(tenantId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        supplier: { select: { name: true } },
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    });
    if (!order) throw new NotFoundException('Bon de commande non trouvé');
    return mapOrder(order);
  }

  // ─── POST /api/purchase-orders ───────────────────────────────────────────────
  async create(tenantId: string, userId: string, dto: CreatePurchaseOrderDto) {
    // Vérifier ownership du fournisseur
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, tenantId },
    });
    if (!supplier) throw new NotFoundException('Fournisseur non trouvé');

    // Vérifier que tous les produits appartiennent au tenant
    for (const item of dto.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId },
      });
      if (!product) {
        throw new NotFoundException(`Produit ${item.productId} non trouvé`);
      }
    }

    const order = await this.prisma.purchaseOrder.create({
      data: {
        tenantId,
        supplierId: dto.supplierId,
        date: dto.date ? new Date(dto.date) : new Date(),
        invoiceNumber: dto.invoiceNumber ?? null,
        status: 'DRAFT',
        notes: dto.notes ?? null,
        createdBy: userId,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            priceBuy: item.priceBuy,
          })),
        },
      },
      include: {
        supplier: { select: { name: true } },
        items: {
          include: { product: { select: { name: true } } },
        },
      },
    });

    await this.activityLogs.log(
      tenantId,
      userId,
      'CREATE',
      'purchase_order',
      order.id,
    );

    return mapOrder(order);
  }

  // ─── PUT /api/purchase-orders/:id/validate ───────────────────────────────────
  async validate(tenantId: string, userId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Bon de commande non trouvé');
    if (order.status !== 'DRAFT') {
      throw new BadRequestException(
        'Seul un bon de commande en statut DRAFT peut être validé',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Valider le BC
      await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'VALIDATED' },
      });

      // Mettre à jour les stocks
      for (const item of order.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { qty: { increment: item.qty } },
        });
      }
    });

    await this.activityLogs.log(
      tenantId,
      userId,
      'VALIDATE',
      'purchase_order',
      id,
    );

    return this.findOne(tenantId, id);
  }

  // ─── PUT /api/purchase-orders/:id/cancel ────────────────────────────────────
  async cancel(tenantId: string, userId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });
    if (!order) throw new NotFoundException('Bon de commande non trouvé');
    if (order.status === 'VALIDATED') {
      throw new BadRequestException(
        'Impossible d\'annuler un bon de commande déjà validé',
      );
    }

    await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.activityLogs.log(
      tenantId,
      userId,
      'CANCEL',
      'purchase_order',
      id,
    );

    return { message: 'Bon de commande annulé avec succès' };
  }

  // ─── DELETE /api/purchase-orders/:id ────────────────────────────────────────
  async remove(tenantId: string, userId: string, id: string) {
    const order = await this.prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
    });
    if (!order) throw new NotFoundException('Bon de commande non trouvé');
    if (order.status !== 'DRAFT') {
      throw new BadRequestException(
        'Seul un bon de commande en statut DRAFT peut être supprimé',
      );
    }

    await this.prisma.purchaseOrder.delete({ where: { id } });

    await this.activityLogs.log(
      tenantId,
      userId,
      'DELETE',
      'purchase_order',
      id,
    );

    return { message: 'Bon de commande supprimé avec succès' };
  }
}
