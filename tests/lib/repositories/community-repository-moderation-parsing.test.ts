/**
 * @jest-environment node
 *
 * @fileOverview Unit Tests for Community Repository - Moderation Action JSON Parsing
 *
 * Tests the moderation action parsing fix added in bug fix commit 1d6fb78.
 * Verifies that the repository can handle both legacy string formats ("allow", "warn", "filter")
 * and new JSON object formats for moderationAction field without JSON.parse errors.
 *
 * Key behaviors tested:
 * - Handles moderationAction as plain string "allow"
 * - Handles moderationAction as plain string "warn"
 * - Handles moderationAction as plain string "filter"
 * - Handles moderationAction as JSON object
 * - Handles null/undefined moderationAction
 * - Throws error for invalid JSON string
 *
 * Fix Location: src/lib/repositories/community-repository.ts:101
 *
 * @phase Testing Phase - Bug Fix Validation
 * @created 2025-10-31
 */

import Database from 'better-sqlite3';
import * as communityRepository from '@/lib/repositories/community-repository';
import type { CommunityPost } from '@/lib/types/community';

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

describe('Community Repository - Moderation Action JSON Parsing', () => {
  beforeEach(() => {
    // Create in-memory test database
    testDb = new Database(':memory:');

    // Initialize schema (table name must be 'posts' not 'community_posts')
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS posts (
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
      )
    `);
  });

  /**
   * Helper function to insert post directly into database
   * This simulates legacy data or database-level operations
   */
  function insertPostDirectly(postData: {
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    moderationAction?: string | null;
  }): void {
    const now = Date.now();

    testDb.prepare(`
      INSERT INTO posts (
        id, authorId, authorName, content, moderationAction, status, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
    `).run(
      postData.id,
      postData.authorId,
      postData.authorName,
      postData.content,
      postData.moderationAction || null,
      now,
      now
    );
  }

  describe('Test 1: Should handle moderationAction as plain string "allow"', () => {
    it('should return "allow" string when stored as plain string', () => {
      // Setup: Insert post with moderationAction as plain string
      insertPostDirectly({
        id: 'post-allow-string',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Clean content',
        moderationAction: 'allow', // Legacy string format
      });

      // Action: Retrieve post
      const post = communityRepository.getPostById('post-allow-string');

      // Assertion: Verify moderationAction returns as string 'allow'
      expect(post).toBeDefined();
      expect(post?.moderationAction).toBe('allow');
      expect(typeof post?.moderationAction).toBe('string');
    });

    it('should not attempt JSON.parse on "allow" string', () => {
      // Setup: Insert with "allow"
      insertPostDirectly({
        id: 'post-allow-2',
        authorId: 'user-2',
        authorName: 'User Two',
        content: 'Test content',
        moderationAction: 'allow',
      });

      // Action & Assertion: Should not throw JSON parse error
      expect(() => {
        communityRepository.getPostById('post-allow-2');
      }).not.toThrow();
    });
  });

  describe('Test 2: Should handle moderationAction as plain string "warn"', () => {
    it('should return "warn" string when stored as plain string', () => {
      // Setup: Insert post with "warn"
      insertPostDirectly({
        id: 'post-warn-string',
        authorId: 'user-3',
        authorName: 'User Three',
        content: 'Borderline content',
        moderationAction: 'warn',
      });

      // Action: Retrieve post
      const post = communityRepository.getPostById('post-warn-string');

      // Assertion: Verify returns 'warn' string
      expect(post?.moderationAction).toBe('warn');
      expect(typeof post?.moderationAction).toBe('string');
    });
  });

  describe('Test 3: Should handle moderationAction as plain string "filter"', () => {
    it('should return "filter" string when stored as plain string', () => {
      // Setup: Insert post with "filter"
      insertPostDirectly({
        id: 'post-filter-string',
        authorId: 'user-4',
        authorName: 'User Four',
        content: 'Filtered content',
        moderationAction: 'filter',
      });

      // Action: Retrieve post
      const post = communityRepository.getPostById('post-filter-string');

      // Assertion: Verify returns 'filter' string
      expect(post?.moderationAction).toBe('filter');
      expect(typeof post?.moderationAction).toBe('string');
    });

    it('should handle all six valid ModerationAction string values', () => {
      // Setup: Insert six posts with all valid ModerationAction values
      insertPostDirectly({
        id: 'post-1',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Content 1',
        moderationAction: 'allow',
      });

      insertPostDirectly({
        id: 'post-2',
        authorId: 'user-2',
        authorName: 'User',
        content: 'Content 2',
        moderationAction: 'warn',
      });

      insertPostDirectly({
        id: 'post-3',
        authorId: 'user-3',
        authorName: 'User',
        content: 'Content 3',
        moderationAction: 'filter',
      });

      insertPostDirectly({
        id: 'post-4',
        authorId: 'user-4',
        authorName: 'User',
        content: 'Content 4',
        moderationAction: 'hide',
      });

      insertPostDirectly({
        id: 'post-5',
        authorId: 'user-5',
        authorName: 'User',
        content: 'Content 5',
        moderationAction: 'block',
      });

      insertPostDirectly({
        id: 'post-6',
        authorId: 'user-6',
        authorName: 'User',
        content: 'Content 6',
        moderationAction: 'flag-for-review',
      });

      // Action: Retrieve all posts
      const post1 = communityRepository.getPostById('post-1');
      const post2 = communityRepository.getPostById('post-2');
      const post3 = communityRepository.getPostById('post-3');
      const post4 = communityRepository.getPostById('post-4');
      const post5 = communityRepository.getPostById('post-5');
      const post6 = communityRepository.getPostById('post-6');

      // Assertion: All return correct string values
      expect(post1?.moderationAction).toBe('allow');
      expect(post2?.moderationAction).toBe('warn');
      expect(post3?.moderationAction).toBe('filter');
      expect(post4?.moderationAction).toBe('hide');
      expect(post5?.moderationAction).toBe('block');
      expect(post6?.moderationAction).toBe('flag-for-review');
    });
  });

  describe('Test 3b: Should handle moderationAction as plain string "hide"', () => {
    it('should return "hide" string when stored as plain string', () => {
      // Setup: Insert post with "hide"
      insertPostDirectly({
        id: 'post-hide-string',
        authorId: 'user-hide',
        authorName: 'User Hide',
        content: 'Hidden content',
        moderationAction: 'hide',
      });

      // Action: Retrieve post
      const post = communityRepository.getPostById('post-hide-string');

      // Assertion: Verify returns 'hide' string without JSON.parse error
      expect(post?.moderationAction).toBe('hide');
      expect(typeof post?.moderationAction).toBe('string');
    });

    it('should not attempt JSON.parse on "hide" string', () => {
      // Setup: Insert with "hide"
      insertPostDirectly({
        id: 'post-hide-2',
        authorId: 'user-hide-2',
        authorName: 'User Hide Two',
        content: 'Test content',
        moderationAction: 'hide',
      });

      // Action & Assertion: Should not throw JSON parse error (this was the bug)
      expect(() => {
        communityRepository.getPostById('post-hide-2');
      }).not.toThrow();
    });
  });

  describe('Test 3c: Should handle moderationAction as plain string "block"', () => {
    it('should return "block" string when stored as plain string', () => {
      // Setup: Insert post with "block"
      insertPostDirectly({
        id: 'post-block-string',
        authorId: 'user-block',
        authorName: 'User Block',
        content: 'Blocked content',
        moderationAction: 'block',
      });

      // Action: Retrieve post
      const post = communityRepository.getPostById('post-block-string');

      // Assertion: Verify returns 'block' string without JSON.parse error
      expect(post?.moderationAction).toBe('block');
      expect(typeof post?.moderationAction).toBe('string');
    });
  });

  describe('Test 3d: Should handle moderationAction as plain string "flag-for-review"', () => {
    it('should return "flag-for-review" string when stored as plain string', () => {
      // Setup: Insert post with "flag-for-review"
      insertPostDirectly({
        id: 'post-flag-string',
        authorId: 'user-flag',
        authorName: 'User Flag',
        content: 'Flagged content',
        moderationAction: 'flag-for-review',
      });

      // Action: Retrieve post
      const post = communityRepository.getPostById('post-flag-string');

      // Assertion: Verify returns 'flag-for-review' string without JSON.parse error
      expect(post?.moderationAction).toBe('flag-for-review');
      expect(typeof post?.moderationAction).toBe('string');
    });
  });

  describe('Test 4: Should handle moderationAction as JSON object', () => {
    it('should parse and return JSON object when stored as JSON string', () => {
      // Setup: Insert post with JSON moderationAction
      const moderationObject = {
        action: 'allow',
        confidence: 0.95,
        flags: [],
      };

      insertPostDirectly({
        id: 'post-json-object',
        authorId: 'user-5',
        authorName: 'User Five',
        content: 'Advanced moderated content',
        moderationAction: JSON.stringify(moderationObject),
      });

      // Action: Retrieve post
      const post = communityRepository.getPostById('post-json-object');

      // Assertion: Verify returns parsed object
      expect(post?.moderationAction).toEqual(moderationObject);
      expect(typeof post?.moderationAction).toBe('object');
      expect((post?.moderationAction as any).confidence).toBe(0.95);
    });

    it('should handle complex JSON objects with nested structures', () => {
      // Setup: Complex moderation data
      const complexModeration = {
        action: 'filter',
        confidence: 0.87,
        detectedIssues: ['profanity', 'spam'],
        metadata: {
          source: 'ai-moderator',
          timestamp: Date.now(),
        },
      };

      insertPostDirectly({
        id: 'post-complex-json',
        authorId: 'user-6',
        authorName: 'User Six',
        content: 'Complex content',
        moderationAction: JSON.stringify(complexModeration),
      });

      // Action: Retrieve post
      const post = communityRepository.getPostById('post-complex-json');

      // Assertion: Nested structure preserved
      expect(post?.moderationAction).toEqual(complexModeration);
      expect((post?.moderationAction as any).detectedIssues).toHaveLength(2);
      expect((post?.moderationAction as any).metadata.source).toBe('ai-moderator');
    });
  });

  describe('Test 5: Should handle null/undefined moderationAction', () => {
    it('should return undefined when moderationAction is null', () => {
      // Setup: Insert post with null moderationAction
      insertPostDirectly({
        id: 'post-null-moderation',
        authorId: 'user-7',
        authorName: 'User Seven',
        content: 'Unmoderated content',
        moderationAction: null,
      });

      // Action: Retrieve post
      const post = communityRepository.getPostById('post-null-moderation');

      // Assertion: Verify returns undefined
      expect(post?.moderationAction).toBeUndefined();
    });

    it('should handle posts without moderationAction field', () => {
      // Setup: Insert post without moderationAction
      insertPostDirectly({
        id: 'post-no-moderation',
        authorId: 'user-8',
        authorName: 'User Eight',
        content: 'Legacy post without moderation',
        // No moderationAction provided
      });

      // Action: Retrieve post
      const post = communityRepository.getPostById('post-no-moderation');

      // Assertion: Should work without errors
      expect(post).toBeDefined();
      expect(post?.moderationAction).toBeUndefined();
    });
  });

  describe('Test 6: Should throw error for invalid JSON string', () => {
    it('should handle corrupted JSON gracefully', () => {
      // Setup: Manually insert post with invalid JSON
      const now = Date.now();

      testDb.prepare(`
        INSERT INTO posts (
          id, authorId, authorName, content, moderationAction, status, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
      `).run(
        'post-invalid-json',
        'user-9',
        'User Nine',
        'Corrupted moderation data',
        '{invalid-json-string',  // Intentionally malformed JSON
        now,
        now
      );

      // Action & Assertion: Should throw descriptive error
      expect(() => {
        communityRepository.getPostById('post-invalid-json');
      }).toThrow();
    });

    it('should differentiate between valid strings and invalid JSON', () => {
      // Setup: Valid string (should work) vs invalid JSON (should fail)
      insertPostDirectly({
        id: 'post-valid-string',
        authorId: 'user-10',
        authorName: 'User Ten',
        content: 'Valid string content',
        moderationAction: 'allow',  // Valid string
      });

      const now = Date.now();

      testDb.prepare(`
        INSERT INTO posts (
          id, authorId, authorName, content, moderationAction, status, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
      `).run(
        'post-invalid-format',
        'user-11',
        'User Eleven',
        'Invalid format content',
        '{"unclosed": "json"',  // Invalid JSON
        now,
        now
      );

      // Assertion: Valid string works
      expect(() => {
        const post = communityRepository.getPostById('post-valid-string');
        expect(post?.moderationAction).toBe('allow');
      }).not.toThrow();

      // Assertion: Invalid JSON throws
      expect(() => {
        communityRepository.getPostById('post-invalid-format');
      }).toThrow();
    });
  });

  describe('Edge Cases: Mixed format handling', () => {
    it('should handle posts retrieved in batch with different moderation formats', () => {
      // Setup: Insert multiple posts with different formats
      insertPostDirectly({
        id: 'batch-1',
        authorId: 'user-batch',
        authorName: 'Batch User',
        content: 'Post 1',
        moderationAction: 'allow',
      });

      insertPostDirectly({
        id: 'batch-2',
        authorId: 'user-batch',
        authorName: 'Batch User',
        content: 'Post 2',
        moderationAction: JSON.stringify({ action: 'warn', confidence: 0.7 }),
      });

      insertPostDirectly({
        id: 'batch-3',
        authorId: 'user-batch',
        authorName: 'Batch User',
        content: 'Post 3',
        moderationAction: null,
      });

      // Action: Get posts by user
      const posts = communityRepository.getPostsByAuthor('user-batch', 10);

      // Assertion: All posts retrieved successfully
      expect(posts).toHaveLength(3);
      expect(posts[0].moderationAction).toBe('allow');
      expect(typeof posts[1].moderationAction).toBe('object');
      expect(posts[2].moderationAction).toBeUndefined();
    });
  });
});
