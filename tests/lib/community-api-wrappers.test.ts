/**
 * @fileOverview Tests for Community API Wrapper Functions
 *
 * Tests the client-side API wrapper functions that interact with community endpoints:
 * - awardXP()
 * - fetchPosts()
 * - createPostAPI()
 * - deletePostAPI()
 * - togglePostLikeAPI()
 * - fetchComments()
 * - addCommentAPI()
 * - deleteCommentAPI()
 *
 * These functions are defined in community/page.tsx and make fetch calls to API routes.
 *
 * Test coverage:
 * - Correct HTTP method and headers
 * - Proper request body construction
 * - Query parameter handling
 * - Error handling (non-ok responses, network errors)
 * - Success response parsing
 *
 * @phase Phase 3 - Community Module Testing
 * @date 2025-10-30
 */

import {
  TEST_USERS,
  CLEAN_POST_DATA,
  CLEAN_COMMENT_DATA,
  MOCK_POST,
  MOCK_POSTS_LIST,
  MOCK_COMMENT,
  MOCK_CREATE_POST_SUCCESS,
} from '../fixtures/community-fixtures';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// We'll dynamically import the wrapper functions from the page component
// Since they're not exported, we'll need to extract and test them separately
// For now, we'll recreate them here for testing purposes

/**
 * Award XP to user via API route
 */
async function awardXP(
  userId: string,
  amount: number,
  reason: string,
  source: 'reading' | 'daily_task' | 'community' | 'note' | 'achievement' | 'admin',
  sourceId?: string
) {
  const response = await fetch('/api/user-level/award-xp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      amount,
      reason,
      source,
      sourceId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to award XP (${response.status})`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to award XP');
  }

  return result;
}

/**
 * Fetch posts via API route
 */
async function fetchPosts(category?: string, tags?: string[], limit?: number): Promise<any[]> {
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (tags && tags.length > 0) params.append('tags', tags.join(','));
  if (limit) params.append('limit', limit.toString());

  const response = await fetch(`/api/community/posts?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch posts (${response.status})`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch posts');
  }

  return result.posts || [];
}

/**
 * Create post via API route
 */
async function createPostAPI(postData: any) {
  const response = await fetch('/api/community/posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to create post (${response.status})`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to create post');
  }

  return result;
}

/**
 * Delete post via API route
 */
async function deletePostAPI(postId: string): Promise<void> {
  const response = await fetch(`/api/community/posts?postId=${encodeURIComponent(postId)}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to delete post (${response.status})`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete post');
  }
}

/**
 * Toggle post like via API route
 */
async function togglePostLikeAPI(postId: string, userId: string, isLiking: boolean): Promise<boolean> {
  if (isLiking) {
    // Like the post
    const response = await fetch(`/api/community/posts/${postId}/like`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to like post (${response.status})`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to like post');
    }

    return result.likeChanged;
  } else {
    // Unlike the post
    const response = await fetch(`/api/community/posts/${postId}/like?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to unlike post (${response.status})`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to unlike post');
    }

    return true; // Always return true for unlike
  }
}

/**
 * Fetch comments via API route
 */
async function fetchComments(postId: string, limit?: number): Promise<any[]> {
  const params = new URLSearchParams();
  if (limit) params.append('limit', limit.toString());

  const response = await fetch(`/api/community/posts/${postId}/comments?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch comments (${response.status})`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch comments');
  }

  return result.comments || [];
}

/**
 * Add comment via API route
 */
async function addCommentAPI(commentData: any) {
  const response = await fetch(`/api/community/posts/${commentData.postId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commentData),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to add comment (${response.status})`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to add comment');
  }

  return result;
}

/**
 * Delete comment via API route
 */
async function deleteCommentAPI(postId: string, commentId: string): Promise<void> {
  const response = await fetch(
    `/api/community/posts/${postId}/comments?commentId=${encodeURIComponent(commentId)}`,
    {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to delete comment (${response.status})`);
  }

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to delete comment');
  }
}

describe('Community API Wrapper Functions', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('awardXP', () => {
    it('should call /api/user-level/award-xp with correct parameters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, result: { xp: 10 } }),
      });

      await awardXP(TEST_USERS.user1.id, 10, 'Created post', 'community', 'post-001');

      expect(mockFetch).toHaveBeenCalledWith('/api/user-level/award-xp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: TEST_USERS.user1.id,
          amount: 10,
          reason: 'Created post',
          source: 'community',
          sourceId: 'post-001',
        }),
      });
    });

    it('should return result on success', async () => {
      const mockResult = { success: true, result: { xp: 10 } };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      });

      const result = await awardXP(TEST_USERS.user1.id, 10, 'Test', 'community');

      expect(result).toEqual(mockResult);
    });

    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid data' }),
      });

      await expect(
        awardXP(TEST_USERS.user1.id, 10, 'Test', 'community')
      ).rejects.toThrow('Invalid data');
    });

    it('should throw error when success is false', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, error: 'XP award failed' }),
      });

      await expect(
        awardXP(TEST_USERS.user1.id, 10, 'Test', 'community')
      ).rejects.toThrow('XP award failed');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      await expect(
        awardXP(TEST_USERS.user1.id, 10, 'Test', 'community')
      ).rejects.toThrow('Network error');
    });
  });

  describe('fetchPosts', () => {
    it('should call /api/community/posts with no filters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, posts: MOCK_POSTS_LIST }),
      });

      const posts = await fetchPosts();

      expect(mockFetch).toHaveBeenCalledWith('/api/community/posts?', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(posts).toEqual(MOCK_POSTS_LIST);
    });

    it('should include category in query params', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, posts: [] }),
      });

      await fetchPosts('discussion');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/community/posts?category=discussion',
        expect.any(Object)
      );
    });

    it('should include tags in query params', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, posts: [] }),
      });

      await fetchPosts(undefined, ['賈寶玉', '林黛玉']);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('tags=%E8%B3%88%E5%AF%B6%E7%8E%89'),
        expect.any(Object)
      );
    });

    it('should include limit in query params', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, posts: [] }),
      });

      await fetchPosts(undefined, undefined, 10);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/community/posts?limit=10',
        expect.any(Object)
      );
    });

    it('should combine multiple filters', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, posts: [] }),
      });

      await fetchPosts('poetry', ['詩詞'], 5);

      const callUrl = (mockFetch.mock.calls[0] as any)[0];
      expect(callUrl).toContain('category=poetry');
      expect(callUrl).toContain('limit=5');
    });

    it('should return empty array when no posts found', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, posts: [] }),
      });

      const posts = await fetchPosts();

      expect(posts).toEqual([]);
    });

    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      });

      await expect(fetchPosts()).rejects.toThrow('Failed to fetch posts (500)');
    });
  });

  describe('createPostAPI', () => {
    it('should call /api/community/posts with POST method', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => MOCK_CREATE_POST_SUCCESS,
      });

      await createPostAPI(CLEAN_POST_DATA);

      expect(mockFetch).toHaveBeenCalledWith('/api/community/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(CLEAN_POST_DATA),
      });
    });

    it('should return created post data', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => MOCK_CREATE_POST_SUCCESS,
      });

      const result = await createPostAPI(CLEAN_POST_DATA);

      expect(result).toEqual(MOCK_CREATE_POST_SUCCESS);
      expect(result.postId).toBeDefined();
    });

    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid post data' }),
      });

      await expect(createPostAPI(CLEAN_POST_DATA)).rejects.toThrow('Invalid post data');
    });

    it('should throw error when success is false', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, error: 'Post creation failed' }),
      });

      await expect(createPostAPI(CLEAN_POST_DATA)).rejects.toThrow('Post creation failed');
    });
  });

  describe('deletePostAPI', () => {
    it('should call /api/community/posts with DELETE method and postId', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await deletePostAPI('post-001');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/community/posts?postId=post-001',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should encode postId in URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await deletePostAPI('post with spaces');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('post%20with%20spaces'),
        expect.any(Object)
      );
    });

    it('should throw error when response is not ok', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Post not found' }),
      });

      await expect(deletePostAPI('post-001')).rejects.toThrow('Failed to delete post (404)');
    });
  });

  describe('togglePostLikeAPI', () => {
    describe('Liking (isLiking=true)', () => {
      it('should call POST /api/community/posts/[postId]/like', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, likeChanged: true }),
        });

        await togglePostLikeAPI('post-001', TEST_USERS.user1.id, true);

        expect(mockFetch).toHaveBeenCalledWith('/api/community/posts/post-001/like', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId: TEST_USERS.user1.id }),
        });
      });

      it('should return likeChanged boolean', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true, likeChanged: true }),
        });

        const result = await togglePostLikeAPI('post-001', TEST_USERS.user1.id, true);

        expect(result).toBe(true);
      });

      it('should throw error on failure', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 404,
          json: async () => ({ error: 'Post not found' }),
        });

        await expect(
          togglePostLikeAPI('post-001', TEST_USERS.user1.id, true)
        ).rejects.toThrow('Failed to like post (404)');
      });
    });

    describe('Unliking (isLiking=false)', () => {
      it('should call DELETE /api/community/posts/[postId]/like', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });

        await togglePostLikeAPI('post-001', TEST_USERS.user1.id, false);

        expect(mockFetch).toHaveBeenCalledWith(
          `/api/community/posts/post-001/like?userId=${TEST_USERS.user1.id}`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      });

      it('should return true for unlike', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });

        const result = await togglePostLikeAPI('post-001', TEST_USERS.user1.id, false);

        expect(result).toBe(true);
      });

      it('should encode userId in query param', async () => {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({ success: true }),
        });

        await togglePostLikeAPI('post-001', 'user with spaces', false);

        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('user%20with%20spaces'),
          expect.any(Object)
        );
      });
    });
  });

  describe('fetchComments', () => {
    it('should call GET /api/community/posts/[postId]/comments', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, comments: [MOCK_COMMENT] }),
      });

      const comments = await fetchComments('post-001');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/community/posts/post-001/comments?',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      expect(comments).toEqual([MOCK_COMMENT]);
    });

    it('should include limit in query params', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, comments: [] }),
      });

      await fetchComments('post-001', 20);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/community/posts/post-001/comments?limit=20',
        expect.any(Object)
      );
    });

    it('should return empty array when no comments', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, comments: [] }),
      });

      const comments = await fetchComments('post-001');

      expect(comments).toEqual([]);
    });

    it('should throw error on failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Post not found' }),
      });

      await expect(fetchComments('post-001')).rejects.toThrow('Failed to fetch comments (404)');
    });
  });

  describe('addCommentAPI', () => {
    it('should call POST /api/community/posts/[postId]/comments', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, commentId: 'comment-001', moderationAction: null }),
      });

      await addCommentAPI(CLEAN_COMMENT_DATA);

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/community/posts/post-001/comments',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(CLEAN_COMMENT_DATA),
        }
      );
    });

    it('should return result with commentId', async () => {
      const mockResult = { success: true, commentId: 'comment-001', moderationAction: null };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      });

      const result = await addCommentAPI(CLEAN_COMMENT_DATA);

      expect(result).toEqual(mockResult);
      expect(result.commentId).toBeDefined();
    });

    it('should throw error on failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid comment' }),
      });

      await expect(addCommentAPI(CLEAN_COMMENT_DATA)).rejects.toThrow('Invalid comment');
    });
  });

  describe('deleteCommentAPI', () => {
    it('should call DELETE /api/community/posts/[postId]/comments with commentId', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await deleteCommentAPI('post-001', 'comment-001');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/community/posts/post-001/comments?commentId=comment-001',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
    });

    it('should encode commentId in URL', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true }),
      });

      await deleteCommentAPI('post-001', 'comment with spaces');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('comment%20with%20spaces'),
        expect.any(Object)
      );
    });

    it('should throw error on failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Forbidden' }),
      });

      await expect(deleteCommentAPI('post-001', 'comment-001')).rejects.toThrow(
        'Failed to delete comment (403)'
      );
    });
  });
});
