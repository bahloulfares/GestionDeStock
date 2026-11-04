import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';

describe('SUPER_ADMIN email uniqueness (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    app = moduleFixture.createNestApplication();
    await app.init();

    // Cleanup test data
    await prisma.user.deleteMany({
      where: {
        email: { startsWith: 'test-super-e2e' },
        role: 'SUPER_ADMIN',
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    await prisma.user.deleteMany({
      where: {
        email: { startsWith: 'test-super-e2e' },
        role: 'SUPER_ADMIN',
      },
    });
    await app.close();
  });

  it('should reject duplicate SUPER_ADMIN email via PostgreSQL constraint', async () => {
    const email = 'test-super-e2e-duplicate@example.com';
    const passwordHash = await bcrypt.hash('Password123!', 12);

    // First creation succeeds
    const first = await prisma.user.create({
      data: {
        tenantId: null,
        email,
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
        isVerified: true,
      },
    });

    expect(first.email).toBe(email);

    // Second creation with same email must fail
    await expect(
      prisma.user.create({
        data: {
          tenantId: null,
          email,
          passwordHash,
          role: 'SUPER_ADMIN',
          isActive: true,
          isVerified: true,
        },
      }),
    ).rejects.toThrow();
  });
});
