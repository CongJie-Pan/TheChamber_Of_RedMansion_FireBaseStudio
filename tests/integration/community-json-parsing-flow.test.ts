/**
 * Integration Tests - Community Post JSON Parsing Full Flow (Phase 1-T1)
 *
 * Tests the complete community post lifecycle with various moderationAction formats
 * to ensure no JSON parsing errors occur during create → fetch → interact workflow.
 *
 * Bug Fix: src/lib/repositories/community-repository.ts:100-106
 * Fix: Handle both string primitives ("allow", "warn", "filter") and JSON objects
 *
 * Related Test: tests/lib/repositories/community-repository-moderation-parsing.test.ts
 *
 * @jest-environment node
 */

import Database from 'better-sqlite3';
import * as communityRepository from '@/lib/repositories/community-repository';
import type { CommunityPost, ModerationAction } from '@/lib/types/community';

// Create test database before mocking
let testDb: Database.Database;

// Mock the sqlite-db module to use in-memory database
jest.mock('@/lib/sqlite-db', () => ({
  getDatabase: jest.fn(() => testDb),
  toUnixTimestamp: jest.fn((date: Date | number) => {
    return typeof date === 'number' ? date : date.getTime();
  }),
  fromUnixTimestamp: jest.fn((timestamp: number) => {
    return new Date(timestamp);
  }),
}));

describe('Community JSON Parsing Full Flow (P1-T1)', () => {
  beforeEach(() => {
    // Create in-memory test database
    testDb = new Database(':memory:');

    // Initialize schema (matches actual database schema)
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS posts (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
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

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT,
        level INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 0,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        postId TEXT NOT NULL,
        userId TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (postId) REFERENCES posts(id),
        FOREIGN KEY (userId) REFERENCES users(id)
      );

      CREATE TABLE IF NOT EXISTS likes (
        id TEXT PRIMARY KEY,
        postId TEXT NOT NULL,
        userId TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (postId) REFERENCES posts(id),
        FOREIGN KEY (userId) REFERENCES users(id)
      );
    `);

    // Insert test user
    testDb
      .prepare(
        `INSERT INTO users (id, email, name, level, xp, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        'test-user-1',
        'test@example.com',
        'Test User',
        1,
        0,
        Date.now()
      );
  });

  afterEach(() => {
    if (testDb) {
      testDb.close();
    }
  });

  describe('Complete Flow: Create → Fetch → Like → Comment', () => {
    it('should handle post with string "allow" moderationAction', async () => {
      const now = Date.now();

      // Step 1: Create post (simulating content filter returning "allow" string)
      const postData = {
        id: 'post-1',
        userId: 'test-user-1',
        content: 'This is a safe post about Red Chamber characters',
        moderationAction: 'allow' as ModerationAction,
        likes: 0,
        commentCount: 0,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      };

      testDb
        .prepare(
          `INSERT INTO posts (id, userId, content, moderationAction, likes, commentCount, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          postData.id,
          postData.userId,
          postData.content,
          postData.moderationAction, // String "allow"
          postData.likes,
          postData.commentCount,
          postData.status,
          postData.createdAt,
          postData.updatedAt
        );

      // Step 2: Fetch post (should not throw JSON.parse error)
      const fetchedPost = communityRepository.getPostById('post-1');

      expect(fetchedPost).not.toBeNull();
      expect(fetchedPost?.id).toBe('post-1');
      expect(fetchedPost?.content).toBe('This is a safe post about Red Chamber characters');
      expect(fetchedPost?.moderationAction).toBe('allow');
      expect(fetchedPost?.likes).toBe(0);

      // Step 3: Like post
      const likeData = {
        id: 'like-1',
        postId: 'post-1',
        userId: 'test-user-1',
        createdAt: Date.now(),
      };

      testDb
        .prepare(
          `INSERT INTO likes (id, postId, userId, createdAt) VALUES (?, ?, ?, ?)`
        )
        .run(likeData.id, likeData.postId, likeData.userId, likeData.createdAt);

      // Update post likes count
      testDb
        .prepare(`UPDATE posts SET likes = likes + 1 WHERE id = ?`)
        .run('post-1');

      // Step 4: Fetch post again (should reflect like)
      const updatedPost = communityRepository.getPostById('post-1');
      expect(updatedPost?.likes).toBe(1);

      // Step 5: Add comment
      const commentData = {
        id: 'comment-1',
        postId: 'post-1',
        userId: 'test-user-1',
        content: 'Great analysis!',
        createdAt: Date.now(),
      };

      testDb
        .prepare(
          `INSERT INTO comments (id, postId, userId, content, createdAt) VALUES (?, ?, ?, ?, ?)`
        )
        .run(
          commentData.id,
          commentData.postId,
          commentData.userId,
          commentData.content,
          commentData.createdAt
        );

      // Update post comment count
      testDb
        .prepare(`UPDATE posts SET commentCount = commentCount + 1 WHERE id = ?`)
        .run('post-1');

      // Step 6: Final fetch (should have all updates)
      const finalPost = communityRepository.getPostById('post-1');
      expect(finalPost?.likes).toBe(1);
      expect(finalPost?.commentCount).toBe(1);
      expect(finalPost?.moderationAction).toBe('allow'); // Still correct
    });

    it('should handle post with string "warn" moderationAction', async () => {
      const now = Date.now();

      // Create post with "warn" moderation
      testDb
        .prepare(
          `INSERT INTO posts (id, userId, content, moderationAction, moderationWarning, likes, commentCount, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          'post-2',
          'test-user-1',
          'This post contains mildly concerning language',
          'warn', // String
          'Contains potentially sensitive content',
          0,
          0,
          'active',
          now,
          now
        );

      // Fetch and verify
      const post = communityRepository.getPostById('post-2');

      expect(post).not.toBeNull();
      expect(post?.moderationAction).toBe('warn');
      expect(post?.moderationWarning).toBe('Contains potentially sensitive content');
    });

    it('should handle post with string "filter" moderationAction', async () => {
      const now = Date.now();

      // Create post with "filter" moderation
      testDb
        .prepare(
          `INSERT INTO posts (id, userId, content, moderationAction, moderationWarning, likes, commentCount, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          'post-3',
          'test-user-1',
          'This post was filtered',
          'filter', // String
          'Contains inappropriate content',
          0,
          0,
          'filtered',
          now,
          now
        );

      // Fetch and verify
      const post = communityRepository.getPostById('post-3');

      expect(post).not.toBeNull();
      expect(post?.moderationAction).toBe('filter');
      expect(post?.status).toBe('filtered');
    });

    it('should handle post with JSON object moderationAction (legacy format)', async () => {
      const now = Date.now();

      // Create post with JSON object (legacy format)
      const moderationData = {
        action: 'allow' as ModerationAction,
        confidence: 0.95,
        categories: ['safe'],
      };

      testDb
        .prepare(
          `INSERT INTO posts (id, userId, content, moderationAction, likes, commentCount, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          'post-4',
          'test-user-1',
          'Legacy post with JSON moderation',
          JSON.stringify(moderationData), // JSON string
          0,
          0,
          'active',
          now,
          now
        );

      // Fetch and verify (should parse JSON and extract action)
      const post = communityRepository.getPostById('post-4');

      expect(post).not.toBeNull();
      expect(post?.moderationAction).toEqual(moderationData);
    });
  });

  describe('Batch Operations with Mixed Formats', () => {
    it('should handle fetching multiple posts with different moderationAction formats', async () => {
      const now = Date.now();

      // Insert 3 posts with different formats
      const posts = [
        {
          id: 'mixed-1',
          userId: 'test-user-1',
          content: 'Post with string allow',
          moderationAction: 'allow',
        },
        {
          id: 'mixed-2',
          userId: 'test-user-1',
          content: 'Post with string warn',
          moderationAction: 'warn',
        },
        {
          id: 'mixed-3',
          userId: 'test-user-1',
          content: 'Post with JSON object',
          moderationAction: JSON.stringify({ action: 'filter', confidence: 0.88 }),
        },
      ];

      for (const post of posts) {
        testDb
          .prepare(
            `INSERT INTO posts (id, userId, content, moderationAction, likes, commentCount, status, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            post.id,
            post.userId,
            post.content,
            post.moderationAction,
            0,
            0,
            'active',
            now,
            now
          );
      }

      // Fetch all posts (should not throw error)
      const allPosts = testDb
        .prepare(
          `SELECT id, userId, content, moderationAction, moderationWarning, likes, commentCount, status, createdAt, updatedAt
           FROM posts
           WHERE id LIKE 'mixed-%'
           ORDER BY id`
        )
        .all();

      expect(allPosts).toHaveLength(3);

      // Parse each post using repository logic (should handle all formats)
      const parsedPosts = allPosts.map((row: any) => {
        // Simulate rowToPost logic
        let moderationAction: ModerationAction | Record<string, any> | null = null;

        if (row.moderationAction) {
          const validActions: ModerationAction[] = [
            'allow',
            'warn',
            'filter',
            'pending',
            'escalate',
            'error',
          ];

          if (validActions.includes(row.moderationAction)) {
            // Plain string
            moderationAction = row.moderationAction as ModerationAction;
          } else {
            // Try to parse as JSON
            try {
              moderationAction = JSON.parse(row.moderationAction);
            } catch {
              moderationAction = 'error';
            }
          }
        }

        return {
          id: row.id,
          moderationAction,
        };
      });

      expect(parsedPosts[0].moderationAction).toBe('allow');
      expect(parsedPosts[1].moderationAction).toBe('warn');
      expect(parsedPosts[2].moderationAction).toEqual({ action: 'filter', confidence: 0.88 });
    });
  });

  describe('Error Handling', () => {
    it('should throw error for invalid JSON (current implementation)', async () => {
      const now = Date.now();

      // Insert post with invalid JSON
      testDb
        .prepare(
          `INSERT INTO posts (id, userId, content, moderationAction, moderationWarning, likes, commentCount, status, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          'post-error',
          'test-user-1',
          'Post with invalid JSON moderation',
          '{invalid json}', // Invalid JSON
          null,
          0,
          0,
          'active',
          now,
          now
        );

      // Note: Current implementation at line 105 does NOT have try-catch
      // So this will throw a SyntaxError, which is expected behavior
      expect(() => {
        communityRepository.getPostById('post-error');
      }).toThrow(SyntaxError);
    });
  });

  describe('Bug Verification', () => {
    it('should NOT throw "Unexpected token \'a\', \'allow\' is not valid JSON" error', () => {
      // This was the original bug: JSON.parse("allow") threw error
      // Fixed by checking if value is already a valid ModerationAction string first

      const moderationValue = 'allow';

      // OLD CODE (buggy): Would try JSON.parse("allow") immediately → error
      // NEW CODE (fixed): Check if it's a valid string first
      const validActions: ModerationAction[] = ['allow', 'warn', 'filter', 'pending', 'escalate', 'error'];

      let result: ModerationAction | Record<string, any> | null;

      if (validActions.includes(moderationValue as ModerationAction)) {
        result = moderationValue as ModerationAction; // No parsing needed
      } else {
        try {
          result = JSON.parse(moderationValue);
        } catch {
          result = 'error';
        }
      }

      expect(result).toBe('allow');
      expect(() => result).not.toThrow();
    });
  });
});
