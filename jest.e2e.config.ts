module.exports = {
  preset: 'jest-playwright',
  testMatch: ['<rootDir>/tests/**/*.playwright.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  testTimeout: 30000,
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};