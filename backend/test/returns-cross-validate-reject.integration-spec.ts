import { IntegrationTestHelper } from './helpers/integration-test.helper';
import { ConflictException } from '@nestjs/common';

describe('B2/B3 - returns cross-test: validate vs reject', () => {
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

  it('validate and reject in parallel on SAME return - only one wins', async () => {
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

      const sale = await helper.salesService.create(tenant.id, admin.id, {
        paymentMethod: 'CASH',
        notes: undefined,
        items: [{ productId: product.id, qty: 10, priceSell: 100 }],
      });

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

      // Run validate and reject concurrently on SAME return
      const results = await Promise.allSettled([
        helper.returnsService.validate(tenant.id, admin.id, saleReturn.id),
        helper.returnsService.reject(tenant.id, admin.id, saleReturn.id),
      ]);

      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      if (succeeded === 1 && failed === 1) {
        const rejection = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
        
        if (rejection.reason instanceof ConflictException) {
          const finalProduct = await helper.prisma.product.findUnique({ where: { id: product.id } });
          const finalReturn = await helper.prisma.saleReturn.findUnique({ where: { id: saleReturn.id } });

          // Check final state is consistent
          // If COMPLETED: stock should be 90 + 5 = 95
          // If REJECTED: stock should be 90 (no change)
          const stockCorrect = 
            (finalReturn?.status === 'COMPLETED' && finalProduct?.qty === 95) ||
            (finalReturn?.status === 'REJECTED' && finalProduct?.qty === 90);

          if (stockCorrect) {
            correctBehaviorCount++;
          }
        }
      }
    }

    console.log(`\n?? Comportement correct: ${correctBehaviorCount}/20 essais`);
    expect(correctBehaviorCount).toBe(20);
  }, 120000);
});
