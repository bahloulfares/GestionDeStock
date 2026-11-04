import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerProxyGuard extends ThrottlerGuard {
  // @nestjs/throttler v6 uses Record<string, any> for the request parameter
  protected getTracker(req: Record<string, any>): Promise<string> {
    const socket = req.socket as { remoteAddress?: string } | undefined;
    const ip =
      (req.ip as string | undefined) ?? socket?.remoteAddress ?? 'unknown';
    return Promise.resolve(ip);
  }
}
