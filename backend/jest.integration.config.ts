import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testEnvironment: 'node',
  testRegex: '.integration-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  testTimeout: 30000,
  globalSetup: '<rootDir>/test/integration-setup.ts',
  globalTeardown: '<rootDir>/test/integration-teardown.ts',
};

export default config;
