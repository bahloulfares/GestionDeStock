import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';

const productInclude = {
  category: {
    select: { id: true, name: true },
  },
};

function mapProduct(p: any) {
  return {
    id: p.id,
    tenantId: p.tenantId,
    name: p.name,
    reference: p.reference,
    categoryId: p.categoryId,
    categoryName: p.category?.name ?? null,
    priceBuy: Number(p.priceBuy),
    priceSell: Number(p.priceSell),
    qty: p.qty,
    minStock: p.minStock,
    isActive: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // ─── GET /api/products ───────────────────────────────────────────────────────
  async findAll(
    tenantId: string,
    categoryId?: string,
    lowStock?: boolean,
    search?: string,
    page = 1,
    limit = 20,
  ) {
    const where: any = { tenantId, isActive: true };

    if (categoryId) where.categoryId = categoryId;
    // lowStock filter is handled in JS after fetching (Prisma doesn't support column-to-column comparisons)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }

    const skip = (page - 1) * limit;

    let products: any[];
    let total: number;

    if (lowStock) {
      // Get products where qty <= minStock
      const allWhere = { ...where };
      // We need a raw-like approach via Prisma filter
      // qty <= minStock: Prisma doesn't support column comparison directly
      // Workaround: fetch all with active filter then filter in JS, or use findRaw
      // Better: use $queryRaw for this specific case
      const allProducts = await this.prisma.product.findMany({
        where: allWhere,
        include: productInclude,
        orderBy: { name: 'asc' },
      });
      const filtered = allProducts.filter((p) => p.qty <= p.minStock);
      total = filtered.length;
      products = filtered.slice(skip, skip + limit);
    } else {
      [products, total] = await Promise.all([
        this.prisma.product.findMany({
          where,
          include: productInclude,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
        }),
        this.prisma.product.count({ where }),
      ]);
    }

    return {
      data: products.map(mapProduct),
      total,
      page,
      limit,
    };
  }

  // ─── GET /api/products/alerts ────────────────────────────────────────────────
  async getLowStockAlerts(tenantId: string) {
    const products = await this.prisma.product.findMany({
      where: { tenantId, isActive: true },
      include: productInclude,
    });
    return products.filter((p) => p.qty <= p.minStock).map(mapProduct);
  }

  // ─── POST /api/products ──────────────────────────────────────────────────────
  async create(tenantId: string, dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        tenantId,
        name: dto.name,
        reference: dto.reference ?? null,
        categoryId: dto.categoryId ?? null,
        priceBuy: dto.priceBuy,
        priceSell: dto.priceSell,
        qty: dto.qty ?? 0,
        minStock: dto.minStock ?? 5,
        isActive: true,
      },
      include: productInclude,
    });
    return mapProduct(product);
  }

  // ─── PUT /api/products/:id ───────────────────────────────────────────────────
  async update(tenantId: string, id: string, dto: UpdateProductDto) {
    await this.ensureOwnership(tenantId, id);

    const product = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.reference !== undefined && { reference: dto.reference }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.priceBuy !== undefined && { priceBuy: dto.priceBuy }),
        ...(dto.priceSell !== undefined && { priceSell: dto.priceSell }),
        ...(dto.qty !== undefined && { qty: dto.qty }),
        ...(dto.minStock !== undefined && { minStock: dto.minStock }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      include: productInclude,
    });
    return mapProduct(product);
  }

  // ─── DELETE /api/products/:id (soft delete) ──────────────────────────────────
  async remove(tenantId: string, id: string) {
    await this.ensureOwnership(tenantId, id);

    await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Produit désactivé avec succès' };
  }

  // ─── Helper ──────────────────────────────────────────────────────────────────
  private async ensureOwnership(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });
    if (!product) {
      throw new NotFoundException('Produit non trouvé');
    }
    return product;
  }

  async findByIdOrFail(tenantId: string, id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId, isActive: true },
    });
    if (!product) throw new NotFoundException('Produit non trouvé');
    return product;
  }
}
