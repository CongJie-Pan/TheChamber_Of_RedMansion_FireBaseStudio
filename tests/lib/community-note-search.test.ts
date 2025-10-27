/**
 * @fileOverview Community Note Search Logic Unit Tests
 *
 * Comprehensive test suite for the note search functionality including:
 * - Basic post search (content, author, tags)
 * - Note post format detection and parsing
 * - Searching within note content, selected text, and source
 * - Edge cases and error handling
 *
 * Test Categories:
 * 1. Expected Use Cases: Normal search operations
 * 2. Edge Cases: Boundary conditions and unusual formats
 * 3. Failure Cases: Invalid inputs and error conditions
 *
 * Each test includes comprehensive error logging and result tracking.
 */

import { Timestamp } from 'firebase/firestore';

// Mock post type matching the structure in community-service.ts
interface MockPost {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  tags: string[];
  likes: number;
  likedBy: string[];
  commentCount: number;
  viewCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isEdited: boolean;
  status: 'active' | 'hidden' | 'deleted';
  bookmarkedBy: string[];
}

/**
 * Helper function to filter posts based on search term
 * This function replicates the search logic from community/page.tsx (lines 818-858)
 *
 * @param posts - Array of posts to filter
 * @param searchTerm - Search term to match against
 * @returns Filtered array of posts
 */
function filterPostsBySearchTerm(posts: MockPost[], searchTerm: string): MockPost[] {
  if (!searchTerm || searchTerm.trim() === '') {
    return posts;
  }

  return posts.filter(post => {
    const searchLower = searchTerm.toLowerCase();

    // Basic search: content, author name, tags
    if (post.content.toLowerCase().includes(searchLower) ||
        post.authorName.toLowerCase().includes(searchLower) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchLower))) {
      return true;
    }

    // Special search for note posts (shared from reading page)
    // Note posts have special format: "我的閱讀筆記\n...\n---\n...\n來源："
    const isNotePost = post.content.includes('我的閱讀筆記') && post.content.includes('來源：');
    if (isNotePost) {
      const parts = post.content.split('---');
      if (parts.length >= 2) {
        // Extract note content (before ---)
        const noteContent = parts[0].replace('我的閱讀筆記', '').trim();

        // Search in note content
        if (noteContent.toLowerCase().includes(searchLower)) return true;

        // Extract and search in selected text
        const bottomPart = parts[1];
        const selectedTextMatch = bottomPart.match(/(?:選取文字：)?\s*\n?([\s\S]+?)\n\n來源：/);
        if (selectedTextMatch && selectedTextMatch[1].toLowerCase().includes(searchLower)) {
          return true;
        }

        // Extract and search in source
        const sourceMatch = bottomPart.match(/來源：([\s\S]+)$/);
        if (sourceMatch && sourceMatch[1].toLowerCase().includes(searchLower)) {
          return true;
        }
      }
    }

    return false;
  });
}

describe('Community Note Search Logic', () => {
  let testLogger: any;

  beforeEach(() => {
    // Initialize test logger for each test
    testLogger = {
      logs: [],
      log: (message: string, data?: any) => {
        testLogger.logs.push({ message, data, timestamp: new Date().toISOString() });
      }
    };
  });

  afterEach(() => {
    // Save test logs to organized output directory
    const fs = require('fs');
    const path = require('path');

    if (global.__TEST_CONFIG__) {
      const testName = expect.getState().currentTestName?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown';
      const logPath = path.join(
        global.__TEST_CONFIG__.outputDir,
        'community-note-search',
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

  // Helper function to create mock posts
  const createMockPost = (overrides: Partial<MockPost>): MockPost => ({
    id: 'post-123',
    authorId: 'user-456',
    authorName: '測試用戶',
    content: '這是一則普通貼文',
    tags: ['測試'],
    likes: 0,
    likedBy: [],
    commentCount: 0,
    viewCount: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    isEdited: false,
    status: 'active',
    bookmarkedBy: [],
    ...overrides
  });

  // Helper function to create mock note post
  const createNotePost = (noteContent: string, selectedText: string, source: string): MockPost => {
    const content = `我的閱讀筆記
${noteContent}
---
選取文字：
${selectedText}

來源：${source}`;

    return createMockPost({ content });
  };

  describe('Basic Search - Expected Use Cases', () => {
    /**
     * Test Case 1: Search in regular post content
     *
     * Verifies that basic search works for regular posts
     */
    it('should find posts by content match', () => {
      testLogger.log('Testing basic content search');

      // Arrange
      const posts = [
        createMockPost({ id: 'p1', content: '今天讀了紅樓夢第一回' }),
        createMockPost({ id: 'p2', content: '分享我的學習心得' }),
        createMockPost({ id: 'p3', content: '這是其他話題' })
      ];

      // Act
      const result = filterPostsBySearchTerm(posts, '紅樓夢');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('p1');

      testLogger.log('Basic content search completed', { matches: result.length });
    });

    /**
     * Test Case 2: Search by author name
     *
     * Verifies that search works for author names
     */
    it('should find posts by author name', () => {
      testLogger.log('Testing author name search');

      // Arrange
      const posts = [
        createMockPost({ id: 'p1', authorName: '林黛玉' }),
        createMockPost({ id: 'p2', authorName: '薛寶釵' }),
        createMockPost({ id: 'p3', authorName: '賈寶玉' })
      ];

      // Act
      const result = filterPostsBySearchTerm(posts, '黛玉');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].authorName).toBe('林黛玉');

      testLogger.log('Author name search completed');
    });

    /**
     * Test Case 3: Search by tags
     *
     * Verifies that search works for post tags
     */
    it('should find posts by tag match', () => {
      testLogger.log('Testing tag search');

      // Arrange
      const posts = [
        createMockPost({ id: 'p1', tags: ['紅樓夢', '讀書心得'] }),
        createMockPost({ id: 'p2', tags: ['詩詞', '文學'] }),
        createMockPost({ id: 'p3', tags: ['歷史'] })
      ];

      // Act
      const result = filterPostsBySearchTerm(posts, '詩詞');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].tags).toContain('詩詞');

      testLogger.log('Tag search completed');
    });

    /**
     * Test Case 4: Case-insensitive search
     *
     * Verifies that search is case-insensitive
     */
    it('should perform case-insensitive search', () => {
      testLogger.log('Testing case-insensitive search');

      // Arrange
      const posts = [
        createMockPost({ content: 'Dream of the Red Chamber' })
      ];

      // Act
      const resultLower = filterPostsBySearchTerm(posts, 'dream');
      const resultUpper = filterPostsBySearchTerm(posts, 'DREAM');
      const resultMixed = filterPostsBySearchTerm(posts, 'DrEaM');

      // Assert
      expect(resultLower).toHaveLength(1);
      expect(resultUpper).toHaveLength(1);
      expect(resultMixed).toHaveLength(1);

      testLogger.log('Case-insensitive search completed');
    });
  });

  describe('Note Post Search - Expected Use Cases', () => {
    /**
     * Test Case 1: Search in note content
     *
     * Verifies that search works within the note content section
     */
    it('should find note posts by note content', () => {
      testLogger.log('Testing note content search');

      // Arrange
      const posts = [
        createNotePost(
          '賈寶玉初見林黛玉，驚為天人。這段描寫細膩動人。',
          '黛玉方進來時，寶玉看罷，因笑道："這個妹妹我曾見過的。"',
          '第三回 - 賈雨村夤緣復舊職 林黛玉拋父進京都'
        ),
        createMockPost({ content: '這是普通貼文' })
      ];

      // Act
      const result = filterPostsBySearchTerm(posts, '賈寶玉初見');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].content).toContain('我的閱讀筆記');

      testLogger.log('Note content search completed');
    });

    /**
     * Test Case 2: Search in selected text
     *
     * Verifies that search works within the selected text section
     */
    it('should find note posts by selected text', () => {
      testLogger.log('Testing selected text search');

      // Arrange
      const posts = [
        createNotePost(
          '這是我的筆記內容',
          '黛玉方進來時，寶玉看罷，因笑道："這個妹妹我曾見過的。"',
          '第三回'
        )
      ];

      // Act
      const result = filterPostsBySearchTerm(posts, '妹妹我曾見過');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].content).toContain('選取文字');

      testLogger.log('Selected text search completed');
    });

    /**
     * Test Case 3: Search in source information
     *
     * Verifies that search works within the source section
     */
    it('should find note posts by source information', () => {
      testLogger.log('Testing source search');

      // Arrange
      const posts = [
        createNotePost(
          '筆記內容',
          '選取的段落',
          '第三回 - 賈雨村夤緣復舊職 林黛玉拋父進京都'
        ),
        createNotePost(
          '其他筆記',
          '其他段落',
          '第五回 - 遊幻境指迷十二釵'
        )
      ];

      // Act
      const result = filterPostsBySearchTerm(posts, '林黛玉拋父');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].content).toContain('第三回');

      testLogger.log('Source search completed');
    });

    /**
     * Test Case 4: Search matches multiple note sections
     *
     * Verifies that posts are returned when search term appears in any section
     */
    it('should find note posts when term appears in any section', () => {
      testLogger.log('Testing multi-section search');

      // Arrange
      const keyword = '林黛玉';
      const posts = [
        createNotePost(
          `${keyword}的性格分析`,
          '原文中的描寫',
          '第三回'
        ),
        createNotePost(
          '筆記內容',
          `${keyword}進賈府的場景`,
          '第三回'
        ),
        createNotePost(
          '筆記內容',
          '原文描寫',
          `第三回 - ${keyword}拋父進京都`
        )
      ];

      // Act
      const result = filterPostsBySearchTerm(posts, keyword);

      // Assert
      expect(result).toHaveLength(3); // All three should match

      testLogger.log('Multi-section search completed', { matches: result.length });
    });
  });

  describe('Note Post Search - Edge Cases', () => {
    /**
     * Edge Case 1: Incomplete note format (missing separator)
     *
     * Verifies handling of malformed note posts
     */
    it('should handle incomplete note format gracefully', () => {
      testLogger.log('Testing incomplete note format');

      // Arrange: Note post without proper separator
      const posts = [
        createMockPost({
          content: '我的閱讀筆記\n這是筆記內容\n來源：第三回' // Missing "---"
        })
      ];

      // Act: Should not crash, might not match note-specific search
      const result = filterPostsBySearchTerm(posts, '筆記內容');

      // Assert: Should still work via basic content search
      expect(result).toHaveLength(1);

      testLogger.log('Incomplete note format test completed');
    });

    /**
     * Edge Case 2: Empty search term
     *
     * Verifies that empty search returns all posts
     */
    it('should return all posts for empty search term', () => {
      testLogger.log('Testing empty search term');

      // Arrange
      const posts = [
        createMockPost({ id: 'p1' }),
        createMockPost({ id: 'p2' }),
        createNotePost('筆記', '選文', '來源')
      ];

      // Act
      const resultEmpty = filterPostsBySearchTerm(posts, '');
      const resultSpaces = filterPostsBySearchTerm(posts, '   ');

      // Assert
      expect(resultEmpty).toHaveLength(3);
      expect(resultSpaces).toHaveLength(3);

      testLogger.log('Empty search term test completed');
    });

    /**
     * Edge Case 3: Special characters in search
     *
     * Verifies that special characters are handled correctly
     */
    it('should handle special characters in search term', () => {
      testLogger.log('Testing special characters');

      // Arrange
      const posts = [
        createNotePost(
          '筆記內容',
          '原文："這個妹妹我曾見過的。"',
          '第三回'
        )
      ];

      // Act
      const result = filterPostsBySearchTerm(posts, '："這個');

      // Assert
      expect(result).toHaveLength(1);

      testLogger.log('Special characters test completed');
    });

    /**
     * Edge Case 4: Very long note content
     *
     * Verifies that search works with lengthy note posts
     */
    it('should handle very long note content', () => {
      testLogger.log('Testing long note content');

      // Arrange
      const longNote = '這是一篇很長的筆記。'.repeat(100);
      const posts = [
        createNotePost(longNote, '選取文字', '來源')
      ];

      // Act
      const result = filterPostsBySearchTerm(posts, '筆記');

      // Assert
      expect(result).toHaveLength(1);

      testLogger.log('Long note content test completed', {
        contentLength: longNote.length
      });
    });

    /**
     * Edge Case 5: Note without selected text label
     *
     * Verifies regex handles optional "選取文字：" label
     */
    it('should handle note without "選取文字：" label', () => {
      testLogger.log('Testing note without selected text label');

      // Arrange: Format without explicit label
      const posts = [
        createMockPost({
          content: `我的閱讀筆記
筆記內容
---

黛玉方進來時，寶玉看罷

來源：第三回`
        })
      ];

      // Act
      const result = filterPostsBySearchTerm(posts, '黛玉方進來');

      // Assert
      expect(result).toHaveLength(1);

      testLogger.log('Note without label test completed');
    });
  });

  describe('Search Performance and Multiple Matches', () => {
    /**
     * Test Case: Search returns multiple matching posts
     *
     * Verifies that all matching posts are returned
     */
    it('should return all posts that match the search term', () => {
      testLogger.log('Testing multiple matches');

      // Arrange
      const keyword = '紅樓夢';
      const posts = [
        createMockPost({ id: 'p1', content: `${keyword}是經典名著` }),
        createMockPost({ id: 'p2', tags: [keyword] }),
        createNotePost(`讀${keyword}心得`, '原文', '第一回'),
        createMockPost({ id: 'p4', content: '其他話題' })
      ];

      // Act
      const result = filterPostsBySearchTerm(posts, keyword);

      // Assert
      expect(result).toHaveLength(3); // First three should match
      expect(result.map(p => p.id)).toEqual(['p1', 'p2', expect.any(String)]);

      testLogger.log('Multiple matches test completed', { matches: result.length });
    });

    /**
     * Test Case: Search with no matches
     *
     * Verifies that empty array is returned when no posts match
     */
    it('should return empty array when no posts match', () => {
      testLogger.log('Testing no matches');

      // Arrange
      const posts = [
        createMockPost({ content: '今天天氣真好' }),
        createNotePost('筆記', '選文', '來源')
      ];

      // Act
      const result = filterPostsBySearchTerm(posts, '不存在的關鍵字xyz');

      // Assert
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);

      testLogger.log('No matches test completed');
    });
  });

  describe('Mixed Post Types', () => {
    /**
     * Test Case: Search across mixed regular and note posts
     *
     * Verifies that search works correctly with both post types
     */
    it('should search correctly across regular and note posts', () => {
      testLogger.log('Testing mixed post types');

      // Arrange
      const posts = [
        createMockPost({ id: 'regular1', content: '討論紅樓夢的主題' }),
        createNotePost('紅樓夢的人物關係很複雜', '原文段落', '第三回'),
        createMockPost({ id: 'regular2', authorName: '紅樓夢愛好者' }),
        createNotePost('其他筆記', '紅樓夢中的詩詞', '第五回'),
        createMockPost({ id: 'regular3', content: '不相關的話題' })
      ];

      // Act
      const result = filterPostsBySearchTerm(posts, '紅樓夢');

      // Assert
      expect(result).toHaveLength(4); // All except last one

      testLogger.log('Mixed post types test completed', {
        total: posts.length,
        matches: result.length
      });
    });
  });
});
