import { Injectable, LoggerService } from '@nestjs/common';

/**
 * JsonLoggerService — Logger NestJS personnalisé.
 *
 * - En production (NODE_ENV === 'production') : chaque entrée est sérialisée
 *   en JSON sur une ligne contenant `level`, `message`, `context` et `timestamp`.
 * - En développement : format texte natif NestJS (identique au comportement par
 *   défaut du framework).
 */
@Injectable()
export class JsonLoggerService implements LoggerService {
  private isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  private writeJson(level: string, message: unknown, context?: string): void {
    process.stdout.write(
      JSON.stringify({
        level,
        message: String(message),
        context: context ?? '',
        timestamp: new Date().toISOString(),
      }) + '\n',
    );
  }

  log(message: unknown, context?: string): void {
    if (this.isProduction()) {
      this.writeJson('log', message, context);
    } else {
      const ctx = context ? ` [${context}]` : '';
      process.stdout.write(`[NestJS]${ctx} ${String(message)}\n`);
    }
  }

  error(message: unknown, trace?: string, context?: string): void {
    if (this.isProduction()) {
      process.stderr.write(
        JSON.stringify({
          level: 'error',
          message: String(message),
          trace: trace ?? '',
          context: context ?? '',
          timestamp: new Date().toISOString(),
        }) + '\n',
      );
    } else {
      const ctx = context ? ` [${context}]` : '';
      process.stderr.write(
        `[NestJS]${ctx} ERROR ${String(message)}${trace ? `\n${trace}` : ''}\n`,
      );
    }
  }

  warn(message: unknown, context?: string): void {
    if (this.isProduction()) {
      this.writeJson('warn', message, context);
    } else {
      const ctx = context ? ` [${context}]` : '';
      process.stdout.write(`[NestJS]${ctx} WARN ${String(message)}\n`);
    }
  }

  debug(message: unknown, context?: string): void {
    if (this.isProduction()) {
      this.writeJson('debug', message, context);
    } else {
      const ctx = context ? ` [${context}]` : '';
      process.stdout.write(`[NestJS]${ctx} DEBUG ${String(message)}\n`);
    }
  }

  verbose(message: unknown, context?: string): void {
    if (this.isProduction()) {
      this.writeJson('verbose', message, context);
    } else {
      const ctx = context ? ` [${context}]` : '';
      process.stdout.write(`[NestJS]${ctx} VERBOSE ${String(message)}\n`);
    }
  }
}
