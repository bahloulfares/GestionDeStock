import { IntegrationTestHelper } from './helpers/integration-test.helper';
import { ConflictException } from '@nestjs/common';

describe('B4 - purchases.validate() atomic double-click protection', () => {
  let helper: IntegrationTestHelper;

  beforeAll(async () => {
    helper = new IntegrationTestHelper();
    await helper.initializeServices();
  });

  beforeEach(async () => {
    await helper.cleanup();
  });

  afterAll(async () => {
    await helper.cleanup();
    await helper.disconnect();
  });

  it('should handle concurrent validate calls on SAME purchase - only one succeeds', async () => {
    let correctBehaviorCount = 0;

    for (let attempt = 0; attempt < 20; attempt++) {
      const tenant = await helper.createTestTenant(`Shop ${attempt}`);
      const admin = await helper.createTestAdmin(tenant.id, `admin${attempt}@test.com`);
      const category = await helper.createTestCategory(tenant.id, `Cat ${attempt}`);
      const product = await helper.createTestProduct(tenant.id, category.id, {
        name: `Product ${attempt}`,
        reference: `REF-${Date.now()}-${attempt}`,
        qty: 50,
        priceSell: 100,
        priceBuy: 50,
      });

      const supplier = await helper.prisma.supplier.create({
        data: {
          tenantId: tenant.id,
          name: `Supplier ${attempt}`,
          phone: '+21612345678',
          email: `supplier${attempt}@test.com`,
        },
      });

      // Create ONE DRAFT purchase order
      const po = await helper.prisma.purchaseOrder.create({
        data: {
          tenantId: tenant.id,
          supplierId: supplier.id,
          createdBy: admin.id,
          status: 'DRAFT',
          items: {
            create: [{
              productId: product.id,
              qty: 10,
              priceBuy: 50,
            }],
          },
        },
      });

      // Double-click: validate SAME purchase TWICE concurrently
      const results = await Promise.allSettled([
        helper.purchasesService.validate(tenant.id, admin.id, po.id),
        helper.purchasesService.validate(tenant.id, admin.id, po.id),
      ]);

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (succeeded === 1 && failed === 1) {
        const rejection = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
        
        if (rejection.reason instanceof ConflictException) {
          const finalProduct = await helper.prisma.product.findUnique({ where: { id: product.id } });
          const finalPO = await helper.prisma.purchaseOrder.findUnique({ where: { id: po.id } });

          // Stock should be 50 + 10 = 60 (ONE increment only)
          // Status should be VALIDATED
          if (finalProduct?.qty === 60 && finalPO?.status === 'VALIDATED') {
            correctBehaviorCount++;
          }
        }
      }
    }

    console.log(`\n?? Comportement correct: ${correctBehaviorCount}/20 essais`);
    expect(correctBehaviorCount).toBe(20);
  }, 120000);
});
