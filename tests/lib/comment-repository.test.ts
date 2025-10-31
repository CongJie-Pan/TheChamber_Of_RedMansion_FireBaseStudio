/**
 * @fileOverview Tests for Comment Repository
 *
 * This test suite validates all comment operations including nested replies,
 * tree building, interactions, and query functionality.
 *
 * Test coverage:
 * - Basic CRUD operations (8 tests)
 * - Tree building (12 tests)
 * - Reply operations (8 tests)
 * - Interactions (6 tests)
 * - Queries (4 tests)
 * - Integration (3 tests)
 * - Performance (2 tests)
 *
 * @phase Phase 3 - SQLITE-015 Comment Repository Tests
 */

import Database from 'better-sqlite3';
import {
  createComment,
  getCommentById,
  getCommentsByPost,
  deleteComment,
  buildCommentTree,
  getCommentReplies,
  updateReplyCount,
  likeComment,
  unlikeComment,
  getCommentsByAuthor,
  getCommentCount,
} from '../../src/lib/repositories/comment-repository';

// Mock modules
jest.mock('../../src/lib/sqlite-db', () => {
  let mockDb: Database.Database | null = null;

  return {
    getDatabase: jest.fn(() => {
      if (!mockDb) {
        mockDb = new Database(':memory:');
        // Initialize schema
        mockDb.exec(`
          CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            postId TEXT NOT NULL,
            authorId TEXT NOT NULL,
            authorName TEXT NOT NULL,
            content TEXT NOT NULL,
            parentCommentId TEXT,
            depth INTEGER DEFAULT 0,
            replyCount INTEGER DEFAULT 0,
            likes INTEGER DEFAULT 0,
            likedBy TEXT,
            status TEXT DEFAULT 'active',
            isEdited INTEGER DEFAULT 0,
            moderationAction TEXT,
            originalContent TEXT,
            moderationWarning TEXT,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL
          );

          CREATE INDEX idx_comments_postId ON comments(postId, createdAt ASC);
          CREATE INDEX idx_comments_authorId ON comments(authorId, createdAt DESC);
          CREATE INDEX idx_comments_parentId ON comments(parentCommentId, createdAt ASC);
          CREATE INDEX idx_comments_status ON comments(status);
        `);
      }
      return mockDb;
    }),
    fromUnixTimestamp: jest.fn((timestamp: number) => {
      return {
        seconds: Math.floor(timestamp / 1000),
        nanoseconds: (timestamp % 1000) * 1000000,
        toMillis: () => timestamp,
        toDate: () => new Date(timestamp),
        isEqual: (other: any) => other?.toMillis?.() === timestamp,
        toJSON: () => ({
          seconds: Math.floor(timestamp / 1000),
          nanoseconds: (timestamp % 1000) * 1000000,
        }),
      };
    }),
  };
});

jest.mock('../../src/lib/content-filter-service', () => ({
  ModerationAction: {},
}));

describe('Comment Repository', () => {
  // ============================================================================
  // A. Basic CRUD Operations (8 tests)
  // ============================================================================

  describe('Basic CRUD Operations', () => {
    test('should create a root comment (depth 0)', () => {
      const commentId = createComment({
        id: 'comment-1',
        postId: 'post-1',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'This is a root comment',
      });

      expect(commentId).toBe('comment-1');

      const comment = getCommentById('comment-1');
      expect(comment).toBeDefined();
      expect(comment?.content).toBe('This is a root comment');
      expect(comment?.depth).toBe(0);
      expect(comment?.parentCommentId).toBeUndefined();
      expect(comment?.replyCount).toBe(0);
      expect(comment?.likes).toBe(0);
      expect(comment?.status).toBe('active');
    });

    test('should create a nested reply (depth 1)', () => {
      // Create root comment
      createComment({
        id: 'comment-2',
        postId: 'post-1',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Root comment',
      });

      // Create reply
      const replyId = createComment({
        id: 'comment-3',
        postId: 'post-1',
        authorId: 'user-2',
        authorName: 'User Two',
        content: 'Reply to root',
        parentCommentId: 'comment-2',
      });

      expect(replyId).toBe('comment-3');

      const reply = getCommentById('comment-3');
      expect(reply?.depth).toBe(1);
      expect(reply?.parentCommentId).toBe('comment-2');

      // Check parent's reply count was updated
      const parent = getCommentById('comment-2');
      expect(parent?.replyCount).toBe(1);
    });

    test('should create deeply nested reply (depth 3)', () => {
      createComment({
        id: 'comment-4',
        postId: 'post-1',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Level 0',
      });

      createComment({
        id: 'comment-5',
        postId: 'post-1',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Level 1',
        parentCommentId: 'comment-4',
      });

      createComment({
        id: 'comment-6',
        postId: 'post-1',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Level 2',
        parentCommentId: 'comment-5',
      });

      const deepReply = createComment({
        id: 'comment-7',
        postId: 'post-1',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Level 3',
        parentCommentId: 'comment-6',
      });

      const comment = getCommentById(deepReply);
      expect(comment?.depth).toBe(3);
    });

    test('should get comment by ID', () => {
      createComment({
        id: 'comment-8',
        postId: 'post-1',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Test content',
      });

      const comment = getCommentById('comment-8');
      expect(comment).toBeDefined();
      expect(comment?.id).toBe('comment-8');
      expect(comment?.content).toBe('Test content');
    });

    test('should return null for non-existent comment', () => {
      const comment = getCommentById('non-existent');
      expect(comment).toBeNull();
    });

    test('should get comments by post', () => {
      createComment({
        id: 'comment-9',
        postId: 'post-2',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Comment 1',
      });

      createComment({
        id: 'comment-10',
        postId: 'post-2',
        authorId: 'user-2',
        authorName: 'User',
        content: 'Comment 2',
      });

      const comments = getCommentsByPost('post-2');
      expect(comments.length).toBe(2);
      expect(comments[0].content).toBe('Comment 1');
      expect(comments[1].content).toBe('Comment 2');
    });

    test('should soft delete comment', () => {
      createComment({
        id: 'comment-11',
        postId: 'post-1',
        authorId: 'user-1',
        authorName: 'User',
        content: 'To be deleted',
      });

      deleteComment('comment-11');

      const comment = getCommentById('comment-11');
      expect(comment?.status).toBe('deleted');
      expect(comment?.content).toBe('[已刪除]');
    });

    test('should throw error when creating reply to non-existent parent', () => {
      expect(() => {
        createComment({
          id: 'comment-invalid',
          postId: 'post-1',
          authorId: 'user-1',
          authorName: 'User',
          content: 'Reply',
          parentCommentId: 'non-existent-parent',
        });
      }).toThrow('Parent comment not found');
    });
  });

  // ============================================================================
  // B. Tree Building (12 tests)
  // ============================================================================

  describe('Tree Building', () => {
    test('should return empty tree for post with no comments', () => {
      const tree = buildCommentTree('empty-post');
      expect(tree).toEqual([]);
    });

    test('should build tree with single root comment', () => {
      createComment({
        id: 'tree-1',
        postId: 'post-tree',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Root only',
      });

      const tree = buildCommentTree('post-tree');
      expect(tree.length).toBe(1);
      expect(tree[0].id).toBe('tree-1');
      expect(tree[0].replies).toEqual([]);
    });

    test('should build 2-level tree (root + 1 reply)', () => {
      createComment({
        id: 'tree-2',
        postId: 'post-tree-2',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Root',
      });

      createComment({
        id: 'tree-3',
        postId: 'post-tree-2',
        authorId: 'user-2',
        authorName: 'User',
        content: 'Reply',
        parentCommentId: 'tree-2',
      });

      const tree = buildCommentTree('post-tree-2');
      expect(tree.length).toBe(1);
      expect(tree[0].id).toBe('tree-2');
      expect(tree[0].replies.length).toBe(1);
      expect(tree[0].replies[0].id).toBe('tree-3');
    });

    test('should build 3-level deep tree', () => {
      createComment({
        id: 'deep-1',
        postId: 'post-deep',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Level 0',
      });

      createComment({
        id: 'deep-2',
        postId: 'post-deep',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Level 1',
        parentCommentId: 'deep-1',
      });

      createComment({
        id: 'deep-3',
        postId: 'post-deep',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Level 2',
        parentCommentId: 'deep-2',
      });

      const tree = buildCommentTree('post-deep');
      expect(tree.length).toBe(1);
      expect(tree[0].replies.length).toBe(1);
      expect(tree[0].replies[0].replies.length).toBe(1);
      expect(tree[0].replies[0].replies[0].id).toBe('deep-3');
    });

    test('should build tree with multiple root comments', () => {
      createComment({
        id: 'multi-1',
        postId: 'post-multi',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Root 1',
      });

      createComment({
        id: 'multi-2',
        postId: 'post-multi',
        authorId: 'user-2',
        authorName: 'User',
        content: 'Root 2',
      });

      createComment({
        id: 'multi-3',
        postId: 'post-multi',
        authorId: 'user-3',
        authorName: 'User',
        content: 'Root 3',
      });

      const tree = buildCommentTree('post-multi');
      expect(tree.length).toBe(3);
      expect(tree[0].id).toBe('multi-1');
      expect(tree[1].id).toBe('multi-2');
      expect(tree[2].id).toBe('multi-3');
    });

    test('should build tree with multiple separate reply chains', () => {
      // Root 1 with reply
      createComment({
        id: 'chain-1',
        postId: 'post-chains',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Root 1',
      });

      createComment({
        id: 'chain-2',
        postId: 'post-chains',
        authorId: 'user-2',
        authorName: 'User',
        content: 'Reply to root 1',
        parentCommentId: 'chain-1',
      });

      // Root 2 with reply
      createComment({
        id: 'chain-3',
        postId: 'post-chains',
        authorId: 'user-3',
        authorName: 'User',
        content: 'Root 2',
      });

      createComment({
        id: 'chain-4',
        postId: 'post-chains',
        authorId: 'user-4',
        authorName: 'User',
        content: 'Reply to root 2',
        parentCommentId: 'chain-3',
      });

      const tree = buildCommentTree('post-chains');
      expect(tree.length).toBe(2);
      expect(tree[0].replies.length).toBe(1);
      expect(tree[1].replies.length).toBe(1);
    });

    test('should exclude deleted comments from tree', () => {
      createComment({
        id: 'del-1',
        postId: 'post-del',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Root',
      });

      createComment({
        id: 'del-2',
        postId: 'post-del',
        authorId: 'user-2',
        authorName: 'User',
        content: 'To be deleted',
      });

      deleteComment('del-2');

      const tree = buildCommentTree('post-del');
      expect(tree.length).toBe(1);
      expect(tree.find(c => c.id === 'del-2')).toBeUndefined();
    });

    test('should preserve chronological order in tree', () => {
      createComment({
        id: 'order-1',
        postId: 'post-order',
        authorId: 'user-1',
        authorName: 'User',
        content: 'First',
      });

      // Small delay to ensure different timestamps
      createComment({
        id: 'order-2',
        postId: 'post-order',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Second',
      });

      createComment({
        id: 'order-3',
        postId: 'post-order',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Third',
      });

      const tree = buildCommentTree('post-order');
      expect(tree[0].id).toBe('order-1');
      expect(tree[1].id).toBe('order-2');
      expect(tree[2].id).toBe('order-3');
    });

    test('should handle large tree (100+ comments)', () => {
      // Create 1 root + 100 replies
      createComment({
        id: 'large-root',
        postId: 'post-large',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Root',
      });

      for (let i = 0; i < 100; i++) {
        createComment({
          id: `large-reply-${i}`,
          postId: 'post-large',
          authorId: 'user-1',
          authorName: 'User',
          content: `Reply ${i}`,
          parentCommentId: 'large-root',
        });
      }

      const start = Date.now();
      const tree = buildCommentTree('post-large');
      const elapsed = Date.now() - start;

      expect(tree.length).toBe(1);
      expect(tree[0].replies.length).toBe(100);
      expect(elapsed).toBeLessThan(50); // Should be under 50ms
    });

    test('should handle max depth (10+ levels)', () => {
      let parentId = null;
      for (let i = 0; i < 12; i++) {
        const commentId = `depth-${i}`;
        createComment({
          id: commentId,
          postId: 'post-max-depth',
          authorId: 'user-1',
          authorName: 'User',
          content: `Level ${i}`,
          parentCommentId: parentId || undefined,
        });
        parentId = commentId;
      }

      const tree = buildCommentTree('post-max-depth');
      expect(tree.length).toBe(1);

      // Traverse down to deepest level
      let current = tree[0];
      let depth = 0;
      while (current.replies.length > 0) {
        current = current.replies[0];
        depth++;
      }
      expect(depth).toBe(11);
      expect(current.depth).toBe(11);
    });

    test('should validate tree node structure', () => {
      createComment({
        id: 'struct-1',
        postId: 'post-struct',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Root',
      });

      createComment({
        id: 'struct-2',
        postId: 'post-struct',
        authorId: 'user-2',
        authorName: 'User Two',
        content: 'Reply',
        parentCommentId: 'struct-1',
      });

      const tree = buildCommentTree('post-struct');
      const node = tree[0];

      // Validate node has comment properties
      expect(node.id).toBeDefined();
      expect(node.postId).toBe('post-struct');
      expect(node.authorId).toBeDefined();
      expect(node.authorName).toBeDefined();
      expect(node.content).toBeDefined();
      expect(node.depth).toBeDefined();
      expect(node.createdAt).toBeDefined();

      // Validate node has tree structure
      expect(node.replies).toBeDefined();
      expect(Array.isArray(node.replies)).toBe(true);
      expect(node.replies[0].id).toBe('struct-2');
    });

    test('should handle mixed depths correctly', () => {
      // Create complex tree with varying depths
      createComment({
        id: 'mixed-1',
        postId: 'post-mixed',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Root 1',
      });

      createComment({
        id: 'mixed-2',
        postId: 'post-mixed',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Root 2',
      });

      // Root 1 -> 2 levels deep
      createComment({
        id: 'mixed-3',
        postId: 'post-mixed',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Reply to root 1',
        parentCommentId: 'mixed-1',
      });

      createComment({
        id: 'mixed-4',
        postId: 'post-mixed',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Reply to reply',
        parentCommentId: 'mixed-3',
      });

      // Root 2 -> only 1 level
      createComment({
        id: 'mixed-5',
        postId: 'post-mixed',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Reply to root 2',
        parentCommentId: 'mixed-2',
      });

      const tree = buildCommentTree('post-mixed');
      expect(tree.length).toBe(2);
      expect(tree[0].replies.length).toBe(1);
      expect(tree[0].replies[0].replies.length).toBe(1);
      expect(tree[1].replies.length).toBe(1);
      expect(tree[1].replies[0].replies.length).toBe(0);
    });
  });

  // ============================================================================
  // C. Reply Operations (8 tests)
  // ============================================================================

  describe('Reply Operations', () => {
    test('should get direct replies to comment', () => {
      createComment({
        id: 'reply-parent',
        postId: 'post-reply',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Parent',
      });

      createComment({
        id: 'reply-child-1',
        postId: 'post-reply',
        authorId: 'user-2',
        authorName: 'User',
        content: 'Child 1',
        parentCommentId: 'reply-parent',
      });

      createComment({
        id: 'reply-child-2',
        postId: 'post-reply',
        authorId: 'user-3',
        authorName: 'User',
        content: 'Child 2',
        parentCommentId: 'reply-parent',
      });

      const replies = getCommentReplies('reply-parent');
      expect(replies.length).toBe(2);
      expect(replies[0].id).toBe('reply-child-1');
      expect(replies[1].id).toBe('reply-child-2');
    });

    test('should update reply count on create', () => {
      createComment({
        id: 'count-parent',
        postId: 'post-count',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Parent',
      });

      const before = getCommentById('count-parent');
      expect(before?.replyCount).toBe(0);

      createComment({
        id: 'count-child',
        postId: 'post-count',
        authorId: 'user-2',
        authorName: 'User',
        content: 'Child',
        parentCommentId: 'count-parent',
      });

      const after = getCommentById('count-parent');
      expect(after?.replyCount).toBe(1);
    });

    test('should update reply count on delete', () => {
      createComment({
        id: 'del-parent',
        postId: 'post-del-count',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Parent',
      });

      createComment({
        id: 'del-child',
        postId: 'post-del-count',
        authorId: 'user-2',
        authorName: 'User',
        content: 'Child',
        parentCommentId: 'del-parent',
      });

      const before = getCommentById('del-parent');
      expect(before?.replyCount).toBe(1);

      deleteComment('del-child');

      const after = getCommentById('del-parent');
      expect(after?.replyCount).toBe(0);
    });

    test('should calculate depth for nested replies', () => {
      createComment({
        id: 'depth-calc-0',
        postId: 'post-depth-calc',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Level 0',
      });

      createComment({
        id: 'depth-calc-1',
        postId: 'post-depth-calc',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Level 1',
        parentCommentId: 'depth-calc-0',
      });

      createComment({
        id: 'depth-calc-2',
        postId: 'post-depth-calc',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Level 2',
        parentCommentId: 'depth-calc-1',
      });

      expect(getCommentById('depth-calc-0')?.depth).toBe(0);
      expect(getCommentById('depth-calc-1')?.depth).toBe(1);
      expect(getCommentById('depth-calc-2')?.depth).toBe(2);
    });

    test('should handle multiple replies to same comment', () => {
      createComment({
        id: 'multi-parent',
        postId: 'post-multi-reply',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Parent',
      });

      for (let i = 0; i < 5; i++) {
        createComment({
          id: `multi-child-${i}`,
          postId: 'post-multi-reply',
          authorId: 'user-1',
          authorName: 'User',
          content: `Child ${i}`,
          parentCommentId: 'multi-parent',
        });
      }

      const parent = getCommentById('multi-parent');
      expect(parent?.replyCount).toBe(5);

      const replies = getCommentReplies('multi-parent');
      expect(replies.length).toBe(5);
    });

    test('should support reply to reply (depth 2+)', () => {
      createComment({
        id: 'r2r-1',
        postId: 'post-r2r',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Root',
      });

      createComment({
        id: 'r2r-2',
        postId: 'post-r2r',
        authorId: 'user-2',
        authorName: 'User',
        content: 'Reply to root',
        parentCommentId: 'r2r-1',
      });

      createComment({
        id: 'r2r-3',
        postId: 'post-r2r',
        authorId: 'user-3',
        authorName: 'User',
        content: 'Reply to reply',
        parentCommentId: 'r2r-2',
      });

      const comment = getCommentById('r2r-3');
      expect(comment?.depth).toBe(2);
      expect(comment?.parentCommentId).toBe('r2r-2');

      const middleReply = getCommentById('r2r-2');
      expect(middleReply?.replyCount).toBe(1);
    });

    test('should maintain reply chain integrity', () => {
      createComment({
        id: 'chain-root',
        postId: 'post-chain',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Root',
      });

      createComment({
        id: 'chain-level-1',
        postId: 'post-chain',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Level 1',
        parentCommentId: 'chain-root',
      });

      createComment({
        id: 'chain-level-2',
        postId: 'post-chain',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Level 2',
        parentCommentId: 'chain-level-1',
      });

      createComment({
        id: 'chain-level-3',
        postId: 'post-chain',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Level 3',
        parentCommentId: 'chain-level-2',
      });

      // Verify each link in the chain
      const tree = buildCommentTree('post-chain');
      expect(tree[0].id).toBe('chain-root');
      expect(tree[0].replies[0].id).toBe('chain-level-1');
      expect(tree[0].replies[0].replies[0].id).toBe('chain-level-2');
      expect(tree[0].replies[0].replies[0].replies[0].id).toBe('chain-level-3');
    });

    test('should manually update reply count', () => {
      createComment({
        id: 'manual-parent',
        postId: 'post-manual',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Parent',
      });

      updateReplyCount('manual-parent', 5);

      const comment = getCommentById('manual-parent');
      expect(comment?.replyCount).toBe(5);

      updateReplyCount('manual-parent', -2);

      const updated = getCommentById('manual-parent');
      expect(updated?.replyCount).toBe(3);
    });
  });

  // ============================================================================
  // D. Interactions (6 tests)
  // ============================================================================

  describe('Interactions', () => {
    test('should like a comment', () => {
      createComment({
        id: 'like-1',
        postId: 'post-like',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Like me!',
      });

      const liked = likeComment('like-1', 'user-2');
      expect(liked.likes).toBe(1);
      expect(liked.likedBy).toContain('user-2');
    });

    test('should unlike a comment', () => {
      createComment({
        id: 'unlike-1',
        postId: 'post-unlike',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Unlike me',
      });

      likeComment('unlike-1', 'user-2');
      const unliked = unlikeComment('unlike-1', 'user-2');

      expect(unliked.likes).toBe(0);
      expect(unliked.likedBy).toEqual([]);
    });

    test('should prevent duplicate likes', () => {
      createComment({
        id: 'dup-like',
        postId: 'post-dup',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Dup like test',
      });

      likeComment('dup-like', 'user-2');
      const secondLike = likeComment('dup-like', 'user-2');

      expect(secondLike.likes).toBe(1);
      expect(secondLike.likedBy).toEqual(['user-2']);
    });

    test('should maintain like count accuracy', () => {
      createComment({
        id: 'like-count',
        postId: 'post-lc',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Count test',
      });

      likeComment('like-count', 'user-1');
      likeComment('like-count', 'user-2');
      likeComment('like-count', 'user-3');

      const comment = getCommentById('like-count');
      expect(comment?.likes).toBe(3);
      expect(comment?.likedBy.length).toBe(3);
    });

    test('should handle unlike on non-liked comment', () => {
      createComment({
        id: 'unlike-none',
        postId: 'post-un',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Not liked',
      });

      const result = unlikeComment('unlike-none', 'user-2');
      expect(result.likes).toBe(0);
      expect(result.likedBy).toEqual([]);
    });

    test('should support multiple users liking same comment', () => {
      createComment({
        id: 'multi-like',
        postId: 'post-ml',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Popular comment',
      });

      likeComment('multi-like', 'user-2');
      likeComment('multi-like', 'user-3');
      likeComment('multi-like', 'user-4');
      likeComment('multi-like', 'user-5');

      const comment = getCommentById('multi-like');
      expect(comment?.likes).toBe(4);
      expect(comment?.likedBy.sort()).toEqual(['user-2', 'user-3', 'user-4', 'user-5'].sort());
    });
  });

  // ============================================================================
  // E. Queries (4 tests)
  // ============================================================================

  describe('Queries', () => {
    test('should get comments by author', () => {
      createComment({
        id: 'author-1',
        postId: 'post-1',
        authorId: 'author-test',
        authorName: 'Test Author',
        content: 'Comment 1',
      });

      createComment({
        id: 'author-2',
        postId: 'post-2',
        authorId: 'author-test',
        authorName: 'Test Author',
        content: 'Comment 2',
      });

      createComment({
        id: 'author-3',
        postId: 'post-3',
        authorId: 'other-author',
        authorName: 'Other',
        content: 'Comment 3',
      });

      const comments = getCommentsByAuthor('author-test');
      expect(comments.length).toBe(2);
      expect(comments.every(c => c.authorId === 'author-test')).toBe(true);
    });

    test('should get comment count for post', () => {
      createComment({
        id: 'count-1',
        postId: 'post-count-test',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Comment 1',
      });

      createComment({
        id: 'count-2',
        postId: 'post-count-test',
        authorId: 'user-2',
        authorName: 'User',
        content: 'Comment 2',
      });

      createComment({
        id: 'count-3',
        postId: 'post-count-test',
        authorId: 'user-3',
        authorName: 'User',
        content: 'Comment 3',
      });

      const count = getCommentCount('post-count-test');
      expect(count).toBe(3);
    });

    test('should filter by status in queries', () => {
      createComment({
        id: 'status-1',
        postId: 'post-status',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Active',
      });

      createComment({
        id: 'status-2',
        postId: 'post-status',
        authorId: 'user-1',
        authorName: 'User',
        content: 'To be deleted',
      });

      deleteComment('status-2');

      const comments = getCommentsByPost('post-status');
      expect(comments.length).toBe(1);
      expect(comments[0].id).toBe('status-1');
    });

    test('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        createComment({
          id: `limit-${i}`,
          postId: 'post-limit',
          authorId: 'user-1',
          authorName: 'User',
          content: `Comment ${i}`,
        });
      }

      const comments = getCommentsByPost('post-limit', 5);
      expect(comments.length).toBe(5);
    });
  });

  // ============================================================================
  // F. Integration (3 tests)
  // ============================================================================

  describe('Integration Tests', () => {
    test('should handle complete comment lifecycle', () => {
      // Create
      const commentId = createComment({
        id: 'lifecycle-1',
        postId: 'post-lifecycle',
        authorId: 'user-1',
        authorName: 'Test User',
        content: 'Complete lifecycle test',
      });

      // Read
      let comment = getCommentById(commentId);
      expect(comment).toBeDefined();

      // Like
      likeComment(commentId, 'user-2');
      comment = getCommentById(commentId);
      expect(comment?.likes).toBe(1);

      // Reply
      createComment({
        id: 'lifecycle-reply',
        postId: 'post-lifecycle',
        authorId: 'user-3',
        authorName: 'User Three',
        content: 'Reply',
        parentCommentId: commentId,
      });
      comment = getCommentById(commentId);
      expect(comment?.replyCount).toBe(1);

      // Tree
      const tree = buildCommentTree('post-lifecycle');
      expect(tree.length).toBe(1);
      expect(tree[0].replies.length).toBe(1);

      // Delete
      deleteComment(commentId);
      comment = getCommentById(commentId);
      expect(comment?.status).toBe('deleted');
    });

    test('should maintain data integrity with complex operations', () => {
      // Create root with multiple reply chains
      const rootId = createComment({
        id: 'complex-root',
        postId: 'post-complex',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Root',
      });

      // Chain 1: 3 levels deep
      const chain1 = createComment({
        id: 'complex-c1-1',
        postId: 'post-complex',
        authorId: 'user-2',
        authorName: 'User',
        content: 'Chain 1 Level 1',
        parentCommentId: rootId,
      });

      createComment({
        id: 'complex-c1-2',
        postId: 'post-complex',
        authorId: 'user-3',
        authorName: 'User',
        content: 'Chain 1 Level 2',
        parentCommentId: chain1,
      });

      // Chain 2: 2 levels deep
      const chain2 = createComment({
        id: 'complex-c2-1',
        postId: 'post-complex',
        authorId: 'user-4',
        authorName: 'User',
        content: 'Chain 2 Level 1',
        parentCommentId: rootId,
      });

      // Add likes
      likeComment(rootId, 'user-5');
      likeComment(chain1, 'user-6');

      // Verify counts
      const root = getCommentById(rootId);
      expect(root?.replyCount).toBe(2);
      expect(root?.likes).toBe(1);

      // Verify tree structure
      const tree = buildCommentTree('post-complex');
      expect(tree[0].replies.length).toBe(2);
      expect(tree[0].replies[0].replies.length).toBe(1);

      // Delete one chain
      deleteComment(chain1);

      // Verify counts updated
      const updatedRoot = getCommentById(rootId);
      expect(updatedRoot?.replyCount).toBe(1);
    });

    test('should handle concurrent operations gracefully', () => {
      const rootId = createComment({
        id: 'concurrent-root',
        postId: 'post-concurrent',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Concurrent test',
      });

      // Simulate concurrent likes from multiple users
      likeComment(rootId, 'user-1');
      likeComment(rootId, 'user-2');
      likeComment(rootId, 'user-3');
      likeComment(rootId, 'user-4');

      // Simulate concurrent replies
      createComment({
        id: 'concurrent-r1',
        postId: 'post-concurrent',
        authorId: 'user-2',
        authorName: 'User',
        content: 'Reply 1',
        parentCommentId: rootId,
      });

      createComment({
        id: 'concurrent-r2',
        postId: 'post-concurrent',
        authorId: 'user-3',
        authorName: 'User',
        content: 'Reply 2',
        parentCommentId: rootId,
      });

      const comment = getCommentById(rootId);
      expect(comment?.likes).toBe(4);
      expect(comment?.replyCount).toBe(2);
      expect(comment?.likedBy.length).toBe(4);
    });
  });

  // ============================================================================
  // G. Performance (2 tests)
  // ============================================================================

  describe('Performance', () => {
    test('should build tree in under 50ms for 100 comments', () => {
      // Create 1 root + 99 replies
      createComment({
        id: 'perf-root',
        postId: 'post-perf',
        authorId: 'user-1',
        authorName: 'User',
        content: 'Root',
      });

      for (let i = 0; i < 99; i++) {
        createComment({
          id: `perf-reply-${i}`,
          postId: 'post-perf',
          authorId: 'user-1',
          authorName: 'User',
          content: `Reply ${i}`,
          parentCommentId: 'perf-root',
        });
      }

      const start = Date.now();
      const tree = buildCommentTree('post-perf');
      const elapsed = Date.now() - start;

      expect(tree.length).toBe(1);
      expect(tree[0].replies.length).toBe(99);
      expect(elapsed).toBeLessThan(50);
    });

    test('should handle deep nesting efficiently (10+ levels)', () => {
      let parentId: string | null = null;
      for (let i = 0; i < 15; i++) {
        const commentId = `deep-perf-${i}`;
        createComment({
          id: commentId,
          postId: 'post-deep-perf',
          authorId: 'user-1',
          authorName: 'User',
          content: `Level ${i}`,
          parentCommentId: parentId || undefined,
        });
        parentId = commentId;
      }

      const start = Date.now();
      const tree = buildCommentTree('post-deep-perf');
      const elapsed = Date.now() - start;

      expect(tree.length).toBe(1);
      expect(elapsed).toBeLessThan(50);

      // Verify depth
      let current = tree[0];
      let depth = 0;
      while (current.replies.length > 0) {
        current = current.replies[0];
        depth++;
      }
      expect(depth).toBe(14);
    });
  });
});
