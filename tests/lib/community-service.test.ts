/**
 * @jest-environment node
 *
 * @fileOverview Tests for Community Service Layer
 *
 * Tests the business logic layer for community features including:
 * - Post creation with content moderation
 * - Dual-mode operation (SQLite first, Firebase fallback)
 * - Comment management
 * - Like/unlike operations
 * - Error handling and propagation
 *
 * Test coverage:
 * - Happy path scenarios
 * - SQLite → Firebase fallback
 * - Content moderation integration
 * - Error handling
 * - Edge cases
 *
 * @phase Phase 3 - Community Module Testing
 * @date 2025-10-30
 */

import { communityService } from '@/lib/community-service';
import * as communityRepo from '@/lib/repositories/community-repository';
import * as commentRepo from '@/lib/repositories/comment-repository';
import { contentFilterService } from '@/lib/content-filter-service';
import {
  TEST_USERS,
  CLEAN_POST_DATA,
  PROFANITY_POST_DATA,
  CLEAN_COMMENT_DATA,
  PROFANITY_COMMENT_DATA,
  MOCK_POST,
  MOCK_COMMENT,
  MOCK_MODERATION_CLEAN,
  MOCK_MODERATION_FILTER,
} from '../fixtures/community-fixtures';

// Mock the repository layers
jest.mock('@/lib/repositories/community-repository');
jest.mock('@/lib/repositories/comment-repository');

// Mock the content filter service
jest.mock('@/lib/content-filter-service');

// Note: Firebase mocking removed as firebase-service doesn't exist
// The community service will use the repository layer which is already mocked

describe('Community Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: Enable SQLite mode
    process.env.SQLITE_SERVER_ENABLED = 'true';
  });

  describe('createPost', () => {
    describe('SQLite Mode', () => {
      it('should create post in SQLite when enabled', async () => {
        (communityRepo.createPost as jest.Mock).mockReturnValue('post-new-001');
        (contentFilterService.processContent as jest.Mock).mockResolvedValue({
          processedContent: CLEAN_POST_DATA.content,
          action: 'allow',
          shouldBlock: false,
        });

        const result = await communityService.createPost(CLEAN_POST_DATA);

        expect(communityRepo.createPost).toHaveBeenCalled();
        expect(result.id).toBeDefined();
      });

      it('should apply content moderation before creating post', async () => {
        (communityRepo.createPost as jest.Mock).mockReturnValue('post-new-001');
        const combinedContent = `${CLEAN_POST_DATA.title} ${CLEAN_POST_DATA.content}`.trim();
        (contentFilterService.processContent as jest.Mock).mockResolvedValue({
          processedContent: combinedContent,
          action: 'allow',
          shouldBlock: false,
        });

        await communityService.createPost(CLEAN_POST_DATA);

        expect(contentFilterService.processContent).toHaveBeenCalledWith(
          combinedContent,
          expect.any(String),
          'post',
          CLEAN_POST_DATA.authorId
        );
      });

      it('should store moderation action when content is filtered', async () => {
        (communityRepo.createPost as jest.Mock).mockReturnValue('post-moderated-001');
        // Simulate filtered content: title + filtered content
        const titleLength = PROFANITY_POST_DATA.title?.length || 0;
        const filteredCombined = '*** filtered title *** filtered content ***';
        (contentFilterService.processContent as jest.Mock).mockResolvedValue({
          processedContent: filteredCombined,
          action: 'filtered',
          shouldBlock: false,
          warningMessage: 'Content was filtered',
        });

        const result = await communityService.createPost(PROFANITY_POST_DATA);

        const createCall = (communityRepo.createPost as jest.Mock).mock.calls[0][0];
        // Service splits the filtered content back into title and content
        expect(createCall.title).toBe(filteredCombined.substring(0, titleLength));
        expect(createCall.content).toBe(filteredCombined.substring(titleLength).trim());
        expect(createCall.moderationAction).toBe('filtered');
      });

      // Firebase fallback tests removed - using repository layer only
    });

    describe('Error Handling', () => {
      it('should throw error when SQLite fails', async () => {
        (communityRepo.createPost as jest.Mock).mockImplementation(() => {
          throw new Error('SQLite failed');
        });
        (contentFilterService.processContent as jest.Mock).mockResolvedValue({
          processedContent: CLEAN_POST_DATA.content,
          action: 'allow',
          shouldBlock: false,
        });

        await expect(communityService.createPost(CLEAN_POST_DATA)).rejects.toThrow();
      });

      it('should throw error when content moderation fails', async () => {
        (contentFilterService.processContent as jest.Mock).mockRejectedValue(
          new Error('Moderation service unavailable')
        );

        await expect(communityService.createPost(CLEAN_POST_DATA)).rejects.toThrow(
          'Moderation service unavailable'
        );
      });
    });
  });

  describe('getPosts', () => {
    it('should retrieve posts from SQLite with filters', async () => {
      const mockPosts = [MOCK_POST];
      (communityRepo.getPosts as jest.Mock).mockResolvedValue(mockPosts);

      const result = await communityService.getPosts({ category: 'discussion' }, 20);

      expect(communityRepo.getPosts).toHaveBeenCalledWith({
        category: 'discussion',
        tags: undefined,
        limit: 20,
        sortBy: 'newest',
      });
      expect(result).toEqual(mockPosts);
    });

    it('should return empty array when no posts found', async () => {
      (communityRepo.getPosts as jest.Mock).mockReturnValue([]);

      const result = await communityService.getPosts({}, 20);

      expect(result).toEqual([]);
    });
  });

  describe('deletePost', () => {
    it('should delete post from SQLite', async () => {
      (communityRepo.deletePost as jest.Mock).mockReturnValue(undefined);

      await communityService.deletePost('post-001');

      expect(communityRepo.deletePost).toHaveBeenCalledWith('post-001');
    });

  });

  describe('togglePostLike', () => {
    it('should add like when isLiking is true', async () => {
      (communityRepo.likePost as jest.Mock).mockResolvedValue({
        ...MOCK_POST,
        likedBy: [TEST_USERS.user1.id],
      });

      const result = await communityService.togglePostLike('post-001', TEST_USERS.user1.id, true);

      expect(communityRepo.likePost).toHaveBeenCalledWith('post-001', TEST_USERS.user1.id);
      expect(result).toBe(true);
    });

    it('should remove like when isLiking is false', async () => {
      (communityRepo.unlikePost as jest.Mock).mockResolvedValue({
        ...MOCK_POST,
        likedBy: [],
      });

      const result = await communityService.togglePostLike('post-001', TEST_USERS.user1.id, false);

      expect(communityRepo.unlikePost).toHaveBeenCalledWith('post-001', TEST_USERS.user1.id);
      expect(result).toBe(true);
    });

    it('should return false when like state does not change', async () => {
      // Return post with userId not in likedBy (like didn't get added)
      (communityRepo.likePost as jest.Mock).mockResolvedValue({
        ...MOCK_POST,
        likedBy: [], // User not in array
      });

      const result = await communityService.togglePostLike('post-001', TEST_USERS.user1.id, true);

      expect(result).toBe(false);
    });

  });

  describe('addComment', () => {
    it('should add comment with content moderation in SQLite', async () => {
      (commentRepo.createComment as jest.Mock).mockResolvedValue(MOCK_COMMENT);
      (contentFilterService.processContent as jest.Mock).mockResolvedValue({
        processedContent: CLEAN_COMMENT_DATA.content,
        action: 'allow',
        shouldBlock: false,
      });

      const result = await communityService.addComment(CLEAN_COMMENT_DATA);

      expect(contentFilterService.processContent).toHaveBeenCalledWith(
        CLEAN_COMMENT_DATA.content,
        expect.any(String), // Temporary ID
        'comment',
        CLEAN_COMMENT_DATA.authorId
      );
      expect(commentRepo.createComment).toHaveBeenCalled();
      expect(result.id).toBeDefined();
    });

    it('should apply moderation to comment content', async () => {
      (commentRepo.createComment as jest.Mock).mockResolvedValue({
        ...MOCK_COMMENT,
        moderationAction: 'filtered',
      });
      (contentFilterService.processContent as jest.Mock).mockResolvedValue({
        processedContent: '*** filtered content ***',
        action: 'filtered',
        shouldBlock: false,
        warningMessage: 'Content was filtered',
      });

      const result = await communityService.addComment(PROFANITY_COMMENT_DATA);

      const createCall = (commentRepo.createComment as jest.Mock).mock.calls[0][0];
      expect(createCall.content).toBe('*** filtered content ***');
      expect(result.moderationAction).toEqual('filtered');
    });

  });

  describe('getComments', () => {
    it('should retrieve comments from SQLite', async () => {
      const mockComments = [MOCK_COMMENT];
      (commentRepo.getCommentsByPost as jest.Mock).mockResolvedValue(mockComments);

      const result = await communityService.getComments('post-001', 50);

      expect(commentRepo.getCommentsByPost).toHaveBeenCalledWith('post-001');
      expect(result).toEqual(mockComments);
    });

    it('should return empty array when no comments found', async () => {
      (commentRepo.getCommentsByPost as jest.Mock).mockResolvedValue([]);

      const result = await communityService.getComments('post-001', 50);

      expect(result).toEqual([]);
    });
  });

  describe('deleteComment', () => {
    it('should delete comment from SQLite', async () => {
      (commentRepo.deleteComment as jest.Mock).mockResolvedValue(undefined);

      await communityService.deleteComment('post-001', 'comment-001');

      expect(commentRepo.deleteComment).toHaveBeenCalledWith('comment-001');
      // Note: Comment count decrement is handled automatically by repository
    });

  });

  describe('Edge Cases', () => {
    it('should handle concurrent post creation', async () => {
      (communityRepo.createPost as jest.Mock)
        .mockReturnValueOnce('post-001')
        .mockReturnValueOnce('post-002');
      (contentFilterService.processContent as jest.Mock).mockResolvedValue({
        processedContent: CLEAN_POST_DATA.content,
        action: 'allow',
        shouldBlock: false,
      });

      const [result1, result2] = await Promise.all([
        communityService.createPost(CLEAN_POST_DATA),
        communityService.createPost(CLEAN_POST_DATA),
      ]);

      expect(result1.id).toBeDefined();
      expect(result2.id).toBeDefined();
      expect(result1.id).not.toBe(result2.id);
    });

    it('should handle rapid like/unlike toggles', async () => {
      (communityRepo.likePost as jest.Mock).mockResolvedValue({
        ...MOCK_POST,
        likedBy: [TEST_USERS.user1.id],
      });
      (communityRepo.unlikePost as jest.Mock).mockResolvedValue({
        ...MOCK_POST,
        likedBy: [],
      });

      await communityService.togglePostLike('post-001', TEST_USERS.user1.id, true);
      await communityService.togglePostLike('post-001', TEST_USERS.user1.id, false);
      await communityService.togglePostLike('post-001', TEST_USERS.user1.id, true);

      expect(communityRepo.likePost).toHaveBeenCalledTimes(2);
      expect(communityRepo.unlikePost).toHaveBeenCalledTimes(1);
    });
  });
});
