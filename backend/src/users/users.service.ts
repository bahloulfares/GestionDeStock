import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

const BCRYPT_ROUNDS = 12;

const userSelect = {
  id: true,
  tenantId: true,
  email: true,
  role: true,
  isActive: true,
  isVerified: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // ─── GET /api/users ──────────────────────────────────────────────────────────
  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: userSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── POST /api/users ─────────────────────────────────────────────────────────
  async create(tenantId: string, dto: CreateUserDto) {
    // Vérifier unicité email dans le tenant
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (existing) {
      throw new ConflictException('Un utilisateur avec cet email existe déjà dans ce tenant');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    return this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        passwordHash,
        role: dto.role ?? 'EMPLOYEE',
        isActive: true,
        isVerified: true, // Les comptes créés par admin sont directement vérifiés
      },
      select: userSelect,
    });
  }

  // ─── PUT /api/users/:id ──────────────────────────────────────────────────────
  async update(tenantId: string, id: string, dto: UpdateUserDto) {
    // Vérifier ownership tenant
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(dto.role !== undefined && { role: dto.role }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
      select: userSelect,
    });
  }

  // ─── Méthode interne: trouver un user par id/tenant ──────────────────────────
  async findById(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return user;
  }
}
