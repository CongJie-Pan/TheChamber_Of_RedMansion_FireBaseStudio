/**
 * @fileOverview Tests for reset-user-password CLI utility.
 *
 * Ensures password reset orchestration validates input, hashes new passwords,
 * and invokes repository helpers correctly without touching the real database.
 */

import {
  resetUserPassword,
  parseArgs,
} from '../../scripts/reset-user-password';

import {
  getUserByEmail,
  getUserById,
  updateUserPasswordHash,
} from '@/lib/repositories/user-repository';
import { hashPassword, MIN_PASSWORD_LENGTH } from '@/lib/utils/password-validation';

jest.mock('@/lib/repositories/user-repository', () => ({
  getUserByEmail: jest.fn(),
  getUserById: jest.fn(),
  updateUserPasswordHash: jest.fn(),
}));

jest.mock('@/lib/utils/password-validation', () => ({
  hashPassword: jest.fn(async (password: string) => `hashed:${password}`),
  MIN_PASSWORD_LENGTH: 8,
}));

describe('reset-user-password script', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseArgs', () => {
    it('parses all supported flags', () => {
      const result = parseArgs([
        '--email',
        'USER@example.com',
        '--password',
        'Secret123',
        '--user-id',
        'user-1',
      ]);

      expect(result).toEqual({
        email: 'USER@example.com',
        password: 'Secret123',
        userId: 'user-1',
      });
    });

    it('throws for unknown flags', () => {
      expect(() =>
        parseArgs(['--email', 'a@b.com', '--unknown', 'value'])
      ).toThrow('Unsupported flag: --unknown');
    });
  });

  describe('resetUserPassword', () => {
    it('resets password using email lookup', async () => {
      (getUserByEmail as jest.Mock).mockReturnValue({
        userId: 'user-123',
        email: 'user@example.com',
        username: 'Test',
        isGuest: false,
      });
      (updateUserPasswordHash as jest.Mock).mockReturnValue({
        userId: 'user-123',
        email: 'user@example.com',
        username: 'Test',
      });

      const result = await resetUserPassword({
        email: 'user@example.com',
        password: 'NewPassword123',
      });

      expect(hashPassword).toHaveBeenCalledWith('NewPassword123');
      expect(updateUserPasswordHash).toHaveBeenCalledWith(
        'user-123',
        'hashed:NewPassword123'
      );
      expect(result).toEqual({
        userId: 'user-123',
        email: 'user@example.com',
        username: 'Test',
      });
    });

    it('resets password using explicit userId', async () => {
      (getUserById as jest.Mock).mockReturnValue({
        userId: 'user-555',
        email: 'custom@example.com',
        username: 'Custom',
        isGuest: false,
      });
      (updateUserPasswordHash as jest.Mock).mockReturnValue({
        userId: 'user-555',
        email: 'custom@example.com',
        username: 'Custom',
      });

      const result = await resetUserPassword({
        userId: 'user-555',
        password: 'AnotherSecret1',
      });

      expect(hashPassword).toHaveBeenCalledWith('AnotherSecret1');
      expect(updateUserPasswordHash).toHaveBeenCalledWith(
        'user-555',
        'hashed:AnotherSecret1'
      );
      expect(result.userId).toBe('user-555');
    });

    it('throws when neither email nor userId supplied', async () => {
      await expect(
        resetUserPassword({ password: 'Example123' })
      ).rejects.toThrow('Either email or userId must be provided');
    });

    it('throws for guest accounts', async () => {
      (getUserByEmail as jest.Mock).mockReturnValue({
        userId: 'guest-test-user-00000000',
        email: 'guest@redmansion.test',
        username: 'Guest',
        isGuest: true,
      });

      await expect(
        resetUserPassword({
          email: 'guest@redmansion.test',
          password: 'Guest1234',
        })
      ).rejects.toThrow('Guest account passwords cannot be reset');
    });

    it('enforces minimum password length', async () => {
      await expect(
        resetUserPassword({ email: 'x@y.com', password: 'short' })
      ).rejects.toThrow(
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
      );
    });

    it('throws when user cannot be found', async () => {
      (getUserByEmail as jest.Mock).mockReturnValue(null);

      await expect(
        resetUserPassword({
          email: 'missing@example.com',
          password: 'Missing123',
        })
      ).rejects.toThrow('User not found for provided identifier');
    });
  });
});
