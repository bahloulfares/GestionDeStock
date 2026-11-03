import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';

@Catch(ThrottlerException)
export class ThrottlerExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ThrottlerExceptionFilter.name);

  catch(_exception: ThrottlerException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.warn('Rate limit dépassé');

    response
      .status(HttpStatus.TOO_MANY_REQUESTS)
      .setHeader('Retry-After', '60')
      .json({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Trop de tentatives. Veuillez réessayer dans 60 secondes.',
        error: 'Too Many Requests',
      });
  }
}
