/**
 * @jest-environment node
 * @fileOverview Note Repository Tests
 *
 * Tests for note repository CRUD operations using mocked Turso/libSQL database
 *
 * @phase Phase 2 - SQLITE-006 - Simple Services Migration (Notes)
 */

// Mock data storage to simulate database
const mockNotesData: Map<string, any> = new Map();

// Create mock database that simulates libSQL client API
const mockExecute = jest.fn(async (params: string | { sql: string; args?: any[] }) => {
  // Handle string parameter (e.g., 'BEGIN', 'COMMIT', 'ROLLBACK')
  if (typeof params === 'string') {
    return { rows: [], rowsAffected: 0 };
  }
  const { sql, args = [] } = params;

  // Handle INSERT INTO notes
  if (sql.includes('INSERT INTO notes')) {
    const [id, userId, chapterId, selectedText, note, createdAt, lastModified,
           tags, isPublic, wordCount, noteType] = args;
    mockNotesData.set(id, {
      id, userId, chapterId, selectedText, note, createdAt, lastModified,
      tags, isPublic, wordCount, noteType, sharedPostId: null
    });
    return { rows: [], rowsAffected: 1 };
  }

  // Handle SELECT * FROM notes WHERE id = ?
  if (sql.includes('SELECT * FROM notes WHERE id = ?') ||
      (sql.includes('SELECT') && sql.includes('FROM notes') && sql.includes('WHERE id ='))) {
    const id = args[0];
    const note = mockNotesData.get(id);
    return { rows: note ? [note] : [], rowsAffected: 0 };
  }

  // Handle SELECT * FROM notes WHERE userId = ? AND chapterId = ? ORDER BY createdAt DESC
  if (sql.includes('WHERE userId = ?') && sql.includes('AND chapterId = ?') && sql.includes('ORDER BY')) {
    const userId = args[0];
    const chapterId = args[1];
    const notes = Array.from(mockNotesData.values())
      .filter(n => n.userId === userId && n.chapterId === chapterId)
      .sort((a, b) => b.createdAt - a.createdAt);
    return { rows: notes, rowsAffected: 0 };
  }

  // Handle SELECT * FROM notes WHERE userId = ? ORDER BY createdAt DESC (no chapterId)
  if (sql.includes('FROM notes') && sql.includes('WHERE userId = ?') && sql.includes('ORDER BY') && !sql.includes('chapterId')) {
    const userId = args[0];
    const notes = Array.from(mockNotesData.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt - a.createdAt);
    return { rows: notes, rowsAffected: 0 };
  }

  // Handle SELECT * FROM notes WHERE isPublic = 1 ORDER BY createdAt DESC
  if (sql.includes('WHERE isPublic = 1')) {
    let notes = Array.from(mockNotesData.values())
      .filter(n => n.isPublic === 1)
      .sort((a, b) => b.createdAt - a.createdAt);
    // Handle LIMIT ? (parameter) or LIMIT n (literal)
    if (sql.includes('LIMIT')) {
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) {
        // Literal limit value in SQL
        notes = notes.slice(0, parseInt(limitMatch[1]));
      } else if (sql.includes('LIMIT ?') && args.length > 0) {
        // Parameterized limit
        notes = notes.slice(0, args[0]);
      }
    }
    return { rows: notes, rowsAffected: 0 };
  }

  // Handle SELECT * FROM notes WHERE sharedPostId = ?
  if (sql.includes('WHERE sharedPostId = ?')) {
    const postId = args[0];
    const note = Array.from(mockNotesData.values()).find(n => n.sharedPostId === postId);
    return { rows: note ? [note] : [], rowsAffected: 0 };
  }

  // Handle SELECT * FROM notes WHERE userId = ? AND sharedPostId IS NOT NULL
  if (sql.includes('WHERE userId = ?') && sql.includes('sharedPostId IS NOT NULL')) {
    const userId = args[0];
    const notes = Array.from(mockNotesData.values())
      .filter(n => n.userId === userId && n.sharedPostId != null)
      .sort((a, b) => b.lastModified - a.lastModified);
    return { rows: notes, rowsAffected: 0 };
  }

  // Handle SELECT * FROM notes WHERE userId = ? AND tags LIKE ?
  if (sql.includes('WHERE userId = ?') && sql.includes('tags LIKE ?')) {
    const userId = args[0];
    const tagPattern = args[1];
    // Extract tag name from pattern like %"tagName"%
    const tag = tagPattern.replace(/%/g, '').replace(/"/g, '');
    const notes = Array.from(mockNotesData.values())
      .filter(n => {
        if (n.userId !== userId) return false;
        try {
          const tags = JSON.parse(n.tags || '[]');
          return tags.includes(tag);
        } catch {
          return false;
        }
      });
    return { rows: notes, rowsAffected: 0 };
  }

  // Handle SELECT COUNT(*) as count FROM notes WHERE userId = ?
  if (sql.includes('SELECT COUNT(*)') && sql.includes('FROM notes')) {
    const userId = args[0];
    let count: number;
    if (sql.includes('AND chapterId = ?') && args[1] !== undefined) {
      const chapterId = args[1];
      count = Array.from(mockNotesData.values())
        .filter(n => n.userId === userId && n.chapterId === chapterId).length;
    } else {
      count = Array.from(mockNotesData.values())
        .filter(n => n.userId === userId).length;
    }
    return { rows: [{ count }], rowsAffected: 0 };
  }

  // Handle UPDATE notes - parse SET clause properly
  if (sql.includes('UPDATE notes')) {
    const noteId = args[args.length - 1]; // noteId is the last arg for WHERE clause
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

          // Check if it's a literal NULL (not a parameter)
          if (valueExpr === 'NULL') {
            if (fieldName === 'sharedPostId') {
              note.sharedPostId = null;
            }
            // Don't increment argIndex for literal NULL
            continue;
          }

          const value = args[argIndex];
          argIndex++;

          switch (fieldName) {
            case 'note':
              note.note = value;
              break;
            case 'wordCount':
              note.wordCount = value;
              break;
            case 'lastModified':
              note.lastModified = value;
              break;
            case 'isPublic':
              note.isPublic = value;
              break;
            case 'tags':
              note.tags = value;
              break;
            case 'noteType':
              note.noteType = value;
              break;
            case 'sharedPostId':
              note.sharedPostId = value;
              break;
          }
        }
      }
      mockNotesData.set(noteId, note);
    }
    return { rows: [], rowsAffected: note ? 1 : 0 };
  }

  // Handle DELETE FROM notes WHERE id = ?
  if (sql.includes('DELETE FROM notes WHERE id = ?')) {
    const id = args[0];
    const deleted = mockNotesData.delete(id);
    return { rows: [], rowsAffected: deleted ? 1 : 0 };
  }

  // Handle DELETE FROM notes WHERE userId = ? AND chapterId = ?
  if (sql.includes('DELETE FROM notes WHERE userId = ?') && sql.includes('AND chapterId = ?')) {
    const userId = args[0];
    const chapterId = args[1];
    let deletedCount = 0;
    for (const [id, note] of mockNotesData.entries()) {
      if (note.userId === userId && note.chapterId === chapterId) {
        mockNotesData.delete(id);
        deletedCount++;
      }
    }
    return { rows: [], rowsAffected: deletedCount };
  }

  // Default: return empty result
  return { rows: [], rowsAffected: 0 };
});

const mockDb = {
  execute: mockExecute,
  batch: jest.fn(async (statements: any[]) => {
    const results = [];
    for (const stmt of statements) {
      // Handle both object format and tuple format
      if (Array.isArray(stmt)) {
        // Tuple format: [sql, args]
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
  fromUnixTimestamp: (timestamp: number) => new Date(timestamp),
}));

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
  linkNoteToPost,
  unlinkNoteFromPost,
  getNoteBySharedPostId,
  getSharedNotesByUser,
  type Note,
} from '@/lib/repositories/note-repository';

describe('Note Repository (SQLITE-006)', () => {
  beforeEach(() => {
    mockNotesData.clear();
    jest.clearAllMocks();
  });

  describe('createNote', () => {
    test('should create a new note successfully', async () => {
      const note = {
        userId: 'test-user-1',
        chapterId: 27,
        selectedText: '花謝花飛花滿天',
        note: '這是林黛玉的《葬花吟》，表達了對生命無常的感慨。',
        tags: ['詩詞', '林黛玉'],
        isPublic: false,
        noteType: 'POETRY',
      };

      const noteId = await createNote(note);

      expect(noteId).toBeDefined();
      expect(noteId).toContain('note-');

      // Verify insertion in mock data
      const row = mockNotesData.get(noteId);
      expect(row).toBeDefined();
      expect(row.userId).toBe('test-user-1');
      expect(row.chapterId).toBe(27);
      expect(row.note).toBe('這是林黛玉的《葬花吟》，表達了對生命無常的感慨。');
      expect(row.isPublic).toBe(0);
      expect(row.noteType).toBe('POETRY');
    });

    test('should auto-calculate word count', async () => {
      const note = {
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'This is a test note with seven words',
      };

      const noteId = await createNote(note);
      const row = mockNotesData.get(noteId);

      // Word count should be 8: "This", "is", "a", "test", "note", "with", "seven", "words"
      expect(row.wordCount).toBe(8);
    });

    test('should handle notes without optional fields', async () => {
      const note = {
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test text',
        note: 'Simple note',
      };

      const noteId = await createNote(note);
      const row = mockNotesData.get(noteId);

      expect(row.tags).toBe('[]');
      expect(row.isPublic).toBe(0);
      expect(row.noteType).toBeNull();
    });

    test('should auto-generate unique IDs for multiple notes', async () => {
      const note = {
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test note',
      };

      const id1 = await createNote(note);
      const id2 = await createNote(note);

      expect(id1).not.toBe(id2);
    });

    test('should handle Chinese characters correctly', async () => {
      const note = {
        userId: 'test-user-1',
        chapterId: 3,
        selectedText: '賈寶玉性格分析',
        note: '賈寶玉是《紅樓夢》中的男主角，性格溫柔多情，最喜與女孩子們相處。',
        tags: ['人物分析', '賈寶玉'],
        noteType: 'CHARACTER',
      };

      const noteId = await createNote(note);
      const row = mockNotesData.get(noteId);

      expect(row.note).toBe('賈寶玉是《紅樓夢》中的男主角，性格溫柔多情，最喜與女孩子們相處。');
    });
  });

  describe('updateNoteContent', () => {
    test('should update note content and word count', async () => {
      const noteId = await createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Original content',
      });

      await updateNoteContent(noteId, 'Updated content with more words here');

      const row = mockNotesData.get(noteId);
      expect(row.note).toBe('Updated content with more words here');
      expect(row.wordCount).toBe(6);
    });

    test('should update lastModified timestamp', async () => {
      const noteId = await createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Original',
      });

      const beforeUpdate = mockNotesData.get(noteId).lastModified;

      await new Promise(resolve => setTimeout(resolve, 10));
      await updateNoteContent(noteId, 'Updated');

      const afterUpdate = mockNotesData.get(noteId).lastModified;
      expect(afterUpdate).toBeGreaterThanOrEqual(beforeUpdate);
    });
  });

  describe('getNotesByUserAndChapter', () => {
    test('should retrieve notes for a specific user and chapter', async () => {
      const now = Date.now();
      mockNotesData.set('n1', {
        id: 'n1', userId: 'test-user-1', chapterId: 27, selectedText: 'Text 1',
        note: 'Note 1', createdAt: now - 2000, lastModified: now - 2000,
        tags: '[]', isPublic: 0, wordCount: 2, noteType: null, sharedPostId: null
      });
      mockNotesData.set('n2', {
        id: 'n2', userId: 'test-user-1', chapterId: 27, selectedText: 'Text 2',
        note: 'Note 2', createdAt: now - 1000, lastModified: now - 1000,
        tags: '[]', isPublic: 0, wordCount: 2, noteType: null, sharedPostId: null
      });
      mockNotesData.set('n3', {
        id: 'n3', userId: 'test-user-1', chapterId: 28, selectedText: 'Text 3',
        note: 'Note 3', createdAt: now, lastModified: now,
        tags: '[]', isPublic: 0, wordCount: 2, noteType: null, sharedPostId: null
      });

      const notes = await getNotesByUserAndChapter('test-user-1', 27);

      expect(notes).toHaveLength(2);
      expect(notes[0].note).toBe('Note 2'); // Most recent first
      expect(notes[1].note).toBe('Note 1');
    });

    test('should return empty array when no notes exist', async () => {
      const notes = await getNotesByUserAndChapter('test-user-1', 999);
      expect(notes).toEqual([]);
    });

    test('should properly parse tags array', async () => {
      const now = Date.now();
      mockNotesData.set('n1', {
        id: 'n1', userId: 'test-user-1', chapterId: 27, selectedText: 'Text',
        note: 'Note', createdAt: now, lastModified: now,
        tags: '["tag1","tag2"]', isPublic: 0, wordCount: 1, noteType: null, sharedPostId: null
      });

      const notes = await getNotesByUserAndChapter('test-user-1', 27);

      expect(notes[0].tags).toEqual(['tag1', 'tag2']);
    });

    test('should convert isPublic to boolean', async () => {
      const now = Date.now();
      mockNotesData.set('n1', {
        id: 'n1', userId: 'test-user-1', chapterId: 27, selectedText: 'Text',
        note: 'Note', createdAt: now, lastModified: now,
        tags: '[]', isPublic: 1, wordCount: 1, noteType: null, sharedPostId: null
      });

      const notes = await getNotesByUserAndChapter('test-user-1', 27);

      expect(notes[0].isPublic).toBe(true);
    });
  });

  describe('getAllNotesByUser', () => {
    test('should retrieve all notes for a user across chapters', async () => {
      // Create notes using the repository function to ensure proper format
      await createNote({
        userId: 'test-user-1',
        chapterId: 27,
        selectedText: 'Ch27',
        note: 'Chapter 27 note',
      });
      await createNote({
        userId: 'test-user-1',
        chapterId: 28,
        selectedText: 'Ch28',
        note: 'Chapter 28 note',
      });
      await createNote({
        userId: 'test-user-1',
        chapterId: 29,
        selectedText: 'Ch29',
        note: 'Chapter 29 note',
      });

      const notes = await getAllNotesByUser('test-user-1');

      expect(notes).toHaveLength(3);
      // All notes should belong to test-user-1
      expect(notes.every(n => n.userId === 'test-user-1')).toBe(true);
    });

    test('should return empty array when user has no notes', async () => {
      const notes = await getAllNotesByUser('nonexistent-user');
      expect(notes).toEqual([]);
    });
  });

  describe('getNoteById', () => {
    test('should retrieve a note by ID', async () => {
      const now = Date.now();
      mockNotesData.set('n1', {
        id: 'n1', userId: 'test-user-1', chapterId: 27, selectedText: 'Selected',
        note: 'Test note', createdAt: now, lastModified: now,
        tags: '["tag1"]', isPublic: 1, wordCount: 2, noteType: 'GENERAL', sharedPostId: null
      });

      const note = await getNoteById('n1');

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

    test('should return null when note does not exist', async () => {
      const note = await getNoteById('nonexistent-id');
      expect(note).toBeNull();
    });
  });

  describe('deleteNote', () => {
    test('should delete a note by ID', async () => {
      const now = Date.now();
      mockNotesData.set('n1', {
        id: 'n1', userId: 'test-user-1', chapterId: 27, selectedText: 'Text',
        note: 'To be deleted', createdAt: now, lastModified: now,
        tags: '[]', isPublic: 0, wordCount: 3, noteType: null, sharedPostId: null
      });

      await deleteNote('n1');

      expect(mockNotesData.has('n1')).toBe(false);
    });

    test('should not throw error when deleting non-existent note', async () => {
      await expect(deleteNote('nonexistent-id')).resolves.not.toThrow();
    });
  });

  describe('updateNoteVisibility', () => {
    test('should update note visibility to public', async () => {
      const noteId = await createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test note',
        isPublic: false,
      });

      await updateNoteVisibility(noteId, true);

      const row = mockNotesData.get(noteId);
      expect(row.isPublic).toBe(1);
    });

    test('should update note visibility to private', async () => {
      const noteId = await createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test note',
        isPublic: true,
      });

      await updateNoteVisibility(noteId, false);

      const row = mockNotesData.get(noteId);
      expect(row.isPublic).toBe(0);
    });
  });

  describe('getPublicNotes', () => {
    test('should retrieve only public notes', async () => {
      const now = Date.now();
      mockNotesData.set('n1', {
        id: 'n1', userId: 'test-user-1', chapterId: 1, selectedText: 'Text',
        note: 'Public note 1', createdAt: now - 2000, lastModified: now - 2000,
        tags: '[]', isPublic: 1, wordCount: 3, noteType: null, sharedPostId: null
      });
      mockNotesData.set('n2', {
        id: 'n2', userId: 'test-user-1', chapterId: 1, selectedText: 'Text',
        note: 'Private note', createdAt: now - 1000, lastModified: now - 1000,
        tags: '[]', isPublic: 0, wordCount: 2, noteType: null, sharedPostId: null
      });
      mockNotesData.set('n3', {
        id: 'n3', userId: 'test-user-2', chapterId: 1, selectedText: 'Text',
        note: 'Public note 2', createdAt: now, lastModified: now,
        tags: '[]', isPublic: 1, wordCount: 3, noteType: null, sharedPostId: null
      });

      const notes = await getPublicNotes();

      expect(notes).toHaveLength(2);
      expect(notes.every(n => n.isPublic)).toBe(true);
      expect(notes[0].note).toBe('Public note 2'); // Most recent first
    });

    test('should respect limit parameter', async () => {
      const now = Date.now();
      for (let i = 0; i < 10; i++) {
        mockNotesData.set(`n${i}`, {
          id: `n${i}`, userId: 'test-user-1', chapterId: 1, selectedText: 'Text',
          note: `Note ${i}`, createdAt: now + i, lastModified: now + i,
          tags: '[]', isPublic: 1, wordCount: 2, noteType: null, sharedPostId: null
        });
      }

      const notes = await getPublicNotes(5);

      expect(notes).toHaveLength(5);
    });

    test('should return empty array when no public notes exist', async () => {
      mockNotesData.set('n1', {
        id: 'n1', userId: 'test-user-1', chapterId: 1, selectedText: 'Text',
        note: 'Private', createdAt: Date.now(), lastModified: Date.now(),
        tags: '[]', isPublic: 0, wordCount: 1, noteType: null, sharedPostId: null
      });

      const notes = await getPublicNotes();

      expect(notes).toEqual([]);
    });
  });

  describe('updateNoteTags', () => {
    test('should update note tags', async () => {
      const noteId = await createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test note',
        tags: ['old-tag'],
      });

      await updateNoteTags(noteId, ['new-tag-1', 'new-tag-2']);

      const row = mockNotesData.get(noteId);
      expect(JSON.parse(row.tags)).toEqual(['new-tag-1', 'new-tag-2']);
    });

    test('should handle empty tags array', async () => {
      const noteId = await createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test',
        tags: ['tag1', 'tag2'],
      });

      await updateNoteTags(noteId, []);

      const row = mockNotesData.get(noteId);
      expect(JSON.parse(row.tags)).toEqual([]);
    });
  });

  describe('deleteNotesByUserAndChapter', () => {
    test('should delete all notes for a user and chapter', async () => {
      const now = Date.now();
      mockNotesData.set('n1', {
        id: 'n1', userId: 'test-user-1', chapterId: 27, selectedText: 'Text',
        note: 'Note 1', createdAt: now, lastModified: now,
        tags: '[]', isPublic: 0, wordCount: 2, noteType: null, sharedPostId: null
      });
      mockNotesData.set('n2', {
        id: 'n2', userId: 'test-user-1', chapterId: 27, selectedText: 'Text',
        note: 'Note 2', createdAt: now, lastModified: now,
        tags: '[]', isPublic: 0, wordCount: 2, noteType: null, sharedPostId: null
      });
      mockNotesData.set('n3', {
        id: 'n3', userId: 'test-user-1', chapterId: 28, selectedText: 'Text',
        note: 'Note 3', createdAt: now, lastModified: now,
        tags: '[]', isPublic: 0, wordCount: 2, noteType: null, sharedPostId: null
      });

      const deletedCount = await deleteNotesByUserAndChapter('test-user-1', 27);

      expect(deletedCount).toBe(2);
      expect(mockNotesData.size).toBe(1);
      expect(mockNotesData.get('n3')).toBeDefined();
    });

    test('should return 0 when no notes match', async () => {
      const deletedCount = await deleteNotesByUserAndChapter('test-user-1', 999);
      expect(deletedCount).toBe(0);
    });
  });

  describe('batchCreateNotes', () => {
    test('should create multiple notes', async () => {
      const notes = [
        { userId: 'test-user-1', chapterId: 27, selectedText: 'Text 1', note: 'Note 1', tags: ['tag1'] },
        { userId: 'test-user-1', chapterId: 27, selectedText: 'Text 2', note: 'Note 2', isPublic: true },
        { userId: 'test-user-1', chapterId: 28, selectedText: 'Text 3', note: 'Note 3', noteType: 'POETRY' },
      ];

      const ids = await batchCreateNotes(notes);

      expect(ids).toHaveLength(3);
      expect(ids.every(id => id.startsWith('note-'))).toBe(true);
      expect(mockNotesData.size).toBe(3);
    });

    test('should return empty array for empty input', async () => {
      const ids = await batchCreateNotes([]);
      expect(ids).toEqual([]);
    });
  });

  describe('getNoteCount', () => {
    test('should count notes for a user', async () => {
      const now = Date.now();
      mockNotesData.set('n1', {
        id: 'n1', userId: 'test-user-1', chapterId: 27, selectedText: 'Text',
        note: 'Note 1', createdAt: now, lastModified: now,
        tags: '[]', isPublic: 0, wordCount: 2, noteType: null, sharedPostId: null
      });
      mockNotesData.set('n2', {
        id: 'n2', userId: 'test-user-1', chapterId: 27, selectedText: 'Text',
        note: 'Note 2', createdAt: now, lastModified: now,
        tags: '[]', isPublic: 0, wordCount: 2, noteType: null, sharedPostId: null
      });
      mockNotesData.set('n3', {
        id: 'n3', userId: 'test-user-1', chapterId: 28, selectedText: 'Text',
        note: 'Note 3', createdAt: now, lastModified: now,
        tags: '[]', isPublic: 0, wordCount: 2, noteType: null, sharedPostId: null
      });

      const totalCount = await getNoteCount('test-user-1');
      const chapter27Count = await getNoteCount('test-user-1', 27);
      const chapter28Count = await getNoteCount('test-user-1', 28);

      expect(totalCount).toBe(3);
      expect(chapter27Count).toBe(2);
      expect(chapter28Count).toBe(1);
    });

    test('should return 0 for user with no notes', async () => {
      const count = await getNoteCount('nonexistent-user');
      expect(count).toBe(0);
    });
  });

  describe('getNotesByTag', () => {
    test('should retrieve notes with a specific tag', async () => {
      const now = Date.now();
      mockNotesData.set('n1', {
        id: 'n1', userId: 'test-user-1', chapterId: 1, selectedText: 'Text',
        note: 'Note with poetry tag', createdAt: now, lastModified: now,
        tags: '["詩詞","林黛玉"]', isPublic: 0, wordCount: 4, noteType: null, sharedPostId: null
      });
      mockNotesData.set('n2', {
        id: 'n2', userId: 'test-user-1', chapterId: 1, selectedText: 'Text',
        note: 'Note with character tag', createdAt: now, lastModified: now,
        tags: '["人物"]', isPublic: 0, wordCount: 4, noteType: null, sharedPostId: null
      });

      const notes = await getNotesByTag('test-user-1', '詩詞');

      expect(notes).toHaveLength(1);
      expect(notes[0].note).toBe('Note with poetry tag');
    });

    test('should return empty array when no notes have the tag', async () => {
      const notes = await getNotesByTag('test-user-1', 'nonexistent-tag');
      expect(notes).toEqual([]);
    });
  });

  describe('updateNoteType', () => {
    test('should update note type', async () => {
      const noteId = await createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test',
        noteType: 'GENERAL',
      });

      await updateNoteType(noteId, 'POETRY');

      const row = mockNotesData.get(noteId);
      expect(row.noteType).toBe('POETRY');
    });

    test('should handle null note type', async () => {
      const noteId = await createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test',
        noteType: 'POETRY',
      });

      await updateNoteType(noteId, null);

      const row = mockNotesData.get(noteId);
      expect(row.noteType).toBeNull();
    });
  });

  describe('Task 4.9: Note-Post Sync', () => {
    describe('linkNoteToPost', () => {
      test('should set sharedPostId on note', async () => {
        const noteId = await createNote({
          userId: 'test-user-1',
          chapterId: 1,
          selectedText: 'Test selection',
          note: 'Test note for sharing',
        });

        await linkNoteToPost(noteId, 'post-123');

        const row = mockNotesData.get(noteId);
        expect(row.sharedPostId).toBe('post-123');
      });
    });

    describe('unlinkNoteFromPost', () => {
      test('should clear sharedPostId', async () => {
        const noteId = await createNote({
          userId: 'test-user-1',
          chapterId: 1,
          selectedText: 'Test',
          note: 'Linked note',
        });
        await linkNoteToPost(noteId, 'post-789');

        expect(mockNotesData.get(noteId).sharedPostId).toBe('post-789');

        await unlinkNoteFromPost(noteId);

        expect(mockNotesData.get(noteId).sharedPostId).toBeNull();
      });
    });

    describe('getNoteBySharedPostId', () => {
      test('should find note by linked post ID', async () => {
        const noteId = await createNote({
          userId: 'test-user-1',
          chapterId: 27,
          selectedText: '葬花吟',
          note: '經典詩詞分享',
        });
        await linkNoteToPost(noteId, 'shared-post-001');

        const note = await getNoteBySharedPostId('shared-post-001');

        expect(note).not.toBeNull();
        expect(note?.id).toBe(noteId);
        expect(note?.note).toBe('經典詩詞分享');
        expect(note?.sharedPostId).toBe('shared-post-001');
      });

      test('should return null when no note is linked to post', async () => {
        const note = await getNoteBySharedPostId('nonexistent-post');
        expect(note).toBeNull();
      });
    });

    describe('getSharedNotesByUser', () => {
      test('should return only notes with sharedPostId', async () => {
        const noteId1 = await createNote({
          userId: 'test-user-1',
          chapterId: 1,
          selectedText: 'Shared text',
          note: 'Shared note',
        });
        await createNote({
          userId: 'test-user-1',
          chapterId: 2,
          selectedText: 'Not shared',
          note: 'Private note',
        });
        const noteId3 = await createNote({
          userId: 'test-user-1',
          chapterId: 3,
          selectedText: 'Also shared',
          note: 'Another shared note',
        });

        await linkNoteToPost(noteId1, 'post-shared-1');
        await linkNoteToPost(noteId3, 'post-shared-2');

        const sharedNotes = await getSharedNotesByUser('test-user-1');

        expect(sharedNotes).toHaveLength(2);
        expect(sharedNotes.every(n => n.sharedPostId != null)).toBe(true);
      });

      test('should return empty array when user has no shared notes', async () => {
        await createNote({
          userId: 'test-user-1',
          chapterId: 1,
          selectedText: 'Test',
          note: 'Unshared note',
        });

        const sharedNotes = await getSharedNotesByUser('test-user-1');
        expect(sharedNotes).toEqual([]);
      });
    });
  });

  describe('Data Integrity', () => {
    test('should maintain correct timestamp data types', async () => {
      const noteId = await createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test note',
      });

      const note = await getNoteById(noteId);

      expect(note?.createdAt).toBeInstanceOf(Date);
      expect(note?.lastModified).toBeInstanceOf(Date);
    });

    test('should handle special characters in note content', async () => {
      const specialNote = '「紅樓夢」："賈寶玉、林黛玉" — 經典名著！@#$%^&*()';
      const noteId = await createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: specialNote,
      });

      const note = await getNoteById(noteId);

      expect(note?.note).toBe(specialNote);
    });

    test('should preserve tag order', async () => {
      const tags = ['tag3', 'tag1', 'tag2'];
      const noteId = await createNote({
        userId: 'test-user-1',
        chapterId: 1,
        selectedText: 'Test',
        note: 'Test',
        tags,
      });

      const note = await getNoteById(noteId);

      expect(note?.tags).toEqual(tags);
    });
  });
});
