/**
 * @fileOverview Note Repository for SQLite Database
 *
 * This module provides CRUD operations for notes using SQLite,
 * replacing Firebase Firestore note operations.
 *
 * @phase Phase 2 - SQLITE-006 - Simple Services Migration (Notes)
 */

import { getDatabase, toUnixTimestamp, fromUnixTimestamp } from '../sqlite-db';

/**
 * Note interface matching the service layer
 */
export interface Note {
  id?: string;
  userId: string;
  chapterId: number;
  selectedText: string;
  note: string;
  createdAt: Date;
  tags?: string[];
  isPublic?: boolean;
  wordCount?: number;
  lastModified?: Date;
  noteType?: string;
}

/**
 * Note data interface for database operations
 */
interface NoteRow {
  id: string;
  userId: string;
  chapterId: number;
  selectedText: string;
  note: string;
  createdAt: number;
  lastModified: number;
  tags: string | null; // JSON array
  isPublic: number; // SQLite boolean (0 or 1)
  wordCount: number;
  noteType: string | null;
}

/**
 * Calculate word count for note content
 */
function calculateWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Convert database row to Note
 */
function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    userId: row.userId,
    chapterId: row.chapterId,
    selectedText: row.selectedText,
    note: row.note,
    createdAt: new Date(row.createdAt),
    lastModified: new Date(row.lastModified),
    tags: row.tags ? JSON.parse(row.tags) : [],
    isPublic: row.isPublic === 1,
    wordCount: row.wordCount,
    noteType: row.noteType || undefined,
  };
}

/**
 * Generate unique note ID
 */
function generateNoteId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new note
 *
 * @param note - Note data without id and createdAt
 * @returns Created note ID
 */
export function createNote(note: Omit<Note, 'id' | 'createdAt'>): string {
  const db = getDatabase();
  const id = generateNoteId();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO notes (
      id, userId, chapterId, selectedText, note, createdAt, lastModified,
      tags, isPublic, wordCount, noteType
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    note.userId,
    note.chapterId,
    note.selectedText,
    note.note,
    now,
    now,
    JSON.stringify(note.tags || []),
    note.isPublic ? 1 : 0,
    calculateWordCount(note.note),
    note.noteType || null
  );

  console.log(`✅ [NoteRepository] Created note: ${id} (user: ${note.userId}, chapter: ${note.chapterId})`);
  return id;
}

/**
 * Update note content
 *
 * @param noteId - Note ID
 * @param content - New note content
 */
export function updateNoteContent(noteId: string, content: string): void {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE notes
    SET note = ?, wordCount = ?, lastModified = ?
    WHERE id = ?
  `);

  stmt.run(
    content,
    calculateWordCount(content),
    Date.now(),
    noteId
  );

  console.log(`✅ [NoteRepository] Updated note content: ${noteId}`);
}

/**
 * Get notes by user ID and chapter ID
 *
 * @param userId - User ID
 * @param chapterId - Chapter ID
 * @returns Array of notes
 */
export function getNotesByUserAndChapter(userId: string, chapterId: number): Note[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM notes
    WHERE userId = ? AND chapterId = ?
    ORDER BY createdAt DESC
  `);

  const rows = stmt.all(userId, chapterId) as NoteRow[];

  return rows.map(rowToNote);
}

/**
 * Get all notes by user ID across all chapters
 *
 * @param userId - User ID
 * @returns Array of notes sorted by creation date (newest first)
 */
export function getAllNotesByUser(userId: string): Note[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM notes
    WHERE userId = ?
    ORDER BY createdAt DESC
  `);

  const rows = stmt.all(userId) as NoteRow[];

  return rows.map(rowToNote);
}

/**
 * Get note by ID
 *
 * @param noteId - Note ID
 * @returns Note or null if not found
 */
export function getNoteById(noteId: string): Note | null {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM notes WHERE id = ?
  `);

  const row = stmt.get(noteId) as NoteRow | undefined;

  if (!row) {
    return null;
  }

  return rowToNote(row);
}

/**
 * Delete note by ID
 *
 * @param noteId - Note ID
 */
export function deleteNote(noteId: string): void {
  const db = getDatabase();

  const stmt = db.prepare(`DELETE FROM notes WHERE id = ?`);
  stmt.run(noteId);

  console.log(`✅ [NoteRepository] Deleted note: ${noteId}`);
}

/**
 * Update note visibility (public/private)
 *
 * @param noteId - Note ID
 * @param isPublic - Whether note is public
 */
export function updateNoteVisibility(noteId: string, isPublic: boolean): void {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE notes
    SET isPublic = ?, lastModified = ?
    WHERE id = ?
  `);

  stmt.run(
    isPublic ? 1 : 0,
    Date.now(),
    noteId
  );

  console.log(`✅ [NoteRepository] Updated note visibility: ${noteId} (public: ${isPublic})`);
}

/**
 * Get public notes from all users
 *
 * @param limit - Maximum number of notes to fetch (default: 50)
 * @returns Array of public notes sorted by creation date (newest first)
 */
export function getPublicNotes(limit: number = 50): Note[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM notes
    WHERE isPublic = 1
    ORDER BY createdAt DESC
    LIMIT ?
  `);

  const rows = stmt.all(limit) as NoteRow[];

  return rows.map(rowToNote);
}

/**
 * Update note tags
 *
 * @param noteId - Note ID
 * @param tags - Array of tag strings
 */
export function updateNoteTags(noteId: string, tags: string[]): void {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE notes
    SET tags = ?, lastModified = ?
    WHERE id = ?
  `);

  stmt.run(
    JSON.stringify(tags),
    Date.now(),
    noteId
  );

  console.log(`✅ [NoteRepository] Updated note tags: ${noteId} (${tags.length} tags)`);
}

/**
 * Delete all notes for a user and chapter
 *
 * @param userId - User ID
 * @param chapterId - Chapter ID
 * @returns Number of notes deleted
 */
export function deleteNotesByUserAndChapter(userId: string, chapterId: number): number {
  const db = getDatabase();

  const stmt = db.prepare(`
    DELETE FROM notes
    WHERE userId = ? AND chapterId = ?
  `);

  const result = stmt.run(userId, chapterId);

  console.log(`✅ [NoteRepository] Deleted ${result.changes} notes for user ${userId}, chapter ${chapterId}`);
  return result.changes;
}

/**
 * Batch create notes
 *
 * @param notes - Array of notes to create
 * @returns Array of created note IDs
 */
export function batchCreateNotes(notes: Array<Omit<Note, 'id' | 'createdAt'>>): string[] {
  const db = getDatabase();
  const ids: string[] = [];

  const insertMany = db.transaction((notesToInsert: Array<Omit<Note, 'id' | 'createdAt'>>) => {
    const stmt = db.prepare(`
      INSERT INTO notes (
        id, userId, chapterId, selectedText, note, createdAt, lastModified,
        tags, isPublic, wordCount, noteType
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const note of notesToInsert) {
      const id = generateNoteId();
      const now = Date.now();

      stmt.run(
        id,
        note.userId,
        note.chapterId,
        note.selectedText,
        note.note,
        now,
        now,
        JSON.stringify(note.tags || []),
        note.isPublic ? 1 : 0,
        calculateWordCount(note.note),
        note.noteType || null
      );

      ids.push(id);
    }
  });

  insertMany(notes);

  console.log(`✅ [NoteRepository] Batch created ${notes.length} notes`);
  return ids;
}

/**
 * Get note count for a user
 *
 * @param userId - User ID
 * @param chapterId - Optional chapter ID filter
 * @returns Note count
 */
export function getNoteCount(userId: string, chapterId?: number): number {
  const db = getDatabase();

  let stmt;
  let params: any[];

  if (chapterId !== undefined) {
    stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM notes
      WHERE userId = ? AND chapterId = ?
    `);
    params = [userId, chapterId];
  } else {
    stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM notes
      WHERE userId = ?
    `);
    params = [userId];
  }

  const result = stmt.get(...params) as { count: number };
  return result.count;
}

/**
 * Get notes by tag
 *
 * @param userId - User ID
 * @param tag - Tag to search for
 * @returns Array of notes with the specified tag
 */
export function getNotesByTag(userId: string, tag: string): Note[] {
  const db = getDatabase();

  // SQLite JSON functions to search within JSON array
  const stmt = db.prepare(`
    SELECT * FROM notes
    WHERE userId = ?
    AND json_each.value = ?
    AND json_each.key IN (SELECT key FROM json_each(notes.tags))
    ORDER BY createdAt DESC
  `);

  // Alternative simpler approach using LIKE (works but less precise)
  const altStmt = db.prepare(`
    SELECT * FROM notes
    WHERE userId = ?
    AND tags LIKE ?
    ORDER BY createdAt DESC
  `);

  const rows = altStmt.all(userId, `%"${tag}"%`) as NoteRow[];

  return rows.map(rowToNote);
}

/**
 * Update note type
 *
 * @param noteId - Note ID
 * @param noteType - Note type (general, vocabulary, character, theme, question)
 */
export function updateNoteType(noteId: string, noteType: string | null): void {
  const db = getDatabase();

  const stmt = db.prepare(`
    UPDATE notes
    SET noteType = ?, lastModified = ?
    WHERE id = ?
  `);

  stmt.run(
    noteType,
    Date.now(),
    noteId
  );

  console.log(`✅ [NoteRepository] Updated note type: ${noteId} (type: ${noteType})`);
}
