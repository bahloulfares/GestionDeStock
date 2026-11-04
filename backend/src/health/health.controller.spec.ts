import { Test } from '@nestjs/testing';
import { HttpException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: any;

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prisma }],
    }).compile();
    controller = module.get(HealthController);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retourne status ok quand la DB repond', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    const res = await controller.check();
    expect(res.status).toBe('ok');
    expect(res.db).toBe('ok');
    expect(typeof res.uptime).toBe('number');
    expect(typeof res.version).toBe('string');
  });

  it('leve HttpException 503 si la DB echoue', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('conn refused'));
    await expect(controller.check()).rejects.toThrow(HttpException);
  });

  it('leve HttpException 503 si la DB timeout (> 2s)', async () => {
    jest.useFakeTimers();
    prisma.$queryRaw.mockImplementation(() => new Promise(() => {}));
    const promise = controller.check();
    jest.advanceTimersByTime(2100);
    await expect(promise).rejects.toThrow(HttpException);
  });
});
