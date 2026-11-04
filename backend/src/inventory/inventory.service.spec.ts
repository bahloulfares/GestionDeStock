import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';

function buildPrisma() {
  const tx = {
    product: { findFirst: jest.fn(), update: jest.fn() },
    inventorySession: { update: jest.fn() },
  };
  return {
    product: { findFirst: jest.fn() },
    inventorySession: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    inventoryItem: {},
    $transaction: jest.fn((fn) => fn(tx)),
    _tx: tx,
  };
}

describe('InventoryService.create', () => {
  let service: InventoryService;
  let prisma: any;

  beforeEach(async () => {
    prisma = buildPrisma();
    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    service = module.get(InventoryService);
  });

  it('cree en DRAFT sans modifier les stocks', async () => {
    prisma.product.findFirst.mockResolvedValue({
      id: 'p1',
      name: 'P',
      qty: 10,
      isActive: true,
    });
    prisma.inventorySession.create.mockResolvedValue({
      id: 'sess1',
      tenantId: 't1',
      date: new Date(),
      notes: null,
      status: 'DRAFT',
      createdBy: 'u1',
      createdAt: new Date(),
      items: [],
    });
    await service.create('t1', 'u1', {
      items: [{ productId: 'p1', qtyPhysical: 10 }],
    });
    const createCall = prisma.inventorySession.create.mock.calls[0][0];
    expect(createCall.data.status).toBe('DRAFT');
    expect(prisma._tx.product.update).not.toHaveBeenCalled();
  });
});

describe('InventoryService.validate', () => {
  let service: InventoryService;
  let prisma: any;

  beforeEach(async () => {
    prisma = buildPrisma();
    const module = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityLogsService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    service = module.get(InventoryService);
  });

  it('NotFoundException si session introuvable', async () => {
    prisma.inventorySession.findFirst.mockResolvedValue(null);
    await expect(service.validate('t1', 'u1', 'bad-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('BadRequestException si deja VALIDATED', async () => {
    prisma.inventorySession.findFirst.mockResolvedValue({
      id: 's1',
      status: 'VALIDATED',
      items: [],
    });
    await expect(service.validate('t1', 'u1', 's1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('BadRequestException si ajustement rendrait le stock negatif', async () => {
    prisma.inventorySession.findFirst.mockResolvedValue({
      id: 's1',
      status: 'DRAFT',
      items: [{ productId: 'p1', difference: -99 }],
    });
    prisma._tx.product.findFirst.mockResolvedValue({ qty: 5, name: 'Prod' });
    await expect(service.validate('t1', 'u1', 's1')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('valide et applique les ajustements de stock', async () => {
    prisma.inventorySession.findFirst
      .mockResolvedValueOnce({
        id: 's1',
        status: 'DRAFT',
        items: [{ productId: 'p1', difference: 3 }],
      })
      .mockResolvedValueOnce({
        id: 's1',
        status: 'VALIDATED',
        tenantId: 't1',
        date: new Date(),
        notes: null,
        createdBy: 'u1',
        createdAt: new Date(),
        items: [],
      });
    prisma._tx.product.findFirst.mockResolvedValue({ qty: 10, name: 'Prod' });
    await service.validate('t1', 'u1', 's1');
    expect(prisma._tx.product.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: { qty: { increment: 3 } },
      }),
    );
    expect(prisma._tx.inventorySession.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'VALIDATED' } }),
    );
  });
});
