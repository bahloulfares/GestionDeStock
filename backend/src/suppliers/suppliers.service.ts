import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, UpdateSupplierDto } from './dto/supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  // ─── GET /api/suppliers ──────────────────────────────────────────────────────
  async findAll(tenantId: string, search?: string) {
    const where: any = { tenantId };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    return this.prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  // ─── POST /api/suppliers ─────────────────────────────────────────────────────
  async create(tenantId: string, dto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: {
        tenantId,
        name: dto.name,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        city: dto.city ?? null,
        paymentTerms: dto.paymentTerms ?? null,
      },
    });
  }

  // ─── PUT /api/suppliers/:id ──────────────────────────────────────────────────
  async update(tenantId: string, id: string, dto: UpdateSupplierDto) {
    await this.ensureOwnership(tenantId, id);

    return this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.city !== undefined && { city: dto.city }),
        ...(dto.paymentTerms !== undefined && { paymentTerms: dto.paymentTerms }),
      },
    });
  }

  // ─── DELETE /api/suppliers/:id ───────────────────────────────────────────────
  async remove(tenantId: string, id: string) {
    await this.ensureOwnership(tenantId, id);

    const orderCount = await this.prisma.purchaseOrder.count({
      where: { supplierId: id, tenantId },
    });
    if (orderCount > 0) {
      throw new ConflictException(
        'Impossible de supprimer: des bons de commande sont associés à ce fournisseur',
      );
    }

    await this.prisma.supplier.delete({ where: { id } });
    return { message: 'Fournisseur supprimé avec succès' };
  }

  // ─── Helper ──────────────────────────────────────────────────────────────────
  private async ensureOwnership(tenantId: string, id: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id, tenantId },
    });
    if (!supplier) {
      throw new NotFoundException('Fournisseur non trouvé');
    }
    return supplier;
  }
}
