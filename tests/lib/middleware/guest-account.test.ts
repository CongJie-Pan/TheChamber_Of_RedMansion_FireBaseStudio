/**
 * Unit Tests - Guest Account Middleware (Phase 4-T1)
 *
 * Tests guest account detection and configuration utilities.
 * Follows Google's testing best practices: test behaviors, not implementation.
 *
 * @jest-environment node
 */

import {
  isGuestAccount,
  getGuestTaskIds,
  isGuestModeEnabled,
  getGuestConfig,
  logGuestAction,
} from '@/lib/middleware/guest-account';
import { GUEST_USER_ID } from '@/lib/constants/guest-account';

describe('Guest Account Middleware', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe('isGuestAccount', () => {
    it('should return true for guest user ID', () => {
      const result = isGuestAccount(GUEST_USER_ID);
      expect(result).toBe(true);
    });

    it('should return false for non-guest user IDs', () => {
      const regularUserId = 'user-12345';
      const result = isGuestAccount(regularUserId);
      expect(result).toBe(false);
    });

    it('should return false for null or undefined user IDs', () => {
      expect(isGuestAccount(null)).toBe(false);
      expect(isGuestAccount(undefined)).toBe(false);
    });
  });

  describe('getGuestTaskIds', () => {
    it('should return array of fixed task IDs', () => {
      const taskIds = getGuestTaskIds();

      expect(Array.isArray(taskIds)).toBe(true);
      expect(taskIds.length).toBe(2);
      expect(taskIds).toContain('guest-task-reading-comprehension');
      expect(taskIds).toContain('guest-task-character-analysis');
    });

    it('should return consistent task IDs across multiple calls', () => {
      const firstCall = getGuestTaskIds();
      const secondCall = getGuestTaskIds();

      expect(firstCall).toEqual(secondCall);
    });
  });

  describe('isGuestModeEnabled', () => {
    it('should return true in development environment', () => {
      process.env.NODE_ENV = 'development';

      const result = isGuestModeEnabled();
      expect(result).toBe(true);
    });

    it('should return false in production without explicit flag', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENABLE_GUEST_ACCOUNT;

      const result = isGuestModeEnabled();
      expect(result).toBe(false);
    });

    it('should return true in production when explicitly enabled', () => {
      process.env.NODE_ENV = 'production';
      process.env.ENABLE_GUEST_ACCOUNT = 'true';

      const result = isGuestModeEnabled();
      expect(result).toBe(true);
    });
  });

  describe('getGuestConfig', () => {
    it('should return complete guest configuration object', () => {
      process.env.NODE_ENV = 'development';

      const config = getGuestConfig();

      expect(config).toEqual({
        userId: GUEST_USER_ID,
        email: 'guest@redmansion.test',
        username: '訪客測試帳號',
        fixedXP: 70,
        level: 1,
        taskIds: expect.arrayContaining([
          'guest-task-reading-comprehension',
          'guest-task-character-analysis',
        ]),
        enabled: true,
      });
    });

    it('should reflect environment-based enabled status', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENABLE_GUEST_ACCOUNT;

      const config = getGuestConfig();
      expect(config.enabled).toBe(false);
    });
  });

  describe('logGuestAction', () => {
    let consoleLogSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it('should log guest actions in development mode', () => {
      process.env.NODE_ENV = 'development';

      logGuestAction('Test action', { detail: 'test' });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Guest Account] Test action',
        { detail: 'test' }
      );
    });

    it('should not log in production mode without flag', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.ENABLE_GUEST_ACCOUNT;

      logGuestAction('Test action');

      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should handle logging without details parameter', () => {
      process.env.NODE_ENV = 'development';

      logGuestAction('Simple action');

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[Guest Account] Simple action',
        ''
      );
    });
  });
});
