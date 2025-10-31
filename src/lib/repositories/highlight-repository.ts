/**
 * @fileOverview Highlight Repository for SQLite Database
 *
 * This module provides CRUD operations for highlights using SQLite,
 * replacing Firebase Firestore highlight operations.
 *
 * @phase Phase 2 - SQLITE-005 - Simple Services Migration (Highlights)
 */

import { getDatabase, toUnixTimestamp, fromUnixTimestamp } from '../sqlite-db';

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
export function createHighlight(
  highlight: Omit<Highlight, 'id' | 'createdAt'>
): string {
  const db = getDatabase();
  const id = generateHighlightId();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO highlights (
      id, userId, chapterId, selectedText, createdAt
    ) VALUES (?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    highlight.userId,
    highlight.chapterId,
    highlight.selectedText,
    now
  );

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
export function getHighlightsByUserAndChapter(
  userId: string,
  chapterId: number
): Highlight[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM highlights
    WHERE userId = ? AND chapterId = ?
    ORDER BY createdAt DESC
  `);

  const rows = stmt.all(userId, chapterId) as HighlightRow[];

  return rows.map(rowToHighlight);
}

/**
 * Get highlight by ID
 *
 * @param highlightId - Highlight ID
 * @returns Highlight or null if not found
 */
export function getHighlightById(highlightId: string): Highlight | null {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM highlights WHERE id = ?
  `);

  const row = stmt.get(highlightId) as HighlightRow | undefined;

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
export function getHighlightsByUser(userId: string): Highlight[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM highlights
    WHERE userId = ?
    ORDER BY createdAt DESC
  `);

  const rows = stmt.all(userId) as HighlightRow[];

  return rows.map(rowToHighlight);
}

/**
 * Delete highlight by ID
 *
 * @param highlightId - Highlight ID
 */
export function deleteHighlight(highlightId: string): void {
  const db = getDatabase();

  const stmt = db.prepare(`DELETE FROM highlights WHERE id = ?`);
  stmt.run(highlightId);

  console.log(`✅ [HighlightRepository] Deleted highlight: ${highlightId}`);
}

/**
 * Delete all highlights for a user and chapter
 *
 * @param userId - User ID
 * @param chapterId - Chapter ID
 * @returns Number of highlights deleted
 */
export function deleteHighlightsByUserAndChapter(
  userId: string,
  chapterId: number
): number {
  const db = getDatabase();

  const stmt = db.prepare(`
    DELETE FROM highlights
    WHERE userId = ? AND chapterId = ?
  `);

  const result = stmt.run(userId, chapterId);

  console.log(`✅ [HighlightRepository] Deleted ${result.changes} highlights for user ${userId}, chapter ${chapterId}`);
  return result.changes;
}

/**
 * Batch create highlights
 *
 * @param highlights - Array of highlights to create
 * @returns Array of created highlight IDs
 */
export function batchCreateHighlights(
  highlights: Array<Omit<Highlight, 'id' | 'createdAt'>>
): string[] {
  const db = getDatabase();
  const ids: string[] = [];

  const insertMany = db.transaction((highlightsToInsert: Array<Omit<Highlight, 'id' | 'createdAt'>>) => {
    const stmt = db.prepare(`
      INSERT INTO highlights (
        id, userId, chapterId, selectedText, createdAt
      ) VALUES (?, ?, ?, ?, ?)
    `);

    for (const highlight of highlightsToInsert) {
      const id = generateHighlightId();
      const now = Date.now();

      stmt.run(
        id,
        highlight.userId,
        highlight.chapterId,
        highlight.selectedText,
        now
      );

      ids.push(id);
    }
  });

  insertMany(highlights);

  console.log(`✅ [HighlightRepository] Batch created ${highlights.length} highlights`);
  return ids;
}

/**
 * Get highlight count for a user
 *
 * @param userId - User ID
 * @param chapterId - Optional chapter ID filter
 * @returns Highlight count
 */
export function getHighlightCount(userId: string, chapterId?: number): number {
  const db = getDatabase();

  let stmt;
  let params: any[];

  if (chapterId !== undefined) {
    stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM highlights
      WHERE userId = ? AND chapterId = ?
    `);
    params = [userId, chapterId];
  } else {
    stmt = db.prepare(`
      SELECT COUNT(*) as count
      FROM highlights
      WHERE userId = ?
    `);
    params = [userId];
  }

  const result = stmt.get(...params) as { count: number };
  return result.count;
}
