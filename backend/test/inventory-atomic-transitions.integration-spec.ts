import { IntegrationTestHelper } from './helpers/integration-test.helper';

describe('B6 - inventory.validate() atomic transitions (integration)', () => {
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

  describe('inventory.validate() - concurrent validations', () => {
    it('should adjust stock atomically when two inventory sessions validated concurrently', async () => {
      let atomicSuccesses = 0;

      for (let attempt = 0; attempt < 10; attempt++) {
        // Setup fresh data
        const tenant = await helper.createTestTenant(`Shop ${attempt}`);
        const admin = await helper.createTestAdmin(tenant.id, `admin${attempt}@test.com`);
        const category = await helper.createTestCategory(tenant.id, `Category ${attempt}`);
        const product = await helper.createTestProduct(tenant.id, category.id, {
          name: `Product ${attempt}`,
          reference: `REF-${Date.now()}-${attempt}`,
          qty: 100,
          priceSell: 100,
          priceBuy: 50,
        });

        // Create two DRAFT inventory sessions with adjustments
        const session1 = await helper.prisma.inventorySession.create({
          data: {
            tenantId: tenant.id,
            createdBy: admin.id,
            status: 'DRAFT',
            items: {
              create: [{
                productId: product.id,
                qtySystem: 100,
                qtyPhysical: 95, // -5
                difference: -5,
              }],
            },
          },
        });

        const session2 = await helper.prisma.inventorySession.create({
          data: {
            tenantId: tenant.id,
            createdBy: admin.id,
            status: 'DRAFT',
            items: {
              create: [{
                productId: product.id,
                qtySystem: 95,
                qtyPhysical: 92, // -3
                difference: -3,
              }],
            },
          },
        });

        // Concurrent validations
        await Promise.all([
          helper.inventoryService.validate(tenant.id, admin.id, session1.id),
          helper.inventoryService.validate(tenant.id, admin.id, session2.id),
        ]);

        // Check final stock: 100 - 5 - 3 = 92
        const finalProduct = await helper.prisma.product.findUnique({
          where: { id: product.id },
        });

        if (finalProduct?.qty === 92) {
          atomicSuccesses++;
        }
      }

      console.log(`\n?? Test validate() sur 10 essais: ${atomicSuccesses}/10 atomiques`);
      expect(atomicSuccesses).toBe(10);
    }, 120000);
  });
});
