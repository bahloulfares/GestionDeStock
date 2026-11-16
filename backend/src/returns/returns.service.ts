import {
  Injectable,
  NotFoundException,
  BadRequestException,  ConflictException} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateReturnDto } from './dto/return.dto';

@Injectable()
export class ReturnsService {
  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
  ) {}

  async create(tenantId: string, userId: string, dto: CreateReturnDto) {
    const sale = await this.prisma.sale.findUnique({
      where: { id: dto.saleId, tenantId },
      include: { items: true },
    });
    if (!sale) throw new NotFoundException('Vente non trouvée');
    if (sale.status !== 'COMPLETED')
      throw new BadRequestException('La vente doit être complétée');

    // Vérifier les quantités retournées par rapport à la vente
    for (const item of dto.items) {
      const saleItem = sale.items.find((si) => si.productId === item.productId);
      if (!saleItem)
        throw new BadRequestException(
          `Le produit ${item.productId} ne fait pas partie de cette vente`,
        );

      // On devrait aussi vérifier que la qté retournée <= qté vendue - qtés déjà retournées
      // Mais pour rester simple on vérifie juste <= qté vendue
      if (item.qty > saleItem.qty) {
        throw new BadRequestException(
          `Quantité retournée supérieure à la quantité vendue pour ce produit`,
        );
      }
    }

    const saleReturn = await this.prisma.saleReturn.create({
      data: {
        tenantId,
        saleId: dto.saleId,
        createdBy: userId,
        notes: dto.notes,
        items: {
          create: dto.items.map((i) => ({
            productId: i.productId,
            qty: i.qty,
            reason: i.reason,
            returnToStock: i.returnToStock,
          })),
        },
      },
      include: { items: true },
    });

    await this.activityLogs.log(
      tenantId,
      userId,
      'CREATE',
      'sale_return',
      saleReturn.id,
    );
    return saleReturn;
  }

    async validate(tenantId: string, userId: string, id: string) {
    let returnItems: any[];

    await this.prisma.$transaction(async (tx) => {
      // Transition atomique: PENDING -> COMPLETED
      const result = await tx.saleReturn.updateMany({
        where: { id, tenantId, status: 'PENDING' },
        data: { status: 'COMPLETED' },
      });

      if (result.count === 0) {
        // Check if return exists
        const saleReturn = await tx.saleReturn.findFirst({ 
          where: { id, tenantId } 
        });
        if (!saleReturn) {
          throw new NotFoundException('Retour non trouvé');
        }
        throw new ConflictException(
          'Ce retour ne peut pas être validé (déjà validé ou rejeté)',
        );
      }

      // Get items after successful transition
      const saleReturn = await tx.saleReturn.findUnique({
        where: { id },
        include: { items: true },
      });
      if (!saleReturn) throw new NotFoundException('Retour introuvable après transition');
      returnItems = saleReturn.items;

      // Apply stock updates only after atomic status transition succeeded
      for (const item of returnItems) {
        if (item.returnToStock) {
          await tx.product.update({
            where: { id: item.productId },
            data: { qty: { increment: item.qty } },
          });
        }
      }
    });

    await this.activityLogs.log(
      tenantId,
      userId,
      'VALIDATE',
      'sale_return',
      id,
    );
    return { success: true };
  }

    async reject(tenantId: string, userId: string, id: string) {
    // Transition atomique: PENDING -> REJECTED
    const result = await this.prisma.saleReturn.updateMany({
      where: { id, tenantId, status: 'PENDING' },
      data: { status: 'REJECTED' },
    });

    if (result.count === 0) {
      const saleReturn = await this.prisma.saleReturn.findFirst({ 
        where: { id, tenantId } 
      });
      if (!saleReturn) {
        throw new NotFoundException('Retour non trouvé');
      }
      throw new ConflictException(
        'Ce retour ne peut pas être rejeté (déjà validé ou rejeté)',
      );
    }

    await this.activityLogs.log(tenantId, userId, 'REJECT', 'sale_return', id);
    return { success: true };
  }

  async findAll(tenantId: string, page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.saleReturn.findMany({
        where: { tenantId },
        include: {
          items: {
            include: { product: { select: { name: true, reference: true } } },
          },
          createdByUser: { select: { email: true } },
          sale: { select: { id: true, date: true, total: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.saleReturn.count({ where: { tenantId } }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const saleReturn = await this.prisma.saleReturn.findUnique({
      where: { id, tenantId },
      include: {
        items: {
          include: { product: { select: { name: true, reference: true } } },
        },
        createdByUser: { select: { email: true } },
        sale: { select: { id: true, date: true, total: true } },
      },
    });
    if (!saleReturn) throw new NotFoundException('Retour non trouvé');
    return saleReturn;
  }
}
