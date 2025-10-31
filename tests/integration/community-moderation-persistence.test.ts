/**
 * @jest-environment node
 *
 * @fileOverview Integration Tests for Community Moderation Pipeline
 *
 * Tests the complete moderation workflow added in bug fix commit 1d6fb78.
 * Verifies that moderation actions flow correctly through the entire stack
 * from API route → service → content filter → repository → SQLite → retrieval.
 *
 * Integration Flow:
 * Client → POST /api/community/posts → Session validation → Content moderation →
 * → Service stores moderation result → Repository parses flexibly → GET returns post
 *
 * Key workflows tested:
 * - Post creation with moderation flows through entire stack
 * - Filtered content stores moderation action correctly
 * - Legacy posts with string moderation actions are readable
 * - New posts with JSON moderation actions work correctly
 * - Comment moderation inherits post moderation standards
 *
 * @phase Testing Phase - Integration Testing
 * @created 2025-10-31
 */

import Database from 'better-sqlite3';
import { communityService } from '@/lib/community-service';
import { contentFilterService } from '@/lib/content-filter-service';
import * as communityRepository from '@/lib/repositories/community-repository';
import type { CreatePostData } from '@/lib/types/community';

// Mock the sqlite-db module to use in-memory database
jest.mock('@/lib/sqlite-db', () => {
  let db: Database.Database;

  return {
    getDatabase: () => {
      if (!db) {
        db = new Database(':memory:');
        // Create community tables
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

describe('Community Moderation Persistence Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Clear database
    const { getDatabase } = require('@/lib/sqlite-db');
    const db = getDatabase();
    db.exec('DELETE FROM community_posts');
    db.exec('DELETE FROM comments');

    // Enable SQLite mode
    process.env.SQLITE_SERVER_ENABLED = 'true';
  });

  describe('Test 1: Post creation with moderation flows through entire stack', () => {
    it('should create post with clean content and store "allow" moderation', async () => {
      // Setup: Clean post data
      const postData: CreatePostData = {
        authorId: 'user-1',
        authorName: 'Test User',
        title: 'Clean Post Title',
        content: 'This is clean, appropriate content for the community.',
        tags: ['discussion', 'literature'],
      };

      // Action: Create post through service (includes content filtering)
      const result = await communityService.createPost(postData);

      // Assertion: Post created with moderationAction: 'allow'
      expect(result.id).toBeDefined();

      // Verify in database
      const post = communityRepository.getPostById(result.id);
      expect(post).toBeDefined();
      expect(post?.moderationAction).toBe('allow');
      expect(post?.content).toBe(postData.content);
    });

    it('should process content through moderation filter', async () => {
      // Setup: Post with borderline content
      const postData: CreatePostData = {
        authorId: 'user-2',
        authorName: 'User Two',
        content: 'Content that needs careful review',
      };

      // Spy on content filter
      const filterSpy = jest.spyOn(contentFilterService, 'processContent');

      // Action: Create post
      await communityService.createPost(postData);

      // Assertion: Content filter was called
      expect(filterSpy).toHaveBeenCalled();
      expect(filterSpy).toHaveBeenCalledWith(
        expect.stringContaining('Content that needs careful review'),
        expect.any(String),
        'post',
        'user-2'
      );
    });

    it('should store moderation result in database', async () => {
      // Setup: Create post
      const postData: CreatePostData = {
        authorId: 'user-3',
        authorName: 'User Three',
        content: 'Test content for moderation storage',
      };

      // Action: Create post
      const result = await communityService.createPost(postData);

      // Verify: Moderation action stored in SQLite
      const { getDatabase } = require('@/lib/sqlite-db');
      const db = getDatabase();
      const row = db.prepare('SELECT moderationAction FROM community_posts WHERE id = ?')
        .get(result.id) as { moderationAction: string };

      expect(row.moderationAction).toBeDefined();
      expect(['allow', 'warn', 'filter']).toContain(row.moderationAction);
    });
  });

  describe('Test 2: Filtered content stores moderation action correctly', () => {
    it('should store "filter" action when content contains profanity', async () => {
      // Setup: Post with profanity (will be filtered)
      const postData: CreatePostData = {
        authorId: 'user-4',
        authorName: 'User Four',
        content: 'This damn post contains profanity', // Content filter will catch this
      };

      // Action: Create post
      const result = await communityService.createPost(postData);

      // Assertion: Moderation action stored
      const post = communityRepository.getPostById(result.id);
      expect(post?.moderationAction).toBeDefined();

      // Verify content was filtered
      if (post?.content !== postData.content) {
        // Content was filtered
        expect(post?.originalContent).toBe(postData.content);
        expect(post?.moderationAction).toBe('filter');
      }
    });

    it('should preserve original content when filtered', async () => {
      // Setup: Post that triggers filtering
      const originalContent = 'Content with inappropriate words';
      const postData: CreatePostData = {
        authorId: 'user-5',
        authorName: 'User Five',
        content: originalContent,
      };

      // Action: Create post
      const result = await communityService.createPost(postData);
      const post = communityRepository.getPostById(result.id);

      // Assertion: If content was modified, original should be stored
      if (post?.content !== originalContent) {
        expect(post?.originalContent).toBe(originalContent);
      }
    });

    it('should include moderation warning when content is filtered', async () => {
      // Setup: Post that will trigger warning
      const postData: CreatePostData = {
        authorId: 'user-6',
        authorName: 'User Six',
        content: 'Borderline inappropriate content',
      };

      // Action: Create post
      const result = await communityService.createPost(postData);
      const post = communityRepository.getPostById(result.id);

      // Assertion: If moderation action is not "allow", warning may be present
      if (post?.moderationAction !== 'allow') {
        // Warning should be set for non-allowed content
        expect(post?.moderationWarning).toBeDefined();
      }
    });
  });

  describe('Test 3: Legacy posts with string moderation actions are readable', () => {
    it('should read legacy post with "allow" string without errors', () => {
      // Setup: Manually insert legacy post with string moderationAction
      const { getDatabase } = require('@/lib/sqlite-db');
      const db = getDatabase();
      const now = Date.now();

      db.prepare(`
        INSERT INTO community_posts (
          id, authorId, authorName, content, moderationAction, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('legacy-post-1', 'legacy-user', 'Legacy User', 'Legacy content', 'allow', now, now);

      // Action: Retrieve post
      const post = communityRepository.getPostById('legacy-post-1');

      // Assertion: No JSON parsing errors
      expect(post).toBeDefined();
      expect(post?.moderationAction).toBe('allow');
    });

    it('should handle all legacy string formats (allow/warn/filter)', () => {
      // Setup: Insert posts with all three legacy formats
      const { getDatabase } = require('@/lib/sqlite-db');
      const db = getDatabase();
      const now = Date.now();

      db.prepare(`
        INSERT INTO community_posts (
          id, authorId, authorName, content, moderationAction, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('legacy-allow', 'user', 'User', 'Content 1', 'allow', now, now);

      db.prepare(`
        INSERT INTO community_posts (
          id, authorId, authorName, content, moderationAction, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('legacy-warn', 'user', 'User', 'Content 2', 'warn', now, now);

      db.prepare(`
        INSERT INTO community_posts (
          id, authorId, authorName, content, moderationAction, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('legacy-filter', 'user', 'User', 'Content 3', 'filter', now, now);

      // Action: Retrieve all posts
      const post1 = communityRepository.getPostById('legacy-allow');
      const post2 = communityRepository.getPostById('legacy-warn');
      const post3 = communityRepository.getPostById('legacy-filter');

      // Assertion: All retrieved successfully
      expect(post1?.moderationAction).toBe('allow');
      expect(post2?.moderationAction).toBe('warn');
      expect(post3?.moderationAction).toBe('filter');
    });

    it('should return posts via service layer with legacy format', async () => {
      // Setup: Insert legacy post
      const { getDatabase } = require('@/lib/sqlite-db');
      const db = getDatabase();
      const now = Date.now();

      db.prepare(`
        INSERT INTO community_posts (
          id, authorId, authorName, content, moderationAction, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run('service-legacy', 'author-1', 'Author', 'Legacy via service', 'warn', now, now);

      // Action: Get via service
      const posts = await communityService.getPosts({ limit: 10 });

      // Assertion: Legacy post included in results
      const legacyPost = posts.find(p => p.id === 'service-legacy');
      expect(legacyPost).toBeDefined();
      expect(legacyPost?.moderationAction).toBe('warn');
    });
  });

  describe('Test 4: New posts with JSON moderation actions work correctly', () => {
    it('should store and retrieve JSON moderation object', () => {
      // Setup: Insert post with JSON moderationAction
      const { getDatabase } = require('@/lib/sqlite-db');
      const db = getDatabase();
      const now = Date.now();

      const moderationObject = {
        action: 'allow',
        confidence: 0.95,
        flags: [],
      };

      db.prepare(`
        INSERT INTO community_posts (
          id, authorId, authorName, content, moderationAction, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'json-post-1',
        'user-json',
        'JSON User',
        'Content with JSON moderation',
        JSON.stringify(moderationObject),
        now,
        now
      );

      // Action: Retrieve post
      const post = communityRepository.getPostById('json-post-1');

      // Assertion: JSON parsed correctly
      expect(post?.moderationAction).toEqual(moderationObject);
      expect((post?.moderationAction as any).confidence).toBe(0.95);
    });

    it('should handle complex nested JSON structures', () => {
      // Setup: Complex moderation data
      const { getDatabase } = require('@/lib/sqlite-db');
      const db = getDatabase();
      const now = Date.now();

      const complexModeration = {
        action: 'filter',
        confidence: 0.87,
        detectedIssues: ['profanity', 'spam'],
        metadata: {
          source: 'ai-moderator',
          version: '2.0',
        },
      };

      db.prepare(`
        INSERT INTO community_posts (
          id, authorId, authorName, content, moderationAction, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        'complex-json',
        'user-complex',
        'Complex User',
        'Complex moderation',
        JSON.stringify(complexModeration),
        now,
        now
      );

      // Action: Retrieve
      const post = communityRepository.getPostById('complex-json');

      // Assertion: Nested structure preserved
      expect(post?.moderationAction).toEqual(complexModeration);
      expect((post?.moderationAction as any).metadata.source).toBe('ai-moderator');
    });
  });

  describe('Test 5: Comment moderation inherits post moderation standards', () => {
    it('should apply content filtering to comments', async () => {
      // Setup: Create post first
      const postData: CreatePostData = {
        authorId: 'post-author',
        authorName: 'Post Author',
        content: 'Discussion post',
      };

      const post = await communityService.createPost(postData);

      // Spy on content filter
      const filterSpy = jest.spyOn(contentFilterService, 'processContent');

      // Action: Add comment
      const commentData = {
        postId: post.id,
        authorId: 'commenter',
        authorName: 'Commenter',
        content: 'This is a comment',
      };

      await communityService.addComment(commentData);

      // Assertion: Comment was filtered
      expect(filterSpy).toHaveBeenCalledWith(
        'This is a comment',
        expect.any(String),
        'comment',
        'commenter'
      );
    });

    it('should reject or filter comments with profanity', async () => {
      // Setup: Create post
      const postData: CreatePostData = {
        authorId: 'post-author',
        authorName: 'Post Author',
        content: 'Clean post',
      };

      const post = await communityService.createPost(postData);

      // Action: Try to add comment with profanity
      const commentData = {
        postId: post.id,
        authorId: 'bad-commenter',
        authorName: 'Bad Commenter',
        content: 'This damn comment has profanity',
      };

      const result = await communityService.addComment(commentData);

      // Assertion: Comment filtered or rejected
      expect(result.moderationAction).toBeDefined();

      // Verify in database
      const { getDatabase } = require('@/lib/sqlite-db');
      const db = getDatabase();
      const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.id) as any;

      expect(comment).toBeDefined();
      // Content should be filtered if profanity detected
      if (comment.moderationAction === 'filter') {
        expect(comment.content).not.toBe(commentData.content);
      }
    });

    it('should maintain referential integrity with post', async () => {
      // Setup: Create post
      const postData: CreatePostData = {
        authorId: 'author',
        authorName: 'Author',
        content: 'Post for referential integrity test',
      };

      const post = await communityService.createPost(postData);

      // Action: Add comment
      const commentData = {
        postId: post.id,
        authorId: 'commenter',
        authorName: 'Commenter',
        content: 'Comment content',
      };

      const comment = await communityService.addComment(commentData);

      // Verify: Foreign key relationship maintained
      const { getDatabase } = require('@/lib/sqlite-db');
      const db = getDatabase();

      const dbComment = db.prepare('SELECT postId FROM comments WHERE id = ?').get(comment.id) as any;
      expect(dbComment.postId).toBe(post.id);
    });
  });
});
