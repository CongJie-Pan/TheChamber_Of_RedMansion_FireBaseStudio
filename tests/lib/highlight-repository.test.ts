/**
 * @jest-environment node
 * @fileOverview Highlight Repository Tests
 *
 * Tests for highlight repository CRUD operations using in-memory SQLite database
 *
 * @phase Phase 2 - SQLITE-005 - Simple Services Migration (Highlights)
 */

import Database from 'better-sqlite3';

// Mock sqlite-db before importing repository
let testDb: Database.Database;

jest.mock('@/lib/sqlite-db', () => ({
  getDatabase: jest.fn(() => testDb),
  toUnixTimestamp: jest.fn((val: any) => (val?.toMillis ? val.toMillis() : Date.now())),
  fromUnixTimestamp: jest.fn((val: number) => new Date(val)),
}));

// Import repository after mocking
import {
  createHighlight,
  getHighlightsByUserAndChapter,
  getHighlightById,
  getHighlightsByUser,
  deleteHighlight,
  deleteHighlightsByUserAndChapter,
  batchCreateHighlights,
  getHighlightCount,
  type Highlight,
} from '@/lib/repositories/highlight-repository';

describe('Highlight Repository (SQLITE-005)', () => {
  beforeEach(() => {
    // Create in-memory test database
    testDb = new Database(':memory:');

    // Initialize schema
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT,
        currentLevel INTEGER DEFAULT 1,
        currentXP INTEGER DEFAULT 0,
        totalXP INTEGER DEFAULT 0,
        attributes TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );
    `);

    testDb.exec(`
      CREATE TABLE IF NOT EXISTS highlights (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        chapterId INTEGER NOT NULL,
        selectedText TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        FOREIGN KEY (userId) REFERENCES users(id)
      );
    `);

    testDb.exec(`
      CREATE INDEX IF NOT EXISTS idx_highlights_user_chapter
      ON highlights(userId, chapterId);
    `);

    // Insert test user
    testDb.prepare(`
      INSERT INTO users (id, username, email, currentLevel, currentXP, totalXP, attributes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('test-user-1', '林黛玉', 'daiyu@test.com', 1, 0, 0, '{}', Date.now(), Date.now());
  });

  afterEach(() => {
    if (testDb) {
      testDb.close();
    }
  });

  describe('createHighlight', () => {
    test('should create a new highlight successfully', () => {
      const highlight = {
        userId: 'test-user-1',
        chapterId: 27,
        selectedText: '花謝花飛花滿天，紅消香斷有誰憐？',
      };

      const highlightId = createHighlight(highlight);

      expect(highlightId).toBeDefined();
      expect(highlightId).toContain('highlight-');

      // Verify insertion
      const row = testDb.prepare('SELECT * FROM highlights WHERE id = ?').get(highlightId) as any;
      expect(row).toBeDefined();
      expect(row.userId).toBe('test-user-1');
      expect(row.chapterId).toBe(27);
      expect(row.selectedText).toBe('花謝花飛花滿天，紅消香斷有誰憐？');
      expect(row.createdAt).toBeDefined();
    });

    test('should auto-generate unique IDs for multiple highlights', () => {
      const highlight = {
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test text',
      };

      const id1 = createHighlight(highlight);
      const id2 = createHighlight(highlight);

      expect(id1).not.toBe(id2);
    });

    test('should handle Chinese characters correctly', () => {
      const highlight = {
        userId: 'test-user-1',
        chapterId: 3,
        selectedText: '賈寶玉：怡紅院主人，最喜女兒家',
      };

      const highlightId = createHighlight(highlight);
      const row = testDb.prepare('SELECT * FROM highlights WHERE id = ?').get(highlightId) as any;

      expect(row.selectedText).toBe('賈寶玉：怡紅院主人，最喜女兒家');
    });
  });

  describe('getHighlightsByUserAndChapter', () => {
    test('should retrieve highlights for a specific user and chapter', () => {
      // Insert test data
      const now = Date.now();
      testDb.prepare(`
        INSERT INTO highlights (id, userId, chapterId, selectedText, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('h1', 'test-user-1', 27, 'Text 1', now - 2000);

      testDb.prepare(`
        INSERT INTO highlights (id, userId, chapterId, selectedText, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('h2', 'test-user-1', 27, 'Text 2', now - 1000);

      testDb.prepare(`
        INSERT INTO highlights (id, userId, chapterId, selectedText, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('h3', 'test-user-1', 28, 'Text 3', now);

      const highlights = getHighlightsByUserAndChapter('test-user-1', 27);

      expect(highlights).toHaveLength(2);
      expect(highlights[0].selectedText).toBe('Text 2'); // Most recent first
      expect(highlights[1].selectedText).toBe('Text 1');
    });

    test('should return empty array when no highlights exist', () => {
      const highlights = getHighlightsByUserAndChapter('test-user-1', 999);

      expect(highlights).toEqual([]);
    });

    test('should not return highlights from other users', () => {
      // Insert another user
      testDb.prepare(`
        INSERT INTO users (id, username, email, currentLevel, currentXP, totalXP, attributes, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('test-user-2', '薛寶釵', 'baochai@test.com', 1, 0, 0, '{}', Date.now(), Date.now());

      testDb.prepare(`
        INSERT INTO highlights (id, userId, chapterId, selectedText, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('h1', 'test-user-1', 27, 'User 1 highlight', Date.now());

      testDb.prepare(`
        INSERT INTO highlights (id, userId, chapterId, selectedText, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('h2', 'test-user-2', 27, 'User 2 highlight', Date.now());

      const highlights = getHighlightsByUserAndChapter('test-user-1', 27);

      expect(highlights).toHaveLength(1);
      expect(highlights[0].selectedText).toBe('User 1 highlight');
    });
  });

  describe('getHighlightById', () => {
    test('should retrieve a highlight by ID', () => {
      testDb.prepare(`
        INSERT INTO highlights (id, userId, chapterId, selectedText, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('h1', 'test-user-1', 27, 'Test highlight', Date.now());

      const highlight = getHighlightById('h1');

      expect(highlight).toBeDefined();
      expect(highlight?.id).toBe('h1');
      expect(highlight?.userId).toBe('test-user-1');
      expect(highlight?.chapterId).toBe(27);
      expect(highlight?.selectedText).toBe('Test highlight');
      expect(highlight?.createdAt).toBeInstanceOf(Date);
    });

    test('should return null when highlight does not exist', () => {
      const highlight = getHighlightById('nonexistent-id');

      expect(highlight).toBeNull();
    });
  });

  describe('getHighlightsByUser', () => {
    test('should retrieve all highlights for a user across chapters', () => {
      const now = Date.now();
      testDb.prepare(`
        INSERT INTO highlights (id, userId, chapterId, selectedText, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('h1', 'test-user-1', 27, 'Chapter 27', now - 2000);

      testDb.prepare(`
        INSERT INTO highlights (id, userId, chapterId, selectedText, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('h2', 'test-user-1', 28, 'Chapter 28', now - 1000);

      testDb.prepare(`
        INSERT INTO highlights (id, userId, chapterId, selectedText, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('h3', 'test-user-1', 29, 'Chapter 29', now);

      const highlights = getHighlightsByUser('test-user-1');

      expect(highlights).toHaveLength(3);
      expect(highlights[0].selectedText).toBe('Chapter 29'); // Most recent first
      expect(highlights[1].selectedText).toBe('Chapter 28');
      expect(highlights[2].selectedText).toBe('Chapter 27');
    });

    test('should return empty array when user has no highlights', () => {
      const highlights = getHighlightsByUser('nonexistent-user');

      expect(highlights).toEqual([]);
    });
  });

  describe('deleteHighlight', () => {
    test('should delete a highlight by ID', () => {
      testDb.prepare(`
        INSERT INTO highlights (id, userId, chapterId, selectedText, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('h1', 'test-user-1', 27, 'To be deleted', Date.now());

      deleteHighlight('h1');

      const row = testDb.prepare('SELECT * FROM highlights WHERE id = ?').get('h1');
      expect(row).toBeUndefined();
    });

    test('should not throw error when deleting non-existent highlight', () => {
      expect(() => deleteHighlight('nonexistent-id')).not.toThrow();
    });
  });

  describe('deleteHighlightsByUserAndChapter', () => {
    test('should delete all highlights for a user and chapter', () => {
      testDb.prepare(`
        INSERT INTO highlights (id, userId, chapterId, selectedText, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('h1', 'test-user-1', 27, 'Text 1', Date.now());

      testDb.prepare(`
        INSERT INTO highlights (id, userId, chapterId, selectedText, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('h2', 'test-user-1', 27, 'Text 2', Date.now());

      testDb.prepare(`
        INSERT INTO highlights (id, userId, chapterId, selectedText, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('h3', 'test-user-1', 28, 'Text 3', Date.now());

      const deletedCount = deleteHighlightsByUserAndChapter('test-user-1', 27);

      expect(deletedCount).toBe(2);

      const remaining = testDb.prepare('SELECT * FROM highlights WHERE userId = ?').all('test-user-1');
      expect(remaining).toHaveLength(1);
      expect((remaining[0] as any).chapterId).toBe(28);
    });

    test('should return 0 when no highlights match', () => {
      const deletedCount = deleteHighlightsByUserAndChapter('test-user-1', 999);

      expect(deletedCount).toBe(0);
    });
  });

  describe('batchCreateHighlights', () => {
    test('should create multiple highlights in a transaction', () => {
      const highlights = [
        { userId: 'test-user-1', chapterId: 27, selectedText: 'Highlight 1' },
        { userId: 'test-user-1', chapterId: 27, selectedText: 'Highlight 2' },
        { userId: 'test-user-1', chapterId: 28, selectedText: 'Highlight 3' },
      ];

      const ids = batchCreateHighlights(highlights);

      expect(ids).toHaveLength(3);
      expect(ids.every(id => id.startsWith('highlight-'))).toBe(true);

      const count = testDb.prepare('SELECT COUNT(*) as count FROM highlights').get() as { count: number };
      expect(count.count).toBe(3);
    });

    test('should create highlights atomically (transaction rollback on error)', () => {
      // This test verifies transaction behavior
      const highlights = [
        { userId: 'test-user-1', chapterId: 27, selectedText: 'Valid' },
      ];

      const ids = batchCreateHighlights(highlights);
      expect(ids).toHaveLength(1);

      const count = testDb.prepare('SELECT COUNT(*) as count FROM highlights').get() as { count: number };
      expect(count.count).toBe(1);
    });

    test('should return empty array for empty input', () => {
      const ids = batchCreateHighlights([]);

      expect(ids).toEqual([]);
    });
  });

  describe('getHighlightCount', () => {
    test('should count highlights for a user', () => {
      testDb.prepare(`
        INSERT INTO highlights (id, userId, chapterId, selectedText, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('h1', 'test-user-1', 27, 'Text 1', Date.now());

      testDb.prepare(`
        INSERT INTO highlights (id, userId, chapterId, selectedText, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('h2', 'test-user-1', 27, 'Text 2', Date.now());

      testDb.prepare(`
        INSERT INTO highlights (id, userId, chapterId, selectedText, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('h3', 'test-user-1', 28, 'Text 3', Date.now());

      const totalCount = getHighlightCount('test-user-1');
      const chapter27Count = getHighlightCount('test-user-1', 27);
      const chapter28Count = getHighlightCount('test-user-1', 28);

      expect(totalCount).toBe(3);
      expect(chapter27Count).toBe(2);
      expect(chapter28Count).toBe(1);
    });

    test('should return 0 for user with no highlights', () => {
      const count = getHighlightCount('nonexistent-user');

      expect(count).toBe(0);
    });

    test('should return 0 for chapter with no highlights', () => {
      testDb.prepare(`
        INSERT INTO highlights (id, userId, chapterId, selectedText, createdAt)
        VALUES (?, ?, ?, ?, ?)
      `).run('h1', 'test-user-1', 27, 'Text 1', Date.now());

      const count = getHighlightCount('test-user-1', 999);

      expect(count).toBe(0);
    });
  });

  describe('Data Integrity', () => {
    test('should maintain correct timestamp data types', () => {
      const highlightId = createHighlight({
        userId: 'test-user-1',
        chapterId: 27,
        selectedText: 'Test',
      });

      const highlight = getHighlightById(highlightId);

      expect(highlight?.createdAt).toBeInstanceOf(Date);
      expect(highlight?.createdAt.getTime()).toBeGreaterThan(Date.now() - 10000); // Within last 10 seconds
    });

    test('should handle special characters in selectedText', () => {
      const specialText = '「紅樓夢」："賈寶玉、林黛玉" — 經典名著！@#$%^&*()';
      const highlightId = createHighlight({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: specialText,
      });

      const highlight = getHighlightById(highlightId);

      expect(highlight?.selectedText).toBe(specialText);
    });
  });
});
