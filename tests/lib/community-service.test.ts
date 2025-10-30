/**
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

// Mock the repository layer
jest.mock('@/lib/repositories/community-repository');

// Mock the content filter service
jest.mock('@/lib/content-filter-service');

// Mock Firebase
jest.mock('@/lib/firebase-service', () => ({
  db: {},
  collection: jest.fn(),
  addDoc: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
}));

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
        (communityRepo.getPostById as jest.Mock).mockReturnValue(MOCK_POST);
        (contentFilterService.moderateContent as jest.Mock).mockResolvedValue(
          MOCK_MODERATION_CLEAN
        );

        const result = await communityService.createPost(CLEAN_POST_DATA);

        expect(communityRepo.createPost).toHaveBeenCalled();
        expect(communityRepo.getPostById).toHaveBeenCalledWith('post-new-001');
        expect(result).toEqual(MOCK_POST);
      });

      it('should apply content moderation before creating post', async () => {
        (communityRepo.createPost as jest.Mock).mockReturnValue('post-new-001');
        (communityRepo.getPostById as jest.Mock).mockReturnValue(MOCK_POST);
        (contentFilterService.moderateContent as jest.Mock).mockResolvedValue(
          MOCK_MODERATION_CLEAN
        );

        await communityService.createPost(CLEAN_POST_DATA);

        expect(contentFilterService.moderateContent).toHaveBeenCalledWith(
          CLEAN_POST_DATA.content,
          'post'
        );
      });

      it('should store moderation action when content is filtered', async () => {
        (communityRepo.createPost as jest.Mock).mockReturnValue('post-moderated-001');
        (communityRepo.getPostById as jest.Mock).mockReturnValue({
          ...MOCK_POST,
          moderationAction: JSON.stringify(MOCK_MODERATION_FILTER),
        });
        (contentFilterService.moderateContent as jest.Mock).mockResolvedValue(
          MOCK_MODERATION_FILTER
        );

        const result = await communityService.createPost(PROFANITY_POST_DATA);

        const createCall = (communityRepo.createPost as jest.Mock).mock.calls[0][0];
        expect(createCall.content).toBe(MOCK_MODERATION_FILTER.filteredContent);
        expect(createCall.moderationAction).toBeDefined();
      });

      it('should fallback to Firebase when SQLite fails', async () => {
        (communityRepo.createPost as jest.Mock).mockImplementation(() => {
          throw new Error('SQLite connection failed');
        });
        (contentFilterService.moderateContent as jest.Mock).mockResolvedValue(
          MOCK_MODERATION_CLEAN
        );

        // Mock Firebase
        const mockFirebasePost = { id: 'firebase-post-001', ...MOCK_POST };
        const firebase = require('@/lib/firebase-service');
        firebase.addDoc.mockResolvedValue({ id: 'firebase-post-001' });
        firebase.getDoc.mockResolvedValue({
          exists: () => true,
          data: () => mockFirebasePost,
        });

        const result = await communityService.createPost(CLEAN_POST_DATA);

        expect(firebase.addDoc).toHaveBeenCalled();
        expect(result).toBeDefined();
      });
    });

    describe('Firebase Mode', () => {
      beforeEach(() => {
        process.env.SQLITE_SERVER_ENABLED = 'false';
      });

      it('should create post in Firebase when SQLite is disabled', async () => {
        (contentFilterService.moderateContent as jest.Mock).mockResolvedValue(
          MOCK_MODERATION_CLEAN
        );

        const firebase = require('@/lib/firebase-service');
        firebase.addDoc.mockResolvedValue({ id: 'firebase-post-001' });
        firebase.getDoc.mockResolvedValue({
          exists: () => true,
          data: () => MOCK_POST,
        });

        const result = await communityService.createPost(CLEAN_POST_DATA);

        expect(communityRepo.createPost).not.toHaveBeenCalled();
        expect(firebase.addDoc).toHaveBeenCalled();
      });
    });

    describe('Error Handling', () => {
      it('should throw error when both SQLite and Firebase fail', async () => {
        (communityRepo.createPost as jest.Mock).mockImplementation(() => {
          throw new Error('SQLite failed');
        });
        (contentFilterService.moderateContent as jest.Mock).mockResolvedValue(
          MOCK_MODERATION_CLEAN
        );

        const firebase = require('@/lib/firebase-service');
        firebase.addDoc.mockRejectedValue(new Error('Firebase failed'));

        await expect(communityService.createPost(CLEAN_POST_DATA)).rejects.toThrow();
      });

      it('should throw error when content moderation fails', async () => {
        (contentFilterService.moderateContent as jest.Mock).mockRejectedValue(
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
      (communityRepo.getPosts as jest.Mock).mockReturnValue(mockPosts);

      const result = await communityService.getPosts({ category: 'discussion' }, 20);

      expect(communityRepo.getPosts).toHaveBeenCalledWith(
        { category: 'discussion' },
        20
      );
      expect(result).toEqual(mockPosts);
    });

    it('should fallback to Firebase when SQLite fails', async () => {
      (communityRepo.getPosts as jest.Mock).mockImplementation(() => {
        throw new Error('SQLite error');
      });

      const firebase = require('@/lib/firebase-service');
      firebase.getDocs.mockResolvedValue({
        docs: [
          { id: 'post-001', data: () => MOCK_POST },
        ],
      });

      const result = await communityService.getPosts({}, 20);

      expect(firebase.getDocs).toHaveBeenCalled();
      expect(result).toBeDefined();
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

    it('should fallback to Firebase when SQLite fails', async () => {
      (communityRepo.deletePost as jest.Mock).mockImplementation(() => {
        throw new Error('SQLite error');
      });

      const firebase = require('@/lib/firebase-service');
      firebase.deleteDoc.mockResolvedValue(undefined);

      await communityService.deletePost('post-001');

      expect(firebase.deleteDoc).toHaveBeenCalled();
    });
  });

  describe('togglePostLike', () => {
    it('should add like when isLiking is true', async () => {
      (communityRepo.likePost as jest.Mock).mockReturnValue(true);

      const result = await communityService.togglePostLike('post-001', TEST_USERS.user1.id, true);

      expect(communityRepo.likePost).toHaveBeenCalledWith('post-001', TEST_USERS.user1.id);
      expect(result).toBe(true);
    });

    it('should remove like when isLiking is false', async () => {
      (communityRepo.unlikePost as jest.Mock).mockReturnValue(true);

      const result = await communityService.togglePostLike('post-001', TEST_USERS.user1.id, false);

      expect(communityRepo.unlikePost).toHaveBeenCalledWith('post-001', TEST_USERS.user1.id);
      expect(result).toBe(true);
    });

    it('should return false when like state does not change', async () => {
      (communityRepo.likePost as jest.Mock).mockReturnValue(false);

      const result = await communityService.togglePostLike('post-001', TEST_USERS.user1.id, true);

      expect(result).toBe(false);
    });

    it('should fallback to Firebase when SQLite fails', async () => {
      (communityRepo.likePost as jest.Mock).mockImplementation(() => {
        throw new Error('SQLite error');
      });

      const firebase = require('@/lib/firebase-service');
      firebase.updateDoc.mockResolvedValue(undefined);
      firebase.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ likedBy: [] }),
      });

      await communityService.togglePostLike('post-001', TEST_USERS.user1.id, true);

      expect(firebase.updateDoc).toHaveBeenCalled();
    });
  });

  describe('addComment', () => {
    it('should add comment with content moderation in SQLite', async () => {
      (communityRepo.createComment as jest.Mock).mockReturnValue('comment-new-001');
      (communityRepo.getCommentById as jest.Mock).mockReturnValue(MOCK_COMMENT);
      (communityRepo.incrementCommentCount as jest.Mock).mockReturnValue(undefined);
      (contentFilterService.moderateContent as jest.Mock).mockResolvedValue(
        MOCK_MODERATION_CLEAN
      );

      const result = await communityService.addComment(CLEAN_COMMENT_DATA);

      expect(contentFilterService.moderateContent).toHaveBeenCalledWith(
        CLEAN_COMMENT_DATA.content,
        'comment'
      );
      expect(communityRepo.createComment).toHaveBeenCalled();
      expect(communityRepo.incrementCommentCount).toHaveBeenCalledWith(CLEAN_COMMENT_DATA.postId);
      expect(result.id).toBe('comment-new-001');
    });

    it('should apply moderation to comment content', async () => {
      (communityRepo.createComment as jest.Mock).mockReturnValue('comment-moderated-001');
      (communityRepo.getCommentById as jest.Mock).mockReturnValue({
        ...MOCK_COMMENT,
        moderationAction: MOCK_MODERATION_FILTER,
      });
      (communityRepo.incrementCommentCount as jest.Mock).mockReturnValue(undefined);
      (contentFilterService.moderateContent as jest.Mock).mockResolvedValue(
        MOCK_MODERATION_FILTER
      );

      const result = await communityService.addComment(PROFANITY_COMMENT_DATA);

      const createCall = (communityRepo.createComment as jest.Mock).mock.calls[0][0];
      expect(createCall.content).toBe(MOCK_MODERATION_FILTER.filteredContent);
      expect(result.moderationAction).toEqual(MOCK_MODERATION_FILTER);
    });

    it('should fallback to Firebase when SQLite fails', async () => {
      (communityRepo.createComment as jest.Mock).mockImplementation(() => {
        throw new Error('SQLite error');
      });
      (contentFilterService.moderateContent as jest.Mock).mockResolvedValue(
        MOCK_MODERATION_CLEAN
      );

      const firebase = require('@/lib/firebase-service');
      firebase.addDoc.mockResolvedValue({ id: 'firebase-comment-001' });
      firebase.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => MOCK_COMMENT,
      });

      const result = await communityService.addComment(CLEAN_COMMENT_DATA);

      expect(firebase.addDoc).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('getComments', () => {
    it('should retrieve comments from SQLite', async () => {
      const mockComments = [MOCK_COMMENT];
      (communityRepo.getCommentsByPostId as jest.Mock).mockReturnValue(mockComments);

      const result = await communityService.getComments('post-001', 50);

      expect(communityRepo.getCommentsByPostId).toHaveBeenCalledWith('post-001', 50);
      expect(result).toEqual(mockComments);
    });

    it('should fallback to Firebase when SQLite fails', async () => {
      (communityRepo.getCommentsByPostId as jest.Mock).mockImplementation(() => {
        throw new Error('SQLite error');
      });

      const firebase = require('@/lib/firebase-service');
      firebase.getDocs.mockResolvedValue({
        docs: [
          { id: 'comment-001', data: () => MOCK_COMMENT },
        ],
      });

      const result = await communityService.getComments('post-001', 50);

      expect(firebase.getDocs).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should return empty array when no comments found', async () => {
      (communityRepo.getCommentsByPostId as jest.Mock).mockReturnValue([]);

      const result = await communityService.getComments('post-001', 50);

      expect(result).toEqual([]);
    });
  });

  describe('deleteComment', () => {
    it('should delete comment from SQLite and decrement count', async () => {
      (communityRepo.deleteComment as jest.Mock).mockReturnValue(undefined);
      (communityRepo.decrementCommentCount as jest.Mock).mockReturnValue(undefined);

      await communityService.deleteComment('post-001', 'comment-001');

      expect(communityRepo.deleteComment).toHaveBeenCalledWith('comment-001');
      expect(communityRepo.decrementCommentCount).toHaveBeenCalledWith('post-001');
    });

    it('should fallback to Firebase when SQLite fails', async () => {
      (communityRepo.deleteComment as jest.Mock).mockImplementation(() => {
        throw new Error('SQLite error');
      });

      const firebase = require('@/lib/firebase-service');
      firebase.deleteDoc.mockResolvedValue(undefined);
      firebase.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ commentCount: 5 }),
      });
      firebase.updateDoc.mockResolvedValue(undefined);

      await communityService.deleteComment('post-001', 'comment-001');

      expect(firebase.deleteDoc).toHaveBeenCalled();
      expect(firebase.updateDoc).toHaveBeenCalled(); // Decrement comment count
    });
  });

  describe('Edge Cases', () => {
    it('should handle concurrent post creation', async () => {
      (communityRepo.createPost as jest.Mock)
        .mockReturnValueOnce('post-001')
        .mockReturnValueOnce('post-002');
      (communityRepo.getPostById as jest.Mock)
        .mockReturnValueOnce({ ...MOCK_POST, id: 'post-001' })
        .mockReturnValueOnce({ ...MOCK_POST, id: 'post-002' });
      (contentFilterService.moderateContent as jest.Mock).mockResolvedValue(
        MOCK_MODERATION_CLEAN
      );

      const [result1, result2] = await Promise.all([
        communityService.createPost(CLEAN_POST_DATA),
        communityService.createPost(CLEAN_POST_DATA),
      ]);

      expect(result1.id).toBe('post-001');
      expect(result2.id).toBe('post-002');
    });

    it('should handle rapid like/unlike toggles', async () => {
      (communityRepo.likePost as jest.Mock).mockReturnValue(true);
      (communityRepo.unlikePost as jest.Mock).mockReturnValue(true);

      await communityService.togglePostLike('post-001', TEST_USERS.user1.id, true);
      await communityService.togglePostLike('post-001', TEST_USERS.user1.id, false);
      await communityService.togglePostLike('post-001', TEST_USERS.user1.id, true);

      expect(communityRepo.likePost).toHaveBeenCalledTimes(2);
      expect(communityRepo.unlikePost).toHaveBeenCalledTimes(1);
    });
  });
});
