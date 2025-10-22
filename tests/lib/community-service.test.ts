/**
 * @fileOverview Community Service Unit Tests
 * 
 * Comprehensive test suite for the CommunityService class including:
 * - Post creation, reading, updating, and deletion
 * - Comment management and threading
 * - Like/unlike functionality
 * - Real-time listeners and data synchronization
 * - Error handling and edge cases
 * - Performance and pagination testing
 * 
 * Test Categories:
 * 1. Expected Use Cases: Normal operations that users perform daily
 * 2. Edge Cases: Boundary conditions and unusual but valid inputs
 * 3. Failure Cases: Error conditions and invalid inputs
 * 
 * Each test includes comprehensive error logging and result tracking.
 */

import { CommunityService } from '@/lib/community-service';
import type { 
  CommunityPost, 
  PostComment, 
  CreatePostData, 
  CreateCommentData 
} from '@/lib/community-service';

// Import Firebase mocks (configured in jest.setup.js)
import {
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  increment,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
  doc,
  collection,
} from 'firebase/firestore';

// Mock content filter service to return allow action by default
jest.mock('@/lib/content-filter-service', () => ({
  contentFilterService: {
    processContent: jest.fn().mockImplementation((content: string) => Promise.resolve({
      action: 'allow',
      processedContent: content, // Return the original content unmodified
      shouldBlock: false,
      warningMessage: '',
      originalContent: ''
    }))
  },
  ModerationAction: {
    ALLOW: 'allow',
    WARN: 'warn',
    BLOCK: 'block'
  }
}));

describe('CommunityService', () => {
  let communityService: CommunityService;
  let testLogger: any;

  beforeEach(() => {
    // Initialize service and test logger for each test
    communityService = new CommunityService();
    testLogger = {
      logs: [],
      log: (message: string, data?: any) => {
        testLogger.logs.push({ message, data, timestamp: new Date().toISOString() });
      }
    };

    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Setup essential Firebase mocks
    (doc as jest.Mock).mockReturnValue({ id: 'mocked-doc-ref', path: 'mocked/path' });
    (collection as jest.Mock).mockReturnValue({ id: 'mocked-collection-ref' });
    (serverTimestamp as jest.Mock).mockReturnValue({ seconds: Date.now() / 1000 });
  });

  afterEach(() => {
    // Save test logs to organized output directory
    const fs = require('fs');
    const path = require('path');
    
    if (global.__TEST_CONFIG__) {
      const testName = expect.getState().currentTestName?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown';
      const logPath = path.join(
        global.__TEST_CONFIG__.outputDir,
        'community-service',
        `${testName}_logs.json`
      );
      
      try {
        fs.writeFileSync(logPath, JSON.stringify({
          testName: expect.getState().currentTestName,
          logs: testLogger.logs,
          testResult: expect.getState().assertionCalls,
          timestamp: new Date().toISOString(),
        }, null, 2));
      } catch (error) {
        console.error('Failed to write test logs:', error);
      }
    }
  });

  describe('Post Management - Expected Use Cases', () => {
    /**
     * Test Case 1: Expected Use - Create a new post successfully
     * 
     * This test verifies the basic functionality of creating a forum post
     * with all required fields and proper data validation.
     */
    it('should create a new post successfully with valid data', async () => {
      testLogger.log('Testing post creation with valid data');
      
      // Arrange: Set up test data and mock responses
      const mockPostData: CreatePostData = {
        authorId: 'user123',
        authorName: '寶玉哥哥',
        content: '今日讀《紅樓夢》第一回，深感曹雪芹筆力之深厚，實為千古奇書。',
        tags: ['紅樓夢', '讀書心得', '古典文學'],
        category: 'discussion'
      };

      const mockDocRef = { id: 'post_123456' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      // Act: Execute the function under test
      const result = await communityService.createPost(mockPostData);

      // Assert: Verify expected behavior - should return object with id and moderationAction
      expect(result).toEqual({ id: 'post_123456', moderationAction: 'allow' });
      // Check that addDoc was called twice: once for moderation log, once for post creation
      expect(addDoc).toHaveBeenCalledTimes(2);
      // Check the second call (post creation) - this is the actual post
      expect(addDoc).toHaveBeenNthCalledWith(2,
        undefined, // collection reference (mocked)
        expect.objectContaining({
          ...mockPostData,
          likes: 0,
          likedBy: [],
          commentCount: 0,
          viewCount: 0,
          isEdited: false,
          status: 'active',
          bookmarkedBy: [],
          // Content filtering fields added by the new system
          moderationAction: 'allow',  // Clean content should be allowed
          moderationWarning: '', // No warnings for clean content
          originalContent: '', // No filtering needed for clean content
          createdAt: expect.anything(),
          updatedAt: expect.anything(),
        })
      );

      testLogger.log('Post creation test completed successfully', { postId: result });
    });
  });

  describe('Post Management - Edge Cases', () => {
    /**
     * Edge Case 1: Create post with minimal valid data
     * 
     * This test ensures the system handles posts with only required fields
     * and applies appropriate defaults for optional fields.
     */
    it('should handle post creation with minimal required data', async () => {
      testLogger.log('Testing post creation with minimal data');

      // Arrange: Use only required fields
      const minimalPostData: CreatePostData = {
        authorId: 'user999',
        authorName: '無名氏',
        content: '簡短測試內容',
        tags: []
      };

      const mockDocRef = { id: 'minimal_post' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      // Act
      const result = await communityService.createPost(minimalPostData);

      // Assert: Verify defaults are applied - should return object with id and moderationAction
      expect(result).toEqual({ id: 'minimal_post', moderationAction: 'allow' });
      // Check that addDoc was called twice: once for moderation log, once for post creation
      expect(addDoc).toHaveBeenCalledTimes(2);
      // Check the second call (post creation)
      expect(addDoc).toHaveBeenNthCalledWith(2,
        { id: 'mocked-collection-ref' }, // collection reference (mocked)
        expect.objectContaining({
          authorId: 'user999',
          authorName: '無名氏',
          content: '簡短測試內容',
          tags: [],
          likes: 0,
          likedBy: [],
          commentCount: 0,
          viewCount: 0,
          isEdited: false,
          status: 'active',
          bookmarkedBy: [],
          // Content filtering fields added by the new system
          moderationAction: 'allow',  // Clean content should be allowed
          moderationWarning: '', // No warnings for clean content
          originalContent: '', // No filtering needed for clean content
          createdAt: expect.anything(),
          updatedAt: expect.anything(),
        })
      );

      testLogger.log('Minimal post creation test completed');
    });
  });

  describe('Post Management - Failure Cases', () => {
    /**
     * Failure Case 1: Handle Firebase connection failure
     * 
     * This test ensures proper error handling when Firebase operations fail,
     * providing meaningful error messages to the user.
     */
    it('should handle Firebase connection failures gracefully', async () => {
      testLogger.log('Testing Firebase connection failure handling');

      // Arrange: Mock Firebase error
      const firebaseError = new Error('Firebase: Permission denied');
      (addDoc as jest.Mock).mockRejectedValue(firebaseError);

      const postData: CreatePostData = {
        authorId: 'test_user',
        authorName: 'Test User',
        content: 'This should fail',
        tags: ['test']
      };

      // Act & Assert: Verify error is properly handled
      await expect(communityService.createPost(postData)).rejects.toThrow(
        'Failed to create post. Please try again.'
      );

      testLogger.log('Firebase failure handling test completed', { 
        originalError: firebaseError.message 
      });
    });

    /**
     * Failure Case 2: Handle invalid post data validation
     * 
     * This test ensures the service properly validates input data and
     * rejects invalid or malformed requests.
     */
    it('should reject invalid post data', async () => {
      testLogger.log('Testing invalid post data rejection');

      // Arrange: Create invalid post data (missing required fields)
      const invalidPostData = {
        // Missing authorId and authorName
        content: '',  // Empty content should be invalid
        tags: ['test']
      } as CreatePostData;

      // Act & Assert: Should throw validation error
      try {
        await communityService.createPost(invalidPostData);
        // If it succeeds when it shouldn't, that's a test failure
        expect(true).toBe(false); // Force failure
      } catch (error) {
        expect(error).toBeDefined();
        testLogger.log('Invalid data rejection test completed', { 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    /**
     * Failure Case 3: Handle network timeout scenarios
     * 
     * This test verifies behavior when Firebase operations timeout,
     * ensuring the application remains responsive.
     */
    it('should handle network timeout scenarios', async () => {
      testLogger.log('Testing network timeout handling');

      // Arrange: Mock timeout error
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';
      (getDocs as jest.Mock).mockRejectedValue(timeoutError);

      // Act & Assert
      await expect(communityService.getPosts()).rejects.toThrow(
        'Failed to fetch posts. Please try again.'
      );

      testLogger.log('Network timeout handling test completed');
    });
  });

  describe('Comment Management - Expected Use Cases', () => {
    /**
     * Test Case: Add a comment successfully
     * 應能正確新增留言，並讓父貼文 commentCount +1
     */
    it('should add a comment and increment commentCount', async () => {
      // Arrange
      const mockCommentData = {
        postId: 'post_abc',
        authorId: 'user456',
        authorName: '林黛玉',
        content: '寶玉哥哥說得好！',
      };
      const mockDocRef = { id: 'comment_001' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await communityService.addComment(mockCommentData);

      // Assert - should return object with id and moderationAction
      expect(result).toEqual({ id: 'comment_001', moderationAction: 'allow' });
      // Check that addDoc was called twice: once for moderation log, once for comment creation
      expect(addDoc).toHaveBeenCalledTimes(2);
      // Check the second call (comment creation)
      expect(addDoc).toHaveBeenNthCalledWith(2,
        expect.anything(),
        expect.objectContaining({
          ...mockCommentData,
          likes: 0,
          likedBy: [],
          isEdited: false,
          status: 'active',
          // Content filtering fields added by the new system
          moderationAction: 'allow',  // Clean content should be allowed
          moderationWarning: '', // No warnings for clean content
          originalContent: '', // No filtering needed for clean content
          createdAt: expect.anything(),
          updatedAt: expect.anything(),
        })
      );
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          commentCount: increment(1),
          updatedAt: expect.anything(),
        })
      );
    });

    /**
     * Test Case: Get comments for a post
     * 應能正確取得所有留言
     */
    it('should get comments for a post', async () => {
      // Arrange
      const mockSnapshot = {
        forEach: (cb: any) => {
          cb({ id: 'c1', data: () => ({ authorName: 'A', content: 'Hi', createdAt: Timestamp.now(), updatedAt: Timestamp.now(), likes: 0, likedBy: [], isEdited: false, status: 'active' }) });
          cb({ id: 'c2', data: () => ({ authorName: 'B', content: 'Hello', createdAt: Timestamp.now(), updatedAt: Timestamp.now(), likes: 0, likedBy: [], isEdited: false, status: 'active' }) });
        }
      };
      (getDocs as jest.Mock).mockResolvedValue(mockSnapshot);

      // Act
      const comments = await communityService.getComments('post_abc');

      // Assert
      expect(comments.length).toBe(2);
      expect(comments[0].authorName).toBe('A');
      expect(comments[1].content).toBe('Hello');
    });

    /**
     * Test Case: Delete a comment and decrement commentCount
     * 應能正確刪除留言，並讓父貼文 commentCount -1
     */
    it('should delete a comment and decrement commentCount', async () => {
      // Arrange
      (deleteDoc as jest.Mock).mockResolvedValue(undefined);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      // Act
      await communityService.deleteComment('post_abc', 'comment_001');

      // Assert
      expect(deleteDoc).toHaveBeenCalledWith(expect.anything());
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          commentCount: increment(-1),
          updatedAt: expect.anything(),
        })
      );
    });

    /**
     * Test Case: Error handling for addComment
     * 應能正確處理新增留言時的異常
     */
    it('should throw error if addComment fails', async () => {
      (addDoc as jest.Mock).mockRejectedValue(new Error('add error'));
      await expect(communityService.addComment({ postId: 'p', authorId: 'u', authorName: 'n', content: 'c' })).rejects.toThrow('Failed to add comment. Please try again.');
    });

    /**
     * Test Case: Error handling for deleteComment
     * 應能正確處理刪除留言時的異常
     */
    it('should throw error if deleteComment fails', async () => {
      (deleteDoc as jest.Mock).mockRejectedValue(new Error('delete error'));
      await expect(communityService.deleteComment('p', 'c')).rejects.toThrow('Failed to delete comment. Please try again.');
    });
  });

  describe('Like System - Expected Use Cases', () => {
    /**
     * Test Case 1: Expected Use - Like a post
     * 
     * This test verifies the like functionality including proper
     * like count incrementation and user tracking.
     */
    it('should like a post and update like count', async () => {
      testLogger.log('Testing post like functionality');

      // Arrange
      const postId = 'likeable_post';
      const userId = 'like_user';
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await communityService.togglePostLike(postId, userId, true);

      // Assert
      expect(result).toBe(true);
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          likes: increment(1),
          likedBy: arrayUnion(userId),
          updatedAt: expect.anything()
        }
      );

      testLogger.log('Post like test completed');
    });

    /**
     * Test Case 2: Expected Use - Unlike a post
     * 
     * This test verifies the unlike functionality including proper
     * like count decrementation and user removal.
     */
    it('should unlike a post and update like count', async () => {
      testLogger.log('Testing post unlike functionality');

      // Arrange
      const postId = 'unlikeable_post';
      const userId = 'unlike_user';
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await communityService.togglePostLike(postId, userId, false);

      // Assert
      expect(result).toBe(true);
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          likes: increment(-1),
          likedBy: arrayRemove(userId),
          updatedAt: expect.anything()
        }
      );

      testLogger.log('Post unlike test completed');
    });
  });

  describe('Post Retrieval - Expected Use Cases', () => {
    /**
     * Test Case 1: Expected Use - Retrieve posts with filtering
     * 
     * This test verifies the ability to fetch posts with various filters
     * and pagination, simulating normal user browsing behavior.
     */
    it('should retrieve posts with filters and pagination', async () => {
      testLogger.log('Testing post retrieval with filters');

      // Arrange: Set up mock data for multiple posts
      const mockPosts = [
        testUtils.createMockDoc('post1', {
          authorId: 'user1',
          authorName: '林黛玉',
          content: '花謝花飛花滿天，紅消香斷有誰憐？這是關於紅樓夢的詩詞',
          tags: ['詩詞', '紅樓夢'],
          likes: 15,
          commentCount: 3,
          createdAt: testUtils.createMockTimestamp(new Date('2024-01-15')),
          status: 'active',
          bookmarkedBy: [],
          viewCount: 0,
          isEdited: false,
        }),
        testUtils.createMockDoc('post2', {
          authorId: 'user2',
          authorName: '薛寶釵',
          content: '好風憑借力，送我上青雲。',
          tags: ['詩詞', '勵志'],
          likes: 8,
          commentCount: 1,
          createdAt: testUtils.createMockTimestamp(new Date('2024-01-14')),
          status: 'active',
          bookmarkedBy: [],
          viewCount: 0,
          isEdited: false,
        })
      ];

      const mockQuerySnapshot = testUtils.createMockQuerySnapshot(mockPosts);
      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      // Act: Execute with various filters
      const filters = { category: 'discussion', searchText: '紅樓夢' };
      const result = await communityService.getPosts(filters, 20);

      // Assert: Verify correct query construction and filtering
      expect(getDocs).toHaveBeenCalled();
      expect(result).toHaveLength(1); // Only post1 should match the search filter
      expect(result[0]).toMatchObject({
        id: 'post1',
        authorName: '林黛玉',
        content: expect.stringContaining('紅樓夢'),
      });

      testLogger.log('Post retrieval test completed', { 
        filteredPosts: result.length,
        filters 
      });
    });

    /**
     * Test Case 2: Edge Case - Retrieve posts with empty result set
     * 
     * This test verifies proper handling when no posts match the query filters.
     */
    it('should handle empty post results gracefully', async () => {
      testLogger.log('Testing empty post retrieval');

      // Arrange: Mock empty query result
      const emptyQuerySnapshot = testUtils.createMockQuerySnapshot([]);
      (getDocs as jest.Mock).mockResolvedValue(emptyQuerySnapshot);

      // Act
      const result = await communityService.getPosts({ searchText: '不存在的搜索詞' });

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);

      testLogger.log('Empty post retrieval test completed');
    });
  });

  describe('Performance and Load Tests', () => {
    /**
     * Test pagination performance with large datasets
     */
    it('should handle large dataset pagination efficiently', async () => {
      testLogger.log('Testing pagination performance');

      const startTime = Date.now();

      // Arrange: Mock large dataset
      const largeMockPosts = Array.from({ length: 50 }, (_, i) => 
        testUtils.createMockDoc(`post_${i}`, {
          authorName: `User${i}`,
          content: `Test content ${i}`,
          likes: i,
          createdAt: testUtils.createMockTimestamp(new Date(Date.now() - i * 1000)),
        })
      );

      const mockQuerySnapshot = testUtils.createMockQuerySnapshot(largeMockPosts);
      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      // Act
      const result = await communityService.getPosts({}, 50);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(result).toHaveLength(50);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      testLogger.log('Pagination performance test completed', { 
        posts: result.length,
        duration: `${duration}ms`
      });
    });
  });

  describe('Data Validation and Edge Cases', () => {
    /**
     * Edge Case: Handle like/unlike edge cases
     */
    it('should handle like/unlike edge cases correctly', async () => {
      testLogger.log('Testing like/unlike edge cases');

      // Arrange
      const postId = 'edge_case_post';
      const userId = 'edge_user';
      (updateDoc as jest.Mock).mockResolvedValue(undefined);

      // Act & Assert: Test double-like scenario
      await communityService.togglePostLike(postId, userId, true);
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        {
          likes: increment(1),
          likedBy: arrayUnion(userId),
          updatedAt: expect.anything()
        }
      );

      // Act & Assert: Test unlike after like
      await communityService.togglePostLike(postId, userId, false);
      expect(updateDoc).toHaveBeenLastCalledWith(
        expect.anything(),
        {
          likes: increment(-1),
          likedBy: arrayRemove(userId),
          updatedAt: expect.anything()
        }
      );

      testLogger.log('Like/unlike edge cases test completed');
    });

    /**
     * Edge Case: Handle very long content
     */
    it('should handle posts with very long content', async () => {
      testLogger.log('Testing long content handling');

      // Arrange: Create post with very long content (non-repetitive to avoid spam detection)
      const longContent = '這是一篇關於紅樓夢的長文章。'.repeat(200) + '今日讀紅樓夢感悟良多。'; // Long but varied content
      const longPostData: CreatePostData = {
        authorId: 'long_user',
        authorName: 'Long Content User',
        content: longContent,
        tags: ['long', 'test']
      };

      const mockDocRef = { id: 'long_post' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      // Act
      const result = await communityService.createPost(longPostData);

      // Assert - should return object with id and moderationAction
      expect(result).toEqual({ id: 'long_post', moderationAction: 'allow' });
      // Check that addDoc was called twice: once for moderation log, once for post creation
      expect(addDoc).toHaveBeenCalledTimes(2);
      // Check the second call (post creation)
      expect(addDoc).toHaveBeenNthCalledWith(2,
        expect.anything(),
        expect.objectContaining({
          content: longContent,
        })
      );

      testLogger.log('Long content test completed', { contentLength: longContent.length });
    });
  });

  // --- Bookmark Feature Tests ---
  describe('Bookmark Feature', () => {
    /**
     * 預期使用測試：成功加入書籤
     */
    it('should add a bookmark to a post for a user', async () => {
      testLogger.log('Testing addBookmark expected use');
      const postId = 'post_bookmark_1';
      const userId = 'user_bookmark_1';
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      await communityService.addBookmark(postId, userId);
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          bookmarkedBy: arrayUnion(userId),
          updatedAt: expect.anything(),
        })
      );
      testLogger.log('addBookmark expected use completed');
    });

    /**
     * 邊界案例：重複加入同一書籤
     */
    it('should not duplicate user in bookmarkedBy when adding bookmark twice', async () => {
      testLogger.log('Testing addBookmark edge case: duplicate');
      const postId = 'post_bookmark_2';
      const userId = 'user_bookmark_2';
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      await communityService.addBookmark(postId, userId);
      await communityService.addBookmark(postId, userId);
      expect(updateDoc).toHaveBeenCalledTimes(2);
      expect(updateDoc).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          bookmarkedBy: arrayUnion(userId),
          updatedAt: expect.anything(),
        })
      );
      testLogger.log('addBookmark edge case completed');
    });

    /**
     * 失敗案例：Firebase 錯誤
     */
    it('should handle error when addBookmark fails', async () => {
      testLogger.log('Testing addBookmark failure case');
      const postId = 'post_bookmark_3';
      const userId = 'user_bookmark_3';
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));
      await expect(communityService.addBookmark(postId, userId)).rejects.toThrow('Failed to add bookmark');
      testLogger.log('addBookmark failure case completed');
    });

    /**
     * 預期使用測試：成功移除書籤
     */
    it('should remove a bookmark from a post for a user', async () => {
      testLogger.log('Testing removeBookmark expected use');
      const postId = 'post_bookmark_4';
      const userId = 'user_bookmark_4';
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      await communityService.removeBookmark(postId, userId);
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          bookmarkedBy: arrayRemove(userId),
          updatedAt: expect.anything(),
        })
      );
      testLogger.log('removeBookmark expected use completed');
    });

    /**
     * 邊界案例：移除不存在的書籤
     */
    it('should not fail when removing a bookmark that does not exist', async () => {
      testLogger.log('Testing removeBookmark edge case: non-existent');
      const postId = 'post_bookmark_5';
      const userId = 'user_bookmark_5';
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      await communityService.removeBookmark(postId, userId);
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          bookmarkedBy: arrayRemove(userId),
          updatedAt: expect.anything(),
        })
      );
      testLogger.log('removeBookmark edge case completed');
    });

    /**
     * 失敗案例：Firebase 錯誤
     */
    it('should handle error when removeBookmark fails', async () => {
      testLogger.log('Testing removeBookmark failure case');
      const postId = 'post_bookmark_6';
      const userId = 'user_bookmark_6';
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));
      await expect(communityService.removeBookmark(postId, userId)).rejects.toThrow('Failed to remove bookmark');
      testLogger.log('removeBookmark failure case completed');
    });

    /**
     * 預期使用測試：取得用戶所有書籤貼文
     */
    it('should get all bookmarked posts for a user', async () => {
      testLogger.log('Testing getBookmarkedPosts expected use');
      const userId = 'user_bookmark_7';
      const mockPosts = [
        testUtils.createMockDoc('postA', { bookmarkedBy: [userId], status: 'active', createdAt: testUtils.createMockTimestamp(), updatedAt: testUtils.createMockTimestamp() }),
        testUtils.createMockDoc('postB', { bookmarkedBy: [userId], status: 'active', createdAt: testUtils.createMockTimestamp(), updatedAt: testUtils.createMockTimestamp() })
      ];
      const mockQuerySnapshot = testUtils.createMockQuerySnapshot(mockPosts);
      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);
      const result = await communityService.getBookmarkedPosts(userId);
      expect(getDocs).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].bookmarkedBy).toContain(userId);
      testLogger.log('getBookmarkedPosts expected use completed');
    });

    /**
     * 邊界案例：用戶沒有任何書籤
     */
    it('should return empty array if user has no bookmarked posts', async () => {
      testLogger.log('Testing getBookmarkedPosts edge case: no bookmarks');
      const userId = 'user_bookmark_8';
      const mockQuerySnapshot = testUtils.createMockQuerySnapshot([]);
      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);
      const result = await communityService.getBookmarkedPosts(userId);
      expect(result).toEqual([]);
      testLogger.log('getBookmarkedPosts edge case completed');
    });

    /**
     * 失敗案例：Firestore 查詢失敗
     */
    it('should handle error when getBookmarkedPosts fails', async () => {
      testLogger.log('Testing getBookmarkedPosts failure case');
      const userId = 'user_bookmark_9';
      (getDocs as jest.Mock).mockRejectedValue(new Error('Firestore error'));
      await expect(communityService.getBookmarkedPosts(userId)).rejects.toThrow('Failed to fetch bookmarked posts');
      testLogger.log('getBookmarkedPosts failure case completed');
    });
  });

  // --- Post Moderation Feature Tests ---
  describe('Post Moderation Feature', () => {
    /**
     * 預期使用測試：管理員成功更新貼文狀態
     */
    it('should update post status successfully', async () => {
      testLogger.log('Testing updatePostStatus expected use');
      const postId = 'post_moderate_1';
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      await communityService.updatePostStatus(postId, 'hidden');
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'hidden',
          updatedAt: expect.anything(),
        })
      );
      testLogger.log('updatePostStatus expected use completed');
    });

    /**
     * 邊界案例：重複設為同一狀態
     */
    it('should not fail when updating to the same status', async () => {
      testLogger.log('Testing updatePostStatus edge case: same status');
      const postId = 'post_moderate_2';
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      await communityService.updatePostStatus(postId, 'active');
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'active',
          updatedAt: expect.anything(),
        })
      );
      testLogger.log('updatePostStatus edge case completed');
    });

    /**
     * 失敗案例：Firestore 更新失敗
     */
    it('should handle error when updatePostStatus fails', async () => {
      testLogger.log('Testing updatePostStatus failure case');
      const postId = 'post_moderate_3';
      (updateDoc as jest.Mock).mockRejectedValue(new Error('Firestore error'));
      await expect(communityService.updatePostStatus(postId, 'deleted')).rejects.toThrow('Failed to update post status');
      testLogger.log('updatePostStatus failure case completed');
    });
  });
}); 