/**
 * @fileOverview Tests for Community Repository
 *
 * This test suite validates all post operations in the community repository.
 * Rewritten to use mocked libSQL/Turso client instead of better-sqlite3.
 *
 * Test coverage:
 * - Basic CRUD operations (createPost, getPostById, updatePost, deletePost, postExists)
 * - Post interactions (like, unlike, bookmark, unbookmark, viewCount, commentCount)
 * - Post queries (byAuthor, byTag, byCategory, trending, bookmarked)
 * - Post moderation
 * - Task 4.9: Note-Post sync functions
 *
 * @phase Phase 3 - SQLITE-014 Community Repository Tests
 */

// Mock data storage to simulate database
const mockPostsData: Map<string, any> = new Map();
const mockNotesData: Map<string, any> = new Map();

// Create mock database that simulates libSQL client API
const mockExecute = jest.fn(async (params: string | { sql: string; args?: any[] }) => {
  // Handle string parameter (e.g., 'BEGIN', 'COMMIT', 'ROLLBACK')
  if (typeof params === 'string') {
    return { rows: [], rowsAffected: 0 };
  }
  const { sql, args = [] } = params;

  // ========== POST OPERATIONS ==========

  // Handle INSERT INTO posts
  if (sql.includes('INSERT INTO posts')) {
    const [id, authorId, authorName, title, content, tags, category, likes, likedBy,
           bookmarkedBy, commentCount, viewCount, status, isEdited, editedAt,
           sourceNoteId, moderationAction, originalContent, moderationWarning,
           createdAt, updatedAt] = args;
    mockPostsData.set(id, {
      id, authorId, authorName, title, content, tags, category, likes, likedBy,
      bookmarkedBy, commentCount, viewCount, status, isEdited, editedAt,
      sourceNoteId, moderationAction, originalContent, moderationWarning,
      createdAt, updatedAt
    });
    return { rows: [], rowsAffected: 1 };
  }

  // Handle SELECT * FROM posts WHERE id = ?
  if (sql.includes('SELECT') && sql.includes('FROM posts') && sql.includes('WHERE id = ?')) {
    const id = args[0];
    const post = mockPostsData.get(id);
    return { rows: post ? [post] : [], rowsAffected: 0 };
  }

  // Handle SELECT * FROM posts WHERE sourceNoteId = ?
  if (sql.includes('FROM posts') && sql.includes('WHERE sourceNoteId = ?')) {
    const noteId = args[0];
    const post = Array.from(mockPostsData.values()).find(p => p.sourceNoteId === noteId);
    return { rows: post ? [post] : [], rowsAffected: 0 };
  }

  // Handle SELECT * FROM posts WHERE authorId = ? AND sourceNoteId IS NOT NULL AND status = 'active'
  if (sql.includes('FROM posts') && sql.includes('WHERE authorId = ?') && sql.includes('sourceNoteId IS NOT NULL')) {
    const authorId = args[0];
    const posts = Array.from(mockPostsData.values())
      .filter(p => p.authorId === authorId && p.sourceNoteId != null && p.status === 'active')
      .sort((a, b) => b.updatedAt - a.updatedAt);
    return { rows: posts, rowsAffected: 0 };
  }

  // Handle SELECT * FROM posts WHERE authorId = ? AND status = 'active' ORDER BY
  if (sql.includes('FROM posts') && sql.includes('WHERE authorId = ?') && sql.includes('ORDER BY') && !sql.includes('sourceNoteId')) {
    const authorId = args[0];
    const limit = args[1] || 20;
    const posts = Array.from(mockPostsData.values())
      .filter(p => p.authorId === authorId && p.status === 'active')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
    return { rows: posts, rowsAffected: 0 };
  }

  // Handle SELECT * FROM posts WHERE tags LIKE ? AND status = 'active' ORDER BY
  if (sql.includes('FROM posts') && sql.includes('WHERE tags LIKE ?')) {
    const tagPattern = args[0];
    const limit = args[1] || 20;
    const tag = tagPattern.replace(/%/g, '').replace(/"/g, '');
    const posts = Array.from(mockPostsData.values())
      .filter(p => {
        if (p.status !== 'active') return false;
        try {
          const tags = JSON.parse(p.tags || '[]');
          return tags.includes(tag);
        } catch {
          return false;
        }
      })
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
    return { rows: posts, rowsAffected: 0 };
  }

  // Handle SELECT * FROM posts WHERE category = ? AND status = 'active' ORDER BY
  if (sql.includes('FROM posts') && sql.includes('WHERE category = ?') && sql.includes('ORDER BY')) {
    const category = args[0];
    const limit = args[1] || 20;
    const posts = Array.from(mockPostsData.values())
      .filter(p => p.category === category && p.status === 'active')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
    return { rows: posts, rowsAffected: 0 };
  }

  // Handle SELECT * FROM posts WHERE bookmarkedBy LIKE ? AND status = 'active'
  if (sql.includes('FROM posts') && sql.includes('WHERE bookmarkedBy LIKE ?')) {
    const userPattern = args[0];
    const userId = userPattern.replace(/%/g, '').replace(/"/g, '');
    const posts = Array.from(mockPostsData.values())
      .filter(p => {
        if (p.status !== 'active') return false;
        try {
          const bookmarkedBy = JSON.parse(p.bookmarkedBy || '[]');
          return bookmarkedBy.includes(userId);
        } catch {
          return false;
        }
      })
      .sort((a, b) => b.createdAt - a.createdAt);
    return { rows: posts, rowsAffected: 0 };
  }

  // Handle SELECT * FROM posts WHERE status = 'active' ORDER BY trending formula
  if (sql.includes('FROM posts') && sql.includes("WHERE status = 'active'") && sql.includes('ORDER BY (likes')) {
    const now = args[0];
    const limit = args[1] || 20;
    const posts = Array.from(mockPostsData.values())
      .filter(p => p.status === 'active')
      .sort((a, b) => {
        // Trending score = (likes * 2 + commentCount * 3 + viewCount) / age_in_hours
        const scoreA = ((a.likes || 0) * 2 + (a.commentCount || 0) * 3 + (a.viewCount || 0)) / ((now - a.createdAt) / 3600000.0 + 1);
        const scoreB = ((b.likes || 0) * 2 + (b.commentCount || 0) * 3 + (b.viewCount || 0)) / ((now - b.createdAt) / 3600000.0 + 1);
        return scoreB - scoreA;
      })
      .slice(0, limit);
    return { rows: posts, rowsAffected: 0 };
  }

  // Handle SELECT * FROM posts WHERE status = 'active' ORDER BY createdAt DESC
  if (sql.includes('FROM posts') && sql.includes("status = 'active'") && sql.includes('ORDER BY createdAt')) {
    let posts = Array.from(mockPostsData.values())
      .filter(p => p.status === 'active')
      .sort((a, b) => b.createdAt - a.createdAt);
    // Handle LIMIT and OFFSET
    if (sql.includes('LIMIT ?')) {
      const limitIdx = args.length > 1 ? 1 : 0;
      const limit = args[limitIdx] || 20;
      const offset = args[limitIdx + 1] || 0;
      posts = posts.slice(offset, offset + limit);
    }
    return { rows: posts, rowsAffected: 0 };
  }

  // Handle SELECT 1 FROM posts WHERE id = ? LIMIT 1 (postExists)
  if (sql.includes('SELECT 1') && sql.includes('FROM posts') && sql.includes('WHERE id = ?')) {
    const id = args[0];
    const exists = mockPostsData.has(id);
    return { rows: exists ? [{ '1': 1 }] : [], rowsAffected: 0 };
  }

  // Handle UPDATE posts - parse SET clause
  if (sql.includes('UPDATE posts')) {
    const postId = args[args.length - 1];
    const post = mockPostsData.get(postId);
    if (post) {
      const setMatch = sql.match(/SET\s+([\s\S]*?)\s+WHERE/i);
      if (setMatch) {
        const setClause = setMatch[1];
        const fieldAssignments = setClause.split(',').map(f => f.trim());

        let argIndex = 0;
        for (let i = 0; i < fieldAssignments.length; i++) {
          const assignment = fieldAssignments[i];
          const fieldName = assignment.split('=')[0].trim();
          const valueExpr = assignment.split('=')[1]?.trim();

          // Handle expressions like commentCount = commentCount + ? (parameterized increment)
          if (valueExpr && valueExpr.includes('+') && valueExpr.includes('?')) {
            const value = args[argIndex];
            argIndex++;
            post[fieldName] = (post[fieldName] || 0) + value;
            continue;
          }

          // Handle expressions like likes = likes + 1 (literal increment)
          if (valueExpr && valueExpr.includes('+')) {
            const match = valueExpr.match(/(\w+)\s*\+\s*(\d+)/);
            if (match) {
              post[fieldName] = (post[fieldName] || 0) + parseInt(match[2]);
              continue;
            }
          }

          // Handle expressions like likes = likes - 1 (literal decrement)
          if (valueExpr && valueExpr.includes('-')) {
            const match = valueExpr.match(/(\w+)\s*-\s*(\d+)/);
            if (match) {
              post[fieldName] = Math.max(0, (post[fieldName] || 0) - parseInt(match[2]));
              continue;
            }
          }

          // Handle literal NULL
          if (valueExpr === 'NULL') {
            post[fieldName] = null;
            continue;
          }

          // Handle literal string like status = 'deleted'
          const literalStringMatch = valueExpr?.match(/^'([^']*)'$/);
          if (literalStringMatch) {
            post[fieldName] = literalStringMatch[1];
            continue;
          }

          // Handle literal number like isEdited = 1
          const literalNumberMatch = valueExpr?.match(/^(\d+)$/);
          if (literalNumberMatch) {
            post[fieldName] = parseInt(literalNumberMatch[1]);
            continue;
          }

          // Handle parameterized value
          if (valueExpr === '?') {
            const value = args[argIndex];
            argIndex++;

            switch (fieldName) {
              case 'title': post.title = value; break;
              case 'content': post.content = value; break;
              case 'tags': post.tags = value; break;
              case 'category': post.category = value; break;
              case 'likes': post.likes = value; break;
              case 'likedBy': post.likedBy = value; break;
              case 'bookmarkedBy': post.bookmarkedBy = value; break;
              case 'commentCount': post.commentCount = value; break;
              case 'viewCount': post.viewCount = value; break;
              case 'status': post.status = value; break;
              case 'isEdited': post.isEdited = value; break;
              case 'editedAt': post.editedAt = value; break;
              case 'sourceNoteId': post.sourceNoteId = value; break;
              case 'moderationAction': post.moderationAction = value; break;
              case 'originalContent': post.originalContent = value; break;
              case 'moderationWarning': post.moderationWarning = value; break;
              case 'updatedAt': post.updatedAt = value; break;
            }
          }
        }
      }
      mockPostsData.set(postId, post);
    }
    return { rows: [], rowsAffected: post ? 1 : 0 };
  }

  // Note: deletePost uses UPDATE (soft delete), not DELETE
  // Handle actual DELETE FROM posts WHERE id = ? (if ever used)
  if (sql.includes('DELETE FROM posts WHERE id = ?')) {
    const id = args[0];
    const deleted = mockPostsData.delete(id);
    return { rows: [], rowsAffected: deleted ? 1 : 0 };
  }

  // ========== NOTE OPERATIONS (for Task 4.9 sync tests) ==========

  // Handle SELECT * FROM notes WHERE id = ?
  if (sql.includes('FROM notes') && sql.includes('WHERE id = ?')) {
    const id = args[0];
    const note = mockNotesData.get(id);
    return { rows: note ? [note] : [], rowsAffected: 0 };
  }

  // Handle UPDATE notes
  if (sql.includes('UPDATE notes')) {
    const noteId = args[args.length - 1];
    const note = mockNotesData.get(noteId);
    if (note) {
      const setMatch = sql.match(/SET\s+([\s\S]*?)\s+WHERE/i);
      if (setMatch) {
        const setClause = setMatch[1];
        const fieldAssignments = setClause.split(',').map(f => f.trim());
        let argIndex = 0;
        for (let i = 0; i < fieldAssignments.length; i++) {
          const assignment = fieldAssignments[i];
          const fieldName = assignment.split('=')[0].trim();
          const valueExpr = assignment.split('=')[1]?.trim();
          if (valueExpr === 'NULL') {
            note[fieldName] = null;
            continue;
          }
          if (valueExpr === '?') {
            note[fieldName] = args[argIndex];
            argIndex++;
          }
        }
      }
      mockNotesData.set(noteId, note);
    }
    return { rows: [], rowsAffected: note ? 1 : 0 };
  }

  // Default: return empty result
  return { rows: [], rowsAffected: 0 };
});

const mockDb = {
  execute: mockExecute,
  batch: jest.fn(async (statements: any[]) => {
    const results = [];
    for (const stmt of statements) {
      if (Array.isArray(stmt)) {
        results.push(await mockExecute({ sql: stmt[0], args: stmt[1] }));
      } else if (stmt && typeof stmt === 'object') {
        results.push(await mockExecute(stmt));
      }
    }
    return results;
  }),
  close: jest.fn(),
};

// Mock the sqlite-db module
jest.mock('@/lib/sqlite-db', () => ({
  getDatabase: jest.fn(() => mockDb),
  toUnixTimestamp: (date: Date) => date.getTime(),
  fromUnixTimestamp: (timestamp: number) => ({
    seconds: Math.floor(timestamp / 1000),
    nanoseconds: (timestamp % 1000) * 1000000,
    toMillis: () => timestamp,
    toDate: () => new Date(timestamp),
    isEqual: (other: any) => other && other.toMillis && other.toMillis() === timestamp,
  }),
}));

// Import after mocking
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
  syncPostFromNote,
  linkPostToNote,
  getPostBySourceNoteId,
  getPostsFromNotesByAuthor,
} from '@/lib/repositories/community-repository';

describe('Community Repository (SQLITE-014)', () => {
  beforeEach(() => {
    mockPostsData.clear();
    mockNotesData.clear();
    jest.clearAllMocks();
  });

  // ============================================================================
  // A. Basic CRUD Operations
  // ============================================================================
  describe('Basic CRUD Operations', () => {
    describe('createPost', () => {
      test('should create a new post with all fields', async () => {
        const postData = {
          id: 'post-001',
          authorId: 'user-001',
          authorName: '林黛玉',
          title: '葬花吟心得',
          content: '花謝花飛花滿天，紅消香斷有誰憐？',
          tags: ['詩詞', '林黛玉'],
          category: 'poetry',
        };

        const postId = await createPost(postData);

        expect(postId).toBe('post-001');
        const saved = mockPostsData.get('post-001');
        expect(saved).toBeDefined();
        expect(saved.authorId).toBe('user-001');
        expect(saved.authorName).toBe('林黛玉');
        expect(saved.content).toBe('花謝花飛花滿天，紅消香斷有誰憐？');
        expect(saved.status).toBe('active');
        expect(saved.likes).toBe(0);
      });

      test('should create post with sourceNoteId for Task 4.9', async () => {
        const postData = {
          id: 'post-002',
          authorId: 'user-001',
          authorName: '賈寶玉',
          content: '從讀書筆記分享',
          sourceNoteId: 'note-001',
        };

        await createPost(postData);

        const saved = mockPostsData.get('post-002');
        expect(saved.sourceNoteId).toBe('note-001');
      });

      test('should set default values for optional fields', async () => {
        const postData = {
          id: 'post-003',
          authorId: 'user-002',
          authorName: '薛寶釵',
          content: '簡單內容',
        };

        await createPost(postData);

        const saved = mockPostsData.get('post-003');
        expect(saved.likes).toBe(0);
        expect(saved.commentCount).toBe(0);
        expect(saved.viewCount).toBe(0);
        expect(saved.status).toBe('active');
        expect(saved.isEdited).toBe(0);
      });
    });

    describe('getPostById', () => {
      test('should retrieve existing post', async () => {
        const now = Date.now();
        mockPostsData.set('post-get-001', {
          id: 'post-get-001',
          authorId: 'user-001',
          authorName: '王熙鳳',
          title: '榮國府管理心得',
          content: '一個家族的興衰...',
          tags: '["管理","家族"]',
          category: 'discussion',
          likes: 10,
          likedBy: '["user-002","user-003"]',
          bookmarkedBy: '[]',
          commentCount: 5,
          viewCount: 100,
          status: 'active',
          isEdited: 0,
          editedAt: null,
          sourceNoteId: null,
          moderationAction: null,
          originalContent: null,
          moderationWarning: null,
          createdAt: now,
          updatedAt: now,
        });

        const post = await getPostById('post-get-001');

        expect(post).not.toBeNull();
        expect(post?.id).toBe('post-get-001');
        expect(post?.authorName).toBe('王熙鳳');
        expect(post?.likes).toBe(10);
        expect(post?.tags).toEqual(['管理', '家族']);
        expect(post?.likedBy).toEqual(['user-002', 'user-003']);
      });

      test('should return null for non-existent post', async () => {
        const post = await getPostById('non-existent');
        expect(post).toBeNull();
      });
    });

    describe('updatePost', () => {
      test('should update post content', async () => {
        const now = Date.now();
        mockPostsData.set('post-update-001', {
          id: 'post-update-001',
          authorId: 'user-001',
          authorName: 'Test',
          title: 'Original Title',
          content: 'Original content',
          tags: '[]',
          category: null,
          likes: 0,
          likedBy: '[]',
          bookmarkedBy: '[]',
          commentCount: 0,
          viewCount: 0,
          status: 'active',
          isEdited: 0,
          editedAt: null,
          sourceNoteId: null,
          moderationAction: null,
          originalContent: null,
          moderationWarning: null,
          createdAt: now,
          updatedAt: now,
        });

        await updatePost('post-update-001', {
          content: 'Updated content',
          title: 'Updated Title',
        });

        const updated = mockPostsData.get('post-update-001');
        expect(updated.content).toBe('Updated content');
        expect(updated.title).toBe('Updated Title');
        expect(updated.isEdited).toBe(1);
      });

      test('should update tags', async () => {
        const now = Date.now();
        mockPostsData.set('post-update-002', {
          id: 'post-update-002',
          authorId: 'user-001',
          authorName: 'Test',
          content: 'Content',
          tags: '["old-tag"]',
          category: null,
          likes: 0,
          likedBy: '[]',
          bookmarkedBy: '[]',
          commentCount: 0,
          viewCount: 0,
          status: 'active',
          isEdited: 0,
          editedAt: null,
          sourceNoteId: null,
          moderationAction: null,
          originalContent: null,
          moderationWarning: null,
          createdAt: now,
          updatedAt: now,
        });

        await updatePost('post-update-002', {
          tags: ['new-tag-1', 'new-tag-2'],
        });

        const updated = mockPostsData.get('post-update-002');
        expect(JSON.parse(updated.tags)).toEqual(['new-tag-1', 'new-tag-2']);
      });
    });

    describe('deletePost', () => {
      test('should soft-delete post by setting status to deleted', async () => {
        mockPostsData.set('post-delete-001', {
          id: 'post-delete-001',
          authorId: 'user-001',
          authorName: 'Test',
          content: 'To be deleted',
          tags: '[]',
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });

        await deletePost('post-delete-001');

        // Soft delete: post still exists but status is 'deleted'
        const post = mockPostsData.get('post-delete-001');
        expect(post).toBeDefined();
        expect(post.status).toBe('deleted');
      });

      test('should not throw when deleting non-existent post', async () => {
        await expect(deletePost('non-existent')).resolves.not.toThrow();
      });
    });

    describe('postExists', () => {
      test('should return true for existing post', async () => {
        mockPostsData.set('post-exists-001', {
          id: 'post-exists-001',
          content: 'Exists',
        });

        const exists = await postExists('post-exists-001');
        expect(exists).toBe(true);
      });

      test('should return false for non-existent post', async () => {
        const exists = await postExists('non-existent');
        expect(exists).toBe(false);
      });
    });
  });

  // ============================================================================
  // B. Post Interactions
  // ============================================================================
  describe('Post Interactions', () => {
    const createTestPost = (id: string, likes = 0, likedBy: string[] = []) => {
      const now = Date.now();
      mockPostsData.set(id, {
        id,
        authorId: 'user-001',
        authorName: 'Test',
        content: 'Test content',
        tags: '[]',
        category: null,
        likes,
        likedBy: JSON.stringify(likedBy),
        bookmarkedBy: '[]',
        commentCount: 0,
        viewCount: 0,
        status: 'active',
        isEdited: 0,
        editedAt: null,
        sourceNoteId: null,
        moderationAction: null,
        originalContent: null,
        moderationWarning: null,
        createdAt: now,
        updatedAt: now,
      });
    };

    describe('likePost', () => {
      test('should increment likes and add user to likedBy', async () => {
        createTestPost('post-like-001', 5, ['user-002']);

        await likePost('post-like-001', 'user-003');

        const post = mockPostsData.get('post-like-001');
        expect(post.likes).toBe(6);
        expect(JSON.parse(post.likedBy)).toContain('user-003');
      });
    });

    describe('unlikePost', () => {
      test('should decrement likes and remove user from likedBy', async () => {
        createTestPost('post-unlike-001', 5, ['user-002', 'user-003']);

        await unlikePost('post-unlike-001', 'user-003');

        const post = mockPostsData.get('post-unlike-001');
        expect(post.likes).toBe(4);
        expect(JSON.parse(post.likedBy)).not.toContain('user-003');
      });
    });

    describe('bookmarkPost', () => {
      test('should add user to bookmarkedBy', async () => {
        const now = Date.now();
        mockPostsData.set('post-bookmark-001', {
          id: 'post-bookmark-001',
          authorId: 'user-001',
          authorName: 'Test',
          content: 'Content',
          tags: '[]',
          likes: 0,
          likedBy: '[]',
          bookmarkedBy: '[]',
          commentCount: 0,
          viewCount: 0,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });

        await bookmarkPost('post-bookmark-001', 'user-002');

        const post = mockPostsData.get('post-bookmark-001');
        expect(JSON.parse(post.bookmarkedBy)).toContain('user-002');
      });
    });

    describe('unbookmarkPost', () => {
      test('should remove user from bookmarkedBy', async () => {
        const now = Date.now();
        mockPostsData.set('post-unbookmark-001', {
          id: 'post-unbookmark-001',
          authorId: 'user-001',
          authorName: 'Test',
          content: 'Content',
          tags: '[]',
          likes: 0,
          likedBy: '[]',
          bookmarkedBy: '["user-002","user-003"]',
          commentCount: 0,
          viewCount: 0,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });

        await unbookmarkPost('post-unbookmark-001', 'user-002');

        const post = mockPostsData.get('post-unbookmark-001');
        expect(JSON.parse(post.bookmarkedBy)).not.toContain('user-002');
        expect(JSON.parse(post.bookmarkedBy)).toContain('user-003');
      });
    });

    describe('incrementViewCount', () => {
      test('should increment view count', async () => {
        const now = Date.now();
        mockPostsData.set('post-view-001', {
          id: 'post-view-001',
          authorId: 'user-001',
          authorName: 'Test',
          content: 'Content',
          viewCount: 10,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });

        await incrementViewCount('post-view-001');

        const post = mockPostsData.get('post-view-001');
        expect(post.viewCount).toBe(11);
      });
    });

    describe('incrementCommentCount', () => {
      test('should increment comment count', async () => {
        const now = Date.now();
        mockPostsData.set('post-comment-001', {
          id: 'post-comment-001',
          authorId: 'user-001',
          authorName: 'Test',
          content: 'Content',
          commentCount: 5,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });

        // incrementCommentCount takes (postId, delta)
        await incrementCommentCount('post-comment-001', 1);

        const post = mockPostsData.get('post-comment-001');
        expect(post.commentCount).toBe(6);
      });

      test('should decrement comment count with negative delta', async () => {
        const now = Date.now();
        mockPostsData.set('post-comment-002', {
          id: 'post-comment-002',
          authorId: 'user-001',
          authorName: 'Test',
          content: 'Content',
          commentCount: 5,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });

        await incrementCommentCount('post-comment-002', -1);

        const post = mockPostsData.get('post-comment-002');
        expect(post.commentCount).toBe(4);
      });
    });
  });

  // ============================================================================
  // C. Post Queries
  // ============================================================================
  describe('Post Queries', () => {
    const setupQueryTestData = () => {
      const now = Date.now();
      // Post 1: by user-001, category poetry, tag 詩詞
      mockPostsData.set('query-001', {
        id: 'query-001',
        authorId: 'user-001',
        authorName: '林黛玉',
        content: '葬花吟',
        tags: '["詩詞","林黛玉"]',
        category: 'poetry',
        likes: 100,
        likedBy: '[]',
        bookmarkedBy: '["user-003"]',
        commentCount: 10,
        viewCount: 500,
        status: 'active',
        isEdited: 0,
        createdAt: now - 3000,
        updatedAt: now - 3000,
      });
      // Post 2: by user-001, category discussion
      mockPostsData.set('query-002', {
        id: 'query-002',
        authorId: 'user-001',
        authorName: '林黛玉',
        content: '紅樓夢讀後感',
        tags: '["心得"]',
        category: 'discussion',
        likes: 50,
        likedBy: '[]',
        bookmarkedBy: '[]',
        commentCount: 5,
        viewCount: 200,
        status: 'active',
        isEdited: 0,
        createdAt: now - 2000,
        updatedAt: now - 2000,
      });
      // Post 3: by user-002, category poetry, tag 詩詞
      mockPostsData.set('query-003', {
        id: 'query-003',
        authorId: 'user-002',
        authorName: '賈寶玉',
        content: '芙蓉女兒誄',
        tags: '["詩詞","賈寶玉"]',
        category: 'poetry',
        likes: 80,
        likedBy: '[]',
        bookmarkedBy: '["user-003"]',
        commentCount: 8,
        viewCount: 300,
        status: 'active',
        isEdited: 0,
        createdAt: now - 1000,
        updatedAt: now - 1000,
      });
    };

    describe('getPostsByAuthor', () => {
      test('should return posts by specific author', async () => {
        setupQueryTestData();

        const posts = await getPostsByAuthor('user-001');

        expect(posts.length).toBe(2);
        expect(posts.every(p => p.authorId === 'user-001')).toBe(true);
      });

      test('should return empty array for author with no posts', async () => {
        setupQueryTestData();

        const posts = await getPostsByAuthor('non-existent');

        expect(posts).toEqual([]);
      });
    });

    describe('getPostsByTag', () => {
      test('should return posts with specific tag', async () => {
        setupQueryTestData();

        const posts = await getPostsByTag('詩詞');

        expect(posts.length).toBe(2);
        expect(posts.every(p => p.tags.includes('詩詞'))).toBe(true);
      });

      test('should return empty array for non-existent tag', async () => {
        setupQueryTestData();

        const posts = await getPostsByTag('不存在的標籤');

        expect(posts).toEqual([]);
      });
    });

    describe('getPostsByCategory', () => {
      test('should return posts in specific category', async () => {
        setupQueryTestData();

        const posts = await getPostsByCategory('poetry');

        expect(posts.length).toBe(2);
        expect(posts.every(p => p.category === 'poetry')).toBe(true);
      });
    });

    describe('getTrendingPosts', () => {
      test('should return posts sorted by likes and views', async () => {
        setupQueryTestData();

        const posts = await getTrendingPosts(10);

        expect(posts.length).toBeGreaterThan(0);
        // First post should have most likes
        expect(posts[0].likes).toBe(100);
      });
    });

    describe('getBookmarkedPostsByUser', () => {
      test('should return bookmarked posts for user', async () => {
        setupQueryTestData();

        const posts = await getBookmarkedPostsByUser('user-003');

        expect(posts.length).toBe(2);
        expect(posts.every(p => p.bookmarkedBy.includes('user-003'))).toBe(true);
      });
    });
  });

  // ============================================================================
  // D. Post Moderation
  // ============================================================================
  describe('Post Moderation', () => {
    test('should apply moderation action to post', async () => {
      const now = Date.now();
      mockPostsData.set('mod-001', {
        id: 'mod-001',
        authorId: 'user-001',
        authorName: 'Test',
        content: '原始內容',
        tags: '[]',
        likes: 0,
        likedBy: '[]',
        bookmarkedBy: '[]',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });

      // moderatePost expects ModerationAction & { shouldHide?, filteredContent?, warning? }
      await moderatePost('mod-001', {
        action: 'warn',
        category: 'language',
        confidence: 0.8,
        reasons: ['inappropriate language'],
        filteredContent: '經過審核的內容',
        warning: '請注意用語',
      } as any);

      const post = mockPostsData.get('mod-001');
      // moderationAction is stored as JSON string
      expect(post.moderationAction).toBeDefined();
      expect(post.content).toBe('經過審核的內容');
      expect(post.originalContent).toBe('原始內容');
      expect(post.moderationWarning).toBe('請注意用語');
    });

    test('should hide post when shouldHide is true', async () => {
      const now = Date.now();
      mockPostsData.set('mod-002', {
        id: 'mod-002',
        authorId: 'user-001',
        authorName: 'Test',
        content: '違規內容',
        tags: '[]',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });

      await moderatePost('mod-002', {
        action: 'hide',
        category: 'violation',
        confidence: 0.95,
        reasons: ['content violation'],
        shouldHide: true,
      } as any);

      const post = mockPostsData.get('mod-002');
      expect(post.status).toBe('hidden');
    });
  });

  // ============================================================================
  // E. Task 4.9: Note-Post Sync
  // ============================================================================
  describe('Task 4.9: Note-Post Sync', () => {
    describe('syncPostFromNote', () => {
      test('should update existing post with content from note', async () => {
        const now = Date.now();
        // First create a post linked to a note
        mockPostsData.set('post-sync-001', {
          id: 'post-sync-001',
          authorId: 'user-001',
          authorName: '林黛玉',
          content: '舊內容',
          tags: '[]',
          sourceNoteId: 'note-sync-001',
          status: 'active',
          isEdited: 0,
          editedAt: null,
          createdAt: now,
          updatedAt: now,
        });

        // Now sync it with new content from note
        await syncPostFromNote('post-sync-001', '從筆記分享的新內容', '花謝花飛花滿天');

        const post = mockPostsData.get('post-sync-001');
        expect(post).toBeDefined();
        expect(post.content).toContain('花謝花飛花滿天');
        expect(post.content).toContain('從筆記分享的新內容');
        expect(post.isEdited).toBe(1);
        expect(post.editedAt).toBeDefined();
      });
    });

    describe('getPostBySourceNoteId', () => {
      test('should find post by source note ID', async () => {
        const now = Date.now();
        mockPostsData.set('post-from-note-001', {
          id: 'post-from-note-001',
          authorId: 'user-001',
          authorName: 'Test',
          content: 'From note',
          tags: '[]',
          sourceNoteId: 'note-linked-001',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });

        const post = await getPostBySourceNoteId('note-linked-001');

        expect(post).not.toBeNull();
        expect(post?.id).toBe('post-from-note-001');
        expect(post?.sourceNoteId).toBe('note-linked-001');
      });

      test('should return null when no post linked to note', async () => {
        const post = await getPostBySourceNoteId('non-existent-note');
        expect(post).toBeNull();
      });
    });

    describe('getPostsFromNotesByAuthor', () => {
      test('should return posts with sourceNoteId for author', async () => {
        const now = Date.now();
        mockPostsData.set('note-post-001', {
          id: 'note-post-001',
          authorId: 'user-001',
          authorName: 'Test',
          content: 'From note 1',
          sourceNoteId: 'note-001',
          status: 'active',
          createdAt: now - 1000,
          updatedAt: now - 1000,
        });
        mockPostsData.set('note-post-002', {
          id: 'note-post-002',
          authorId: 'user-001',
          authorName: 'Test',
          content: 'From note 2',
          sourceNoteId: 'note-002',
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });
        mockPostsData.set('regular-post', {
          id: 'regular-post',
          authorId: 'user-001',
          authorName: 'Test',
          content: 'Regular post',
          sourceNoteId: null,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });

        const posts = await getPostsFromNotesByAuthor('user-001');

        expect(posts.length).toBe(2);
        expect(posts.every(p => p.sourceNoteId != null)).toBe(true);
      });

      test('should return empty array when author has no note-linked posts', async () => {
        const posts = await getPostsFromNotesByAuthor('non-existent');
        expect(posts).toEqual([]);
      });
    });

    describe('linkPostToNote', () => {
      test('should set sourceNoteId on existing post', async () => {
        const now = Date.now();
        mockPostsData.set('post-to-link', {
          id: 'post-to-link',
          authorId: 'user-001',
          authorName: 'Test',
          content: 'Post to link',
          sourceNoteId: null,
          status: 'active',
          createdAt: now,
          updatedAt: now,
        });

        await linkPostToNote('post-to-link', 'note-to-link');

        const post = mockPostsData.get('post-to-link');
        expect(post.sourceNoteId).toBe('note-to-link');
      });
    });
  });

  // ============================================================================
  // F. Data Integrity
  // ============================================================================
  describe('Data Integrity', () => {
    test('should handle Chinese characters correctly', async () => {
      const postData = {
        id: 'chinese-001',
        authorId: 'user-001',
        authorName: '賈寶玉',
        title: '紅樓夢讀後感：「夢」與「醒」',
        content: '「滿紙荒唐言，一把辛酸淚！」——曹雪芹',
        tags: ['紅樓夢', '經典', '文學'],
        category: '文學評論',
      };

      await createPost(postData);

      const saved = mockPostsData.get('chinese-001');
      expect(saved.title).toBe('紅樓夢讀後感：「夢」與「醒」');
      expect(saved.content).toBe('「滿紙荒唐言，一把辛酸淚！」——曹雪芹');
    });

    test('should preserve tag order', async () => {
      const tags = ['tag3', 'tag1', 'tag2'];
      const postData = {
        id: 'tag-order-001',
        authorId: 'user-001',
        authorName: 'Test',
        content: 'Test',
        tags,
      };

      await createPost(postData);

      const saved = mockPostsData.get('tag-order-001');
      expect(JSON.parse(saved.tags)).toEqual(tags);
    });
  });
});
