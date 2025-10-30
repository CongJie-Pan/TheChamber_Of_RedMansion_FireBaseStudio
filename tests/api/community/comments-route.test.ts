/**
 * @fileOverview Tests for Community Post Comments API Route
 *
 * Tests the /api/community/posts/[postId]/comments endpoint which handles:
 * - GET: Retrieving comments for a post
 * - POST: Adding a new comment
 * - DELETE: Deleting a comment
 *
 * Test coverage:
 * - Authentication validation
 * - Input validation with Zod
 * - Authorization checks
 * - Content moderation integration
 * - Service layer integration
 * - Error handling (401, 400, 403, 404, 500, 503)
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
  getComments: jest.fn(),
  addComment: jest.fn(),
  deleteComment: jest.fn(),
};
jest.mock('@/lib/community-service', () => ({
  communityService: mockCommunityService,
}));

import {
  TEST_USERS,
  MOCK_SESSIONS,
  CLEAN_COMMENT_DATA,
  PROFANITY_COMMENT_DATA,
  REPLY_COMMENT_DATA,
  MOCK_COMMENT,
  MOCK_MODERATION_CLEAN,
  MOCK_MODERATION_FILTER,
  createMockRequest,
  createMockRequestWithParams,
  readMockResponseJson,
} from '../../fixtures/community-fixtures';

let GET: any;
let POST: any;
let DELETE: any;

describe('Community Post Comments API Route', () => {
  beforeAll(() => {
    // Import route handlers after mocks are set up
    const commentsRoute = require('@/app/api/community/posts/[postId]/comments/route');
    GET = commentsRoute.GET;
    POST = commentsRoute.POST;
    DELETE = commentsRoute.DELETE;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/community/posts/[postId]/comments', () => {
    describe('Service Integration', () => {
      it('should retrieve comments for a post without authentication', async () => {
        const mockComments = [MOCK_COMMENT];
        mockCommunityService.getComments.mockResolvedValue(mockComments);

        const req = createMockRequestWithParams(null, {});
        const params = { params: { postId: 'post-001' } };
        const res = await GET(req, params);

        expect(res.status).toBe(200);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(true);
        expect(body.comments).toEqual(mockComments);
        expect(mockCommunityService.getComments).toHaveBeenCalledWith(
          'post-001',
          50 // default limit
        );
      });

      it('should pass limit parameter to service', async () => {
        mockCommunityService.getComments.mockResolvedValue([]);

        const req = createMockRequestWithParams(null, { limit: '20' });
        const params = { params: { postId: 'post-001' } };
        const res = await GET(req, params);

        expect(res.status).toBe(200);
        expect(mockCommunityService.getComments).toHaveBeenCalledWith(
          'post-001',
          20
        );
      });

      it('should return empty array when no comments exist', async () => {
        mockCommunityService.getComments.mockResolvedValue([]);

        const req = createMockRequestWithParams(null, {});
        const params = { params: { postId: 'post-001' } };
        const res = await GET(req, params);

        const body = await readMockResponseJson(res);
        expect(body.success).toBe(true);
        expect(body.comments).toEqual([]);
      });

      it('should return multiple comments in order', async () => {
        const mockComments = [
          MOCK_COMMENT,
          { ...MOCK_COMMENT, id: 'comment-002' },
          { ...MOCK_COMMENT, id: 'comment-003' },
        ];
        mockCommunityService.getComments.mockResolvedValue(mockComments);

        const req = createMockRequestWithParams(null, {});
        const params = { params: { postId: 'post-001' } };
        const res = await GET(req, params);

        const body = await readMockResponseJson(res);
        expect(body.comments).toHaveLength(3);
        expect(body.comments[0].id).toBe('comment-001');
      });
    });

    describe('Error Handling', () => {
      it('should return 404 when post does not exist', async () => {
        mockCommunityService.getComments.mockRejectedValue(
          new Error('Post not found')
        );

        const req = createMockRequestWithParams(null, {});
        const params = { params: { postId: 'non-existent' } };
        const res = await GET(req, params);

        expect(res.status).toBe(404);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/not found/i);
      });

      it('should return 503 when database error occurs', async () => {
        mockCommunityService.getComments.mockRejectedValue(
          new Error('SQLite connection failed')
        );

        const req = createMockRequestWithParams(null, {});
        const params = { params: { postId: 'post-001' } };
        const res = await GET(req, params);

        expect(res.status).toBe(503);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/database/i);
      });
    });
  });

  describe('POST /api/community/posts/[postId]/comments', () => {
    describe('Authentication', () => {
      it('should return 401 when no session exists', async () => {
        mockGetServerSession.mockResolvedValue(null);

        const req = createMockRequest(CLEAN_COMMENT_DATA);
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(401);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/unauthorized/i);
      });

      it('should return 401 when session has no user ID', async () => {
        mockGetServerSession.mockResolvedValue({
          user: { name: 'Test User' },
          expires: new Date(Date.now() + 86400000).toISOString(),
        });

        const req = createMockRequest(CLEAN_COMMENT_DATA);
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(401);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
      });

      it('should accept valid authenticated session', async () => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user2);
        mockCommunityService.addComment.mockResolvedValue({
          id: 'comment-new-001',
          moderationAction: null,
        });

        const req = createMockRequest(CLEAN_COMMENT_DATA);
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(201);
        expect(mockGetServerSession).toHaveBeenCalled();
      });
    });

    describe('Input Validation', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user2);
      });

      it('should return 400 when content is missing', async () => {
        const invalidData = {
          postId: 'post-001',
          authorId: TEST_USERS.user2.id,
          authorName: TEST_USERS.user2.name,
          // Missing content
        };

        const req = createMockRequest(invalidData);
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(400);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/invalid/i);
        expect(body.details).toBeDefined();
      });

      it('should return 400 when content is empty string', async () => {
        const invalidData = {
          postId: 'post-001',
          authorId: TEST_USERS.user2.id,
          authorName: TEST_USERS.user2.name,
          content: '',
        };

        const req = createMockRequest(invalidData);
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(400);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
      });

      it('should return 400 when content exceeds maximum length', async () => {
        const invalidData = {
          postId: 'post-001',
          authorId: TEST_USERS.user2.id,
          authorName: TEST_USERS.user2.name,
          content: 'a'.repeat(5001), // Exceeds 5000 char limit
        };

        const req = createMockRequest(invalidData);
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(400);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
      });

      it('should return 400 when authorId is missing', async () => {
        const invalidData = {
          postId: 'post-001',
          authorName: TEST_USERS.user2.name,
          content: 'Test content',
        };

        const req = createMockRequest(invalidData);
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(400);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
      });

      it('should accept valid comment data', async () => {
        mockCommunityService.addComment.mockResolvedValue({
          id: 'comment-new-001',
          moderationAction: null,
        });

        const req = createMockRequest(CLEAN_COMMENT_DATA);
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(201);
      });

      it('should accept optional parentCommentId for replies', async () => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
        mockCommunityService.addComment.mockResolvedValue({
          id: 'comment-reply-001',
          moderationAction: null,
        });

        const req = createMockRequest(REPLY_COMMENT_DATA);
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(201);
        expect(mockCommunityService.addComment).toHaveBeenCalledWith(
          expect.objectContaining({
            parentCommentId: 'comment-001',
          })
        );
      });
    });

    describe('Authorization', () => {
      it('should return 403 when authorId does not match session user ID', async () => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);

        const commentWithDifferentAuthor = {
          ...CLEAN_COMMENT_DATA,
          authorId: TEST_USERS.user3.id, // Different from session user
        };

        const req = createMockRequest(commentWithDifferentAuthor);
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(403);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/forbidden|mismatch/i);
      });

      it('should allow comment when authorId matches session user ID', async () => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user2);
        mockCommunityService.addComment.mockResolvedValue({
          id: 'comment-new-001',
          moderationAction: null,
        });

        const req = createMockRequest(CLEAN_COMMENT_DATA);
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(201);
      });
    });

    describe('Content Moderation', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user3);
      });

      it('should return moderation action when content is filtered', async () => {
        mockCommunityService.addComment.mockResolvedValue({
          id: 'comment-moderated-001',
          moderationAction: MOCK_MODERATION_FILTER,
        });

        const req = createMockRequest(PROFANITY_COMMENT_DATA);
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(201);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(true);
        expect(body.commentId).toBe('comment-moderated-001');
        expect(body.moderationAction).toEqual(MOCK_MODERATION_FILTER);
      });

      it('should return null moderationAction for clean content', async () => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user2);
        mockCommunityService.addComment.mockResolvedValue({
          id: 'comment-clean-001',
          moderationAction: null,
        });

        const req = createMockRequest(CLEAN_COMMENT_DATA);
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        const body = await readMockResponseJson(res);
        expect(body.moderationAction).toBeNull();
      });

      it('should return 400 when content is blocked by moderation', async () => {
        mockCommunityService.addComment.mockRejectedValue(
          new Error('Content violates community guidelines')
        );

        const severelyProfaneComment = {
          ...PROFANITY_COMMENT_DATA,
          content: 'Extremely offensive content here',
        };

        const req = createMockRequest(severelyProfaneComment);
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(400);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/moderation/i);
      });
    });

    describe('Service Integration', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user2);
      });

      it('should call communityService.addComment with correct data', async () => {
        mockCommunityService.addComment.mockResolvedValue({
          id: 'comment-new-001',
          moderationAction: null,
        });

        const req = createMockRequest(CLEAN_COMMENT_DATA);
        const params = { params: { postId: 'post-001' } };
        await POST(req, params);

        expect(mockCommunityService.addComment).toHaveBeenCalledWith(
          CLEAN_COMMENT_DATA
        );
        expect(mockCommunityService.addComment).toHaveBeenCalledTimes(1);
      });

      it('should return created comment ID in response', async () => {
        mockCommunityService.addComment.mockResolvedValue({
          id: 'comment-new-001',
          moderationAction: null,
        });

        const req = createMockRequest(CLEAN_COMMENT_DATA);
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(201);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(true);
        expect(body.commentId).toBe('comment-new-001');
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user2);
      });

      it('should return 404 when post does not exist', async () => {
        mockCommunityService.addComment.mockRejectedValue(
          new Error('Post not found')
        );

        const req = createMockRequest(CLEAN_COMMENT_DATA);
        const params = { params: { postId: 'non-existent' } };
        const res = await POST(req, params);

        expect(res.status).toBe(404);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/not found/i);
      });

      it('should return 503 when database error occurs', async () => {
        mockCommunityService.addComment.mockRejectedValue(
          new Error('SQLite connection failed')
        );

        const req = createMockRequest(CLEAN_COMMENT_DATA);
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(503);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/database/i);
      });

      it('should return 500 for generic errors', async () => {
        mockCommunityService.addComment.mockRejectedValue(
          new Error('Unexpected error')
        );

        const req = createMockRequest(CLEAN_COMMENT_DATA);
        const params = { params: { postId: 'post-001' } };
        const res = await POST(req, params);

        expect(res.status).toBe(500);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
      });
    });
  });

  describe('DELETE /api/community/posts/[postId]/comments', () => {
    describe('Authentication', () => {
      it('should return 401 when no session exists', async () => {
        mockGetServerSession.mockResolvedValue(null);

        const req = createMockRequestWithParams(null, {
          commentId: 'comment-001',
        });
        const params = { params: { postId: 'post-001' } };
        const res = await DELETE(req, params);

        expect(res.status).toBe(401);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/unauthorized/i);
      });

      it('should accept valid authenticated session', async () => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user2);
        mockCommunityService.deleteComment.mockResolvedValue(undefined);

        const req = createMockRequestWithParams(null, {
          commentId: 'comment-001',
        });
        const params = { params: { postId: 'post-001' } };
        const res = await DELETE(req, params);

        expect(res.status).toBe(200);
      });
    });

    describe('Input Validation', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user2);
      });

      it('should return 400 when commentId is missing', async () => {
        const req = createMockRequestWithParams(null, {});
        const params = { params: { postId: 'post-001' } };
        const res = await DELETE(req, params);

        expect(res.status).toBe(400);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/commentId/i);
      });

      it('should accept valid commentId', async () => {
        mockCommunityService.deleteComment.mockResolvedValue(undefined);

        const req = createMockRequestWithParams(null, {
          commentId: 'comment-001',
        });
        const params = { params: { postId: 'post-001' } };
        const res = await DELETE(req, params);

        expect(res.status).toBe(200);
      });
    });

    describe('Service Integration', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user2);
      });

      it('should call communityService.deleteComment with correct parameters', async () => {
        mockCommunityService.deleteComment.mockResolvedValue(undefined);

        const req = createMockRequestWithParams(null, {
          commentId: 'comment-001',
        });
        const params = { params: { postId: 'post-001' } };
        await DELETE(req, params);

        expect(mockCommunityService.deleteComment).toHaveBeenCalledWith(
          'post-001',
          'comment-001'
        );
        expect(mockCommunityService.deleteComment).toHaveBeenCalledTimes(1);
      });

      it('should return success response after deletion', async () => {
        mockCommunityService.deleteComment.mockResolvedValue(undefined);

        const req = createMockRequestWithParams(null, {
          commentId: 'comment-001',
        });
        const params = { params: { postId: 'post-001' } };
        const res = await DELETE(req, params);

        const body = await readMockResponseJson(res);
        expect(body.success).toBe(true);
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user2);
      });

      it('should return 404 when comment does not exist', async () => {
        mockCommunityService.deleteComment.mockRejectedValue(
          new Error('Comment not found')
        );

        const req = createMockRequestWithParams(null, {
          commentId: 'non-existent',
        });
        const params = { params: { postId: 'post-001' } };
        const res = await DELETE(req, params);

        expect(res.status).toBe(404);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/not found/i);
      });

      it('should return 403 when user tries to delete someone elses comment', async () => {
        mockCommunityService.deleteComment.mockRejectedValue(
          new Error('Unauthorized to delete this comment')
        );

        const req = createMockRequestWithParams(null, {
          commentId: 'comment-001',
        });
        const params = { params: { postId: 'post-001' } };
        const res = await DELETE(req, params);

        expect(res.status).toBe(403);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/forbidden|unauthorized/i);
      });

      it('should return 503 when database error occurs', async () => {
        mockCommunityService.deleteComment.mockRejectedValue(
          new Error('SQLite connection failed')
        );

        const req = createMockRequestWithParams(null, {
          commentId: 'comment-001',
        });
        const params = { params: { postId: 'post-001' } };
        const res = await DELETE(req, params);

        expect(res.status).toBe(503);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/database/i);
      });
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user2);
    });

    it('should handle rapid sequential comments', async () => {
      mockCommunityService.addComment
        .mockResolvedValueOnce({ id: 'comment-001', moderationAction: null })
        .mockResolvedValueOnce({ id: 'comment-002', moderationAction: null })
        .mockResolvedValueOnce({ id: 'comment-003', moderationAction: null });

      const req1 = createMockRequest(CLEAN_COMMENT_DATA);
      const req2 = createMockRequest(CLEAN_COMMENT_DATA);
      const req3 = createMockRequest(CLEAN_COMMENT_DATA);
      const params = { params: { postId: 'post-001' } };

      const res1 = await POST(req1, params);
      const res2 = await POST(req2, params);
      const res3 = await POST(req3, params);

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
      expect(res3.status).toBe(201);
      expect(mockCommunityService.addComment).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent comment requests', async () => {
      mockCommunityService.addComment.mockResolvedValue({
        id: 'comment-concurrent',
        moderationAction: null,
      });

      const req1 = createMockRequest(CLEAN_COMMENT_DATA);
      const req2 = createMockRequest(CLEAN_COMMENT_DATA);
      const params = { params: { postId: 'post-001' } };

      const [res1, res2] = await Promise.all([
        POST(req1, params),
        POST(req2, params),
      ]);

      expect(res1.status).toBe(201);
      expect(res2.status).toBe(201);
    });
  });
});
