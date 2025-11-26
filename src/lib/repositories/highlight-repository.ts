/**
 * @fileOverview Highlight Repository for SQLite Database
 *
 * This module provides CRUD operations for highlights using SQLite,
 * replacing Firebase Firestore highlight operations.
 *
 * @phase Phase 2 - SQLITE-005 - Simple Services Migration (Highlights)
 */

import { getDatabase, type Client, toUnixTimestamp, fromUnixTimestamp } from '../sqlite-db';

/**
 * Highlight interface matching the service layer
 */
export interface Highlight {
  id?: string;
  userId: string;
  chapterId: number;
  selectedText: string;
  createdAt: Date;
}

/**
 * Highlight data interface for database operations
 */
interface HighlightRow {
  id: string;
  userId: string;
  chapterId: number;
  selectedText: string;
  createdAt: number;
}

/**
 * Convert database row to Highlight
 */
function rowToHighlight(row: HighlightRow): Highlight {
  return {
    id: row.id,
    userId: row.userId,
    chapterId: row.chapterId,
    selectedText: row.selectedText,
    createdAt: new Date(row.createdAt),
  };
}

/**
 * Generate unique highlight ID
 */
function generateHighlightId(): string {
  return `highlight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create a new highlight
 *
 * @param highlight - Highlight data without id and createdAt
 * @returns Created highlight ID
 */
export async function createHighlight(
  highlight: Omit<Highlight, 'id' | 'createdAt'>
): Promise<string> {
  const db = getDatabase();
  const id = generateHighlightId();
  const now = Date.now();

  await db.execute({
    sql: `
    INSERT INTO highlights (
      id, userId, chapterId, selectedText, createdAt
    ) VALUES (?, ?, ?, ?, ?)
  `,
    args: [
    id,
    highlight.userId,
    highlight.chapterId,
    highlight.selectedText,
    now
  ]
  });

  console.log(`✅ [HighlightRepository] Created highlight: ${id} (user: ${highlight.userId}, chapter: ${highlight.chapterId})`);
  return id;
}

/**
 * Get highlights by user ID and chapter ID
 *
 * @param userId - User ID
 * @param chapterId - Chapter ID
 * @returns Array of highlights
 */
export async function getHighlightsByUserAndChapter(
  userId: string,
  chapterId: number
): Promise<Highlight[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM highlights
    WHERE userId = ? AND chapterId = ?
    ORDER BY createdAt DESC
  `,
    args: [userId, chapterId]
  });
  const rows = result.rows as unknown as HighlightRow[];

  return rows.map(rowToHighlight);
}

/**
 * Get highlight by ID
 *
 * @param highlightId - Highlight ID
 * @returns Highlight or null if not found
 */
export async function getHighlightById(highlightId: string): Promise<Highlight | null> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM highlights WHERE id = ?
  `,
    args: [highlightId]
  });
  const row = result.rows[0] as unknown as HighlightRow | undefined;

  if (!row) {
    return null;
  }

  return rowToHighlight(row);
}

/**
 * Get all highlights by user ID
 *
 * @param userId - User ID
 * @returns Array of highlights across all chapters
 */
export async function getHighlightsByUser(userId: string): Promise<Highlight[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM highlights
    WHERE userId = ?
    ORDER BY createdAt DESC
  `,
    args: [userId]
  });
  const rows = result.rows as unknown as HighlightRow[];

  return rows.map(rowToHighlight);
}

/**
 * Delete highlight by ID
 *
 * @param highlightId - Highlight ID
 */
export async function deleteHighlight(highlightId: string): Promise<void> {
  const db = getDatabase();

  await db.execute({
    sql: `DELETE FROM highlights WHERE id = ?`,
    args: [highlightId]
  });

  console.log(`✅ [HighlightRepository] Deleted highlight: ${highlightId}`);
}

/**
 * Delete all highlights for a user and chapter
 *
 * @param userId - User ID
 * @param chapterId - Chapter ID
 * @returns Number of highlights deleted
 */
export async function deleteHighlightsByUserAndChapter(
  userId: string,
  chapterId: number
): Promise<number> {
  const db = await getDatabase();

  const result = await db.execute({
    sql: `DELETE FROM highlights WHERE userId = ? AND chapterId = ?`,
    args: [userId, chapterId]
  });

  const changes = result.rowsAffected;
  console.log(`✅ [HighlightRepository] Deleted ${changes} highlights for user ${userId}, chapter ${chapterId}`);
  return changes;
}

/**
 * Batch create highlights
 *
 * @param highlights - Array of highlights to create
 * @returns Array of created highlight IDs
 */
export async function batchCreateHighlights(
  highlights: Array<Omit<Highlight, 'id' | 'createdAt'>>
): Promise<string[]> {
  const db = await getDatabase();
  const ids: string[] = [];

  try {
    // Start transaction
    await db.execute('BEGIN');

    const sql = `
      INSERT INTO highlights (
        id, userId, chapterId, selectedText, createdAt
      ) VALUES (?, ?, ?, ?, ?)
    `;

    for (const highlight of highlights) {
      const id = generateHighlightId();
      const now = Date.now();

      await db.execute({
        sql,
        args: [
          id,
          highlight.userId,
          highlight.chapterId,
          highlight.selectedText,
          now
        ]
      });

      ids.push(id);
    }

    // Commit transaction
    await db.execute('COMMIT');
    console.log(`✅ [HighlightRepository] Batch created ${highlights.length} highlights`);
    return ids;
  } catch (error) {
    // Rollback transaction on error
    await db.execute('ROLLBACK');
    console.error(`❌ [HighlightRepository] Batch create failed:`, error);
    throw error;
  }
}

/**
 * Get highlight count for a user
 *
 * @param userId - User ID
 * @param chapterId - Optional chapter ID filter
 * @returns Highlight count
 */
export async function getHighlightCount(userId: string, chapterId?: number): Promise<number> {
  const db = await getDatabase();

  let sql: string;
  let params: any[];

  if (chapterId !== undefined) {
    sql = `
      SELECT COUNT(*) as count
      FROM highlights
      WHERE userId = ? AND chapterId = ?
    `;
    params = [userId, chapterId];
  } else {
    sql = `
      SELECT COUNT(*) as count
      FROM highlights
      WHERE userId = ?
    `;
    params = [userId];
  }

  const result = await db.execute({ sql, args: params });
  const row = result.rows[0] as unknown as { count: number };
  return row.count;
}
