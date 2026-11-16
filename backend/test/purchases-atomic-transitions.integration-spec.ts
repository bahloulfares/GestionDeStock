import { IntegrationTestHelper } from './helpers/integration-test.helper';

describe('B4 - purchases.validate() atomic transitions (integration)', () => {
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

  describe('purchases.validate() - concurrent validations', () => {
    it('should increment stock atomically when two purchase orders validated concurrently', async () => {
      let atomicSuccesses = 0;

      for (let attempt = 0; attempt < 10; attempt++) {
        // Setup fresh data
        const tenant = await helper.createTestTenant(`Shop ${attempt}`);
        const admin = await helper.createTestAdmin(tenant.id, `admin${attempt}@test.com`);
        const category = await helper.createTestCategory(tenant.id, `Category ${attempt}`);
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

        // Create two DRAFT purchase orders
        const po1 = await helper.prisma.purchaseOrder.create({
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

        const po2 = await helper.prisma.purchaseOrder.create({
          data: {
            tenantId: tenant.id,
            supplierId: supplier.id,
            createdBy: admin.id,
            status: 'DRAFT',
            items: {
              create: [{
                productId: product.id,
                qty: 8,
                priceBuy: 50,
              }],
            },
          },
        });

        // Concurrent validations
        await Promise.all([
          helper.purchasesService.validate(tenant.id, admin.id, po1.id),
          helper.purchasesService.validate(tenant.id, admin.id, po2.id),
        ]);

        // Check final stock: 50 + 10 + 8 = 68
        const finalProduct = await helper.prisma.product.findUnique({
          where: { id: product.id },
        });

        if (finalProduct?.qty === 68) {
          atomicSuccesses++;
        }
      }

      console.log(`\n?? Test validate() sur 10 essais: ${atomicSuccesses}/10 atomiques`);
      expect(atomicSuccesses).toBe(10);
    }, 120000);
  });
});
