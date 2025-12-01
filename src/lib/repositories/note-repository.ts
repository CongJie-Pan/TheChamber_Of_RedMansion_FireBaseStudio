/**
 * @fileOverview Note Repository for SQLite Database
 *
 * This module provides CRUD operations for notes using SQLite,
 * replacing Firebase Firestore note operations.
 *
 * @phase Phase 2 - SQLITE-006 - Simple Services Migration (Notes)
 */

import { getDatabase, type Client, toUnixTimestamp, fromUnixTimestamp } from '../sqlite-db';

/**
 * Note interface matching the service layer
 * Task 4.9: Added sharedPostId for bi-directional note-post linking
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
  sharedPostId?: string; // Task 4.9: Reference to community post if note is shared
}

/**
 * Note data interface for database operations
 * Task 4.9: Added sharedPostId for bi-directional note-post linking
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
  sharedPostId: string | null; // Task 4.9: Reference to community post
}

/**
 * Calculate word count for note content
 */
function calculateWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Convert database row to Note
 * Task 4.9: Added sharedPostId field
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
    sharedPostId: row.sharedPostId || undefined,
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
export async function createNote(note: Omit<Note, 'id' | 'createdAt'>): Promise<string> {
  const db = getDatabase();
  const id = generateNoteId();
  const now = Date.now();

  await db.execute({
    sql: `
    INSERT INTO notes (
      id, userId, chapterId, selectedText, note, createdAt, lastModified,
      tags, isPublic, wordCount, noteType
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    args: [
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
  ]
  });

  console.log(`✅ [NoteRepository] Created note: ${id} (user: ${note.userId}, chapter: ${note.chapterId})`);
  return id;
}

/**
 * Update note content
 *
 * Task 4.9: If the note is linked to a community post, automatically sync the post
 *
 * @param noteId - Note ID
 * @param content - New note content
 * @returns Object indicating if the linked post was synced
 */
export async function updateNoteContent(noteId: string, content: string): Promise<{ syncedPostId?: string }> {
  // Task 4.9/4.10 Debug Logging
  console.log(`📝 [NoteRepo] updateNoteContent called:`, {
    noteId,
    contentLength: content.length
  });

  const db = getDatabase();
  const now = Date.now();

  // First, get the current note to check if it has a linked post
  const note = await getNoteById(noteId);

  // Task 4.9/4.10 Debug Logging - Check for sharedPostId
  console.log(`🔍 [NoteRepo] Note sharedPostId:`, note?.sharedPostId || 'NULL - no linked post');

  await db.execute({
    sql: `
    UPDATE notes
    SET note = ?, wordCount = ?, lastModified = ?
    WHERE id = ?
  `,
    args: [
    content,
    calculateWordCount(content),
    now,
    noteId
  ]
  });

  console.log(`✅ [NoteRepo] Updated note content: ${noteId}`);

  // Task 4.9: Automatically sync the linked community post if it exists
  if (note?.sharedPostId) {
    console.log(`🔄 [NoteRepo] Found linked post, triggering auto-sync to: ${note.sharedPostId}`);
    try {
      // Import syncPostFromNote dynamically to avoid circular dependency
      const { syncPostFromNote } = await import('./community-repository');
      await syncPostFromNote(note.sharedPostId, content, note.selectedText);
      console.log(`✅ [NoteRepo] Auto-sync completed successfully:`, {
        noteId,
        postId: note.sharedPostId
      });
      return { syncedPostId: note.sharedPostId };
    } catch (error) {
      console.error(`❌ [NoteRepo] Failed to auto-sync linked post ${note.sharedPostId}:`, error);
      // Don't throw - note update succeeded, post sync is secondary
    }
  } else {
    console.log(`ℹ️ [NoteRepo] No sharedPostId, skipping community post sync`);
  }

  return {};
}

/**
 * Get notes by user ID and chapter ID
 *
 * @param userId - User ID
 * @param chapterId - Chapter ID
 * @returns Array of notes
 */
export async function getNotesByUserAndChapter(userId: string, chapterId: number): Promise<Note[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM notes
    WHERE userId = ? AND chapterId = ?
    ORDER BY createdAt DESC
  `,
    args: [userId, chapterId]
  });
  const rows = result.rows as unknown as NoteRow[];

  return rows.map(rowToNote);
}

/**
 * Get all notes by user ID across all chapters
 *
 * @param userId - User ID
 * @returns Array of notes sorted by creation date (newest first)
 */
export async function getAllNotesByUser(userId: string): Promise<Note[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM notes
    WHERE userId = ?
    ORDER BY createdAt DESC
  `,
    args: [userId]
  });
  const rows = result.rows as unknown as NoteRow[];

  return rows.map(rowToNote);
}

/**
 * Get note by ID
 *
 * @param noteId - Note ID
 * @returns Note or null if not found
 */
export async function getNoteById(noteId: string): Promise<Note | null> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM notes WHERE id = ?
  `,
    args: [noteId]
  });
  const row = result.rows[0] as unknown as NoteRow | undefined;

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
export async function deleteNote(noteId: string): Promise<void> {
  const db = getDatabase();

  await db.execute({
    sql: `DELETE FROM notes WHERE id = ?`,
    args: [noteId]
  });

  console.log(`✅ [NoteRepository] Deleted note: ${noteId}`);
}

/**
 * Update note visibility (public/private)
 *
 * @param noteId - Note ID
 * @param isPublic - Whether note is public
 */
export async function updateNoteVisibility(noteId: string, isPublic: boolean): Promise<void> {
  const db = getDatabase();

  await db.execute({
    sql: `
    UPDATE notes
    SET isPublic = ?, lastModified = ?
    WHERE id = ?
  `,
    args: [
    isPublic ? 1 : 0,
    Date.now(),
    noteId
  ]
  });

  console.log(`✅ [NoteRepository] Updated note visibility: ${noteId} (public: ${isPublic})`);
}

/**
 * Get public notes from all users
 *
 * @param limit - Maximum number of notes to fetch (default: 50)
 * @returns Array of public notes sorted by creation date (newest first)
 */
export async function getPublicNotes(limit: number = 50): Promise<Note[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM notes
    WHERE isPublic = 1
    ORDER BY createdAt DESC
    LIMIT ?
  `,
    args: [limit]
  });
  const rows = result.rows as unknown as NoteRow[];

  return rows.map(rowToNote);
}

/**
 * Update note tags
 *
 * @param noteId - Note ID
 * @param tags - Array of tag strings
 */
export async function updateNoteTags(noteId: string, tags: string[]): Promise<void> {
  const db = getDatabase();

  await db.execute({
    sql: `
    UPDATE notes
    SET tags = ?, lastModified = ?
    WHERE id = ?
  `,
    args: [
    JSON.stringify(tags),
    Date.now(),
    noteId
  ]
  });

  console.log(`✅ [NoteRepository] Updated note tags: ${noteId} (${tags.length} tags)`);
}

/**
 * Delete all notes for a user and chapter
 *
 * @param userId - User ID
 * @param chapterId - Chapter ID
 * @returns Number of notes deleted
 */
export async function deleteNotesByUserAndChapter(userId: string, chapterId: number): Promise<number> {
  const db = await getDatabase();

  const result = await db.execute({
    sql: `DELETE FROM notes WHERE userId = ? AND chapterId = ?`,
    args: [userId, chapterId]
  });

  const changes = result.rowsAffected;
  console.log(`✅ [NoteRepository] Deleted ${changes} notes for user ${userId}, chapter ${chapterId}`);
  return changes;
}

/**
 * Batch create notes
 *
 * @param notes - Array of notes to create
 * @returns Array of created note IDs
 */
export async function batchCreateNotes(notes: Array<Omit<Note, 'id' | 'createdAt'>>): Promise<string[]> {
  const db = await getDatabase();
  const ids: string[] = [];

  try {
    // Start transaction
    await db.execute('BEGIN');

    const sql = `
      INSERT INTO notes (
        id, userId, chapterId, selectedText, note, createdAt, lastModified,
        tags, isPublic, wordCount, noteType
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const note of notes) {
      const id = generateNoteId();
      const now = Date.now();

      await db.execute({
        sql,
        args: [
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
        ]
      });

      ids.push(id);
    }

    // Commit transaction
    await db.execute('COMMIT');
    console.log(`✅ [NoteRepository] Batch created ${notes.length} notes`);
    return ids;
  } catch (error) {
    // Rollback transaction on error
    await db.execute('ROLLBACK');
    console.error(`❌ [NoteRepository] Batch create failed:`, error);
    throw error;
  }
}

/**
 * Get note count for a user
 *
 * @param userId - User ID
 * @param chapterId - Optional chapter ID filter
 * @returns Note count
 */
export async function getNoteCount(userId: string, chapterId?: number): Promise<number> {
  const db = await getDatabase();

  let sql: string;
  let params: any[];

  if (chapterId !== undefined) {
    sql = `
      SELECT COUNT(*) as count
      FROM notes
      WHERE userId = ? AND chapterId = ?
    `;
    params = [userId, chapterId];
  } else {
    sql = `
      SELECT COUNT(*) as count
      FROM notes
      WHERE userId = ?
    `;
    params = [userId];
  }

  const result = await db.execute({ sql, args: params });
  const row = result.rows[0] as unknown as { count: number };
  return row.count;
}

/**
 * Get notes by tag
 *
 * @param userId - User ID
 * @param tag - Tag to search for
 * @returns Array of notes with the specified tag
 */
export async function getNotesByTag(userId: string, tag: string): Promise<Note[]> {
  const db = await getDatabase();

  // Using LIKE approach for simplicity with Turso
  const result = await db.execute({
    sql: `
      SELECT * FROM notes
      WHERE userId = ?
      AND tags LIKE ?
      ORDER BY createdAt DESC
    `,
    args: [userId, `%"${tag}"%`]
  });

  const rows = result.rows as unknown as NoteRow[];
  return rows.map(rowToNote);
}

/**
 * Update note type
 *
 * @param noteId - Note ID
 * @param noteType - Note type (general, vocabulary, character, theme, question)
 */
export async function updateNoteType(noteId: string, noteType: string | null): Promise<void> {
  const db = getDatabase();

  await db.execute({
    sql: `
    UPDATE notes
    SET noteType = ?, lastModified = ?
    WHERE id = ?
  `,
    args: [
    noteType,
    Date.now(),
    noteId
  ]
  });

  console.log(`✅ [NoteRepository] Updated note type: ${noteId} (type: ${noteType})`);
}

// ============================================================================
// Task 4.9: Note-Post Linking Functions
// ============================================================================

/**
 * Link a note to a community post
 * Task 4.9: Bi-directional note-post linking
 *
 * @param noteId - Note ID
 * @param postId - Community post ID
 */
export async function linkNoteToPost(noteId: string, postId: string): Promise<void> {
  const db = getDatabase();

  await db.execute({
    sql: `
    UPDATE notes
    SET sharedPostId = ?, lastModified = ?
    WHERE id = ?
  `,
    args: [postId, Date.now(), noteId]
  });

  console.log(`✅ [NoteRepository] Linked note ${noteId} to post ${postId}`);
}

/**
 * Unlink a note from its community post
 * Task 4.9: Remove note-post link
 *
 * @param noteId - Note ID
 */
export async function unlinkNoteFromPost(noteId: string): Promise<void> {
  const db = getDatabase();

  await db.execute({
    sql: `
    UPDATE notes
    SET sharedPostId = NULL, lastModified = ?
    WHERE id = ?
  `,
    args: [Date.now(), noteId]
  });

  console.log(`✅ [NoteRepository] Unlinked note ${noteId} from post`);
}

/**
 * Get note by its linked post ID
 * Task 4.9: Find the source note for a community post
 *
 * @param postId - Community post ID
 * @returns Note or null if not found
 */
export async function getNoteBySharedPostId(postId: string): Promise<Note | null> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `SELECT * FROM notes WHERE sharedPostId = ?`,
    args: [postId]
  });
  const row = result.rows[0] as unknown as NoteRow | undefined;

  if (!row) {
    return null;
  }

  return rowToNote(row);
}

/**
 * Get all notes that have been shared to community posts
 * Task 4.9: Get all linked notes for a user
 *
 * @param userId - User ID
 * @returns Array of notes with sharedPostId
 */
export async function getSharedNotesByUser(userId: string): Promise<Note[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM notes
    WHERE userId = ? AND sharedPostId IS NOT NULL
    ORDER BY lastModified DESC
  `,
    args: [userId]
  });
  const rows = result.rows as unknown as NoteRow[];

  return rows.map(rowToNote);
}
