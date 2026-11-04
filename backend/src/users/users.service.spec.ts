import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              count: jest.fn(),
            },
            tenant: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  describe('create', () => {
    it('should reject SUPER_ADMIN role assignment', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'Password123!',
        role: UserRole.SUPER_ADMIN,
      };

      await expect(service.create('tenant-id', dto)).rejects.toThrow(ForbiddenException);
      await expect(service.create('tenant-id', dto)).rejects.toThrow(
        'Le rôle SUPER_ADMIN ne peut pas être attribué depuis une boutique',
      );
    });

    it('should reject creation when maxUsers limit is reached', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'Password123!',
        role: UserRole.EMPLOYEE,
      };

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.tenant, 'findUnique').mockResolvedValue({ id: 'tenant-id', maxUsers: 5 } as any);
      jest.spyOn(prisma.user, 'count').mockResolvedValue(5);

      await expect(service.create('tenant-id', dto)).rejects.toThrow(BadRequestException);
      await expect(service.create('tenant-id', dto)).rejects.toThrow(
        "Limite d'utilisateurs atteinte (5). Passez à un plan supérieur.",
      );
    });

    it('should allow creation when under maxUsers limit', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'Password123!',
        role: UserRole.EMPLOYEE,
      };

      const mockUser = {
        id: 'user-id',
        tenantId: 'tenant-id',
        email: 'test@example.com',
        role: UserRole.EMPLOYEE,
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);
      jest.spyOn(prisma.tenant, 'findUnique').mockResolvedValue({ id: 'tenant-id', maxUsers: 5 } as any);
      jest.spyOn(prisma.user, 'count').mockResolvedValue(3);
      jest.spyOn(prisma.user, 'create').mockResolvedValue(mockUser as any);

      const result = await service.create('tenant-id', dto);
      expect(result.email).toBe('test@example.com');
    });
  });

  describe('update', () => {
    it('should reject SUPER_ADMIN role assignment', async () => {
      const dto = { role: UserRole.SUPER_ADMIN };
      const mockUser = {
        id: 'user-id',
        tenantId: 'tenant-id',
        email: 'test@example.com',
        role: UserRole.ADMIN,
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);

      await expect(service.update('tenant-id', 'user-id', dto, 'current-user-id')).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.update('tenant-id', 'user-id', dto, 'current-user-id')).rejects.toThrow(
        'Le rôle SUPER_ADMIN ne peut pas être attribué depuis une boutique',
      );
    });

    it('should reject self-deactivation', async () => {
      const dto = { isActive: false };
      const mockUser = {
        id: 'user-id',
        tenantId: 'tenant-id',
        email: 'test@example.com',
        role: UserRole.ADMIN,
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);

      await expect(service.update('tenant-id', 'user-id', dto, 'user-id')).rejects.toThrow(BadRequestException);
      await expect(service.update('tenant-id', 'user-id', dto, 'user-id')).rejects.toThrow(
        'Vous ne pouvez pas vous désactiver vous-même',
      );
    });

    it('should reject self-demotion for ADMIN', async () => {
      const dto = { role: UserRole.EMPLOYEE };
      const mockUser = {
        id: 'user-id',
        tenantId: 'tenant-id',
        email: 'test@example.com',
        role: UserRole.ADMIN,
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);

      await expect(service.update('tenant-id', 'user-id', dto, 'user-id')).rejects.toThrow(BadRequestException);
      await expect(service.update('tenant-id', 'user-id', dto, 'user-id')).rejects.toThrow(
        'Vous ne pouvez pas modifier votre propre rôle',
      );
    });

    it('should reject deactivation of last active ADMIN', async () => {
      const dto = { isActive: false };
      const mockUser = {
        id: 'user-id',
        tenantId: 'tenant-id',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.user, 'count').mockResolvedValue(1); // Only 1 active ADMIN

      await expect(service.update('tenant-id', 'user-id', dto, 'other-user-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('tenant-id', 'user-id', dto, 'other-user-id')).rejects.toThrow(
        'Impossible de désactiver ou rétrograder le dernier administrateur actif',
      );
    });

    it('should reject demotion of last active ADMIN', async () => {
      const dto = { role: UserRole.EMPLOYEE };
      const mockUser = {
        id: 'user-id',
        tenantId: 'tenant-id',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.user, 'count').mockResolvedValue(1); // Only 1 active ADMIN

      await expect(service.update('tenant-id', 'user-id', dto, 'other-user-id')).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.update('tenant-id', 'user-id', dto, 'other-user-id')).rejects.toThrow(
        'Impossible de désactiver ou rétrograder le dernier administrateur actif',
      );
    });

    it('should allow deactivation of ADMIN when multiple active ADMINs exist', async () => {
      const dto = { isActive: false };
      const mockUser = {
        id: 'user-id',
        tenantId: 'tenant-id',
        email: 'admin@example.com',
        role: UserRole.ADMIN,
        isActive: true,
        isVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(prisma.user, 'findFirst').mockResolvedValue(mockUser as any);
      jest.spyOn(prisma.user, 'count').mockResolvedValue(2); // 2 active ADMINs
      jest.spyOn(prisma.user, 'update').mockResolvedValue({ ...mockUser, isActive: false } as any);

      const result = await service.update('tenant-id', 'user-id', dto, 'other-user-id');
      expect(result.isActive).toBe(false);
    });
  });
});
