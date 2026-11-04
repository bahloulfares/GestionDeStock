import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';

describe('AuthService.setup', () => {
  let service: AuthService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      user: { count: jest.fn(), create: jest.fn() },
      tenant: { create: jest.fn() },
      tokenStore: { create: jest.fn() },
      $transaction: jest.fn((fn) => fn(prisma)),
    };
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue('tok') },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue('15m') },
        },
        { provide: MailService, useValue: { sendMail: jest.fn() } },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('409 si SUPER_ADMIN existe deja', async () => {
    prisma.user.count.mockResolvedValue(1);
    await expect(
      service.setup({
        shopName: 'S',
        email: 'a@a.com',
        password: 'P@ss123',
      } as any),
    ).rejects.toThrow(ConflictException);
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { role: 'SUPER_ADMIN' },
    });
  });

  it('201 si aucun SUPER_ADMIN', async () => {
    prisma.user.count.mockResolvedValue(0);
    prisma.tenant.create.mockResolvedValue({ id: 't1', name: 'S' });
    prisma.user.create.mockResolvedValue({ id: 'u1', email: 'a@a.com' });
    const res = await service.setup({
      shopName: 'S',
      email: 'a@a.com',
      password: 'P@ss123',
      phone: null,
    } as any);
    expect(res.message).toMatch(/configur/i);
  });
});
