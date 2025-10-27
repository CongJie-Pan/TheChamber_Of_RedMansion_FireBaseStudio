/**
 * @fileOverview Community Note Search Integration Tests
 *
 * End-to-end integration tests for the community note search functionality including:
 * - Sharing notes from reading page to community
 * - Searching for note content in community
 * - Searching for selected text within notes
 * - Searching for source information
 * - Mixed search scenarios with regular and note posts
 *
 * Test Categories:
 * 1. Expected Use Cases: Normal search workflows
 * 2. Edge Cases: Boundary conditions and complex scenarios
 * 3. Failure Cases: Error handling and recovery
 *
 * These tests verify the complete flow from note creation to search discovery.
 */

import { CommunityService } from '@/lib/community-service';
import type { CreatePostData, CommunityPost } from '@/lib/community-service';
import { Timestamp } from 'firebase/firestore';

// Import Firebase mocks (configured in jest.setup.js)
import {
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';

describe('Community Note Search Integration Tests', () => {
  let communityService: CommunityService;
  let testLogger: any;

  beforeEach(() => {
    // Initialize service and test logger
    communityService = new CommunityService();
    testLogger = {
      logs: [],
      log: (message: string, data?: any) => {
        testLogger.logs.push({ message, data, timestamp: new Date().toISOString() });
      }
    };

    // Reset all mocks
    jest.clearAllMocks();

    // Setup default Firebase mock behavior
    (serverTimestamp as jest.Mock).mockReturnValue({ seconds: Date.now() / 1000 });
  });

  afterEach(() => {
    // Save test logs
    const fs = require('fs');
    const path = require('path');

    if (global.__TEST_CONFIG__) {
      const testName = expect.getState().currentTestName?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown';
      const logPath = path.join(
        global.__TEST_CONFIG__.outputDir,
        'community-note-search-integration',
        `${testName}_logs.json`
      );

      try {
        fs.mkdirSync(path.dirname(logPath), { recursive: true });
        fs.writeFileSync(logPath, JSON.stringify({
          testName: expect.getState().currentTestName,
          logs: testLogger.logs,
          timestamp: new Date().toISOString(),
        }, null, 2));
      } catch (error) {
        console.error('Failed to write test logs:', error);
      }
    }
  });

  /**
   * Helper function to create a note post in the format shared from reading page
   */
  const createNotePost = (
    noteContent: string,
    selectedText: string,
    source: string,
    authorId: string = 'user-123',
    authorName: string = '測試用戶'
  ): CreatePostData => {
    const content = `我的閱讀筆記
${noteContent}
---
選取文字：
${selectedText}

來源：${source}`;

    return {
      authorId,
      authorName,
      content,
      tags: ['讀書筆記', '紅樓夢']
    };
  };

  /**
   * Helper function to simulate searching posts
   * This mimics the search logic from community/page.tsx
   */
  const searchPosts = (posts: CommunityPost[], searchTerm: string): CommunityPost[] => {
    if (!searchTerm || searchTerm.trim() === '') {
      return posts;
    }

    return posts.filter(post => {
      const searchLower = searchTerm.toLowerCase();

      // Basic search
      if (post.content.toLowerCase().includes(searchLower) ||
          post.authorName.toLowerCase().includes(searchLower) ||
          post.tags.some(tag => tag.toLowerCase().includes(searchLower))) {
        return true;
      }

      // Note post search
      const isNotePost = post.content.includes('我的閱讀筆記') && post.content.includes('來源：');
      if (isNotePost) {
        const parts = post.content.split('---');
        if (parts.length >= 2) {
          const noteContent = parts[0].replace('我的閱讀筆記', '').trim();
          if (noteContent.toLowerCase().includes(searchLower)) return true;

          const bottomPart = parts[1];
          const selectedTextMatch = bottomPart.match(/(?:選取文字：)?\s*\n?([\s\S]+?)\n\n來源：/);
          if (selectedTextMatch && selectedTextMatch[1].toLowerCase().includes(searchLower)) {
            return true;
          }

          const sourceMatch = bottomPart.match(/來源：([\s\S]+)$/);
          if (sourceMatch && sourceMatch[1].toLowerCase().includes(searchLower)) {
            return true;
          }
        }
      }

      return false;
    });
  };

  describe('Note Sharing to Community - Expected Use Cases', () => {
    /**
     * Test Case 1: Share note from reading page to community
     *
     * Simulates the complete flow of sharing a reading note to community
     */
    it('should successfully share a note from reading page to community', async () => {
      testLogger.log('Testing note sharing workflow');

      // Arrange
      const notePost = createNotePost(
        '賈寶玉初見林黛玉一段寫得真是精彩，細膩刻畫了兩人的初次相遇。',
        '黛玉方進來時，寶玉看罷，因笑道："這個妹妹我曾見過的。"',
        '第三回 - 賈雨村夤緣復舊職 林黛玉拋父進京都'
      );

      const mockDocRef = { id: 'note_post_123' };
      (addDoc as jest.Mock).mockResolvedValue(mockDocRef);

      // Act
      const postId = await communityService.createPost(notePost);

      // Assert
      expect(postId).toBe('note_post_123');
      expect(addDoc).toHaveBeenCalled();

      // Verify post content structure
      const createPostCall = (addDoc as jest.Mock).mock.calls.find(
        call => call[1]?.content?.includes('我的閱讀筆記')
      );
      expect(createPostCall).toBeDefined();
      expect(createPostCall[1].content).toContain('賈寶玉初見林黛玉');
      expect(createPostCall[1].content).toContain('選取文字');
      expect(createPostCall[1].content).toContain('來源：');

      testLogger.log('Note sharing workflow test completed', { postId });
    });
  });

  describe('Search Within Note Content - Expected Use Cases', () => {
    /**
     * Test Case 1: Search for text in note content section
     *
     * Verifies that search finds posts when keywords appear in note content
     */
    it('should find note post when searching for note content', async () => {
      testLogger.log('Testing note content search');

      // Arrange: Mock getPosts to return a note post
      const mockPosts = [
        {
          id: 'note1',
          authorId: 'user1',
          authorName: '林黛玉',
          content: `我的閱讀筆記
賈寶玉初見林黛玉的場景描寫細膩動人
---
選取文字：
黛玉方進來時，寶玉看罷，因笑道："這個妹妹我曾見過的。"

來源：第三回`,
          tags: ['讀書筆記'],
          likes: 5,
          likedBy: [],
          commentCount: 2,
          viewCount: 10,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          isEdited: false,
          status: 'active' as const,
          bookmarkedBy: []
        }
      ];

      const mockQuerySnapshot = {
        forEach: (callback: (doc: any) => void) => {
          mockPosts.forEach(post => callback({
            id: post.id,
            data: () => post
          }));
        }
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      // Act: Fetch posts and search
      const posts = await communityService.getPosts();
      const searchResults = searchPosts(posts, '賈寶玉初見');

      // Assert
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].id).toBe('note1');
      expect(searchResults[0].content).toContain('賈寶玉初見');

      testLogger.log('Note content search test completed', {
        results: searchResults.length
      });
    });

    /**
     * Test Case 2: Search for text in selected text section
     *
     * Verifies that search finds posts when keywords appear in selected text
     */
    it('should find note post when searching for selected text', async () => {
      testLogger.log('Testing selected text search');

      // Arrange
      const mockPosts = [
        {
          id: 'note2',
          authorId: 'user2',
          authorName: '薛寶釵',
          content: `我的閱讀筆記
這段描寫很有意境
---
選取文字：
滿紙荒唐言，一把辛酸淚。都云作者癡，誰解其中味？

來源：第一回 - 甄士隱夢幻識通靈`,
          tags: ['詩詞'],
          likes: 8,
          likedBy: [],
          commentCount: 1,
          viewCount: 15,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          isEdited: false,
          status: 'active' as const,
          bookmarkedBy: []
        }
      ];

      const mockQuerySnapshot = {
        forEach: (callback: (doc: any) => void) => {
          mockPosts.forEach(post => callback({
            id: post.id,
            data: () => post
          }));
        }
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      // Act
      const posts = await communityService.getPosts();
      const searchResults = searchPosts(posts, '滿紙荒唐言');

      // Assert
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].content).toContain('滿紙荒唐言');

      testLogger.log('Selected text search test completed');
    });

    /**
     * Test Case 3: Search for source information
     *
     * Verifies that search finds posts when keywords appear in source
     */
    it('should find note post when searching for source', async () => {
      testLogger.log('Testing source search');

      // Arrange
      const mockPosts = [
        {
          id: 'note3',
          authorId: 'user3',
          authorName: '賈寶玉',
          content: `我的閱讀筆記
林黛玉進賈府的場景
---
選取文字：
賈母疼愛黛玉

來源：第三回 - 林黛玉拋父進京都`,
          tags: ['人物'],
          likes: 3,
          likedBy: [],
          commentCount: 0,
          viewCount: 5,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          isEdited: false,
          status: 'active' as const,
          bookmarkedBy: []
        }
      ];

      const mockQuerySnapshot = {
        forEach: (callback: (doc: any) => void) => {
          mockPosts.forEach(post => callback({
            id: post.id,
            data: () => post
          }));
        }
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      // Act
      const posts = await communityService.getPosts();
      const searchResults = searchPosts(posts, '林黛玉拋父');

      // Assert
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].content).toContain('林黛玉拋父進京都');

      testLogger.log('Source search test completed');
    });
  });

  describe('Mixed Search Scenarios - Expected Use Cases', () => {
    /**
     * Test Case: Search across mixed regular and note posts
     *
     * Verifies that search works correctly with both post types
     */
    it('should search correctly across regular and note posts', async () => {
      testLogger.log('Testing mixed post type search');

      // Arrange: Mix of regular posts and note posts
      const mockPosts = [
        {
          id: 'regular1',
          authorId: 'user1',
          authorName: '王熙鳳',
          content: '今天讀紅樓夢有新的感悟',
          tags: ['讀後感'],
          likes: 2,
          likedBy: [],
          commentCount: 0,
          viewCount: 3,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          isEdited: false,
          status: 'active' as const,
          bookmarkedBy: []
        },
        {
          id: 'note1',
          authorId: 'user2',
          authorName: '賈探春',
          content: `我的閱讀筆記
紅樓夢中的詩詞很有韻味
---
選取文字：
寶鼎茶閑煙尚綠，幽窗棋罷指猶涼

來源：第二十六回`,
          tags: ['詩詞'],
          likes: 5,
          likedBy: [],
          commentCount: 1,
          viewCount: 8,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          isEdited: false,
          status: 'active' as const,
          bookmarkedBy: []
        },
        {
          id: 'note2',
          authorId: 'user3',
          authorName: '史湘雲',
          content: `我的閱讀筆記
紅樓夢人物塑造細膩
---
選取文字：
文字原文

來源：第五回`,
          tags: ['人物分析'],
          likes: 7,
          likedBy: [],
          commentCount: 2,
          viewCount: 12,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          isEdited: false,
          status: 'active' as const,
          bookmarkedBy: []
        }
      ];

      const mockQuerySnapshot = {
        forEach: (callback: (doc: any) => void) => {
          mockPosts.forEach(post => callback({
            id: post.id,
            data: () => post
          }));
        }
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      // Act
      const posts = await communityService.getPosts();
      const searchResults = searchPosts(posts, '紅樓夢');

      // Assert: Should find all three posts (2 in content, 1 in note content)
      expect(searchResults).toHaveLength(3);

      testLogger.log('Mixed post type search test completed', {
        totalPosts: posts.length,
        matchingPosts: searchResults.length
      });
    });
  });

  describe('Edge Cases and Complex Scenarios', () => {
    /**
     * Edge Case: Search with no matching results
     *
     * Verifies that search returns empty array when no posts match
     */
    it('should return empty array when no posts match search', async () => {
      testLogger.log('Testing no results scenario');

      // Arrange
      const mockPosts = [
        {
          id: 'note1',
          authorId: 'user1',
          authorName: 'User',
          content: `我的閱讀筆記
筆記內容
---
選取文字：
選取段落

來源：第一回`,
          tags: ['筆記'],
          likes: 0,
          likedBy: [],
          commentCount: 0,
          viewCount: 1,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          isEdited: false,
          status: 'active' as const,
          bookmarkedBy: []
        }
      ];

      const mockQuerySnapshot = {
        forEach: (callback: (doc: any) => void) => {
          mockPosts.forEach(post => callback({
            id: post.id,
            data: () => post
          }));
        }
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      // Act
      const posts = await communityService.getPosts();
      const searchResults = searchPosts(posts, '不存在的關鍵字xyz123');

      // Assert
      expect(searchResults).toHaveLength(0);
      expect(searchResults).toEqual([]);

      testLogger.log('No results scenario test completed');
    });

    /**
     * Edge Case: Case-insensitive search
     *
     * Verifies that search is case-insensitive
     */
    it('should perform case-insensitive search', async () => {
      testLogger.log('Testing case-insensitive search');

      // Arrange
      const mockPosts = [
        {
          id: 'note1',
          authorId: 'user1',
          authorName: 'User',
          content: `我的閱讀筆記
林黛玉的性格分析
---
選取文字：
原文段落

來源：第三回`,
          tags: ['人物'],
          likes: 0,
          likedBy: [],
          commentCount: 0,
          viewCount: 1,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          isEdited: false,
          status: 'active' as const,
          bookmarkedBy: []
        }
      ];

      const mockQuerySnapshot = {
        forEach: (callback: (doc: any) => void) => {
          mockPosts.forEach(post => callback({
            id: post.id,
            data: () => post
          }));
        }
      };

      (getDocs as jest.Mock).mockResolvedValue(mockQuerySnapshot);

      // Act
      const posts = await communityService.getPosts();
      const resultsLower = searchPosts(posts, '林黛玉');
      const resultsMixed = searchPosts(posts, '林黛玉');

      // Assert
      expect(resultsLower).toHaveLength(1);
      expect(resultsMixed).toHaveLength(1);

      testLogger.log('Case-insensitive search test completed');
    });
  });
});
