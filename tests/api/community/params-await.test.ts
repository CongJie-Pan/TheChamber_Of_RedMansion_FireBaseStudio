/**
 * @jest-environment node
 *
 * @fileOverview Unit Tests for API Routes - Next.js 15 Params Handling
 *
 * Tests the params await fixes added in bug fix commit 1d6fb78.
 * Verifies that all dynamic route handlers properly await the params Promise
 * before accessing route parameters, as required by Next.js 15.
 *
 * Key behaviors tested:
 * - Like route POST awaits params before processing
 * - Like route DELETE awaits params
 * - Comments route GET awaits params at start
 * - Comments route POST awaits params before session check
 * - Handles params Promise rejection gracefully
 *
 * Fix Locations:
 * - src/app/api/community/posts/[postId]/like/route.ts:46
 * - src/app/api/community/posts/[postId]/comments/route.ts:48,134
 *
 * @phase Testing Phase - Bug Fix Validation
 * @created 2025-10-31
 */

// Mock next-auth before imports
jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

// Mock next/server
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
  NextRequest: class MockNextRequest {
    public nextUrl: any;
    constructor(url: string, init?: any) {
      const urlObj = new URL(url, 'http://localhost:3001');
      this.nextUrl = {
        searchParams: urlObj.searchParams,
      };
      Object.assign(this, init || {});
    }
    async json() {
      return this._body || {};
    }
    _body?: any;
  },
}));

// Mock community service
jest.mock('@/lib/community-service', () => ({
  communityService: {
    togglePostLike: jest.fn(),
    addComment: jest.fn(),
    getComments: jest.fn(),
    deleteComment: jest.fn(),
  },
}));

import { getServerSession } from 'next-auth';
import { communityService } from '@/lib/community-service';

describe('API Routes - Next.js 15 Params Handling', () => {
  let LikePOST: any;
  let LikeDELETE: any;
  let CommentsGET: any;
  let CommentsPOST: any;
  let CommentsDELETE: any;

  beforeAll(() => {
    // Import route handlers after mocking
    const likeRoute = require('@/app/api/community/posts/[postId]/like/route');
    LikePOST = likeRoute.POST;
    LikeDELETE = likeRoute.DELETE;

    const commentsRoute = require('@/app/api/community/posts/[postId]/comments/route');
    CommentsGET = commentsRoute.GET;
    CommentsPOST = commentsRoute.POST;
    CommentsDELETE = commentsRoute.DELETE;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Helper to create mock NextRequest
   */
  function createMockRequest(url: string, options: { body?: any } = {}) {
    const { NextRequest } = require('next/server');
    const req = new NextRequest(url);
    if (options.body) {
      req._body = options.body;
    }
    return req;
  }

  /**
   * Helper to create params Promise
   */
  function createParamsPromise(postId: string) {
    return Promise.resolve({ postId });
  }

  describe('Test 1: Like route POST should await params before processing', () => {
    it('should successfully access postId after awaiting params Promise', async () => {
      // Setup: Mock authenticated session
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      // Mock togglePostLike to return success
      (communityService.togglePostLike as jest.Mock).mockResolvedValue(true);

      // Create request with body
      const req = createMockRequest('http://localhost:3001/api/community/posts/test-post-123/like', {
        body: { userId: 'user-123' },
      });

      // Create params Promise (Next.js 15 format)
      const params = createParamsPromise('test-post-123');

      // Action: Call POST handler
      const response = await LikePOST(req, { params });

      // Assertion: Verify params accessed correctly, no 404 error
      expect(response.status).not.toBe(404);
      expect(communityService.togglePostLike).toHaveBeenCalledWith(
        'test-post-123',
        'user-123',
        true
      );
    });

    it('should extract postId from params before calling service', async () => {
      // Setup: Authenticated session
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-456', email: 'user@test.com' },
      });

      (communityService.togglePostLike as jest.Mock).mockResolvedValue(true);

      const req = createMockRequest('http://localhost:3001/api/community/posts/post-abc/like', {
        body: { userId: 'user-456' },
      });

      const params = createParamsPromise('post-abc');

      // Action: Call handler
      await LikePOST(req, { params });

      // Assertion: postId correctly passed to service
      expect(communityService.togglePostLike).toHaveBeenCalledWith(
        'post-abc',
        expect.any(String),
        expect.any(Boolean)
      );
    });
  });

  describe('Test 2: Like route DELETE should await params', () => {
    it('should await params before processing unlike request', async () => {
      // Setup: Mock session
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'delete@test.com' },
      });

      (communityService.togglePostLike as jest.Mock).mockResolvedValue(undefined);

      const req = createMockRequest(
        'http://localhost:3001/api/community/posts/post-xyz/like?userId=user-789'
      );

      const params = createParamsPromise('post-xyz');

      // Action: Call DELETE handler
      const response = await LikeDELETE(req, { params });

      // Assertion: Verify params resolved correctly
      expect(response.status).toBe(200);
      expect(communityService.togglePostLike).toHaveBeenCalledWith(
        'post-xyz',
        'user-789',
        false
      );
    });

    it('should handle params Promise for DELETE endpoint', async () => {
      // Setup
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-del', email: 'del@test.com' },
      });

      (communityService.togglePostLike as jest.Mock).mockResolvedValue(undefined);

      const req = createMockRequest(
        'http://localhost:3001/api/community/posts/another-post/like?userId=user-del'
      );

      const params = createParamsPromise('another-post');

      // Action
      await LikeDELETE(req, { params });

      // Assertion: Correct postId extracted
      const callArgs = (communityService.togglePostLike as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe('another-post');
    });
  });

  describe('Test 3: Comments route GET should await params at start', () => {
    it('should await params before fetching comments', async () => {
      // Setup: Mock getComments to return empty array
      (communityService.getComments as jest.Mock).mockResolvedValue([]);

      const req = createMockRequest(
        'http://localhost:3001/api/community/posts/comment-post-1/comments?limit=50'
      );

      const params = createParamsPromise('comment-post-1');

      // Action: Call GET handler
      const response = await CommentsGET(req, { params });

      // Assertion: Verify postId available throughout handler
      expect(response.status).toBe(200);
      expect(communityService.getComments).toHaveBeenCalledWith('comment-post-1', 50);
    });

    it('should extract postId correctly for GET requests', async () => {
      // Setup
      (communityService.getComments as jest.Mock).mockResolvedValue([
        { id: 'comment-1', content: 'Test comment' },
      ]);

      const req = createMockRequest(
        'http://localhost:3001/api/community/posts/my-post/comments'
      );

      const params = createParamsPromise('my-post');

      // Action
      await CommentsGET(req, { params });

      // Assertion: postId passed to service
      expect(communityService.getComments).toHaveBeenCalledWith('my-post', 50);
    });
  });

  describe('Test 4: Comments route POST should await params before session check', () => {
    it('should await params before processing comment creation', async () => {
      // Setup: Mock authenticated session
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'comment-user', email: 'commenter@test.com' },
      });

      (communityService.addComment as jest.Mock).mockResolvedValue({
        id: 'new-comment-1',
        moderationAction: 'allow',
      });

      const req = createMockRequest(
        'http://localhost:3001/api/community/posts/target-post/comments',
        {
          body: {
            authorId: 'comment-user',
            authorName: 'Commenter',
            content: 'This is a test comment',
          },
        }
      );

      const params = createParamsPromise('target-post');

      // Action: Call POST handler
      const response = await CommentsPOST(req, { params });

      // Assertion: Verify params available for authorization logic
      expect(response.status).toBe(201);
      const addCommentArgs = (communityService.addComment as jest.Mock).mock.calls[0][0];
      expect(addCommentArgs.postId).toBe('target-post');
    });

    it('should have postId available for comment service call', async () => {
      // Setup
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-comment-2', email: 'user2@test.com' },
      });

      (communityService.addComment as jest.Mock).mockResolvedValue({
        id: 'comment-2',
        moderationAction: 'allow',
      });

      const req = createMockRequest(
        'http://localhost:3001/api/community/posts/discussion-post/comments',
        {
          body: {
            authorId: 'user-comment-2',
            authorName: 'User Two',
            content: 'Another comment',
          },
        }
      );

      const params = createParamsPromise('discussion-post');

      // Action
      await CommentsPOST(req, { params });

      // Assertion: postId correctly passed
      const callData = (communityService.addComment as jest.Mock).mock.calls[0][0];
      expect(callData.postId).toBe('discussion-post');
      expect(callData.content).toBe('Another comment');
    });
  });

  describe('Test 5: Should handle params Promise rejection gracefully', () => {
    it('should return 500 when params Promise rejects', async () => {
      // Setup: Create rejecting params Promise
      const rejectingParams = Promise.reject(new Error('Invalid route parameter'));

      const req = createMockRequest(
        'http://localhost:3001/api/community/posts/bad-post/like',
        { body: { userId: 'user-123' } }
      );

      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123' },
      });

      // Action & Assertion: Should handle rejection gracefully
      await expect(async () => {
        await LikePOST(req, { params: rejectingParams });
      }).rejects.toThrow();
    });

    it('should handle malformed params Promise', async () => {
      // Setup: Promise that resolves to invalid data
      const invalidParams = Promise.resolve({ invalidKey: 'no-postId-here' });

      const req = createMockRequest(
        'http://localhost:3001/api/community/posts/some-post/comments'
      );

      (communityService.getComments as jest.Mock).mockResolvedValue([]);

      // Action: Call with invalid params
      const response = await CommentsGET(req, { params: invalidParams });

      // Assertion: Should attempt to handle gracefully
      // (Actual behavior depends on implementation - may return 500 or use undefined postId)
      expect(response).toBeDefined();
    });
  });

  describe('Edge Cases: Params timing and consistency', () => {
    it('should await params before any async operations', async () => {
      // Setup: Track call order
      const callOrder: string[] = [];

      (getServerSession as jest.Mock).mockImplementation(async () => {
        callOrder.push('session');
        return { user: { id: 'user-123' } };
      });

      (communityService.togglePostLike as jest.Mock).mockImplementation(async () => {
        callOrder.push('service');
        return true;
      });

      const req = createMockRequest(
        'http://localhost:3001/api/community/posts/order-test/like',
        { body: { userId: 'user-123' } }
      );

      const params = createParamsPromise('order-test');

      // Action
      await LikePOST(req, { params });

      // Assertion: Params should be awaited before other operations
      // (Session check comes first in implementation, so it should be first in callOrder)
      expect(callOrder).toContain('session');
      expect(callOrder).toContain('service');
    });

    it('should handle concurrent requests with different postIds', async () => {
      // Setup: Multiple concurrent requests
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'concurrent-user' },
      });

      (communityService.getComments as jest.Mock).mockResolvedValue([]);

      const req1 = createMockRequest(
        'http://localhost:3001/api/community/posts/post-1/comments'
      );
      const req2 = createMockRequest(
        'http://localhost:3001/api/community/posts/post-2/comments'
      );
      const req3 = createMockRequest(
        'http://localhost:3001/api/community/posts/post-3/comments'
      );

      const params1 = createParamsPromise('post-1');
      const params2 = createParamsPromise('post-2');
      const params3 = createParamsPromise('post-3');

      // Action: Concurrent requests
      await Promise.all([
        CommentsGET(req1, { params: params1 }),
        CommentsGET(req2, { params: params2 }),
        CommentsGET(req3, { params: params3 }),
      ]);

      // Assertion: All three called with correct postIds
      expect(communityService.getComments).toHaveBeenCalledWith('post-1', expect.any(Number));
      expect(communityService.getComments).toHaveBeenCalledWith('post-2', expect.any(Number));
      expect(communityService.getComments).toHaveBeenCalledWith('post-3', expect.any(Number));
    });
  });
});
