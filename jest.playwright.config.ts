module.exports = {
  preset: 'jest-playwright',
  testEnvironment: 'jest-playwright-environment',
  globalSetup: 'jest-playwright/global-setup',
  globalTeardown: 'jest-playwright/global-teardown',
  testMatch: ['**/tests/**/*.playwright.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  reporters: ['default'],
};