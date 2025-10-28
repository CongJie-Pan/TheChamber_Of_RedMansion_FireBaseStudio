/**
 * @jest-environment node
 * @fileOverview Note Repository Tests
 *
 * Tests for note repository CRUD operations and advanced features using in-memory SQLite database
 *
 * @phase Phase 2 - SQLITE-006 - Simple Services Migration (Notes)
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
  createNote,
  updateNoteContent,
  getNotesByUserAndChapter,
  getAllNotesByUser,
  getNoteById,
  deleteNote,
  updateNoteVisibility,
  getPublicNotes,
  updateNoteTags,
  deleteNotesByUserAndChapter,
  batchCreateNotes,
  getNoteCount,
  getNotesByTag,
  updateNoteType,
  type Note,
} from '@/lib/repositories/note-repository';

describe('Note Repository (SQLITE-006)', () => {
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
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        chapterId INTEGER NOT NULL,
        selectedText TEXT NOT NULL,
        note TEXT NOT NULL,
        createdAt INTEGER NOT NULL,
        lastModified INTEGER NOT NULL,
        tags TEXT,
        isPublic INTEGER DEFAULT 0,
        wordCount INTEGER DEFAULT 0,
        noteType TEXT,
        FOREIGN KEY (userId) REFERENCES users(id)
      );
    `);

    testDb.exec(`
      CREATE INDEX IF NOT EXISTS idx_notes_user_chapter
      ON notes(userId, chapterId);

      CREATE INDEX IF NOT EXISTS idx_notes_user
      ON notes(userId, createdAt DESC);

      CREATE INDEX IF NOT EXISTS idx_notes_public
      ON notes(isPublic, createdAt DESC);
    `);

    // Insert test users
    testDb.prepare(`
      INSERT INTO users (id, username, email, currentLevel, currentXP, totalXP, attributes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('test-user-1', '林黛玉', 'daiyu@test.com', 1, 0, 0, '{}', Date.now(), Date.now());

    testDb.prepare(`
      INSERT INTO users (id, username, email, currentLevel, currentXP, totalXP, attributes, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('test-user-2', '薛寶釵', 'baochai@test.com', 1, 0, 0, '{}', Date.now(), Date.now());
  });

  afterEach(() => {
    if (testDb) {
      testDb.close();
    }
  });

  describe('createNote', () => {
    test('should create a new note successfully', () => {
      const note = {
        userId: 'test-user-1',
        chapterId: 27,
        selectedText: '花謝花飛花滿天',
        note: '這是林黛玉的《葬花吟》，表達了對生命無常的感慨。',
        tags: ['詩詞', '林黛玉'],
        isPublic: false,
        noteType: 'POETRY',
      };

      const noteId = createNote(note);

      expect(noteId).toBeDefined();
      expect(noteId).toContain('note-');

      // Verify insertion
      const row = testDb.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as any;
      expect(row).toBeDefined();
      expect(row.userId).toBe('test-user-1');
      expect(row.chapterId).toBe(27);
      expect(row.note).toBe('這是林黛玉的《葬花吟》，表達了對生命無常的感慨。');
      expect(row.isPublic).toBe(0); // SQLite boolean
      expect(row.wordCount).toBeGreaterThan(0);
      expect(JSON.parse(row.tags)).toEqual(['詩詞', '林黛玉']);
      expect(row.noteType).toBe('POETRY');
    });

    test('should auto-calculate word count', () => {
      const note = {
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'This is a test note with seven words',
      };

      const noteId = createNote(note);
      const row = testDb.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as any;

      expect(row.wordCount).toBe(7);
    });

    test('should handle notes without optional fields', () => {
      const note = {
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test text',
        note: 'Simple note',
      };

      const noteId = createNote(note);
      const row = testDb.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as any;

      expect(row.tags).toBe('[]'); // Empty array
      expect(row.isPublic).toBe(0); // Default false
      expect(row.noteType).toBeNull();
    });

    test('should auto-generate unique IDs for multiple notes', () => {
      const note = {
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test note',
      };

      const id1 = createNote(note);
      const id2 = createNote(note);

      expect(id1).not.toBe(id2);
    });

    test('should handle Chinese characters correctly', () => {
      const note = {
        userId: 'test-user-1',
        chapterId: 3,
        selectedText: '賈寶玉性格分析',
        note: '賈寶玉是《紅樓夢》中的男主角，性格溫柔多情，最喜與女孩子們相處。',
        tags: ['人物分析', '賈寶玉'],
        noteType: 'CHARACTER',
      };

      const noteId = createNote(note);
      const row = testDb.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as any;

      expect(row.note).toBe('賈寶玉是《紅樓夢》中的男主角，性格溫柔多情，最喜與女孩子們相處。');
      expect(JSON.parse(row.tags)).toEqual(['人物分析', '賈寶玉']);
    });
  });

  describe('updateNoteContent', () => {
    test('should update note content and word count', () => {
      // Create initial note
      const noteId = createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Original content',
      });

      // Update content
      updateNoteContent(noteId, 'Updated content with more words here');

      const row = testDb.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as any;
      expect(row.note).toBe('Updated content with more words here');
      expect(row.wordCount).toBe(6);
      expect(row.lastModified).toBeGreaterThan(row.createdAt);
    });

    test('should update lastModified timestamp', () => {
      const noteId = createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Original',
      });

      const beforeUpdate = testDb.prepare('SELECT lastModified FROM notes WHERE id = ?').get(noteId) as any;

      // Wait a moment to ensure timestamp difference
      setTimeout(() => {
        updateNoteContent(noteId, 'Updated');
        const afterUpdate = testDb.prepare('SELECT lastModified FROM notes WHERE id = ?').get(noteId) as any;
        expect(afterUpdate.lastModified).toBeGreaterThanOrEqual(beforeUpdate.lastModified);
      }, 10);
    });
  });

  describe('getNotesByUserAndChapter', () => {
    test('should retrieve notes for a specific user and chapter', () => {
      const now = Date.now();

      // Insert test data
      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n1', 'test-user-1', 27, 'Text 1', 'Note 1', now - 2000, now - 2000, '[]', 0, 2, null);

      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n2', 'test-user-1', 27, 'Text 2', 'Note 2', now - 1000, now - 1000, '[]', 0, 2, null);

      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n3', 'test-user-1', 28, 'Text 3', 'Note 3', now, now, '[]', 0, 2, null);

      const notes = getNotesByUserAndChapter('test-user-1', 27);

      expect(notes).toHaveLength(2);
      expect(notes[0].note).toBe('Note 2'); // Most recent first
      expect(notes[1].note).toBe('Note 1');
    });

    test('should return empty array when no notes exist', () => {
      const notes = getNotesByUserAndChapter('test-user-1', 999);
      expect(notes).toEqual([]);
    });

    test('should not return notes from other users', () => {
      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n1', 'test-user-1', 27, 'Text 1', 'User 1 note', Date.now(), Date.now(), '[]', 0, 3, null);

      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n2', 'test-user-2', 27, 'Text 2', 'User 2 note', Date.now(), Date.now(), '[]', 0, 3, null);

      const notes = getNotesByUserAndChapter('test-user-1', 27);

      expect(notes).toHaveLength(1);
      expect(notes[0].note).toBe('User 1 note');
    });

    test('should properly parse tags array', () => {
      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n1', 'test-user-1', 27, 'Text', 'Note', Date.now(), Date.now(), '["tag1","tag2"]', 0, 1, null);

      const notes = getNotesByUserAndChapter('test-user-1', 27);

      expect(notes[0].tags).toEqual(['tag1', 'tag2']);
    });

    test('should convert isPublic to boolean', () => {
      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n1', 'test-user-1', 27, 'Text', 'Note', Date.now(), Date.now(), '[]', 1, 1, null);

      const notes = getNotesByUserAndChapter('test-user-1', 27);

      expect(notes[0].isPublic).toBe(true);
    });
  });

  describe('getAllNotesByUser', () => {
    test('should retrieve all notes for a user across chapters', () => {
      const now = Date.now();

      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n1', 'test-user-1', 27, 'Ch27', 'Chapter 27 note', now - 2000, now - 2000, '[]', 0, 3, null);

      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n2', 'test-user-1', 28, 'Ch28', 'Chapter 28 note', now - 1000, now - 1000, '[]', 0, 3, null);

      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n3', 'test-user-1', 29, 'Ch29', 'Chapter 29 note', now, now, '[]', 0, 3, null);

      const notes = getAllNotesByUser('test-user-1');

      expect(notes).toHaveLength(3);
      expect(notes[0].note).toBe('Chapter 29 note'); // Most recent first
      expect(notes[1].note).toBe('Chapter 28 note');
      expect(notes[2].note).toBe('Chapter 27 note');
    });

    test('should return empty array when user has no notes', () => {
      const notes = getAllNotesByUser('nonexistent-user');
      expect(notes).toEqual([]);
    });

    test('should not include other users notes', () => {
      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n1', 'test-user-1', 1, 'Text', 'User 1', Date.now(), Date.now(), '[]', 0, 2, null);

      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n2', 'test-user-2', 1, 'Text', 'User 2', Date.now(), Date.now(), '[]', 0, 2, null);

      const notes = getAllNotesByUser('test-user-1');

      expect(notes).toHaveLength(1);
      expect(notes[0].note).toBe('User 1');
    });
  });

  describe('getNoteById', () => {
    test('should retrieve a note by ID', () => {
      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n1', 'test-user-1', 27, 'Selected', 'Test note', Date.now(), Date.now(), '["tag1"]', 1, 2, 'GENERAL');

      const note = getNoteById('n1');

      expect(note).toBeDefined();
      expect(note?.id).toBe('n1');
      expect(note?.userId).toBe('test-user-1');
      expect(note?.chapterId).toBe(27);
      expect(note?.note).toBe('Test note');
      expect(note?.tags).toEqual(['tag1']);
      expect(note?.isPublic).toBe(true);
      expect(note?.wordCount).toBe(2);
      expect(note?.noteType).toBe('GENERAL');
      expect(note?.createdAt).toBeInstanceOf(Date);
      expect(note?.lastModified).toBeInstanceOf(Date);
    });

    test('should return null when note does not exist', () => {
      const note = getNoteById('nonexistent-id');
      expect(note).toBeNull();
    });
  });

  describe('deleteNote', () => {
    test('should delete a note by ID', () => {
      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n1', 'test-user-1', 27, 'Text', 'To be deleted', Date.now(), Date.now(), '[]', 0, 3, null);

      deleteNote('n1');

      const row = testDb.prepare('SELECT * FROM notes WHERE id = ?').get('n1');
      expect(row).toBeUndefined();
    });

    test('should not throw error when deleting non-existent note', () => {
      expect(() => deleteNote('nonexistent-id')).not.toThrow();
    });
  });

  describe('updateNoteVisibility', () => {
    test('should update note visibility to public', () => {
      const noteId = createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test note',
        isPublic: false,
      });

      updateNoteVisibility(noteId, true);

      const row = testDb.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as any;
      expect(row.isPublic).toBe(1); // SQLite boolean
    });

    test('should update note visibility to private', () => {
      const noteId = createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test note',
        isPublic: true,
      });

      updateNoteVisibility(noteId, false);

      const row = testDb.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as any;
      expect(row.isPublic).toBe(0);
    });

    test('should update lastModified timestamp', () => {
      const noteId = createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test',
      });

      const before = testDb.prepare('SELECT lastModified FROM notes WHERE id = ?').get(noteId) as any;
      updateNoteVisibility(noteId, true);
      const after = testDb.prepare('SELECT lastModified FROM notes WHERE id = ?').get(noteId) as any;

      expect(after.lastModified).toBeGreaterThanOrEqual(before.lastModified);
    });
  });

  describe('getPublicNotes', () => {
    test('should retrieve only public notes', () => {
      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n1', 'test-user-1', 1, 'Text', 'Public note 1', Date.now() - 2000, Date.now() - 2000, '[]', 1, 3, null);

      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n2', 'test-user-1', 1, 'Text', 'Private note', Date.now() - 1000, Date.now() - 1000, '[]', 0, 2, null);

      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n3', 'test-user-2', 1, 'Text', 'Public note 2', Date.now(), Date.now(), '[]', 1, 3, null);

      const notes = getPublicNotes();

      expect(notes).toHaveLength(2);
      expect(notes.every(n => n.isPublic)).toBe(true);
      expect(notes[0].note).toBe('Public note 2'); // Most recent first
    });

    test('should respect limit parameter', () => {
      for (let i = 0; i < 10; i++) {
        testDb.prepare(`
          INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(`n${i}`, 'test-user-1', 1, 'Text', `Note ${i}`, Date.now() + i, Date.now() + i, '[]', 1, 2, null);
      }

      const notes = getPublicNotes(5);

      expect(notes).toHaveLength(5);
    });

    test('should return empty array when no public notes exist', () => {
      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n1', 'test-user-1', 1, 'Text', 'Private', Date.now(), Date.now(), '[]', 0, 1, null);

      const notes = getPublicNotes();

      expect(notes).toEqual([]);
    });
  });

  describe('updateNoteTags', () => {
    test('should update note tags', () => {
      const noteId = createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test note',
        tags: ['old-tag'],
      });

      updateNoteTags(noteId, ['new-tag-1', 'new-tag-2']);

      const row = testDb.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as any;
      expect(JSON.parse(row.tags)).toEqual(['new-tag-1', 'new-tag-2']);
    });

    test('should handle empty tags array', () => {
      const noteId = createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test',
        tags: ['tag1', 'tag2'],
      });

      updateNoteTags(noteId, []);

      const row = testDb.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as any;
      expect(JSON.parse(row.tags)).toEqual([]);
    });

    test('should update lastModified timestamp', () => {
      const noteId = createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test',
      });

      const before = testDb.prepare('SELECT lastModified FROM notes WHERE id = ?').get(noteId) as any;
      updateNoteTags(noteId, ['tag']);
      const after = testDb.prepare('SELECT lastModified FROM notes WHERE id = ?').get(noteId) as any;

      expect(after.lastModified).toBeGreaterThanOrEqual(before.lastModified);
    });
  });

  describe('deleteNotesByUserAndChapter', () => {
    test('should delete all notes for a user and chapter', () => {
      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n1', 'test-user-1', 27, 'Text', 'Note 1', Date.now(), Date.now(), '[]', 0, 2, null);

      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n2', 'test-user-1', 27, 'Text', 'Note 2', Date.now(), Date.now(), '[]', 0, 2, null);

      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n3', 'test-user-1', 28, 'Text', 'Note 3', Date.now(), Date.now(), '[]', 0, 2, null);

      const deletedCount = deleteNotesByUserAndChapter('test-user-1', 27);

      expect(deletedCount).toBe(2);

      const remaining = testDb.prepare('SELECT * FROM notes WHERE userId = ?').all('test-user-1');
      expect(remaining).toHaveLength(1);
      expect((remaining[0] as any).chapterId).toBe(28);
    });

    test('should return 0 when no notes match', () => {
      const deletedCount = deleteNotesByUserAndChapter('test-user-1', 999);
      expect(deletedCount).toBe(0);
    });
  });

  describe('batchCreateNotes', () => {
    test('should create multiple notes in a transaction', () => {
      const notes = [
        { userId: 'test-user-1', chapterId: 27, selectedText: 'Text 1', note: 'Note 1', tags: ['tag1'] },
        { userId: 'test-user-1', chapterId: 27, selectedText: 'Text 2', note: 'Note 2', isPublic: true },
        { userId: 'test-user-1', chapterId: 28, selectedText: 'Text 3', note: 'Note 3', noteType: 'POETRY' },
      ];

      const ids = batchCreateNotes(notes);

      expect(ids).toHaveLength(3);
      expect(ids.every(id => id.startsWith('note-'))).toBe(true);

      const count = testDb.prepare('SELECT COUNT(*) as count FROM notes').get() as { count: number };
      expect(count.count).toBe(3);
    });

    test('should return empty array for empty input', () => {
      const ids = batchCreateNotes([]);
      expect(ids).toEqual([]);
    });

    test('should properly handle all optional fields in batch', () => {
      const notes = [
        {
          userId: 'test-user-1',
          chapterId: 1,
          selectedText: 'Text',
          note: 'Note with all fields',
          tags: ['tag1', 'tag2'],
          isPublic: true,
          noteType: 'CHARACTER',
        },
      ];

      const ids = batchCreateNotes(notes);
      const row = testDb.prepare('SELECT * FROM notes WHERE id = ?').get(ids[0]) as any;

      expect(JSON.parse(row.tags)).toEqual(['tag1', 'tag2']);
      expect(row.isPublic).toBe(1);
      expect(row.noteType).toBe('CHARACTER');
    });
  });

  describe('getNoteCount', () => {
    test('should count notes for a user', () => {
      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n1', 'test-user-1', 27, 'Text', 'Note 1', Date.now(), Date.now(), '[]', 0, 2, null);

      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n2', 'test-user-1', 27, 'Text', 'Note 2', Date.now(), Date.now(), '[]', 0, 2, null);

      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n3', 'test-user-1', 28, 'Text', 'Note 3', Date.now(), Date.now(), '[]', 0, 2, null);

      const totalCount = getNoteCount('test-user-1');
      const chapter27Count = getNoteCount('test-user-1', 27);
      const chapter28Count = getNoteCount('test-user-1', 28);

      expect(totalCount).toBe(3);
      expect(chapter27Count).toBe(2);
      expect(chapter28Count).toBe(1);
    });

    test('should return 0 for user with no notes', () => {
      const count = getNoteCount('nonexistent-user');
      expect(count).toBe(0);
    });

    test('should return 0 for chapter with no notes', () => {
      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n1', 'test-user-1', 27, 'Text', 'Note', Date.now(), Date.now(), '[]', 0, 1, null);

      const count = getNoteCount('test-user-1', 999);
      expect(count).toBe(0);
    });
  });

  describe('getNotesByTag', () => {
    test('should retrieve notes with a specific tag', () => {
      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n1', 'test-user-1', 1, 'Text', 'Note with poetry tag', Date.now(), Date.now(), '["詩詞","林黛玉"]', 0, 4, null);

      testDb.prepare(`
        INSERT INTO notes (id, userId, chapterId, selectedText, note, createdAt, lastModified, tags, isPublic, wordCount, noteType)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run('n2', 'test-user-1', 1, 'Text', 'Note with character tag', Date.now(), Date.now(), '["人物"]', 0, 4, null);

      const notes = getNotesByTag('test-user-1', '詩詞');

      expect(notes).toHaveLength(1);
      expect(notes[0].note).toBe('Note with poetry tag');
    });

    test('should return empty array when no notes have the tag', () => {
      const notes = getNotesByTag('test-user-1', 'nonexistent-tag');
      expect(notes).toEqual([]);
    });
  });

  describe('updateNoteType', () => {
    test('should update note type', () => {
      const noteId = createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test',
        noteType: 'GENERAL',
      });

      updateNoteType(noteId, 'POETRY');

      const row = testDb.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as any;
      expect(row.noteType).toBe('POETRY');
    });

    test('should handle null note type', () => {
      const noteId = createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test',
        noteType: 'POETRY',
      });

      updateNoteType(noteId, null);

      const row = testDb.prepare('SELECT * FROM notes WHERE id = ?').get(noteId) as any;
      expect(row.noteType).toBeNull();
    });

    test('should update lastModified timestamp', () => {
      const noteId = createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test',
      });

      const before = testDb.prepare('SELECT lastModified FROM notes WHERE id = ?').get(noteId) as any;
      updateNoteType(noteId, 'CHARACTER');
      const after = testDb.prepare('SELECT lastModified FROM notes WHERE id = ?').get(noteId) as any;

      expect(after.lastModified).toBeGreaterThanOrEqual(before.lastModified);
    });
  });

  describe('Data Integrity', () => {
    test('should maintain correct timestamp data types', () => {
      const noteId = createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test note',
      });

      const note = getNoteById(noteId);

      expect(note?.createdAt).toBeInstanceOf(Date);
      expect(note?.lastModified).toBeInstanceOf(Date);
      expect(note?.createdAt.getTime()).toBeGreaterThan(Date.now() - 10000);
    });

    test('should handle special characters in note content', () => {
      const specialNote = '「紅樓夢」："賈寶玉、林黛玉" — 經典名著！@#$%^&*()';
      const noteId = createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: specialNote,
      });

      const note = getNoteById(noteId);

      expect(note?.note).toBe(specialNote);
    });

    test('should preserve tag order', () => {
      const tags = ['tag3', 'tag1', 'tag2'];
      const noteId = createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test',
        tags,
      });

      const note = getNoteById(noteId);

      expect(note?.tags).toEqual(tags);
    });

    test('should handle very long note content', () => {
      const longNote = 'A'.repeat(10000);
      const noteId = createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: longNote,
      });

      const note = getNoteById(noteId);

      expect(note?.note).toBe(longNote);
      expect(note?.wordCount).toBe(1); // One very long "word"
    });
  });
});
