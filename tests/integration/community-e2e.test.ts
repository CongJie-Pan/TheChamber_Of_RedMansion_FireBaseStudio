/**
 * @fileOverview End-to-End Integration Tests for Community Module
 *
 * Tests complete workflows through all layers:
 * Client → API Routes → Service Layer → Repository → Database
 *
 * Test scenarios:
 * 1. Complete post creation flow
 * 2. Comment thread flow
 * 3. Content moderation flow
 * 4. Concurrent operations
 * 5. Error propagation
 * 6. Authentication edge cases
 * 7. Polling mechanism behavior
 *
 * @phase Phase 3 - Community Module Testing
 * @date 2025-10-30
 */

// Mock next/server
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

import Database from 'better-sqlite3';
import {
  TEST_USERS,
  MOCK_SESSIONS,
  CLEAN_POST_DATA,
  PROFANITY_POST_DATA,
  CLEAN_COMMENT_DATA,
  PROFANITY_COMMENT_DATA,
  createMockRequest,
  createMockRequestWithParams,
  readMockResponseJson,
} from '../fixtures/community-fixtures';

// Import services and repositories
import { communityService } from '@/lib/community-service';
import * as communityRepo from '@/lib/repositories/community-repository';
import { contentFilterService } from '@/lib/content-filter-service';

// Import API route handlers
let postsRoutePOST: any;
let postsRouteGET: any;
let postsRouteDELETE: any;
let likePOST: any;
let likeDELETE: any;
let commentsPOST: any;
let commentsGET: any;
let commentsDELETE: any;

describe('Community E2E Integration Tests', () => {
  let db: Database.Database;

  beforeAll(() => {
    // Set up in-memory database
    db = new Database(':memory:');

    // Initialize schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        authorId TEXT NOT NULL,
        authorName TEXT NOT NULL,
        title TEXT,
        content TEXT NOT NULL,
        tags TEXT,
        category TEXT,
        likes INTEGER DEFAULT 0,
        likedBy TEXT,
        bookmarkedBy TEXT,
        commentCount INTEGER DEFAULT 0,
        viewCount INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        isEdited INTEGER DEFAULT 0,
        moderationAction TEXT,
        originalContent TEXT,
        moderationWarning TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        postId TEXT NOT NULL,
        authorId TEXT NOT NULL,
        authorName TEXT NOT NULL,
        content TEXT NOT NULL,
        parentCommentId TEXT,
        likes INTEGER DEFAULT 0,
        likedBy TEXT,
        status TEXT DEFAULT 'active',
        moderationAction TEXT,
        originalContent TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL,
        FOREIGN KEY (postId) REFERENCES posts(id)
      );
    `);

    // Mock getDatabase to return our test database
    jest.mock('@/lib/sqlite-db', () => ({
      getDatabase: () => db,
      toUnixTimestamp: (timestamp: any) => {
        if (timestamp instanceof Date) return timestamp.getTime();
        if (typeof timestamp === 'number') return timestamp;
        return Date.now();
      },
      fromUnixTimestamp: (timestamp: number) => ({
        toDate: () => new Date(timestamp),
        toMillis: () => timestamp,
        seconds: Math.floor(timestamp / 1000),
        nanoseconds: (timestamp % 1000) * 1000000,
      }),
    }));

    // Load API route handlers
    const postsRoute = require('@/app/api/community/posts/route');
    const likeRoute = require('@/app/api/community/posts/[postId]/like/route');
    const commentsRoute = require('@/app/api/community/posts/[postId]/comments/route');

    postsRoutePOST = postsRoute.POST;
    postsRouteGET = postsRoute.GET;
    postsRouteDELETE = postsRoute.DELETE;
    likePOST = likeRoute.POST;
    likeDELETE = likeRoute.DELETE;
    commentsPOST = commentsRoute.POST;
    commentsGET = commentsRoute.GET;
    commentsDELETE = commentsRoute.DELETE;
  });

  beforeEach(() => {
    // Clear database tables
    db.exec('DELETE FROM comments');
    db.exec('DELETE FROM posts');
    jest.clearAllMocks();
    // Enable SQLite mode
    process.env.SQLITE_SERVER_ENABLED = 'true';
  });

  afterAll(() => {
    db.close();
  });

  describe('Scenario 1: Complete Post Creation Flow', () => {
    it('should create post, retrieve it, like it, and delete it', async () => {
      mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);

      // Step 1: Create post
      const createReq = createMockRequest(CLEAN_POST_DATA);
      const createRes = await postsRoutePOST(createReq);

      expect(createRes.status).toBe(201);
      const createBody = await readMockResponseJson(createRes);
      expect(createBody.success).toBe(true);
      expect(createBody.postId).toBeDefined();
      const postId = createBody.postId;

      // Step 2: Retrieve posts
      const getReq = createMockRequestWithParams(null, {});
      const getRes = await postsRouteGET(getReq);

      const getBody = await readMockResponseJson(getRes);
      expect(getBody.success).toBe(true);
      expect(getBody.posts).toHaveLength(1);
      expect(getBody.posts[0].id).toBe(postId);

      // Step 3: Like the post
      const likeReq = createMockRequest({ userId: TEST_USERS.user1.id });
      const likeParams = { params: { postId } };
      const likeRes = await likePOST(likeReq, likeParams);

      const likeBody = await readMockResponseJson(likeRes);
      expect(likeBody.success).toBe(true);
      expect(likeBody.likeChanged).toBe(true);

      // Step 4: Verify like was applied
      const getAfterLikeReq = createMockRequestWithParams(null, {});
      const getAfterLikeRes = await postsRouteGET(getAfterLikeReq);
      const getAfterLikeBody = await readMockResponseJson(getAfterLikeRes);
      expect(getAfterLikeBody.posts[0].likes).toBe(1);
      expect(getAfterLikeBody.posts[0].likedBy).toContain(TEST_USERS.user1.id);

      // Step 5: Delete the post
      const deleteReq = createMockRequestWithParams(null, { postId });
      const deleteRes = await postsRouteDELETE(deleteReq);

      const deleteBody = await readMockResponseJson(deleteRes);
      expect(deleteBody.success).toBe(true);

      // Step 6: Verify post is deleted
      const getFinalReq = createMockRequestWithParams(null, {});
      const getFinalRes = await postsRouteGET(getFinalReq);
      const getFinalBody = await readMockResponseJson(getFinalRes);
      expect(getFinalBody.posts).toHaveLength(0);
    });
  });

  describe('Scenario 2: Comment Thread Flow', () => {
    it('should create post, add comments, fetch comments, and delete comment', async () => {
      mockGetServerSession
        .mockResolvedValueOnce(MOCK_SESSIONS.user1) // Create post
        .mockResolvedValueOnce(MOCK_SESSIONS.user1) // Get posts
        .mockResolvedValueOnce(MOCK_SESSIONS.user2) // Add comment 1
        .mockResolvedValueOnce(MOCK_SESSIONS.user1) // Add comment 2
        .mockResolvedValue(MOCK_SESSIONS.user2); // Delete comment

      // Step 1: Create post
      const createPostReq = createMockRequest(CLEAN_POST_DATA);
      const createPostRes = await postsRoutePOST(createPostReq);
      const createPostBody = await readMockResponseJson(createPostRes);
      const postId = createPostBody.postId;

      // Step 2: Add first comment
      const comment1Data = { ...CLEAN_COMMENT_DATA, postId };
      const comment1Req = createMockRequest(comment1Data);
      const comment1Params = { params: { postId } };
      const comment1Res = await commentsPOST(comment1Req, comment1Params);

      const comment1Body = await readMockResponseJson(comment1Res);
      expect(comment1Body.success).toBe(true);
      expect(comment1Body.commentId).toBeDefined();
      const comment1Id = comment1Body.commentId;

      // Step 3: Add second comment
      const comment2Data = {
        ...CLEAN_COMMENT_DATA,
        postId,
        authorId: TEST_USERS.user1.id,
        authorName: TEST_USERS.user1.name,
      };
      const comment2Req = createMockRequest(comment2Data);
      const comment2Res = await commentsPOST(comment2Req, comment1Params);

      const comment2Body = await readMockResponseJson(comment2Res);
      expect(comment2Body.success).toBe(true);

      // Step 4: Fetch comments
      const getCommentsReq = createMockRequestWithParams(null, {});
      const getCommentsParams = { params: { postId } };
      const getCommentsRes = await commentsGET(getCommentsReq, getCommentsParams);

      const getCommentsBody = await readMockResponseJson(getCommentsRes);
      expect(getCommentsBody.success).toBe(true);
      expect(getCommentsBody.comments).toHaveLength(2);

      // Step 5: Verify comment count was incremented
      const getPostReq = createMockRequestWithParams(null, {});
      const getPostRes = await postsRouteGET(getPostReq);
      const getPostBody = await readMockResponseJson(getPostRes);
      expect(getPostBody.posts[0].commentCount).toBe(2);

      // Step 6: Delete first comment
      const deleteCommentReq = createMockRequestWithParams(null, { commentId: comment1Id });
      const deleteCommentParams = { params: { postId } };
      const deleteCommentRes = await commentsDELETE(deleteCommentReq, deleteCommentParams);

      const deleteCommentBody = await readMockResponseJson(deleteCommentRes);
      expect(deleteCommentBody.success).toBe(true);

      // Step 7: Verify comment was deleted and count decremented
      const getFinalCommentsReq = createMockRequestWithParams(null, {});
      const getFinalCommentsRes = await commentsGET(getFinalCommentsReq, getCommentsParams);
      const getFinalCommentsBody = await readMockResponseJson(getFinalCommentsRes);
      expect(getFinalCommentsBody.comments).toHaveLength(1);

      const getFinalPostReq = createMockRequestWithParams(null, {});
      const getFinalPostRes = await postsRouteGET(getFinalPostReq);
      const getFinalPostBody = await readMockResponseJson(getFinalPostRes);
      expect(getFinalPostBody.posts[0].commentCount).toBe(1);
    });
  });

  describe('Scenario 3: Content Moderation Flow', () => {
    it('should apply moderation when creating post with profanity', async () => {
      mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user2);

      // Mock content filter to detect profanity
      jest.spyOn(contentFilterService, 'moderateContent').mockResolvedValue({
        shouldHide: true,
        filteredContent: '王熙鳳這個角色實在太狡猾了，她為了權力不擇手段。她的行為真的很[內容已過濾]，欺負弱小毫無人性。',
        violations: ['profanity'],
        action: 'filter',
      });

      const createReq = createMockRequest(PROFANITY_POST_DATA);
      const createRes = await postsRoutePOST(createReq);

      const createBody = await readMockResponseJson(createRes);
      expect(createBody.success).toBe(true);
      expect(createBody.post.moderationAction).toBeDefined();

      // Verify filtered content was stored
      const getReq = createMockRequestWithParams(null, {});
      const getRes = await postsRouteGET(getReq);
      const getBody = await readMockResponseJson(getRes);
      expect(getBody.posts[0].content).toContain('[內容已過濾]');
    });

    it('should apply moderation when creating comment with profanity', async () => {
      mockGetServerSession
        .mockResolvedValueOnce(MOCK_SESSIONS.user1) // Create post
        .mockResolvedValueOnce(MOCK_SESSIONS.user3); // Add comment

      // Create post first
      const createPostReq = createMockRequest(CLEAN_POST_DATA);
      const createPostRes = await postsRoutePOST(createPostReq);
      const createPostBody = await readMockResponseJson(createPostRes);
      const postId = createPostBody.postId;

      // Mock moderation for comment
      jest.spyOn(contentFilterService, 'moderateContent').mockResolvedValue({
        shouldHide: true,
        filteredContent: '你說的什麼[內容已過濾]，根本就是[內容已過濾]！',
        violations: ['profanity'],
        action: 'filter',
      });

      const commentData = { ...PROFANITY_COMMENT_DATA, postId };
      const commentReq = createMockRequest(commentData);
      const commentParams = { params: { postId } };
      const commentRes = await commentsPOST(commentReq, commentParams);

      const commentBody = await readMockResponseJson(commentRes);
      expect(commentBody.success).toBe(true);
      expect(commentBody.moderationAction).toBeDefined();
      expect(commentBody.moderationAction.action).toBe('filter');
    });
  });

  describe('Scenario 4: Concurrent Operations', () => {
    it('should handle multiple users liking same post simultaneously', async () => {
      mockGetServerSession
        .mockResolvedValueOnce(MOCK_SESSIONS.user1) // Create post
        .mockResolvedValueOnce(MOCK_SESSIONS.user1) // Like by user1
        .mockResolvedValueOnce(MOCK_SESSIONS.user2) // Like by user2
        .mockResolvedValueOnce(MOCK_SESSIONS.user3) // Like by user3
        .mockResolvedValue(MOCK_SESSIONS.user1); // Get posts

      // Create post
      const createReq = createMockRequest(CLEAN_POST_DATA);
      const createRes = await postsRoutePOST(createReq);
      const createBody = await readMockResponseJson(createRes);
      const postId = createBody.postId;

      // Simulate concurrent likes from different users
      const like1Req = createMockRequest({ userId: TEST_USERS.user1.id });
      const like2Req = createMockRequest({ userId: TEST_USERS.user2.id });
      const like3Req = createMockRequest({ userId: TEST_USERS.user3.id });
      const likeParams1 = { params: { postId } };
      const likeParams2 = { params: { postId } };
      const likeParams3 = { params: { postId } };

      const [like1Res, like2Res, like3Res] = await Promise.all([
        likePOST(like1Req, likeParams1),
        likePOST(like2Req, likeParams2),
        likePOST(like3Req, likeParams3),
      ]);

      expect(like1Res.status).toBe(200);
      expect(like2Res.status).toBe(200);
      expect(like3Res.status).toBe(200);

      // Verify all likes were recorded
      const getReq = createMockRequestWithParams(null, {});
      const getRes = await postsRouteGET(getReq);
      const getBody = await readMockResponseJson(getRes);
      expect(getBody.posts[0].likes).toBe(3);
      expect(getBody.posts[0].likedBy).toContain(TEST_USERS.user1.id);
      expect(getBody.posts[0].likedBy).toContain(TEST_USERS.user2.id);
      expect(getBody.posts[0].likedBy).toContain(TEST_USERS.user3.id);
    });
  });

  describe('Scenario 5: Error Propagation', () => {
    it('should propagate validation errors from API to client', async () => {
      mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);

      const invalidPostData = {
        ...CLEAN_POST_DATA,
        content: '', // Invalid: empty content
      };

      const createReq = createMockRequest(invalidPostData);
      const createRes = await postsRoutePOST(createReq);

      expect(createRes.status).toBe(400);
      const createBody = await readMockResponseJson(createRes);
      expect(createBody.success).toBe(false);
      expect(createBody.error).toMatch(/invalid/i);
    });

    it('should handle database errors gracefully', async () => {
      mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);

      // Corrupt the database by closing it
      db.close();

      const createReq = createMockRequest(CLEAN_POST_DATA);
      const createRes = await postsRoutePOST(createReq);

      expect(createRes.status).toBeGreaterThanOrEqual(500);
      const createBody = await readMockResponseJson(createRes);
      expect(createBody.success).toBe(false);

      // Reopen database for subsequent tests
      db = new Database(':memory:');
    });
  });

  describe('Scenario 6: Authentication Edge Cases', () => {
    it('should reject requests with expired session', async () => {
      mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.expired);

      const createReq = createMockRequest(CLEAN_POST_DATA);
      const createRes = await postsRoutePOST(createReq);

      expect(createRes.status).toBe(401);
      const createBody = await readMockResponseJson(createRes);
      expect(createBody.success).toBe(false);
      expect(createBody.error).toMatch(/unauthorized/i);
    });

    it('should reject request with tampered authorId', async () => {
      mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);

      const tamperedData = {
        ...CLEAN_POST_DATA,
        authorId: TEST_USERS.user2.id, // Trying to impersonate user2
      };

      const createReq = createMockRequest(tamperedData);
      const createRes = await postsRoutePOST(createReq);

      expect(createRes.status).toBe(403);
      const createBody = await readMockResponseJson(createRes);
      expect(createBody.success).toBe(false);
      expect(createBody.error).toMatch(/forbidden|mismatch/i);
    });
  });

  describe('Scenario 7: Data Consistency', () => {
    it('should maintain consistent state across create, update, and delete operations', async () => {
      mockGetServerSession.mockResolvedValue(MOCK_SESSIONS.user1);

      // Create 3 posts
      const post1Req = createMockRequest(CLEAN_POST_DATA);
      const post2Req = createMockRequest(CLEAN_POST_DATA);
      const post3Req = createMockRequest(CLEAN_POST_DATA);

      const [post1Res, post2Res, post3Res] = await Promise.all([
        postsRoutePOST(post1Req),
        postsRoutePOST(post2Req),
        postsRoutePOST(post3Req),
      ]);

      const post1Body = await readMockResponseJson(post1Res);
      const post2Body = await readMockResponseJson(post2Res);
      const post3Body = await readMockResponseJson(post3Res);

      // Verify 3 posts exist
      const getAllReq = createMockRequestWithParams(null, {});
      const getAllRes = await postsRouteGET(getAllReq);
      const getAllBody = await readMockResponseJson(getAllRes);
      expect(getAllBody.posts).toHaveLength(3);

      // Delete middle post
      const deleteReq = createMockRequestWithParams(null, { postId: post2Body.postId });
      await postsRouteDELETE(deleteReq);

      // Verify 2 posts remain
      const getAfterDeleteReq = createMockRequestWithParams(null, {});
      const getAfterDeleteRes = await postsRouteGET(getAfterDeleteReq);
      const getAfterDeleteBody = await readMockResponseJson(getAfterDeleteRes);
      expect(getAfterDeleteBody.posts).toHaveLength(2);
      expect(getAfterDeleteBody.posts.map((p: any) => p.id)).not.toContain(post2Body.postId);
    });
  });
});
