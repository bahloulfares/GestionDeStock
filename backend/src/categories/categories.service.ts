import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  // ─── GET /api/categories ─────────────────────────────────────────────────────
  async findAll(tenantId: string) {
    return this.prisma.category.findMany({
      where: { tenantId },
      orderBy: { name: 'asc' },
    });
  }

  // ─── POST /api/categories ────────────────────────────────────────────────────
  async create(tenantId: string, dto: CreateCategoryDto) {
    // Vérifier unicité nom dans le tenant
    const existing = await this.prisma.category.findUnique({
      where: { tenantId_name: { tenantId, name: dto.name } },
    });
    if (existing) {
      throw new ConflictException('Une catégorie avec ce nom existe déjà');
    }

    return this.prisma.category.create({
      data: { tenantId, name: dto.name },
    });
  }

  // ─── PUT /api/categories/:id ─────────────────────────────────────────────────
  async update(tenantId: string, id: string, dto: UpdateCategoryDto) {
    await this.ensureOwnership(tenantId, id);

    return this.prisma.category.update({
      where: { id },
      data: { ...(dto.name && { name: dto.name }) },
    });
  }

  // ─── DELETE /api/categories/:id ──────────────────────────────────────────────
  async remove(tenantId: string, id: string) {
    await this.ensureOwnership(tenantId, id);

    // Vérifier qu'aucun produit n'est rattaché
    const productCount = await this.prisma.product.count({
      where: { categoryId: id, tenantId },
    });
    if (productCount > 0) {
      throw new ConflictException(
        'Impossible de supprimer: des produits utilisent cette catégorie',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { message: 'Catégorie supprimée avec succès' };
  }

  // ─── Helper ──────────────────────────────────────────────────────────────────
  private async ensureOwnership(tenantId: string, id: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });
    if (!category) {
      throw new NotFoundException('Catégorie non trouvée');
    }
    return category;
  }
}
