/**
 * @fileOverview Tests for /api/user/reset route
 *
 * Verifies that the account reset API:
 * - Requires authentication
 * - Validates confirmation text
 * - Prevents resetting other users' accounts
 * - Calls the service method correctly
 */

const nextResponseJsonMock = jest.fn((body: any, init?: { status?: number }) => ({
  json: async () => body,
  status: init?.status ?? 200,
}));

jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: nextResponseJsonMock,
  },
}));

import { POST } from '@/app/api/user/reset/route';
import { userLevelService } from '@/lib/user-level-service';
import { getServerSession } from 'next-auth';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/lib/user-level-service', () => ({
  userLevelService: {
    resetUserAccount: jest.fn(),
  },
}));

jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

describe('POST /api/user/reset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = (body: Record<string, unknown>) =>
    ({
      json: async () => body,
    } as unknown as Request);

  describe('Authentication', () => {
    it('returns 401 when user is not authenticated', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = createRequest({
        userId: 'user-123',
        confirmationText: '我確定要重設帳號',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Unauthorized');
    });

    it('returns 401 when session has no user id', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: {},
      });

      const request = createRequest({
        userId: 'user-123',
        confirmationText: '我確定要重設帳號',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.success).toBe(false);
    });
  });

  describe('Authorization', () => {
    it('returns 403 when trying to reset another user account', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      });

      const request = createRequest({
        userId: 'different-user-456',
        confirmationText: '我確定要重設帳號',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Forbidden');
    });
  });

  describe('Validation', () => {
    it('returns error when userId is missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      });

      const request = createRequest({
        confirmationText: '我確定要重設帳號',
      });

      const response = await POST(request);
      const data = await response.json();

      // Should fail validation
      expect(data.success).toBe(false);
      // Accept either 400 (validation error) or other error status
      expect([400, 500]).toContain(response.status);
    });

    it('returns error when confirmationText is missing', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      });

      const request = createRequest({
        userId: 'user-123',
      });

      const response = await POST(request);
      const data = await response.json();

      // Should fail validation
      expect(data.success).toBe(false);
      expect([400, 500]).toContain(response.status);
    });

    it('returns error when userId is empty string', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      });

      const request = createRequest({
        userId: '',
        confirmationText: '我確定要重設帳號',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect([400, 500]).toContain(response.status);
    });

    it('returns 400 when confirmationText does not match', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      });

      const request = createRequest({
        userId: 'user-123',
        confirmationText: 'wrong text',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Confirmation failed');
    });

    it('returns 400 when confirmationText is partially correct', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      });

      const request = createRequest({
        userId: 'user-123',
        confirmationText: '我確定要重設',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe('Successful reset', () => {
    it('resets account when all validations pass', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      });

      (userLevelService.resetUserAccount as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Account has been successfully reset to initial state',
        profile: {
          uid: 'user-123',
          currentLevel: 0,
          currentXP: 0,
          totalXP: 0,
        },
      });

      const request = createRequest({
        userId: 'user-123',
        confirmationText: '我確定要重設帳號',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Account has been successfully reset to initial state');

      expect(userLevelService.resetUserAccount).toHaveBeenCalledWith(
        'user-123',
        'Test User',
        'test@example.com'
      );
    });

    it('uses default name when user name is not available', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      (userLevelService.resetUserAccount as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Account has been successfully reset to initial state',
      });

      const request = createRequest({
        userId: 'user-123',
        confirmationText: '我確定要重設帳號',
      });

      await POST(request);

      expect(userLevelService.resetUserAccount).toHaveBeenCalledWith(
        'user-123',
        'User',
        'test@example.com'
      );
    });

    it('uses empty string when user email is not available', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', name: 'Test User' },
      });

      (userLevelService.resetUserAccount as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Account has been successfully reset to initial state',
      });

      const request = createRequest({
        userId: 'user-123',
        confirmationText: '我確定要重設帳號',
      });

      await POST(request);

      expect(userLevelService.resetUserAccount).toHaveBeenCalledWith(
        'user-123',
        'Test User',
        ''
      );
    });
  });

  describe('Service errors', () => {
    it('returns 500 when service returns failure', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      });

      (userLevelService.resetUserAccount as jest.Mock).mockResolvedValue({
        success: false,
        message: 'User profile not found',
      });

      const request = createRequest({
        userId: 'user-123',
        confirmationText: '我確定要重設帳號',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('User profile not found');
    });

    it('returns 503 when SQLite error occurs', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      });

      (userLevelService.resetUserAccount as jest.Mock).mockRejectedValue(
        new Error('SQLite database error')
      );

      const request = createRequest({
        userId: 'user-123',
        confirmationText: '我確定要重設帳號',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.message).toBe('Database error');
    });

    it('returns 500 for other errors', async () => {
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', name: 'Test User', email: 'test@example.com' },
      });

      (userLevelService.resetUserAccount as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      const request = createRequest({
        userId: 'user-123',
        confirmationText: '我確定要重設帳號',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Unexpected error');
    });
  });
});
