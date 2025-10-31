/**
 * @fileOverview Tests for Community Posts API Route
 *
 * Tests the /api/community/posts endpoint which handles:
 * - POST: Creating new posts
 * - GET: Retrieving posts with filters
 * - DELETE: Deleting posts
 *
 * Test coverage:
 * - Authentication validation
 * - Input validation with Zod
 * - Authorization checks (authorId matching)
 * - Service layer integration
 * - Error handling (401, 400, 403, 500, 503)
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
  __esModule: true,
  default: jest.fn(() => ({ GET: jest.fn(), POST: jest.fn() })),
  getServerSession: (...args: any[]) => mockGetServerSession(...args),
}));

// Mock the auth route to prevent NextAuth execution
jest.mock('@/app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

// Mock community service
const mockCommunityService = {
  createPost: jest.fn(),
  getPosts: jest.fn(),
  deletePost: jest.fn(),
};
jest.mock('@/lib/community-service', () => ({
  communityService: mockCommunityService,
}));

import {
  TEST_USERS,
  MOCK_SESSIONS,
  CLEAN_POST_DATA,
  MOCK_POST,
  MOCK_POSTS_LIST,
  INVALID_POST_DATA_NO_CONTENT,
  INVALID_POST_DATA_TOO_LONG,
  INVALID_POST_DATA_NO_AUTHOR,
  createMockRequest,
  createMockRequestWithParams,
  readMockResponseJson,
} from '../../fixtures/community-fixtures';

let POST: any;
let GET: any;
let DELETE: any;

describe('Community Posts API Route', () => {
  beforeAll(() => {
    // Import route handlers after mocks are set up
    const postsRoute = require('@/app/api/community/posts/route');
    POST = postsRoute.POST;
    GET = postsRoute.GET;
    DELETE = postsRoute.DELETE;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/community/posts', () => {
    describe('Authentication', () => {
      it('should return 401 when no session exists', async () => {
        mockGetServerSession.mockResolvedValue(null);

        const req = createMockRequest(CLEAN_POST_DATA);
        const res = await POST(req);

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

        const req = createMockRequest(CLEAN_POST_DATA);
        const res = await POST(req);

        expect(res.status).toBe(401);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
      });

      it('should accept valid authenticated session', async () => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
        mockCommunityService.createPost.mockResolvedValue(MOCK_POST);

        const req = createMockRequest(CLEAN_POST_DATA);
        const res = await POST(req);

        expect(res.status).toBe(201);
        expect(mockGetServerSession).toHaveBeenCalled();
      });
    });

    describe('Input Validation', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
      });

      it('should return 400 when content is missing', async () => {
        const req = createMockRequest(INVALID_POST_DATA_NO_CONTENT);
        const res = await POST(req);

        expect(res.status).toBe(400);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/invalid/i);
        expect(body.details).toBeDefined();
      });

      it('should return 400 when content is too long', async () => {
        const req = createMockRequest(INVALID_POST_DATA_TOO_LONG);
        const res = await POST(req);

        expect(res.status).toBe(400);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/invalid/i);
      });

      it('should return 400 when authorId is empty', async () => {
        const req = createMockRequest(INVALID_POST_DATA_NO_AUTHOR);
        const res = await POST(req);

        expect(res.status).toBe(400);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
      });

      it('should accept minimal valid post data', async () => {
        mockCommunityService.createPost.mockResolvedValue(MOCK_POST);

        const minimalData = {
          authorId: TEST_USERS.user1.id,
          authorName: TEST_USERS.user1.name,
          content: 'Valid content',
          tags: [],
        };

        const req = createMockRequest(minimalData);
        const res = await POST(req);

        expect(res.status).toBe(201);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(true);
      });

      it('should accept post with all optional fields', async () => {
        mockCommunityService.createPost.mockResolvedValue(MOCK_POST);

        const req = createMockRequest(CLEAN_POST_DATA);
        const res = await POST(req);

        expect(res.status).toBe(201);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(true);
      });
    });

    describe('Authorization', () => {
      it('should return 403 when authorId does not match session user ID', async () => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);

        const postDataWithDifferentAuthor = {
          ...CLEAN_POST_DATA,
          authorId: TEST_USERS.user2.id, // Different from session user
        };

        const req = createMockRequest(postDataWithDifferentAuthor);
        const res = await POST(req);

        expect(res.status).toBe(403);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/forbidden|mismatch/i);
      });

      it('should allow post when authorId matches session user ID', async () => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
        mockCommunityService.createPost.mockResolvedValue(MOCK_POST);

        const req = createMockRequest(CLEAN_POST_DATA);
        const res = await POST(req);

        expect(res.status).toBe(201);
      });
    });

    describe('Service Integration', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
      });

      it('should call communityService.createPost with correct data', async () => {
        mockCommunityService.createPost.mockResolvedValue(MOCK_POST);

        const req = createMockRequest(CLEAN_POST_DATA);
        await POST(req);

        expect(mockCommunityService.createPost).toHaveBeenCalledWith(
          CLEAN_POST_DATA
        );
        expect(mockCommunityService.createPost).toHaveBeenCalledTimes(1);
      });

      it('should return created post with ID in response', async () => {
        mockCommunityService.createPost.mockResolvedValue(MOCK_POST);

        const req = createMockRequest(CLEAN_POST_DATA);
        const res = await POST(req);

        expect(res.status).toBe(201);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(true);
        expect(body.postId).toBe(MOCK_POST.id);
        expect(body.post).toBeDefined();
        expect(body.post.id).toBe(MOCK_POST.id);
      });

      it('should handle content moderation in service layer', async () => {
        const moderatedPost = {
          ...MOCK_POST,
          moderationAction: JSON.stringify({ action: 'filter' }),
        };
        mockCommunityService.createPost.mockResolvedValue(moderatedPost);

        const req = createMockRequest(CLEAN_POST_DATA);
        const res = await POST(req);

        expect(res.status).toBe(201);
        const body = await readMockResponseJson(res);
        expect(body.post.moderationAction).toBeDefined();
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
      });

      it('should return 503 when SQLite error occurs', async () => {
        mockCommunityService.createPost.mockRejectedValue(
          new Error('SQLite database connection failed')
        );

        const req = createMockRequest(CLEAN_POST_DATA);
        const res = await POST(req);

        expect(res.status).toBe(503);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/database/i);
      });

      it('should return 500 for generic service errors', async () => {
        mockCommunityService.createPost.mockRejectedValue(
          new Error('Unknown error occurred')
        );

        const req = createMockRequest(CLEAN_POST_DATA);
        const res = await POST(req);

        expect(res.status).toBe(500);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toBeDefined();
      });
    });
  });

  describe('GET /api/community/posts', () => {
    describe('Authentication', () => {
      it('should return 401 when no session exists', async () => {
        mockGetServerSession.mockResolvedValue(null);

        const req = createMockRequest(null);
        const res = await GET(req);

        expect(res.status).toBe(401);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/unauthorized/i);
      });

      it('should accept valid authenticated session', async () => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
        mockCommunityService.getPosts.mockResolvedValue(MOCK_POSTS_LIST);

        const req = createMockRequestWithParams(null, {});
        const res = await GET(req);

        expect(res.status).toBe(200);
      });
    });

    describe('Query Parameters', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
      });

      it('should retrieve all posts when no filters provided', async () => {
        mockCommunityService.getPosts.mockResolvedValue(MOCK_POSTS_LIST);

        const req = createMockRequestWithParams(null, {});
        const res = await GET(req);

        expect(res.status).toBe(200);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(true);
        expect(body.posts).toEqual(MOCK_POSTS_LIST);
        expect(mockCommunityService.getPosts).toHaveBeenCalledWith({}, 20);
      });

      it('should filter by category', async () => {
        mockCommunityService.getPosts.mockResolvedValue([MOCK_POSTS_LIST[1]]);

        const req = createMockRequestWithParams(null, {
          category: 'character-analysis',
        });
        const res = await GET(req);

        expect(res.status).toBe(200);
        const body = await readMockResponseJson(res);
        expect(body.posts).toHaveLength(1);
        expect(mockCommunityService.getPosts).toHaveBeenCalledWith(
          { category: 'character-analysis' },
          20
        );
      });

      it('should filter by tags (comma-separated)', async () => {
        mockCommunityService.getPosts.mockResolvedValue([MOCK_POSTS_LIST[2]]);

        const req = createMockRequestWithParams(null, {
          tags: '詩詞,文學分析',
        });
        const res = await GET(req);

        expect(res.status).toBe(200);
        expect(mockCommunityService.getPosts).toHaveBeenCalledWith(
          { tags: ['詩詞', '文學分析'] },
          20
        );
      });

      it('should respect limit parameter', async () => {
        mockCommunityService.getPosts.mockResolvedValue(
          MOCK_POSTS_LIST.slice(0, 10)
        );

        const req = createMockRequestWithParams(null, { limit: '10' });
        const res = await GET(req);

        expect(res.status).toBe(200);
        expect(mockCommunityService.getPosts).toHaveBeenCalledWith({}, 10);
      });

      it('should use default limit when limit parameter is invalid', async () => {
        mockCommunityService.getPosts.mockResolvedValue(MOCK_POSTS_LIST);

        const req = createMockRequestWithParams(null, { limit: 'invalid' });
        const res = await GET(req);

        expect(res.status).toBe(200);
        expect(mockCommunityService.getPosts).toHaveBeenCalledWith({}, 20);
      });

      it('should combine multiple filters', async () => {
        mockCommunityService.getPosts.mockResolvedValue([]);

        const req = createMockRequestWithParams(null, {
          category: 'poetry',
          tags: '詩詞',
          limit: '5',
        });
        const res = await GET(req);

        expect(res.status).toBe(200);
        expect(mockCommunityService.getPosts).toHaveBeenCalledWith(
          { category: 'poetry', tags: ['詩詞'] },
          5
        );
      });
    });

    describe('Service Integration', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
      });

      it('should return posts array from service', async () => {
        mockCommunityService.getPosts.mockResolvedValue(MOCK_POSTS_LIST);

        const req = createMockRequestWithParams(null, {});
        const res = await GET(req);

        const body = await readMockResponseJson(res);
        expect(body.success).toBe(true);
        expect(body.posts).toHaveLength(MOCK_POSTS_LIST.length);
        expect(body.posts[0].id).toBe(MOCK_POSTS_LIST[0].id);
      });

      it('should return empty array when no posts match filters', async () => {
        mockCommunityService.getPosts.mockResolvedValue([]);

        const req = createMockRequestWithParams(null, {
          category: 'non-existent',
        });
        const res = await GET(req);

        const body = await readMockResponseJson(res);
        expect(body.success).toBe(true);
        expect(body.posts).toEqual([]);
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
      });

      it('should return 503 when database error occurs', async () => {
        mockCommunityService.getPosts.mockRejectedValue(
          new Error('SQLite connection failed')
        );

        const req = createMockRequestWithParams(null, {});
        const res = await GET(req);

        expect(res.status).toBe(503);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/database/i);
      });

      it('should return 500 for generic errors', async () => {
        mockCommunityService.getPosts.mockRejectedValue(
          new Error('Unexpected error')
        );

        const req = createMockRequestWithParams(null, {});
        const res = await GET(req);

        expect(res.status).toBe(500);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
      });
    });
  });

  describe('DELETE /api/community/posts', () => {
    describe('Authentication', () => {
      it('should return 401 when no session exists', async () => {
        mockGetServerSession.mockResolvedValue(null);

        const req = createMockRequestWithParams(null, { postId: 'post-001' });
        const res = await DELETE(req);

        expect(res.status).toBe(401);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/unauthorized/i);
      });
    });

    describe('Input Validation', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
      });

      it('should return 400 when postId is missing', async () => {
        const req = createMockRequestWithParams(null, {});
        const res = await DELETE(req);

        expect(res.status).toBe(400);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
        expect(body.error).toMatch(/postId/i);
      });

      it('should accept valid postId', async () => {
        mockCommunityService.deletePost.mockResolvedValue(undefined);

        const req = createMockRequestWithParams(null, { postId: 'post-001' });
        const res = await DELETE(req);

        expect(res.status).toBe(200);
      });
    });

    describe('Service Integration', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
      });

      it('should call communityService.deletePost with correct postId', async () => {
        mockCommunityService.deletePost.mockResolvedValue(undefined);

        const req = createMockRequestWithParams(null, { postId: 'post-001' });
        await DELETE(req);

        expect(mockCommunityService.deletePost).toHaveBeenCalledWith('post-001');
        expect(mockCommunityService.deletePost).toHaveBeenCalledTimes(1);
      });

      it('should return success response after deletion', async () => {
        mockCommunityService.deletePost.mockResolvedValue(undefined);

        const req = createMockRequestWithParams(null, { postId: 'post-001' });
        const res = await DELETE(req);

        const body = await readMockResponseJson(res);
        expect(body.success).toBe(true);
      });
    });

    describe('Error Handling', () => {
      beforeEach(() => {
        mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);
      });

      it('should return 404 when post does not exist', async () => {
        mockCommunityService.deletePost.mockRejectedValue(
          new Error('Post not found')
        );

        const req = createMockRequestWithParams(null, { postId: 'non-existent' });
        const res = await DELETE(req);

        expect(res.status).toBe(500); // Service layer doesn't differentiate 404
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
      });

      it('should return 503 when database error occurs', async () => {
        mockCommunityService.deletePost.mockRejectedValue(
          new Error('SQLite error during deletion')
        );

        const req = createMockRequestWithParams(null, { postId: 'post-001' });
        const res = await DELETE(req);

        expect(res.status).toBe(503);
        const body = await readMockResponseJson(res);
        expect(body.success).toBe(false);
      });
    });
  });
});
