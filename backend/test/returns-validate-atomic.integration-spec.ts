import { IntegrationTestHelper } from './helpers/integration-test.helper';
import { ConflictException } from '@nestjs/common';

describe('B2 - returns.validate() atomic double-click protection', () => {
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

  it('should handle concurrent validate calls on SAME return - only one succeeds', async () => {
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

      // Create sale
      const sale = await helper.salesService.create(tenant.id, admin.id, {
        paymentMethod: 'CASH',
        notes: undefined,
        items: [{ productId: product.id, qty: 10, priceSell: 100 }],
      });

      const productAfterSale = await helper.prisma.product.findUnique({ where: { id: product.id } });
      expect(productAfterSale?.qty).toBe(90);

      // Create ONE PENDING return
      const saleReturn = await helper.prisma.saleReturn.create({
        data: {
          tenantId: tenant.id,
          saleId: sale.id,
          createdBy: admin.id,
          status: 'PENDING',
          items: {
            create: [{
              productId: product.id,
              qty: 5,
              reason: 'BROKEN',
              returnToStock: true,
            }],
          },
        },
      });

      // Double-click: validate SAME return TWICE concurrently
      const results = await Promise.allSettled([
        helper.returnsService.validate(tenant.id, admin.id, saleReturn.id),
        helper.returnsService.validate(tenant.id, admin.id, saleReturn.id),
      ]);

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      // Check: exactly ONE success, ONE failure
      if (succeeded === 1 && failed === 1) {
        const rejection = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
        
        // Must be ConflictException
        if (rejection.reason instanceof ConflictException) {
          // Check final state
          const finalProduct = await helper.prisma.product.findUnique({ where: { id: product.id } });
          const finalReturn = await helper.prisma.saleReturn.findUnique({ where: { id: saleReturn.id } });

          // Stock should be 90 + 5 = 95 (ONE increment only)
          // Status should be COMPLETED
          if (finalProduct?.qty === 95 && finalReturn?.status === 'COMPLETED') {
            correctBehaviorCount++;
          }
        }
      }
    }

    console.log(`\n?? Comportement correct: ${correctBehaviorCount}/20 essais`);
    expect(correctBehaviorCount).toBe(20);
  }, 120000);
});
