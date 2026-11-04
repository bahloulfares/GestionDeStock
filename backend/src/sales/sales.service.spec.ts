import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SalesService } from './sales.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { PdfService } from '../pdf/pdf.service';

function buildPrisma(overrides: any = {}) {
  const tx = {
    sale: {
      create: jest
        .fn()
        .mockResolvedValue({ id: 's1', items: [], createdByUser: {} }),
    },
    $executeRaw: jest.fn().mockResolvedValue(1),
    product: { findFirst: jest.fn(), update: jest.fn() },
  };
  return {
    product: { findFirst: jest.fn() },
    sale: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn(tx)),
    _tx: tx,
    ...overrides,
  };
}

describe('SalesService.create', () => {
  let service: SalesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = buildPrisma();
    const module = await Test.createTestingModule({
      providers: [
        SalesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityLogsService, useValue: { log: jest.fn() } },
        { provide: PdfService, useValue: {} },
      ],
    }).compile();
    service = module.get(SalesService);
  });

  it('leve NotFoundException si produit introuvable', async () => {
    prisma.product.findFirst.mockResolvedValue(null);
    await expect(
      service.create('t1', 'u1', {
        paymentMethod: 'CASH',
        items: [{ productId: 'p1', qty: 1, priceSell: 10 }],
      } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('leve BadRequestException si priceBuy est null', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 'p1',
      name: 'Prod',
      priceBuy: null,
      qty: 10,
      isActive: true,
    });
    await expect(
      service.create('t1', 'u1', {
        paymentMethod: 'CASH',
        items: [{ productId: 'p1', qty: 1, priceSell: 10 }],
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('stock insuffisant : BadRequestException si executeRaw retourne 0', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 'p1',
      name: 'Prod',
      priceBuy: 5,
      qty: 3,
      isActive: true,
    });
    prisma._tx.$executeRaw.mockResolvedValue(0);
    prisma._tx.product.findFirst.mockResolvedValue({ name: 'Prod', qty: 0 });
    await expect(
      service.create('t1', 'u1', {
        paymentMethod: 'CASH',
        items: [{ productId: 'p1', qty: 5, priceSell: 10 }],
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('stocke costPriceAtSale depuis priceBuy du produit', async () => {
    const priceBuy = { toFixed: () => '7.500', toString: () => '7.5' };
    prisma.product.findFirst.mockResolvedValue({
      id: 'p1',
      name: 'Prod',
      priceBuy,
      qty: 10,
      isActive: true,
    });
    prisma._tx.$executeRaw.mockResolvedValue(1);
    prisma._tx.sale.create.mockResolvedValue({
      id: 's1',
      tenantId: 't1',
      date: new Date(),
      total: 10,
      paymentMethod: 'CASH',
      status: 'COMPLETED',
      notes: null,
      cancelReason: null,
      createdBy: 'u1',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdByUser: { email: 'a@a.com' },
      items: [
        {
          id: 'i1',
          productId: 'p1',
          qty: 1,
          priceSell: 10,
          costPriceAtSale: priceBuy,
          product: { name: 'Prod' },
        },
      ],
    });
    await service.create('t1', 'u1', {
      paymentMethod: 'CASH',
      items: [{ productId: 'p1', qty: 1, priceSell: 10 }],
    } as any);
    const callArgs = prisma._tx.sale.create.mock.calls[0][0];
    expect(callArgs.data.items.create[0].costPriceAtSale).toBe(priceBuy);
  });

  it('isolation : refus si produit appartient a un autre tenant', async () => {
    prisma.product.findFirst.mockResolvedValue(null); // findFirst filtre par tenantId
    await expect(
      service.create('t1', 'u1', {
        paymentMethod: 'CASH',
        items: [{ productId: 'p-autre-tenant', qty: 1, priceSell: 10 }],
      } as any),
    ).rejects.toThrow(NotFoundException);
  });
});
