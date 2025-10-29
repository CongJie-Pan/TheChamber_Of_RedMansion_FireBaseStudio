/**
 * @fileOverview Tests for Community Repository
 *
 * This test suite validates all post operations in the community repository.
 *
 * Test coverage:
 * - Basic CRUD operations (8 tests)
 * - Post interactions (10 tests)
 * - Post queries (7 tests)
 * - Post moderation (5 tests)
 * - Error handling (3 tests)
 * - Integration tests (2 tests)
 *
 * @phase Phase 3 - SQLITE-014 Community Repository Tests
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import {
  createPost,
  getPostById,
  getPosts,
  updatePost,
  deletePost,
  postExists,
  likePost,
  unlikePost,
  bookmarkPost,
  unbookmarkPost,
  incrementViewCount,
  getPostsByAuthor,
  getPostsByTag,
  getPostsByCategory,
  getTrendingPosts,
  getBookmarkedPostsByUser,
  moderatePost,
  incrementCommentCount,
} from '../../src/lib/repositories/community-repository';

// Mock modules
jest.mock('../../src/lib/sqlite-db', () => {
  let mockDb: Database.Database | null = null;

  return {
    getDatabase: jest.fn(() => {
      if (!mockDb) {
        mockDb = new Database(':memory:');
        // Initialize schema
        mockDb.exec(`
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

          CREATE INDEX IF NOT EXISTS idx_posts_author
          ON posts(authorId, createdAt DESC);

          CREATE INDEX IF NOT EXISTS idx_posts_category
          ON posts(category, createdAt DESC);

          CREATE INDEX IF NOT EXISTS idx_posts_status
          ON posts(status, createdAt DESC);

          CREATE INDEX IF NOT EXISTS idx_posts_trending
          ON posts(likes DESC, viewCount DESC, createdAt DESC);
        `);
      }
      return mockDb;
    }),
    toUnixTimestamp: jest.fn((timestamp: any) => {
      if (timestamp instanceof Date) return timestamp.getTime();
      if (typeof timestamp === 'number') return timestamp;
      if (timestamp?.toMillis) return timestamp.toMillis();
      return Date.now();
    }),
    fromUnixTimestamp: jest.fn((timestamp: number) => {
      return {
        toDate: () => new Date(timestamp),
        toMillis: () => timestamp,
        seconds: Math.floor(timestamp / 1000),
        nanoseconds: (timestamp % 1000) * 1000000,
      };
    }),
  };
});

jest.mock('../../src/lib/content-filter-service', () => ({
  contentFilterService: {
    moderateContent: jest.fn((content: string) => {
      // Mock moderation - flag offensive content
      if (content.includes('offensive')) {
        return {
          action: 'replace',
          filteredContent: '[Content filtered]',
          shouldHide: true,
          warning: 'Content contains offensive language',
        };
      }
      return {
        action: 'allow',
        filteredContent: content,
        shouldHide: false,
      };
    }),
  },
  ModerationAction: {},
}));

describe('Community Repository', () => {
  // ============================================================================
  // A. Basic CRUD Operations (8 tests)
  // ============================================================================

  describe('Basic CRUD Operations', () => {
    test('should create a new post', () => {
      const postId = createPost({
        id: 'post-1',
        authorId: 'user-1',
        authorName: 'Test User',
        title: 'My First Post',
        content: 'This is the content of my first post.',
        tags: ['introduction', 'test'],
        category: 'general',
      });

      expect(postId).toBe('post-1');

      const post = getPostById('post-1');
      expect(post).toBeDefined();
      expect(post?.title).toBe('My First Post');
      expect(post?.content).toBe('This is the content of my first post.');
      expect(post?.tags).toEqual(['introduction', 'test']);
      expect(post?.category).toBe('general');
      expect(post?.authorId).toBe('user-1');
      expect(post?.likes).toBe(0);
      expect(post?.viewCount).toBe(0);
      expect(post?.status).toBe('active');
    });

    test('should get post by ID', () => {
      createPost({
        id: 'post-2',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Second post content',
      });

      const post = getPostById('post-2');
      expect(post).toBeDefined();
      expect(post?.id).toBe('post-2');
      expect(post?.content).toBe('Second post content');
    });

    test('should return null for non-existent post', () => {
      const post = getPostById('non-existent');
      expect(post).toBeNull();
    });

    test('should get posts with filters', () => {
      createPost({
        id: 'post-3',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Category test',
        category: 'discussion',
      });

      const posts = getPosts({ category: 'discussion' });
      expect(posts.length).toBeGreaterThan(0);
      expect(posts[0].category).toBe('discussion');
    });

    test('should update post content', () => {
      createPost({
        id: 'post-4',
        authorId: 'user-1',
        authorName: 'Test User',
        title: 'Original Title',
        content: 'Original content',
      });

      const updated = updatePost('post-4', {
        title: 'Updated Title',
        content: 'Updated content',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.content).toBe('Updated content');
      expect(updated.isEdited).toBe(true);
    });

    test('should soft delete post', () => {
      createPost({
        id: 'post-5',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'To be deleted',
      });

      deletePost('post-5');

      const post = getPostById('post-5');
      expect(post?.status).toBe('deleted');
    });

    test('should check if post exists', () => {
      createPost({
        id: 'post-6',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Existence check',
      });

      expect(postExists('post-6')).toBe(true);
      expect(postExists('non-existent')).toBe(false);
    });

    test('should handle posts without optional fields', () => {
      const postId = createPost({
        id: 'post-7',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Minimal post',
      });

      const post = getPostById(postId);
      expect(post).toBeDefined();
      expect(post?.title).toBeUndefined();
      expect(post?.category).toBeUndefined();
      expect(post?.tags).toEqual([]);
    });
  });

  // ============================================================================
  // B. Post Interactions (10 tests)
  // ============================================================================

  describe('Post Interactions', () => {
    test('should like a post', () => {
      createPost({
        id: 'post-like-1',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Like me!',
      });

      const liked = likePost('post-like-1', 'user-2');
      expect(liked.likes).toBe(1);
      expect(liked.likedBy).toContain('user-2');
    });

    test('should prevent duplicate likes', () => {
      createPost({
        id: 'post-like-2',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Like me!',
      });

      likePost('post-like-2', 'user-2');
      const secondLike = likePost('post-like-2', 'user-2');

      expect(secondLike.likes).toBe(1);
      expect(secondLike.likedBy).toEqual(['user-2']);
    });

    test('should unlike a post', () => {
      createPost({
        id: 'post-unlike-1',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Unlike me!',
      });

      likePost('post-unlike-1', 'user-2');
      const unliked = unlikePost('post-unlike-1', 'user-2');

      expect(unliked.likes).toBe(0);
      expect(unliked.likedBy).toEqual([]);
    });

    test('should handle unlike on non-liked post', () => {
      createPost({
        id: 'post-unlike-2',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Not liked yet',
      });

      const result = unlikePost('post-unlike-2', 'user-2');
      expect(result.likes).toBe(0);
    });

    test('should bookmark a post', () => {
      createPost({
        id: 'post-bookmark-1',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Bookmark me!',
      });

      const bookmarked = bookmarkPost('post-bookmark-1', 'user-2');
      expect(bookmarked.bookmarkedBy).toContain('user-2');
    });

    test('should prevent duplicate bookmarks', () => {
      createPost({
        id: 'post-bookmark-2',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Bookmark me!',
      });

      bookmarkPost('post-bookmark-2', 'user-2');
      const secondBookmark = bookmarkPost('post-bookmark-2', 'user-2');

      expect(secondBookmark.bookmarkedBy).toEqual(['user-2']);
    });

    test('should unbookmark a post', () => {
      createPost({
        id: 'post-unbookmark-1',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Unbookmark me!',
      });

      bookmarkPost('post-unbookmark-1', 'user-2');
      const unbookmarked = unbookmarkPost('post-unbookmark-1', 'user-2');

      expect(unbookmarked.bookmarkedBy).toEqual([]);
    });

    test('should handle unbookmark on non-bookmarked post', () => {
      createPost({
        id: 'post-unbookmark-2',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Not bookmarked yet',
      });

      const result = unbookmarkPost('post-unbookmark-2', 'user-2');
      expect(result.bookmarkedBy).toEqual([]);
    });

    test('should increment view count', () => {
      createPost({
        id: 'post-view-1',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'View me!',
      });

      incrementViewCount('post-view-1');
      incrementViewCount('post-view-1');

      const post = getPostById('post-view-1');
      expect(post?.viewCount).toBe(2);
    });

    test('should handle multiple likes from different users', () => {
      createPost({
        id: 'post-multi-like',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Popular post!',
      });

      likePost('post-multi-like', 'user-2');
      likePost('post-multi-like', 'user-3');
      likePost('post-multi-like', 'user-4');

      const post = getPostById('post-multi-like');
      expect(post?.likes).toBe(3);
      expect(post?.likedBy).toEqual(['user-2', 'user-3', 'user-4']);
    });
  });

  // ============================================================================
  // C. Post Queries (7 tests)
  // ============================================================================

  describe('Post Queries', () => {
    beforeAll(() => {
      // Create sample posts for querying (using beforeAll instead of beforeEach)
      createPost({
        id: 'query-1',
        authorId: 'author-1',
        authorName: 'Author One',
        content: 'First post',
        category: 'tech',
        tags: ['javascript', 'nodejs'],
      });

      createPost({
        id: 'query-2',
        authorId: 'author-1',
        authorName: 'Author One',
        content: 'Second post',
        category: 'tech',
        tags: ['python', 'django'],
      });

      createPost({
        id: 'query-3',
        authorId: 'author-2',
        authorName: 'Author Two',
        content: 'Third post',
        category: 'lifestyle',
        tags: ['travel', 'food'],
      });
    });

    test('should get posts by author', () => {
      const posts = getPostsByAuthor('author-1');
      expect(posts.length).toBe(2);
      expect(posts.every(p => p.authorId === 'author-1')).toBe(true);
    });

    test('should get posts by tag', () => {
      const posts = getPostsByTag('javascript');
      expect(posts.length).toBeGreaterThan(0);
      expect(posts[0].tags).toContain('javascript');
    });

    test('should get posts by category', () => {
      const posts = getPostsByCategory('tech');
      expect(posts.length).toBe(2);
      expect(posts.every(p => p.category === 'tech')).toBe(true);
    });

    test('should get trending posts', () => {
      // Add interactions to make posts trending
      likePost('query-1', 'user-1');
      likePost('query-1', 'user-2');
      incrementViewCount('query-1');
      incrementCommentCount('query-1', 3);

      const trending = getTrendingPosts(5);
      expect(trending.length).toBeGreaterThan(0);
      // Most trending post should be first
      expect(trending[0].id).toBe('query-1');
    });

    test('should get bookmarked posts by user', () => {
      bookmarkPost('query-1', 'user-1');
      bookmarkPost('query-3', 'user-1');

      const bookmarked = getBookmarkedPostsByUser('user-1');
      expect(bookmarked.length).toBe(2);
      expect(bookmarked.map(p => p.id)).toContain('query-1');
      expect(bookmarked.map(p => p.id)).toContain('query-3');
    });

    test('should respect pagination in getPosts', () => {
      const page1 = getPosts({ limit: 2, offset: 0 });
      const page2 = getPosts({ limit: 2, offset: 2 });

      expect(page1.length).toBeLessThanOrEqual(2);
      expect(page2.length).toBeLessThanOrEqual(2);
      // Different pages should have different posts
      if (page1.length > 0 && page2.length > 0) {
        expect(page1[0].id).not.toBe(page2[0].id);
      }
    });

    test('should filter posts by multiple tags', () => {
      const posts = getPosts({
        tags: ['javascript', 'python'],
      });

      expect(posts.length).toBeGreaterThan(0);
      const hasRelevantTag = posts.every(p =>
        p.tags.some(tag => ['javascript', 'python'].includes(tag))
      );
      expect(hasRelevantTag).toBe(true);
    });
  });

  // ============================================================================
  // D. Post Moderation (5 tests)
  // ============================================================================

  describe('Post Moderation', () => {
    test('should moderate offensive content on creation', () => {
      const postId = createPost({
        id: 'moderation-1',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'This is offensive content',
      });

      const post = getPostById(postId);
      expect(post?.content).toBe('[Content filtered]');
      expect(post?.status).toBe('hidden');
      expect(post?.originalContent).toBe('This is offensive content');
      expect(post?.moderationWarning).toBe('Content contains offensive language');
    });

    test('should moderate offensive content on update', () => {
      createPost({
        id: 'moderation-2',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Normal content',
      });

      const updated = updatePost('moderation-2', {
        content: 'Updated with offensive words',
      });

      expect(updated.content).toBe('[Content filtered]');
      expect(updated.moderationAction).toBeDefined();
      expect(updated.originalContent).toBe('Updated with offensive words');
    });

    test('should manually moderate a post', () => {
      createPost({
        id: 'moderation-3',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Borderline content',
      });

      const moderated = moderatePost('moderation-3', {
        action: 'replace',
        filteredContent: '[Manually reviewed and filtered]',
        shouldHide: true,
        warning: 'Content violates community guidelines',
      });

      expect(moderated.content).toBe('[Manually reviewed and filtered]');
      expect(moderated.status).toBe('hidden');
      expect(moderated.moderationWarning).toBe('Content violates community guidelines');
    });

    test('should preserve original content in moderation', () => {
      createPost({
        id: 'moderation-4',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'This has offensive language',
      });

      const post = getPostById('moderation-4');
      expect(post?.originalContent).toBe('This has offensive language');
      expect(post?.content).not.toBe(post?.originalContent);
    });

    test('should not show hidden posts in active queries', () => {
      createPost({
        id: 'moderation-5',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'offensive stuff',
      });

      const activePosts = getPosts({ status: 'active' });
      expect(activePosts.find(p => p.id === 'moderation-5')).toBeUndefined();

      const hiddenPosts = getPosts({ status: 'hidden' });
      expect(hiddenPosts.find(p => p.id === 'moderation-5')).toBeDefined();
    });
  });

  // ============================================================================
  // E. Error Handling (3 tests)
  // ============================================================================

  describe('Error Handling', () => {
    test('should throw error when updating non-existent post', () => {
      expect(() => {
        updatePost('non-existent', { content: 'New content' });
      }).toThrow();
    });

    test('should throw error when liking non-existent post', () => {
      expect(() => {
        likePost('non-existent', 'user-1');
      }).toThrow('Post not found');
    });

    test('should throw error when bookmarking non-existent post', () => {
      expect(() => {
        bookmarkPost('non-existent', 'user-1');
      }).toThrow('Post not found');
    });
  });

  // ============================================================================
  // F. Integration Tests (2 tests)
  // ============================================================================

  describe('Integration Tests', () => {
    test('should handle complete post lifecycle', () => {
      // Create
      const postId = createPost({
        id: 'lifecycle-1',
        authorId: 'user-1',
        authorName: 'Test User',
        title: 'Complete Lifecycle',
        content: 'Testing full lifecycle',
        tags: ['test'],
        category: 'general',
      });

      // Interact
      likePost(postId, 'user-2');
      likePost(postId, 'user-3');
      bookmarkPost(postId, 'user-2');
      incrementViewCount(postId);
      incrementCommentCount(postId, 1);

      // Update
      updatePost(postId, { content: 'Updated content' });

      // Verify
      const post = getPostById(postId);
      expect(post?.likes).toBe(2);
      expect(post?.bookmarkedBy.length).toBe(1);
      expect(post?.viewCount).toBe(1);
      expect(post?.commentCount).toBe(1);
      expect(post?.isEdited).toBe(true);

      // Delete
      deletePost(postId);
      const deleted = getPostById(postId);
      expect(deleted?.status).toBe('deleted');
    });

    test('should handle concurrent interactions on same post', () => {
      const postId = createPost({
        id: 'concurrent-1',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Concurrent test',
      });

      // Simulate concurrent operations
      likePost(postId, 'user-1');
      likePost(postId, 'user-2');
      bookmarkPost(postId, 'user-1');
      bookmarkPost(postId, 'user-3');
      incrementViewCount(postId);
      incrementViewCount(postId);

      const post = getPostById(postId);
      expect(post?.likes).toBe(2);
      expect(post?.likedBy.length).toBe(2);
      expect(post?.bookmarkedBy.length).toBe(2);
      expect(post?.viewCount).toBe(2);
    });
  });
});
