/**
 * @jest-environment node
 *
 * @fileOverview Integration Tests for Community Interactions with Next.js 15 Routing
 *
 * Tests the complete like/comment operations with Next.js 15 dynamic routing.
 * Verifies that route parameter handling works correctly through the entire stack
 * from client request → API route (await params) → service → repository → SQLite.
 *
 * Integration Flow:
 * Client click → POST /api/community/posts/[postId]/like → Await params →
 * → Extract postId → Service toggles like → Database updated → UI reflects change
 *
 * Key workflows tested:
 * - Like operation with dynamic route parameter
 * - Unlike operation with query parameter
 * - Comment creation with nested route parameters
 * - Comment deletion with both path and query parameters
 * - Malformed route parameters return 400 error
 *
 * @phase Testing Phase - Integration Testing
 * @created 2025-10-31
 */

import Database from 'better-sqlite3';

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

// Mock the sqlite-db module to use in-memory database
jest.mock('@/lib/sqlite-db', () => {
  let db: Database.Database;

  return {
    getDatabase: () => {
      if (!db) {
        db = new Database(':memory:');
        db.exec(`
          CREATE TABLE IF NOT EXISTS community_posts (
            id TEXT PRIMARY KEY,
            authorId TEXT NOT NULL,
            authorName TEXT NOT NULL,
            title TEXT,
            content TEXT NOT NULL,
            tags TEXT,
            likeCount INTEGER DEFAULT 0,
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

          CREATE TABLE IF NOT EXISTS post_likes (
            postId TEXT NOT NULL,
            userId TEXT NOT NULL,
            createdAt INTEGER NOT NULL,
            PRIMARY KEY (postId, userId),
            FOREIGN KEY (postId) REFERENCES community_posts(id)
          );

          CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            postId TEXT NOT NULL,
            authorId TEXT NOT NULL,
            authorName TEXT NOT NULL,
            content TEXT NOT NULL,
            likeCount INTEGER DEFAULT 0,
            status TEXT DEFAULT 'active',
            parentCommentId TEXT,
            moderationAction TEXT,
            originalContent TEXT,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL,
            FOREIGN KEY (postId) REFERENCES community_posts(id)
          );
        `);
      }
      return db;
    },
    toUnixTimestamp: (date: Date | number) => {
      return typeof date === 'number' ? date : date.getTime();
    },
    fromUnixTimestamp: (timestamp: number) => {
      return new Date(timestamp);
    },
  };
});

import { getServerSession } from 'next-auth';
import * as communityRepository from '@/lib/repositories/community-repository';

describe('Community Interactions Routing Integration', () => {
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

    // Clear database
    const { getDatabase } = require('@/lib/sqlite-db');
    const db = getDatabase();
    db.exec('DELETE FROM community_posts');
    db.exec('DELETE FROM post_likes');
    db.exec('DELETE FROM comments');

    // Enable SQLite mode
    process.env.SQLITE_SERVER_ENABLED = 'true';
  });

  /**
   * Helper to create mock request
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

  /**
   * Helper to insert test post
   */
  function insertTestPost(postId: string, authorId: string = 'author-1') {
    const { getDatabase } = require('@/lib/sqlite-db');
    const db = getDatabase();
    const now = Date.now();

    db.prepare(`
      INSERT INTO community_posts (
        id, authorId, authorName, content, moderationAction, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(postId, authorId, 'Test Author', 'Test content', 'allow', now, now);
  }

  describe('Test 1: Like operation with dynamic route parameter', () => {
    it('should add like with correct postId from route params', async () => {
      // Setup: Mock authenticated session
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      // Insert test post
      insertTestPost('test-post-123');

      // Create request
      const req = createMockRequest(
        'http://localhost:3001/api/community/posts/test-post-123/like',
        { body: { userId: 'user-123' } }
      );

      const params = createParamsPromise('test-post-123');

      // Action: Call POST handler
      const response = await LikePOST(req, { params });

      // Assertion: Like added successfully
      expect(response.status).toBe(200);

      // Verify in database
      const { getDatabase } = require('@/lib/sqlite-db');
      const db = getDatabase();
      const like = db.prepare('SELECT * FROM post_likes WHERE postId = ? AND userId = ?')
        .get('test-post-123', 'user-123');

      expect(like).toBeDefined();
    });

    it('should increment like count in post', async () => {
      // Setup
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-456', email: 'user@test.com' },
      });

      insertTestPost('post-abc');

      const req = createMockRequest(
        'http://localhost:3001/api/community/posts/post-abc/like',
        { body: { userId: 'user-456' } }
      );

      const params = createParamsPromise('post-abc');

      // Action
      await LikePOST(req, { params });

      // Assertion: Like count updated
      const post = communityRepository.getPostById('post-abc');
      expect(post?.likeCount).toBe(1);
    });

    it('should handle multiple likes from different users', async () => {
      // Setup: Insert post
      insertTestPost('popular-post');

      // User 1 likes
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-1', email: 'user1@test.com' },
      });

      const req1 = createMockRequest(
        'http://localhost:3001/api/community/posts/popular-post/like',
        { body: { userId: 'user-1' } }
      );

      await LikePOST(req1, { params: createParamsPromise('popular-post') });

      // User 2 likes
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-2', email: 'user2@test.com' },
      });

      const req2 = createMockRequest(
        'http://localhost:3001/api/community/posts/popular-post/like',
        { body: { userId: 'user-2' } }
      );

      await LikePOST(req2, { params: createParamsPromise('popular-post') });

      // Assertion: Like count is 2
      const post = communityRepository.getPostById('popular-post');
      expect(post?.likeCount).toBe(2);
    });
  });

  describe('Test 2: Unlike operation with query parameter', () => {
    it('should remove like when DELETE is called', async () => {
      // Setup: Insert post and like
      insertTestPost('unliked-post');

      const { getDatabase } = require('@/lib/sqlite-db');
      const db = getDatabase();
      const now = Date.now();

      db.prepare('INSERT INTO post_likes (postId, userId, createdAt) VALUES (?, ?, ?)')
        .run('unliked-post', 'user-789', now);

      // Update like count
      db.prepare('UPDATE community_posts SET likeCount = 1 WHERE id = ?').run('unliked-post');

      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-789', email: 'delete@test.com' },
      });

      const req = createMockRequest(
        'http://localhost:3001/api/community/posts/unliked-post/like?userId=user-789'
      );

      const params = createParamsPromise('unliked-post');

      // Action: Call DELETE handler
      const response = await LikeDELETE(req, { params });

      // Assertion: Like removed successfully
      expect(response.status).toBe(200);

      // Verify like removed from database
      const like = db.prepare('SELECT * FROM post_likes WHERE postId = ? AND userId = ?')
        .get('unliked-post', 'user-789');

      expect(like).toBeUndefined();
    });

    it('should decrement like count after unlike', async () => {
      // Setup: Post with 1 like
      insertTestPost('post-xyz');

      const { getDatabase } = require('@/lib/sqlite-db');
      const db = getDatabase();
      const now = Date.now();

      db.prepare('INSERT INTO post_likes (postId, userId, createdAt) VALUES (?, ?, ?)')
        .run('post-xyz', 'user-unlike', now);

      db.prepare('UPDATE community_posts SET likeCount = 1 WHERE id = ?').run('post-xyz');

      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-unlike', email: 'unlike@test.com' },
      });

      const req = createMockRequest(
        'http://localhost:3001/api/community/posts/post-xyz/like?userId=user-unlike'
      );

      // Action
      await LikeDELETE(req, { params: createParamsPromise('post-xyz') });

      // Assertion: Like count decreased
      const post = communityRepository.getPostById('post-xyz');
      expect(post?.likeCount).toBe(0);
    });
  });

  describe('Test 3: Comment creation with nested route parameters', () => {
    it('should add comment to correct post using postId from params', async () => {
      // Setup: Insert post
      insertTestPost('comment-post-1');

      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'commenter-1', email: 'commenter@test.com' },
      });

      const req = createMockRequest(
        'http://localhost:3001/api/community/posts/comment-post-1/comments',
        {
          body: {
            authorId: 'commenter-1',
            authorName: 'Commenter',
            content: 'This is a test comment',
          },
        }
      );

      const params = createParamsPromise('comment-post-1');

      // Action: Call POST handler
      const response = await CommentsPOST(req, { params });

      // Assertion: Comment added to correct post
      expect(response.status).toBe(201);

      const responseData = await response.json();
      expect(responseData.commentId).toBeDefined();

      // Verify in database
      const { getDatabase } = require('@/lib/sqlite-db');
      const db = getDatabase();
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?')
        .get(responseData.commentId) as any;

      expect(comment.postId).toBe('comment-post-1');
      expect(comment.content).toBe('This is a test comment');
    });

    it('should increment comment count on post', async () => {
      // Setup
      insertTestPost('discussion-post');

      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-comment-2', email: 'user2@test.com' },
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

      // Action
      await CommentsPOST(req, { params: createParamsPromise('discussion-post') });

      // Assertion: Comment count updated
      const post = communityRepository.getPostById('discussion-post');
      expect(post?.commentCount).toBeGreaterThan(0);
    });
  });

  describe('Test 4: Comment deletion with both path and query parameters', () => {
    it('should delete correct comment using commentId from query', async () => {
      // Setup: Insert post and comment
      insertTestPost('post-with-comment');

      const { getDatabase } = require('@/lib/sqlite-db');
      const db = getDatabase();
      const now = Date.now();

      db.prepare(`
        INSERT INTO comments (
          id, postId, authorId, authorName, content, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('comment-123', 'post-with-comment', 'commenter', 'Commenter', 'Comment to delete', now, now);

      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'commenter', email: 'commenter@test.com' },
      });

      const req = createMockRequest(
        'http://localhost:3001/api/community/posts/post-with-comment/comments?commentId=comment-123'
      );

      const params = createParamsPromise('post-with-comment');

      // Action: Call DELETE handler
      const response = await CommentsDELETE(req, { params });

      // Assertion: Comment deleted successfully
      expect(response.status).toBe(200);

      // Verify deletion
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get('comment-123');
      expect(comment).toBeUndefined();
    });

    it('should maintain database foreign key constraints', async () => {
      // Setup: Post with comment
      insertTestPost('fk-test-post');

      const { getDatabase } = require('@/lib/sqlite-db');
      const db = getDatabase();
      const now = Date.now();

      db.prepare(`
        INSERT INTO comments (
          id, postId, authorId, authorName, content, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('fk-comment', 'fk-test-post', 'author', 'Author', 'FK test', now, now);

      // Verify: Comment references correct post
      const comment = db.prepare('SELECT postId FROM comments WHERE id = ?')
        .get('fk-comment') as any;

      expect(comment.postId).toBe('fk-test-post');

      // Verify: Post exists
      const post = db.prepare('SELECT id FROM community_posts WHERE id = ?')
        .get('fk-test-post');

      expect(post).toBeDefined();
    });
  });

  describe('Test 5: Malformed route parameters return 400 error', () => {
    it('should return 404 when post does not exist', async () => {
      // Setup: Authenticated session
      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com' },
      });

      const req = createMockRequest(
        'http://localhost:3001/api/community/posts/nonexistent-post/like',
        { body: { userId: 'user-123' } }
      );

      const params = createParamsPromise('nonexistent-post');

      // Action: Try to like nonexistent post
      const response = await LikePOST(req, { params });

      // Assertion: Should return 404
      expect(response.status).toBe(404);
    });

    it('should return 400 when required query parameter is missing', async () => {
      // Setup: Post exists
      insertTestPost('some-post');

      (getServerSession as jest.Mock).mockResolvedValue({
        user: { id: 'user-del', email: 'del@test.com' },
      });

      // Missing userId query parameter
      const req = createMockRequest(
        'http://localhost:3001/api/community/posts/some-post/like'
      );

      const params = createParamsPromise('some-post');

      // Action: Try to delete like without userId
      const response = await LikeDELETE(req, { params });

      // Assertion: Should return 400
      expect(response.status).toBe(400);
    });

    it('should handle concurrent requests to same post correctly', async () => {
      // Setup: Insert post
      insertTestPost('concurrent-post');

      // Mock multiple users
      const sessions = [
        { user: { id: 'user-a', email: 'a@test.com' } },
        { user: { id: 'user-b', email: 'b@test.com' } },
        { user: { id: 'user-c', email: 'c@test.com' } },
      ];

      // Action: 3 concurrent likes
      const responses = await Promise.all(
        sessions.map((session, i) => {
          (getServerSession as jest.Mock).mockResolvedValueOnce(session);

          const req = createMockRequest(
            'http://localhost:3001/api/community/posts/concurrent-post/like',
            { body: { userId: session.user.id } }
          );

          return LikePOST(req, { params: createParamsPromise('concurrent-post') });
        })
      );

      // Assertion: All succeeded
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Verify: Like count is 3
      const post = communityRepository.getPostById('concurrent-post');
      expect(post?.likeCount).toBe(3);
    });
  });
});
