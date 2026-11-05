import { IntegrationTestHelper } from './helpers/integration-test.helper';
import * as bcrypt from 'bcrypt';

describe('SUPER_ADMIN email uniqueness (integration)', () => {
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

  it('should allow creating first SUPER_ADMIN with unique email', async () => {
    const email = 'super-admin-unique@test.com';
    const passwordHash = await bcrypt.hash('Password123!', 12);

    const user = await helper.prisma.user.create({
      data: {
        tenantId: null,
        email,
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
        isVerified: true,
      },
    });

    expect(user.email).toBe(email);
    expect(user.role).toBe('SUPER_ADMIN');
    expect(user.tenantId).toBeNull();
  });

  it('should reject duplicate SUPER_ADMIN email via PostgreSQL constraint', async () => {
    const email = 'super-admin-duplicate@test.com';
    const passwordHash = await bcrypt.hash('Password123!', 12);

    // First creation succeeds
    await helper.prisma.user.create({
      data: {
        tenantId: null,
        email,
        passwordHash,
        role: 'SUPER_ADMIN',
        isActive: true,
        isVerified: true,
      },
    });

    // Second creation with same email must fail
    await expect(
      helper.prisma.user.create({
        data: {
          tenantId: null,
          email,
          passwordHash,
          role: 'SUPER_ADMIN',
          isActive: true,
          isVerified: true,
        },
      }),
    ).rejects.toThrow();
  });
});
