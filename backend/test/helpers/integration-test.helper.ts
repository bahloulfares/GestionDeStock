import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import { ActivityLogsService } from '../../src/activity-logs/activity-logs.service';
import { SalesService } from '../../src/sales/sales.service';
import { PdfService } from '../../src/pdf/pdf.service';
import { ReturnsService } from '../../src/returns/returns.service';
import { PurchasesService } from '../../src/purchases/purchases.service';
import { InventoryService } from '../../src/inventory/inventory.service';

const DATABASE_URL = process.env.DATABASE_URL_TEST || process.env.DATABASE_URL || 'postgresql://mvp_user:mvp_secret_2026@localhost:5433/mvp_test?schema=public';

export class IntegrationTestHelper {
  private pool: Pool;
  public prisma: PrismaClient;
  public salesService!: SalesService;
  public returnsService!: ReturnsService;
  public purchasesService!: PurchasesService;
  public inventoryService!: InventoryService;

  constructor() {
    // Garde-fou: vérifier que la base est bien une base de test
    const dbName = this.extractDatabaseName(DATABASE_URL);
    if (!dbName.endsWith('_test') && dbName !== 'mvp_test') {
      throw new Error(
        'SECURITE: Refus d executer sur la base "' + dbName + '". Seules les bases se terminant par "_test" ou nommees "mvp_test" sont autorisees.'
      );
    }
    this.pool = new Pool({ connectionString: DATABASE_URL });
    const adapter = new PrismaPg(this.pool);
    this.prisma = new PrismaClient({ adapter });
  }

  private extractDatabaseName(url: string): string {
    const match = url.match(/\/([^/?]+)(\?|$)/);
    return match ? match[1] : '';
  }

  async initializeServices() {
    const activityLogsService = new ActivityLogsService(this.prisma as any);
    const pdfService = new PdfService();
    
    this.salesService = new SalesService(this.prisma as any, activityLogsService, pdfService);
    this.returnsService = new ReturnsService(this.prisma as any, activityLogsService);
    this.purchasesService = new PurchasesService(this.prisma as any, activityLogsService, pdfService);
    this.inventoryService = new InventoryService(this.prisma as any, activityLogsService);
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
    const passwordHash = await bcrypt.hash(process.env.TEST_PASSWORD || 'CHANGE_ME_TestPass123!', 12);
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
    const passwordHash = await bcrypt.hash(process.env.TEST_PASSWORD || 'CHANGE_ME_TestPass123!', 12);
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
