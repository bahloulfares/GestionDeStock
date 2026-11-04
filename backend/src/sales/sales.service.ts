import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PdfService } from '../pdf/pdf.service';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
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
      costPriceAtSale:
        item.costPriceAtSale != null
          ? Number(item.costPriceAtSale).toFixed(3)
          : null,
    })),
  };
}

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private activityLogs: ActivityLogsService,
    private readonly pdfService: PdfService,
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
    // Lire name et priceBuy avant la transaction (la vérification du stock
    // se fait dans l'UPDATE atomique, pas ici)
    const productMap = new Map<
      string,
      { name: string; priceBuy: import('@prisma/client').Prisma.Decimal }
    >();
    for (const item of dto.items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, tenantId, isActive: true },
        select: { name: true, priceBuy: true },
      });
      if (!product) {
        throw new NotFoundException(`Produit ${item.productId} non trouvé`);
      }
      if (product.priceBuy === null) {
        throw new BadRequestException(
          `Le coût d'achat du produit "${product.name}" est manquant`,
        );
      }
      productMap.set(item.productId, {
        name: product.name,
        priceBuy: product.priceBuy,
      });
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
              costPriceAtSale: productMap.get(item.productId)!.priceBuy,
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

      // Décrémenter les stocks de manière atomique (vérification dans le WHERE)
      for (const item of dto.items) {
        const affected = await tx.$executeRaw`
          UPDATE products SET qty = qty - ${item.qty}
          WHERE id = ${item.productId} AND tenant_id = ${tenantId} AND qty >= ${item.qty}
        `;
        if (affected === 0) {
          const current = await tx.product.findFirst({
            where: { id: item.productId },
            select: { qty: true, name: true },
          });
          throw new BadRequestException(
            `Stock insuffisant pour "${current?.name}": disponible ${current?.qty ?? 0}, demandé ${item.qty}`,
          );
        }
      }

      return newSale;
    });

    await this.activityLogs.log(tenantId, userId, 'CREATE', 'sale', sale.id);

    return mapSale(sale);
  }

  // ─── POST /api/sales/:id/cancel ──────────────────────────────────────────────
  async cancel(
    tenantId: string,
    userId: string,
    id: string,
    dto: CancelSaleDto,
  ) {
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

  async generateInvoicePdf(tenantId: string, id: string) {
    const sale = await this.prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        items: { include: { product: true } },
        tenant: true,
      },
    });
    if (!sale) throw new NotFoundException('Vente non trouvée');

    // Construction du document : nom boutique, titre FACTURE, référence,
    // date, règlement, tableau articles (désignation, qté, prix unitaire,
    // montant) et total général. Document sans colonne fiscale.
    const docDefinition: TDocumentDefinitions = {
      defaultStyle: { font: 'Helvetica' },
      content: [
        {
          text: sale.tenant.name,
          fontSize: 20,
          bold: true,
          margin: [0, 0, 0, 5],
        },
        {
          text: 'FACTURE',
          fontSize: 16,
          bold: true,
          alignment: 'right',
          margin: [0, -25, 0, 20],
        },

        {
          text: `Réf : #${sale.id.slice(-8).toUpperCase()}`,
          margin: [0, 5, 0, 2],
        },
        {
          text: `Date : ${sale.date.toLocaleDateString()}`,
          margin: [0, 0, 0, 2],
        },
        { text: `Règlement : ${sale.paymentMethod}`, margin: [0, 0, 0, 20] },

        {
          table: {
            headerRows: 1,
            widths: ['*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'Désignation', bold: true },
                { text: 'Qté', bold: true },
                { text: 'Prix Unitaire', bold: true },
                { text: 'Montant', bold: true },
              ],
              ...sale.items.map((item) => [
                item.product.name,
                item.qty.toString(),
                Number(item.priceSell).toFixed(3),
                (item.qty * Number(item.priceSell)).toFixed(3),
              ]),
              [
                {
                  text: 'TOTAL (TND)',
                  colSpan: 3,
                  alignment: 'right',
                  bold: true,
                },
                {},
                {},
                { text: Number(sale.total).toFixed(3), bold: true },
              ],
            ],
          },
          layout: 'lightHorizontalLines',
        },
      ],
    };

    return await this.pdfService.generateBuffer(docDefinition);
  }
}
