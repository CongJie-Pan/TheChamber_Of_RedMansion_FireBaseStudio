/**
 * @fileOverview Tests for Community Post Like API Route
 *
 * Tests the /api/community/posts/[postId]/like endpoint which handles:
 * - POST: Liking a post
 * - DELETE: Unliking a post
 *
 * Test coverage:
 * - Authentication validation
 * - Input validation with Zod
 * - Authorization checks (userId matching)
 * - Service layer integration
 * - Error handling (401, 400, 403, 500)
 *
 * @phase Phase 3 - Community Module Testing
 * @date 2025-10-30
 */

// Mock next/server before imports
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      async text() {
        return JSON.stringify(data);
      },
      async json() {
        return data;
      },
    }),
  },
}));

// Mock NextAuth
const mockGetServerSession = jest.fn();
jest.mock('next-auth', () => ({
  getServerSession: (...args: any[]) => mockGetServerSession(...args),
}));

// Mock community service
const mockCommunityService = {
  togglePostLike: jest.fn(),
};
jest.mock('@/lib/community-service', () => ({
  communityService: mockCommunityService,
}));

import {
  TEST_USERS,
  MOCK_SESSIONS,
  createMockRequest,
  createMockRequestWithParams,
  readMockResponseJson,
} from '../../fixtures/community-fixtures';

let POST: any;
let DELETE: any;

describe('Community Post Like API Route', () => {
  beforeAll(() => {
    // Import route handlers after mocks are set up
    const likeRoute = require('@/app/api/community/posts/[postId]/like/route');
    POST = likeRoute.POST;
    DELETE = likeRoute.DELETE;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/community/posts/[postId]/like', () => {
    describe('Authentication', () => {
      it('should return 401 when no session exists', async () => {
        mockGetServerSession.mockResolvedValue(null);

        const req = createMockRequest({ userId: TEST_USERS.user1.id });
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(401);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/unauthorized/i);
      });

      it('should return 401 when session has no user ID', async () => {
        mockGetServerSession.mockResolvedValue({
          user: { name: 'Test User' }, // Missing ID
          expires: new Date(Date.now() + 86400000).toISOString(),
        });

        const req = createMockRequest({ userId: TEST_USERS.user1.id });
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(401);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
      });

      it('should accept valid authenticated session', async () => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
        mockCommunityService.togglePostLike.mockResolvedValue(true);

        const req = createMockRequest({ userId: TEST_USERS.user1.id });
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(200);
        expect(mockGetServerSession).toHaveBeenCalled();
      });
    });

    describe('Input Validation', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
      });

      it('should return 400 when userId is missing', async () => {
        const req = createMockRequest({});
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(400);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/invalid/i);
        expect(body.details).toBeDefined();
      });

      it('should return 400 when userId is empty string', async () => {
        const req = createMockRequest({ userId: '' });
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(400);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
      });

      it('should accept valid userId', async () => {
        mockCommunityService.togglePostLike.mockResolvedValue(true);

        const req = createMockRequest({ userId: TEST_USERS.user1.id });
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(200);
      });
    });

    describe('Authorization', () => {
      it('should return 403 when userId does not match session user ID', async () => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);

        const req = createMockRequest({ userId: TEST_USERS.user2.id }); // Different user
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(403);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/forbidden/i);
      });

      it('should allow like when userId matches session user ID', async () => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
        mockCommunityService.togglePostLike.mockResolvedValue(true);

        const req = createMockRequest({ userId: TEST_USERS.user1.id });
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(200);
      });
    });

    describe('Service Integration', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
      });

      it('should call communityService.togglePostLike with correct parameters', async () => {
        mockCommunityService.togglePostLike.mockResolvedValue(true);

        const req = createMockRequest({ userId: TEST_USERS.user1.id });
        const params = { params: { postId: 'post-001' } };
        await POST(req, params);

        expect(mockCommunityService.togglePostLike).toHaveBeenCalledWith(
          'post-001',
          TEST_USERS.user1.id,
          true // isLiking
        );
        expect(mockCommunityService.togglePostLike).toHaveBeenCalledTimes(1);
      });

      it('should return likeChanged boolean in response', async () => {
        mockCommunityService.togglePostLike.mockResolvedValue(true);

        const req = createMockRequest({ userId: TEST_USERS.user1.id });
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(200);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(true);
        expect(body.likeChanged).toBe(true);
      });

      it('should return likeChanged=false when already liked', async () => {
        mockCommunityService.togglePostLike.mockResolvedValue(false);

        const req = createMockRequest({ userId: TEST_USERS.user1.id });
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        const body = await readMockResponseJson(res);
        expect(body.success).toBe(true);
        expect(body.likeChanged).toBe(false);
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
      });

      it('should return 404 when post does not exist', async () => {
        mockCommunityService.togglePostLike.mockRejectedValue(
          new Error('Post not found')
        );

        const req = createMockRequest({ userId: TEST_USERS.user1.id });
        const params = { params: { postId: 'non-existent' } };
        const res = await POST(req, params);

        expect(res.status).toBe(404);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/not found/i);
      });

      it('should return 503 when database error occurs', async () => {
        mockCommunityService.togglePostLike.mockRejectedValue(
          new Error('SQLite connection failed')
        );

        const req = createMockRequest({ userId: TEST_USERS.user1.id });
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(503);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/database/i);
      });

      it('should return 500 for generic errors', async () => {
        mockCommunityService.togglePostLike.mockRejectedValue(
          new Error('Unexpected error')
        );

        const req = createMockRequest({ userId: TEST_USERS.user1.id });
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(500);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
      });
    });
  });

  describe('DELETE /api/community/posts/[postId]/like', () => {
    describe('Authentication', () => {
      it('should return 401 when no session exists', async () => {
        mockGetServerSession.mockResolvedValue(null);

        const req = createMockRequestWithParams(null, {
          userId: TEST_USERS.user1.id,
        });
        const params = { params: { postId: 'post-001' } };
        const res = await DELETE(req, params);

        expect(res.status).toBe(401);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/unauthorized/i);
      });

      it('should accept valid authenticated session', async () => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
        mockCommunityService.togglePostLike.mockResolvedValue(true);

        const req = createMockRequestWithParams(null, {
          userId: TEST_USERS.user1.id,
        });
        const params = { params: { postId: 'post-001' } };
        const res = await DELETE(req, params);

        expect(res.status).toBe(200);
      });
    });

    describe('Input Validation', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
      });

      it('should return 400 when userId query parameter is missing', async () => {
        const req = createMockRequestWithParams(null, {});
        const params = { params: { postId: 'post-001' } };
        const res = await DELETE(req, params);

        expect(res.status).toBe(400);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/userId/i);
      });

      it('should accept valid userId in query string', async () => {
        mockCommunityService.togglePostLike.mockResolvedValue(true);

        const req = createMockRequestWithParams(null, {
          userId: TEST_USERS.user1.id,
        });
        const params = { params: { postId: 'post-001' } };
        const res = await DELETE(req, params);

        expect(res.status).toBe(200);
      });
    });

    describe('Authorization', () => {
      it('should return 403 when userId does not match session user ID', async () => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);

        const req = createMockRequestWithParams(null, {
          userId: TEST_USERS.user2.id, // Different user
        });
        const params = { params: { postId: 'post-001' } };
        const res = await DELETE(req, params);

        expect(res.status).toBe(403);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/forbidden/i);
      });

      it('should allow unlike when userId matches session user ID', async () => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
        mockCommunityService.togglePostLike.mockResolvedValue(true);

        const req = createMockRequestWithParams(null, {
          userId: TEST_USERS.user1.id,
        });
        const params = { params: { postId: 'post-001' } };
        const res = await DELETE(req, params);

        expect(res.status).toBe(200);
      });
    });

    describe('Service Integration', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
      });

      it('should call communityService.togglePostLike with isLiking=false', async () => {
        mockCommunityService.togglePostLike.mockResolvedValue(true);

        const req = createMockRequestWithParams(null, {
          userId: TEST_USERS.user1.id,
        });
        const params = { params: { postId: 'post-001' } };
        await DELETE(req, params);

        expect(mockCommunityService.togglePostLike).toHaveBeenCalledWith(
          'post-001',
          TEST_USERS.user1.id,
          false // isLiking = false for unlike
        );
      });

      it('should return success response after unliking', async () => {
        mockCommunityService.togglePostLike.mockResolvedValue(true);

        const req = createMockRequestWithParams(null, {
          userId: TEST_USERS.user1.id,
        });
        const params = { params: { postId: 'post-001' } };
        const res = await DELETE(req, params);

        const body = await readMockResponseJson(res);
        expect(body.success).toBe(true);
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
      });

      it('should return 404 when post does not exist', async () => {
        mockCommunityService.togglePostLike.mockRejectedValue(
          new Error('Post not found')
        );

        const req = createMockRequestWithParams(null, {
          userId: TEST_USERS.user1.id,
        });
        const params = { params: { postId: 'non-existent' } };
        const res = await DELETE(req, params);

        expect(res.status).toBe(404);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
      });

      it('should return 503 when database error occurs', async () => {
        mockCommunityService.togglePostLike.mockRejectedValue(
          new Error('SQLite error')
        );

        const req = createMockRequestWithParams(null, {
          userId: TEST_USERS.user1.id,
        });
        const params = { params: { postId: 'post-001' } };
        const res = await DELETE(req, params);

        expect(res.status).toBe(503);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
      });
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
    });

    it('should handle concurrent like requests gracefully', async () => {
      mockCommunityService.togglePostLike.mockResolvedValue(true);

      const req1 = createMockRequest({ userId: TEST_USERS.user1.id });
      const req2 = createMockRequest({ userId: TEST_USERS.user1.id });
      const params = { params: { postId: 'post-001' } };

      const [res1, res2] = await Promise.all([
        POST(req1, params),
        POST(req2, params),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
    });

    it('should handle like/unlike toggle sequence', async () => {
      mockCommunityService.togglePostLike
        .mockResolvedValueOnce(true) // Like
        .mockResolvedValueOnce(true); // Unlike

      const likeReq = createMockRequest({ userId: TEST_USERS.user1.id });
      const unlikeReq = createMockRequestWithParams(null, {
        userId: TEST_USERS.user1.id,
      });
      const params = { params: { postId: 'post-001' } };

      const likeRes = await POST(likeReq, params);
      const unlikeRes = await DELETE(unlikeReq, params);

      expect(likeRes.status).toBe(200);
      expect(unlikeRes.status).toBe(200);
      expect(mockCommunityService.togglePostLike).toHaveBeenCalledTimes(2);
    });
  });
});
