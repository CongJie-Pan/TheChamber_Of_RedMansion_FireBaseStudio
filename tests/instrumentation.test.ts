/**
 * Unit Tests - Instrumentation Hook (Phase 4-T1)
 *
 * Tests server startup instrumentation for guest account auto-seeding.
 * Validates environment-specific behavior.
 *
 * @jest-environment node
 */

describe('Instrumentation Hook', () => {
  let originalEnv: string | undefined;
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Clear module cache to allow re-importing with different NODE_ENV
    jest.resetModules();
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('register function', () => {
    it('should seed guest account in development environment', async () => {
      process.env.NODE_ENV = 'development';

      // Mock seedGuestAccount
      const mockSeedGuestAccount = jest.fn();
      jest.doMock('../../scripts/seed-guest-account', () => ({
        seedGuestAccount: mockSeedGuestAccount,
      }));

      const { register } = await import('../../instrumentation');
      await register();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Instrumentation] Running development setup tasks')
      );
      expect(mockSeedGuestAccount).toHaveBeenCalledWith(true);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Instrumentation] Guest account seeded successfully')
      );
    });

    it('should not seed guest account in production environment', async () => {
      process.env.NODE_ENV = 'production';

      const mockSeedGuestAccount = jest.fn();
      jest.doMock('../../scripts/seed-guest-account', () => ({
        seedGuestAccount: mockSeedGuestAccount,
      }));

      const { register } = await import('../../instrumentation');
      await register();

      // Should not attempt to seed in production
      expect(mockSeedGuestAccount).not.toHaveBeenCalled();
      expect(consoleLogSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('[Instrumentation] Running development setup tasks')
      );
    });

    it('should handle seeding errors gracefully', async () => {
      process.env.NODE_ENV = 'development';

      const mockError = new Error('Database connection failed');
      const mockSeedGuestAccount = jest.fn().mockImplementation(() => {
        throw mockError;
      });

      jest.doMock('../../scripts/seed-guest-account', () => ({
        seedGuestAccount: mockSeedGuestAccount,
      }));

      const { register } = await import('../../instrumentation');

      // Should not throw, but log error
      await expect(register()).resolves.not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Instrumentation] Failed to seed guest account'),
        mockError.message
      );
    });
  });

  describe('Next.js configuration integration', () => {
    it('should have instrumentationHook enabled in next.config', async () => {
      const nextConfig = await import('../../next.config');
      const config = nextConfig.default;

      expect(config.experimental?.instrumentationHook).toBe(true);
    });
  });

  describe('Development workflow validation', () => {
    it('should reset guest account on each server restart', async () => {
      process.env.NODE_ENV = 'development';

      const mockSeedGuestAccount = jest.fn();
      jest.doMock('../../scripts/seed-guest-account', () => ({
        seedGuestAccount: mockSeedGuestAccount,
      }));

      const { register } = await import('../../instrumentation');

      // First server start
      await register();
      expect(mockSeedGuestAccount).toHaveBeenCalledWith(true); // reset flag = true

      // Simulate server restart by clearing call history
      mockSeedGuestAccount.mockClear();

      // Second server start
      await register();
      expect(mockSeedGuestAccount).toHaveBeenCalledWith(true); // reset flag still true
    });

    it('should complete seeding before server accepts requests', async () => {
      process.env.NODE_ENV = 'development';

      let seedingComplete = false;
      const mockSeedGuestAccount = jest.fn().mockImplementation(() => {
        // Simulate async operation
        return new Promise((resolve) => {
          setTimeout(() => {
            seedingComplete = true;
            resolve(undefined);
          }, 10);
        });
      });

      jest.doMock('../../scripts/seed-guest-account', () => ({
        seedGuestAccount: mockSeedGuestAccount,
      }));

      const { register } = await import('../../instrumentation');

      // Register should wait for seeding to complete
      expect(seedingComplete).toBe(false);
      await register();
      expect(seedingComplete).toBe(true);
    });
  });
});
