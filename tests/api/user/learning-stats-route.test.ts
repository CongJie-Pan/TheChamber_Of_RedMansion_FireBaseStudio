/**
 * @fileOverview Learning Stats API Route Tests
 *
 * Tests for GET /api/user/learning-stats endpoint
 * Task 2.2: Learning Progress Dynamic Data
 *
 * @phase Phase 2 - Gamification System
 * @date 2025-12-01
 */

// Mock NextResponse before imports
const nextResponseJsonMock = jest.fn((body: any, init?: { status?: number }) => ({
  json: async () => body,
  status: init?.status ?? 200,
}));

jest.mock('next/server', () => ({
  NextRequest: class {
    url: string;
    headers: Map<string, string>;

    constructor(url: string, init?: { headers?: Record<string, string> }) {
      this.url = url;
      this.headers = new Map(Object.entries(init?.headers || {}));
    }
  },
  NextResponse: {
    json: nextResponseJsonMock,
  },
}));

// Mock next-auth
const mockGetServerSession = jest.fn();
jest.mock('next-auth', () => ({
  getServerSession: (...args: any[]) => mockGetServerSession(...args),
}));

// Mock auth options
jest.mock('@/lib/auth-options', () => ({
  authOptions: {},
}));

// Mock user repository
const mockGetUserById = jest.fn();
jest.mock('@/lib/repositories/user-repository', () => ({
  getUserById: (...args: any[]) => mockGetUserById(...args),
}));

// Mock note repository
const mockGetNoteCount = jest.fn();
jest.mock('@/lib/repositories/note-repository', () => ({
  getNoteCount: (...args: any[]) => mockGetNoteCount(...args),
}));

import { GET } from '@/app/api/user/learning-stats/route';
import { NextRequest } from 'next/server';

describe('GET /api/user/learning-stats', () => {
  const mockUserId = 'test-user-123';

  const mockUserProfile = {
    userId: mockUserId,
    username: 'TestUser',
    email: 'test@example.com',
    currentLevel: 2,
    currentXP: 50,
    totalXP: 230,
    stats: {
      chaptersCompleted: 5,
      totalReadingTimeMinutes: 150, // 2 hours 30 minutes
      notesCount: 10,
      currentStreak: 7,
      longestStreak: 14,
      aiInteractionsCount: 25,
      communityPostsCount: 3,
      communityLikesReceived: 12,
    },
    completedChapters: [1, 2, 3, 4, 5],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createRequest = (headers: Record<string, string> = {}) => {
    const req = new NextRequest('http://localhost:3000/api/user/learning-stats', {
      headers,
    });
    return req;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    nextResponseJsonMock.mockClear();

    // Default successful mocks
    mockGetServerSession.mockResolvedValue({
      user: { id: mockUserId, email: 'test@example.com' },
    });
    mockGetUserById.mockResolvedValue(mockUserProfile);
    mockGetNoteCount.mockResolvedValue(15); // Actual note count from DB
  });

  describe('Authentication', () => {
    test('should return 401 when not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = createRequest();
      await GET(request as any);

      expect(nextResponseJsonMock).toHaveBeenCalledWith(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    });

    test('should return 401 when session has no user', async () => {
      mockGetServerSession.mockResolvedValue({ user: null });

      const request = createRequest();
      await GET(request as any);

      expect(nextResponseJsonMock).toHaveBeenCalledWith(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    });
  });

  describe('User not found', () => {
    test('should return 404 when user profile not found', async () => {
      mockGetUserById.mockResolvedValue(null);

      const request = createRequest();
      await GET(request as any);

      expect(nextResponseJsonMock).toHaveBeenCalledWith(
        { error: 'User profile not found', userId: mockUserId },
        { status: 404 }
      );
    });
  });

  describe('Success cases', () => {
    test('should return learning stats with correct values', async () => {
      const request = createRequest();
      await GET(request as any);

      expect(nextResponseJsonMock).toHaveBeenCalledWith({
        success: true,
        stats: {
          totalReadingTime: expect.stringContaining('2'), // 2 hours 30 minutes
          totalReadingTimeMinutes: 150,
          chaptersCompleted: 5,
          totalChapters: 120,
          notesTaken: 15, // From getNoteCount, not stats.notesCount
          currentStreak: 7,
        },
      });
    });

    test('should use note count from database, not from user stats', async () => {
      mockGetNoteCount.mockResolvedValue(25); // Different from stats.notesCount (10)

      const request = createRequest();
      await GET(request as any);

      expect(mockGetNoteCount).toHaveBeenCalledWith(mockUserId);
      expect(nextResponseJsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          stats: expect.objectContaining({
            notesTaken: 25, // Should use actual DB count
          }),
        })
      );
    });

    test('should format reading time in Chinese by default', async () => {
      const request = createRequest(); // No language header
      await GET(request as any);

      const call = nextResponseJsonMock.mock.calls[0][0];
      expect(call.stats.totalReadingTime).toContain('小時');
    });

    test('should format reading time in English when accept-language is en', async () => {
      const request = createRequest({ 'accept-language': 'en-US' });
      await GET(request as any);

      const call = nextResponseJsonMock.mock.calls[0][0];
      expect(call.stats.totalReadingTime).toContain('Hours');
    });

    test('should handle zero reading time', async () => {
      mockGetUserById.mockResolvedValue({
        ...mockUserProfile,
        stats: {
          ...mockUserProfile.stats,
          totalReadingTimeMinutes: 0,
        },
      });

      const request = createRequest();
      await GET(request as any);

      const call = nextResponseJsonMock.mock.calls[0][0];
      expect(call.stats.totalReadingTimeMinutes).toBe(0);
      expect(call.stats.totalReadingTime).toContain('0');
    });

    test('should handle reading time less than an hour', async () => {
      mockGetUserById.mockResolvedValue({
        ...mockUserProfile,
        stats: {
          ...mockUserProfile.stats,
          totalReadingTimeMinutes: 45, // 45 minutes
        },
      });

      const request = createRequest();
      await GET(request as any);

      const call = nextResponseJsonMock.mock.calls[0][0];
      expect(call.stats.totalReadingTime).toContain('45');
      expect(call.stats.totalReadingTime).toContain('分鐘');
    });
  });

  describe('Error handling', () => {
    test('should return 500 on database error', async () => {
      mockGetUserById.mockRejectedValue(new Error('Database connection failed'));

      const request = createRequest();
      await GET(request as any);

      expect(nextResponseJsonMock).toHaveBeenCalledWith(
        {
          error: 'Failed to fetch learning stats',
          details: 'Database connection failed',
        },
        { status: 500 }
      );
    });

    test('should return 500 on note count error', async () => {
      mockGetNoteCount.mockRejectedValue(new Error('Note query failed'));

      const request = createRequest();
      await GET(request as any);

      expect(nextResponseJsonMock).toHaveBeenCalledWith(
        {
          error: 'Failed to fetch learning stats',
          details: 'Note query failed',
        },
        { status: 500 }
      );
    });
  });

  describe('Edge cases', () => {
    test('should handle user with no completed chapters', async () => {
      mockGetUserById.mockResolvedValue({
        ...mockUserProfile,
        stats: {
          ...mockUserProfile.stats,
          chaptersCompleted: 0,
        },
        completedChapters: [],
      });
      mockGetNoteCount.mockResolvedValue(0);

      const request = createRequest();
      await GET(request as any);

      const call = nextResponseJsonMock.mock.calls[0][0];
      expect(call.success).toBe(true);
      expect(call.stats.chaptersCompleted).toBe(0);
      expect(call.stats.notesTaken).toBe(0);
      expect(call.stats.currentStreak).toBe(7); // Still has streak
    });

    test('should always return totalChapters as 120', async () => {
      const request = createRequest();
      await GET(request as any);

      const call = nextResponseJsonMock.mock.calls[0][0];
      expect(call.stats.totalChapters).toBe(120);
    });
  });
});
