import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // ─── GET /api/reports/top-products ──────────────────────────────────────────
  async getTopProducts(
    tenantId: string,
    startDate?: string,
    endDate?: string,
    limit = 10,
  ) {
    const start = startDate ? new Date(startDate) : new Date('2000-01-01');
    const end = endDate ? new Date(endDate) : new Date();

    const results = await this.prisma.$queryRaw<any[]>`
      SELECT
        p.id          AS "productId",
        p.name        AS "productName",
        p.reference   AS reference,
        SUM(si.qty)   AS "totalQty",
        SUM(si.qty * si.price_sell) AS "totalRevenue"
      FROM sale_items si
      JOIN products p ON p.id = si.product_id
      JOIN sales s ON s.id = si.sale_id
      WHERE s.tenant_id = ${tenantId}
        AND s.status = 'COMPLETED'
        AND s.date >= ${start}
        AND s.date <= ${end}
      GROUP BY p.id, p.name, p.reference
      ORDER BY "totalQty" DESC
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      reference: r.reference,
      totalQty: Number(r.totalQty),
      totalRevenue: Number(r.totalRevenue),
    }));
  }

  // ─── GET /api/reports/sales-by-period ───────────────────────────────────────
  async getSalesByPeriod(
    tenantId: string,
    startDate?: string,
    endDate?: string,
    groupBy: 'day' | 'week' | 'month' = 'day',
  ) {
    const start = startDate ? new Date(startDate) : new Date('2000-01-01');
    const end = endDate ? new Date(endDate) : new Date();

    // Choisir le format de troncature selon groupBy
    const truncFn = Prisma.raw(
      groupBy === 'month' ? "'month'" : groupBy === 'week' ? "'week'" : "'day'",
    );

    const results = await this.prisma.$queryRaw<any[]>`
      SELECT
        DATE_TRUNC(${truncFn}, s.date)         AS date,
        COUNT(*)                                AS count,
        SUM(s.total)                            AS total,
        SUM(CASE WHEN s.payment_method = 'CASH'     THEN s.total ELSE 0 END) AS cash,
        SUM(CASE WHEN s.payment_method = 'TRANSFER' THEN s.total ELSE 0 END) AS transfer,
        SUM(CASE WHEN s.payment_method = 'CREDIT'   THEN s.total ELSE 0 END) AS credit
      FROM sales s
      WHERE s.tenant_id = ${tenantId}
        AND s.status = 'COMPLETED'
        AND s.date >= ${start}
        AND s.date <= ${end}
      GROUP BY DATE_TRUNC(${truncFn}, s.date)
      ORDER BY date ASC
    `;

    return results.map((r) => ({
      date: r.date,
      count: Number(r.count),
      total: Number(r.total),
      cash: Number(r.cash),
      transfer: Number(r.transfer),
      credit: Number(r.credit),
    }));
  }

  // ─── GET /api/reports/stock-value ───────────────────────────────────────────
  async getStockValue(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        category: { select: { name: true } },
      },
    });

    const totalValue = products.reduce(
      (sum, p) => sum + Number(p.priceBuy) * p.qty,
      0,
    );

    // Regrouper par catégorie
    const categoryMap = new Map<
      string,
      { categoryName: string; value: number; productCount: number }
    >();

    for (const p of products) {
      const key = p.categoryId ?? '__none__';
      const catName = p.category?.name ?? 'Sans catégorie';
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          categoryName: catName,
          value: 0,
          productCount: 0,
        });
      }
      const entry = categoryMap.get(key)!;
      entry.value += Number(p.priceBuy) * p.qty;
      entry.productCount += 1;
    }

    // Produits sans mouvement depuis 30j
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const inactiveProducts = await this.prisma.$queryRaw<any[]>`
      SELECT
        p.id, p.name, p.reference, p.qty, p.min_stock AS "minStock"
      FROM products p
      WHERE p.tenant_id = ${tenantId}
        AND p.is_active = true
        AND p.id NOT IN (
          SELECT DISTINCT si.product_id FROM sale_items si
          JOIN sales s ON s.id = si.sale_id
          WHERE s.date >= ${thirtyDaysAgo}
        )
        AND p.id NOT IN (
          SELECT DISTINCT pi.product_id FROM purchase_items pi
          JOIN purchase_orders po ON po.id = pi.order_id
          WHERE po.created_at >= ${thirtyDaysAgo}
        )
    `;

    return {
      totalValue,
      byCategory: Array.from(categoryMap.values()).sort(
        (a, b) => b.value - a.value,
      ),
      inactiveProducts: inactiveProducts.map((p) => ({
        id: p.id,
        name: p.name,
        reference: p.reference,
        qty: p.qty,
        minStock: p.minStock,
      })),
    };
  }

  // ─── GET /api/reports/stock-alerts ──────────────────────────────────────────
  async getStockAlerts(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: {
        category: { select: { name: true } },
      },
    });

    return products
      .filter((p) => p.qty <= p.minStock)
      .map((p) => ({
        id: p.id,
        name: p.name,
        reference: p.reference,
        qty: p.qty,
        minStock: p.minStock,
        missingQty: p.minStock - p.qty,
        categoryName: p.category?.name ?? null,
      }));
  }

  // ─── GET /api/reports/sales/export ──────────────────────────────────────────
  async exportSalesExcel(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date('2000-01-01');
    const end = endDate ? new Date(endDate) : new Date();

    const sales = await this.prisma.sale.findMany({
      where: { tenantId, date: { gte: start, lte: end } },
      include: {
        createdByUser: { select: { email: true } },
        items: { include: { product: { select: { name: true } } } },
      },
      orderBy: { date: 'asc' },
    });

    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Ventes');

    sheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Date', key: 'date', width: 25 },
      { header: 'Total (TND)', key: 'total', width: 15 },
      { header: 'Paiement', key: 'payment', width: 15 },
      { header: 'Statut', key: 'status', width: 15 },
      { header: 'Vendeur', key: 'seller', width: 25 },
      { header: 'Articles', key: 'items', width: 50 },
    ];

    for (const s of sales) {
      sheet.addRow({
        id: s.id,
        date: s.date.toISOString(),
        total: Number(s.total),
        payment: s.paymentMethod,
        status: s.status,
        seller: s.createdByUser.email,
        items: s.items.map((i) => `${i.qty}x ${i.product.name}`).join(', '),
      });
    }

    return await workbook.xlsx.writeBuffer();
  }
}
