import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { UserRole } from '@prisma/client';

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

  // --- GET /api/users ----------------------------------------------------------
  async findAll(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId },
      select: userSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- POST /api/users ---------------------------------------------------------
  async create(tenantId: string, dto: CreateUserDto) {
    // Défense en profondeur : SUPER_ADMIN interdit
    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Le rôle SUPER_ADMIN ne peut pas être attribué depuis une boutique',
      );
    }

    // Vérifier unicité email dans le tenant
    const existing = await this.prisma.user.findUnique({
      where: { tenantId_email: { tenantId, email: dto.email } },
    });
    if (existing) {
      throw new ConflictException(
        'Un utilisateur avec cet email existe déjà dans ce tenant',
      );
    }

    // Vérifier maxUsers du tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { maxUsers: true },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant introuvable');
    }

    const currentUsersCount = await this.prisma.user.count({
      where: { tenantId },
    });
    if (currentUsersCount >= tenant.maxUsers) {
      throw new BadRequestException(
        `Limite d'utilisateurs atteinte (${tenant.maxUsers}). Passez à un plan supérieur.`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    return this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        passwordHash,
        role: dto.role ?? UserRole.EMPLOYEE,
        isActive: true,
        isVerified: true, // Les comptes créés par admin sont directement vérifiés
      },
      select: userSelect,
    });
  }

  // --- PUT /api/users/:id ------------------------------------------------------
  async update(
    tenantId: string,
    id: string,
    dto: UpdateUserDto,
    currentUserId: string,
  ) {
    // Défense en profondeur : SUPER_ADMIN interdit
    if (dto.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException(
        'Le rôle SUPER_ADMIN ne peut pas être attribué depuis une boutique',
      );
    }

    // Vérifier ownership tenant
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: { ...userSelect, role: true, isActive: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouvé');
    }

    // Empêcher auto-désactivation
    if (id === currentUserId && dto.isActive === false) {
      throw new BadRequestException(
        'Vous ne pouvez pas vous désactiver vous-même',
      );
    }

    // Empêcher auto-rétrogradation si ADMIN
    if (
      id === currentUserId &&
      user.role === UserRole.ADMIN &&
      dto.role !== undefined &&
      dto.role !== UserRole.ADMIN
    ) {
      throw new BadRequestException(
        'Vous ne pouvez pas modifier votre propre rôle',
      );
    }

    // Empêcher de laisser la boutique sans ADMIN actif
    if (
      (dto.role !== undefined &&
        dto.role !== UserRole.ADMIN &&
        user.role === UserRole.ADMIN) ||
      (dto.isActive === false && user.role === UserRole.ADMIN && user.isActive)
    ) {
      const activeAdminsCount = await this.prisma.user.count({
        where: { tenantId, role: UserRole.ADMIN, isActive: true },
      });
      // Si on désactive ou rétrograde le seul ADMIN actif
      if (
        activeAdminsCount === 1 &&
        user.role === UserRole.ADMIN &&
        user.isActive
      ) {
        throw new BadRequestException(
          'Impossible de désactiver ou rétrograder le dernier administrateur actif',
        );
      }
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

  // --- Méthode interne: trouver un user par id/tenant --------------------------
  async findById(tenantId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, tenantId },
      select: userSelect,
    });
    if (!user) throw new NotFoundException('Utilisateur non trouvé');
    return user;
  }
}
