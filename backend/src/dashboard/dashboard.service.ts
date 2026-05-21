import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(tenantId: string) {
    const now = new Date();

    // Début du jour
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    // Début du mois
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Exécuter toutes les requêtes en parallèle
    const [
      totalProducts,
      allActiveProducts,
      todaySales,
      monthSales,
      recentSales,
    ] = await Promise.all([
      // Count produits actifs
      this.prisma.product.count({
        where: { tenantId, isActive: true },
      }),

      // Tous les produits actifs pour low stock + stock value
      this.prisma.product.findMany({
        where: { tenantId, isActive: true },
        include: {
          category: { select: { name: true } },
        },
      }),

      // Revenue aujourd'hui
      this.prisma.sale.findMany({
        where: {
          tenantId,
          status: 'COMPLETED',
          date: { gte: todayStart, lte: todayEnd },
        },
        select: { total: true },
      }),

      // Revenue du mois
      this.prisma.sale.findMany({
        where: {
          tenantId,
          status: 'COMPLETED',
          date: { gte: monthStart, lte: monthEnd },
        },
        select: { total: true },
      }),

      // 5 dernières ventes COMPLETED
      this.prisma.sale.findMany({
        where: { tenantId, status: 'COMPLETED' },
        take: 5,
        orderBy: { date: 'desc' },
        include: {
          createdByUser: { select: { email: true } },
          items: {
            include: { product: { select: { name: true } } },
          },
        },
      }),
    ]);

    // Calculer les métriques
    const lowStockProducts = allActiveProducts.filter(
      (p) => p.qty <= p.minStock,
    );

    const stockValue = allActiveProducts.reduce(
      (sum, p) => sum + Number(p.priceBuy) * p.qty,
      0,
    );

    const todayRevenue = todaySales.reduce(
      (sum, s) => sum + Number(s.total),
      0,
    );
    const monthRevenue = monthSales.reduce(
      (sum, s) => sum + Number(s.total),
      0,
    );

    return {
      totalProducts,
      lowStockCount: lowStockProducts.length,
      todayRevenue,
      monthRevenue,
      stockValue,
      recentSales: recentSales.map((sale) => ({
        id: sale.id,
        date: sale.date,
        total: Number(sale.total),
        paymentMethod: sale.paymentMethod,
        createdByEmail: sale.createdByUser?.email,
        items: sale.items.map((item) => ({
          productName: item.product?.name,
          qty: item.qty,
          priceSell: Number(item.priceSell),
        })),
      })),
      lowStockAlerts: lowStockProducts.map((p) => ({
        id: p.id,
        name: p.name,
        reference: p.reference,
        qty: p.qty,
        minStock: p.minStock,
        categoryName: p.category?.name ?? null,
      })),
    };
  }
}
