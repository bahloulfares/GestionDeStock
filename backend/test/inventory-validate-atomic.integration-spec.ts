import { IntegrationTestHelper } from './helpers/integration-test.helper';
import { ConflictException } from '@nestjs/common';

describe('B6 - inventory.validate() atomic double-click protection', () => {
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

  it('should handle concurrent validate calls on SAME inventory session - only one succeeds', async () => {
    let correctBehaviorCount = 0;

    for (let attempt = 0; attempt < 20; attempt++) {
      const tenant = await helper.createTestTenant(`Shop ${attempt}`);
      const admin = await helper.createTestAdmin(tenant.id, `admin${attempt}@test.com`);
      const category = await helper.createTestCategory(tenant.id, `Cat ${attempt}`);
      const product = await helper.createTestProduct(tenant.id, category.id, {
        name: `Product ${attempt}`,
        reference: `REF-${Date.now()}-${attempt}`,
        qty: 100,
        priceSell: 100,
        priceBuy: 50,
      });

      // Create ONE DRAFT inventory session
      const session = await helper.prisma.inventorySession.create({
        data: {
          tenantId: tenant.id,
          createdBy: admin.id,
          status: 'DRAFT',
          items: {
            create: [{
              productId: product.id,
              qtySystem: 100,
              qtyPhysical: 95,
              difference: -5,
            }],
          },
        },
      });

      // Double-click: validate SAME session TWICE concurrently
      const results = await Promise.allSettled([
        helper.inventoryService.validate(tenant.id, admin.id, session.id),
        helper.inventoryService.validate(tenant.id, admin.id, session.id),
      ]);

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (succeeded === 1 && failed === 1) {
        const rejection = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
        
        if (rejection.reason instanceof ConflictException) {
          const finalProduct = await helper.prisma.product.findUnique({ where: { id: product.id } });
          const finalSession = await helper.prisma.inventorySession.findUnique({ where: { id: session.id } });

          // Stock should be 100 - 5 = 95 (ONE adjustment only)
          // Status should be VALIDATED
          if (finalProduct?.qty === 95 && finalSession?.status === 'VALIDATED') {
            correctBehaviorCount++;
          }
        }
      }
    }

    console.log(`\n?? Comportement correct: ${correctBehaviorCount}/20 essais`);
    expect(correctBehaviorCount).toBe(20);
  }, 120000);
});
