import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://mvp_user:mvp_secret_2026@localhost:5433/mvp_test?schema=public';

export class IntegrationTestHelper {
  private pool: Pool;
  public prisma: PrismaClient;

  constructor() {
    this.pool = new Pool({ connectionString: DATABASE_URL });
    const adapter = new PrismaPg(this.pool);
    this.prisma = new PrismaClient({ adapter });
  }

  async cleanup() {
    // Clean all tables in reverse dependency order
    await this.prisma.activityLog.deleteMany();
    await this.prisma.inventoryItem.deleteMany();
    await this.prisma.inventorySession.deleteMany();
    await this.prisma.saleReturnItem.deleteMany();
    await this.prisma.saleReturn.deleteMany();
    await this.prisma.saleItem.deleteMany();
    await this.prisma.sale.deleteMany();
    await this.prisma.purchaseItem.deleteMany();
    await this.prisma.purchaseOrder.deleteMany();
    await this.prisma.product.deleteMany();
    await this.prisma.category.deleteMany();
    await this.prisma.supplier.deleteMany();
    await this.prisma.tokenStore.deleteMany();
    await this.prisma.user.deleteMany();
    await this.prisma.tenantPayment.deleteMany();
    await this.prisma.tenant.deleteMany();
  }

  async disconnect() {
    await this.prisma.$disconnect();
    await this.pool.end();
  }

  async createTestTenant(name: string = 'Test Shop') {
    const tenant = await this.prisma.tenant.create({
      data: {
        name,
        email: `${name.toLowerCase().replace(/\s+/g, '-')}@test.com`,
        phone: '+21612345678',
        plan: 'TRIAL',
        status: 'ACTIVE',
        subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        maxUsers: 10,
      },
    });
    return tenant;
  }

  async createTestAdmin(tenantId: string, email: string = 'admin@test.com') {
    const passwordHash = await bcrypt.hash('Password123!', 12);
    const admin = await this.prisma.user.create({
      data: {
        tenantId,
        email,
        passwordHash,
        role: 'ADMIN',
        isActive: true,
        isVerified: true,
      },
    });
    return admin;
  }

  async createTestEmployee(tenantId: string, email: string = 'employee@test.com') {
    const passwordHash = await bcrypt.hash('Password123!', 12);
    const employee = await this.prisma.user.create({
      data: {
        tenantId,
        email,
        passwordHash,
        role: 'EMPLOYEE',
        isActive: true,
        isVerified: true,
      },
    });
    return employee;
  }

  async createTestCategory(tenantId: string, name: string = 'Test Category') {
    const category = await this.prisma.category.create({
      data: {
        tenantId,
        name,
      },
    });
    return category;
  }

  async createTestProduct(
    tenantId: string,
    categoryId: string,
    overrides: Partial<{
      name: string;
      reference: string;
      priceSell: number;
      priceBuy: number;
      qty: number;
      minStock: number;
    }> = {},
  ) {
    const product = await this.prisma.product.create({
      data: {
        tenantId,
        categoryId,
        name: overrides.name || 'Test Product',
        reference: overrides.reference || `REF-${Date.now()}`,
        priceSell: overrides.priceSell || 100,
        priceBuy: overrides.priceBuy !== undefined ? overrides.priceBuy : 50,
        qty: overrides.qty !== undefined ? overrides.qty : 10,
        minStock: overrides.minStock || 5,
      },
    });
    return product;
  }
}
