import { IntegrationTestHelper } from './helpers/integration-test.helper';
import { ConflictException } from '@nestjs/common';

describe('B1 - Atomic status transitions with REAL services (integration)', () => {
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

  describe('sales.cancel() - deterministic race condition test', () => {
    it('should detect race condition over 30 attempts', async () => {
      let raceConditionDetected = false;
      let totalAttempts = 0;
      let atomicSuccesses = 0;

      // Run 30 attempts to force race condition detection
      for (let i = 0; i < 30; i++) {
        totalAttempts++;

        // Setup fresh data for each attempt
        const tenant = await helper.createTestTenant(`Shop ${i}`);
        const admin = await helper.createTestAdmin(tenant.id, `admin${i}@test.com`);
        const category = await helper.createTestCategory(tenant.id, `Category ${i}`);
        const product = await helper.createTestProduct(tenant.id, category.id, {
          name: `Product ${i}`,
          reference: `REF-${Date.now()}-${i}`,
          qty: 100,
          priceSell: 100,
          priceBuy: 50,
        });

        // Create a sale using the REAL service
        const sale = await helper.salesService.create(tenant.id, admin.id, {
          paymentMethod: 'CASH',
          notes: undefined,
          items: [{ productId: product.id, qty: 2, priceSell: 100 }],
        });

        // Check product stock after sale
        const productAfterSale = await helper.prisma.product.findUnique({ where: { id: product.id } });
        expect(productAfterSale?.qty).toBe(98); // 100 - 2

        // Concurrent cancellations using REAL service
        const results = await Promise.allSettled([
          helper.salesService.cancel(tenant.id, admin.id, sale.id, { reason: `Test 1-${i}` }),
          helper.salesService.cancel(tenant.id, admin.id, sale.id, { reason: `Test 2-${i}` }),
        ]);

        // Check results
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        if (succeeded === 1 && failed === 1) {
          atomicSuccesses++;
          
          // Verify the rejection is ConflictException
          const rejection = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
          expect(rejection.reason).toBeInstanceOf(ConflictException);

          // Verify final state
          const finalSale = await helper.prisma.sale.findUnique({ where: { id: sale.id } });
          expect(finalSale?.status).toBe('CANCELLED');

          // Verify stock was restored only once (atomic behavior)
          const finalProduct = await helper.prisma.product.findUnique({ where: { id: product.id } });
          expect(finalProduct?.qty).toBe(100); // 98 + 2 (one cancellation)
        } else {
          // Race condition detected (both succeeded or both failed)
          raceConditionDetected = true;
          console.log(`❌ Race condition at attempt ${i + 1}: succeeded=${succeeded}, failed=${failed}`);
          
          if (succeeded === 2) {
            // Both cancellations succeeded - check if stock is corrupted
            const finalProduct = await helper.prisma.product.findUnique({ where: { id: product.id } });
            console.log(`   Stock after double cancellation: ${finalProduct?.qty} (expected: 100, would be 102 if race)`);
          }
        }
      }

      console.log(`\n📊 Test de contrôle sur ${totalAttempts} essais:`);
      console.log(`   ✅ Comportement atomique: ${atomicSuccesses}/${totalAttempts}`);
      console.log(`   ❌ Race condition détectée: ${raceConditionDetected ? 'OUI' : 'NON'}`);

      // With atomic code, ALL attempts should succeed (1 success, 1 conflict)
      // With non-atomic code, at least ONE attempt should show race condition
      expect(atomicSuccesses).toBe(30);
      expect(raceConditionDetected).toBe(false);
    }, 180000); // 3 minutes timeout
  });

  describe('sales.create() - concurrent sales of last item', () => {
    it('should allow only one sale when qty=1 over multiple attempts', async () => {
      let atomicSuccesses = 0;

      // Run 10 attempts
      for (let i = 0; i < 10; i++) {
        const tenant = await helper.createTestTenant(`Shop ${i}`);
        const admin = await helper.createTestAdmin(tenant.id, `admin${i}@test.com`);
        const category = await helper.createTestCategory(tenant.id, `Category ${i}`);
        const product = await helper.createTestProduct(tenant.id, category.id, {
          name: `Product ${i}`,
          reference: `REF-${Date.now()}-${i}`,
          qty: 1, // Only one item left
          priceSell: 100,
          priceBuy: 50,
        });

        // Two concurrent sales using REAL service
        const results = await Promise.allSettled([
          helper.salesService.create(tenant.id, admin.id, {
            paymentMethod: 'CASH',
            notes: undefined,
            items: [{ productId: product.id, qty: 1, priceSell: 100 }],
          }),
          helper.salesService.create(tenant.id, admin.id, {
            paymentMethod: 'CASH',
            notes: undefined,
            items: [{ productId: product.id, qty: 1, priceSell: 100 }],
          }),
        ]);

        // One should succeed, one should fail
        const succeeded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        if (succeeded === 1 && failed === 1) {
          atomicSuccesses++;

          // Check final stock
          const finalProduct = await helper.prisma.product.findUnique({ where: { id: product.id } });
          expect(finalProduct?.qty).toBe(0);

          // Check only one sale was created
          const salesCount = await helper.prisma.sale.count({ where: { tenantId: tenant.id } });
          expect(salesCount).toBe(1);
        }
      }

      console.log(`\n📊 Test create() sur 10 essais: ${atomicSuccesses}/10 atomiques`);
      expect(atomicSuccesses).toBe(10);
    }, 120000); // 2 minutes timeout
  });
});