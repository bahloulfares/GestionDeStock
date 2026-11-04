import { JsonLoggerService } from './json-logger.service';

describe('JsonLoggerService', () => {
  let logger: JsonLoggerService;

  it('ecrit du JSON valide en production', () => {
    process.env.NODE_ENV = 'production';
    logger = new JsonLoggerService();
    const lines: string[] = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((s: any) => {
      lines.push(String(s));
      return true;
    });
    logger.log('bonjour', 'TestCtx');
    jest.restoreAllMocks();
    process.env.NODE_ENV = 'test';
    const parsed = JSON.parse(lines[0]);
    expect(parsed).toMatchObject({
      level: 'log',
      message: 'bonjour',
      context: 'TestCtx',
    });
    expect(typeof parsed.timestamp).toBe('string');
  });

  it('ne produit pas de JSON en developpement', () => {
    process.env.NODE_ENV = 'development';
    logger = new JsonLoggerService();
    const lines: string[] = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((s: any) => {
      lines.push(String(s));
      return true;
    });
    logger.log('hello');
    jest.restoreAllMocks();
    process.env.NODE_ENV = 'test';
    expect(() => JSON.parse(lines[0])).toThrow();
  });
});
