import { IntegrationTestHelper } from './helpers/integration-test.helper';

describe('B2 - returns.validate() atomic transitions (integration)', () => {
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

  describe('returns.validate() - concurrent validations', () => {
    it('should increment stock atomically when two returns validated concurrently', async () => {
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

        // Create a sale first
        const sale = await helper.salesService.create(tenant.id, admin.id, {
          paymentMethod: 'CASH',
          notes: undefined,
          items: [{ productId: product.id, qty: 10, priceSell: 100 }],
        });

        // Verify stock decreased
        const productAfterSale = await helper.prisma.product.findUnique({ where: { id: product.id } });
        expect(productAfterSale?.qty).toBe(40); // 50 - 10

        // Create two PENDING returns
        const return1 = await helper.prisma.saleReturn.create({
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

        const return2 = await helper.prisma.saleReturn.create({
          data: {
            tenantId: tenant.id,
            saleId: sale.id,
            createdBy: admin.id,
            status: 'PENDING',
            items: {
              create: [{
                productId: product.id,
                qty: 3,
                reason: 'WRONG_ITEM',
                returnToStock: true,
              }],
            },
          },
        });

        // Concurrent validations
        await Promise.all([
          helper.returnsService.validate(tenant.id, admin.id, return1.id),
          helper.returnsService.validate(tenant.id, admin.id, return2.id),
        ]);

        // Check final stock: 40 + 5 + 3 = 48
        const finalProduct = await helper.prisma.product.findUnique({
          where: { id: product.id },
        });

        if (finalProduct?.qty === 48) {
          atomicSuccesses++;
        }
      }

      console.log(`\n?? Test validate() sur 10 essais: ${atomicSuccesses}/10 atomiques`);
      expect(atomicSuccesses).toBe(10);
    }, 120000);
  });
});
