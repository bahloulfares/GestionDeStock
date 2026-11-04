import {
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../common/decorators/skip-subscription.decorator';
import { PrismaService } from '../prisma/prisma.service';
import packageJson from '../../package.json';

interface HealthResponse {
  status: 'ok' | 'error';
  db: 'ok' | 'error';
  uptime: number;
  version: string;
}

@ApiTags('Health')
@Public()
@SkipSubscriptionCheck()
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({
    summary: "Vérification de santé de l'API et de la base de données",
  })
  async check(): Promise<HealthResponse> {
    const uptime = Math.floor(process.uptime());
    const version = packageJson.version;

    try {
      await Promise.race([
        this.prisma.$queryRaw`SELECT 1`,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('DB timeout')), 2000),
        ),
      ]);
      return { status: 'ok', db: 'ok', uptime, version };
    } catch (error) {
      this.logger.warn(
        'Health check DB failed',
        error instanceof Error ? error.message : String(error),
      );
      throw new HttpException(
        { status: 'error', db: 'error', uptime, version },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
