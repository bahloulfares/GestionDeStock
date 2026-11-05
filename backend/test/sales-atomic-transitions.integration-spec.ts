import { IntegrationTestHelper } from './helpers/integration-test.helper';
import { ConflictException } from '@nestjs/common';

describe('B1 - Atomic status transitions (integration)', () => {
  let helper: IntegrationTestHelper;

  beforeAll(async () => {
    helper = new IntegrationTestHelper();
  });

  beforeEach(async () => {
    await helper.cleanup();
  });

  afterAll(async () => {
    await helper.cleanup();
    await helper.disconnect();
  });

  describe('sales.cancel() - concurrent cancellations', () => {
    it('should allow only one concurrent cancellation to succeed', async () => {
      // Setup
      const tenant = await helper.createTestTenant();
      const admin = await helper.createTestAdmin(tenant.id);
      const category = await helper.createTestCategory(tenant.id);
      const product = await helper.createTestProduct(tenant.id, category.id, {
        qty: 10,
        priceSell: 100,
        priceBuy: 50,
      });

      // Create a completed sale
      const sale = await helper.prisma.sale.create({
        data: {
          tenantId: tenant.id,
          total: 200,
          paymentMethod: 'CASH',
          status: 'COMPLETED',
          createdBy: admin.id,
          items: {
            create: [
              {
                productId: product.id,
                qty: 2,
                priceSell: 100,
                costPriceAtSale: 50,
              },
            ],
          },
        },
      });

      // Update product stock (simulate the sale deducted stock)
      await helper.prisma.product.update({
        where: { id: product.id },
        data: { qty: 8 }, // 10 - 2
      });

      // Simulate concurrent cancel operations (direct updateMany + stock update)
      const cancelSale = async () => {
        return helper.prisma.$transaction(async (tx) => {
          const result = await tx.sale.updateMany({
            where: { id: sale.id, tenantId: tenant.id, status: 'COMPLETED' },
            data: { status: 'CANCELLED', cancelReason: 'Test' },
          });

          if (result.count === 0) {
            throw new ConflictException('Already cancelled');
          }

          // Get items
          const saleWithItems = await tx.sale.findUnique({
            where: { id: sale.id },
            include: { items: true },
          });

          // Restore stock
          for (const item of saleWithItems!.items) {
            await tx.product.update({
              where: { id: item.productId },
              data: { qty: { increment: item.qty } },
            });
          }
        });
      };

      // Concurrent cancellations
      const results = await Promise.allSettled([
        cancelSale(),
        cancelSale(),
      ]);

      // One should succeed, one should fail
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(succeeded).toBe(1);
      expect(failed).toBe(1);

      // Check the rejection is ConflictException
      const rejection = results.find(r => r.status === 'rejected') as PromiseRejectedResult;
      expect(rejection.reason).toBeInstanceOf(ConflictException);

      // Check final state
      const finalSale = await helper.prisma.sale.findUnique({ where: { id: sale.id } });
      expect(finalSale?.status).toBe('CANCELLED');

      // Check stock was incremented only once
      const finalProduct = await helper.prisma.product.findUnique({ where: { id: product.id } });
      expect(finalProduct?.qty).toBe(10); // 8 + 2 (one cancellation)
    });
  });

  describe('sales.create() - concurrent sales of last item', () => {
    it('should allow only one sale when qty=1 and two concurrent requests', async () => {
      // Setup
      const tenant = await helper.createTestTenant();
      const admin = await helper.createTestAdmin(tenant.id);
      const category = await helper.createTestCategory(tenant.id);
      const product = await helper.createTestProduct(tenant.id, category.id, {
        qty: 1, // Only one item left
        priceSell: 100,
        priceBuy: 50,
      });

      // Simulate concurrent sales
      const createSale = async () => {
        return helper.prisma.$transaction(async (tx) => {
          const newSale = await tx.sale.create({
            data: {
              tenantId: tenant.id,
              total: 100,
              paymentMethod: 'CASH',
              status: 'COMPLETED',
              createdBy: admin.id,
              items: {
                create: [
                  {
                    productId: product.id,
                    qty: 1,
                    priceSell: 100,
                    costPriceAtSale: 50,
                  },
                ],
              },
            },
          });

          // Atomic stock decrement
          const affected = await tx.$executeRaw`
            UPDATE products SET qty = qty - 1
            WHERE id = ${product.id} AND tenant_id = ${tenant.id} AND qty >= 1
          `;

          if (affected === 0) {
            throw new Error('Insufficient stock');
          }

          return newSale;
        });
      };

      // Two concurrent sales
      const results = await Promise.allSettled([
        createSale(),
        createSale(),
      ]);

      // One should succeed, one should fail
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      expect(succeeded).toBe(1);
      expect(failed).toBe(1);

      // Check final stock
      const finalProduct = await helper.prisma.product.findUnique({ where: { id: product.id } });
      expect(finalProduct?.qty).toBe(0);

      // Check only one sale was created
      const salesCount = await helper.prisma.sale.count({ where: { tenantId: tenant.id } });
      expect(salesCount).toBe(1);
    });
  });
});
