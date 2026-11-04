import { ThrottlerProxyGuard } from './throttler-proxy.guard';

describe('ThrottlerProxyGuard.getTracker', () => {
  let guard: ThrottlerProxyGuard;
  beforeEach(() => {
    guard = new ThrottlerProxyGuard(null as any, null as any, null as any);
  });

  it('retourne req.ip si present', async () => {
    const req = { ip: '1.2.3.4', socket: {} } as any;
    expect(await (guard as any).getTracker(req)).toBe('1.2.3.4');
  });

  it('fallback sur socket.remoteAddress si req.ip absent', async () => {
    const req = { socket: { remoteAddress: '5.6.7.8' } } as any;
    expect(await (guard as any).getTracker(req)).toBe('5.6.7.8');
  });

  it('fallback sur unknown si tout absent', async () => {
    expect(await (guard as any).getTracker({} as any)).toBe('unknown');
  });
});
