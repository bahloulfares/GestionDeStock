import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerProxyGuard extends ThrottlerGuard {
  // @nestjs/throttler v6 uses Record<string, any> for the request parameter
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Use req.ip (real IP after trust proxy) or fallback to remoteAddress
    return (
      (req.ip as string | undefined) ??
      (req.socket?.remoteAddress as string | undefined) ??
      'unknown'
    );
  }
}
