/**
 * @fileOverview Service functions for saving and retrieving user underline highlights.
 *
 * This module provides functions to save a highlight and fetch highlights for a specific user and chapter.
 * It is designed for underline (not background highlight) integration with the Red Mansion reading system.
 *
 * **SQLITE-025**: Migrated to SQLite-only (Firebase removed)
 * - Uses SQLite database exclusively via highlight-repository
 * - No Firebase/Firestore fallback
 *
 * @phase Phase 2 - SQLITE-005 - Simple Services Migration (Highlights)
 * @updated SQLITE-025 - Firebase removal
 */

// Type definition for a user highlight (underline)
export interface Highlight {
  id?: string; // Generated ID from SQLite
  userId: string; // User's unique ID
  chapterId: number; // Chapter number
  selectedText: string; // The text user underlined
  createdAt: Date; // Timestamp of creation
}

// SQLite Database Integration
// Conditional import: only load SQLite modules on server-side
// Avoid loading better-sqlite3 native module on client-side (browser)
let highlightRepository: any;

const SQLITE_SERVER_ENABLED = typeof window === 'undefined';

if (SQLITE_SERVER_ENABLED) {
  try {
    highlightRepository = require('./repositories/highlight-repository');
    console.log('✅ [HighlightService] SQLite modules loaded successfully');
  } catch (error: any) {
    console.error('❌ [HighlightService] Failed to load SQLite modules');
    console.error('   Run "pnpm run doctor:sqlite" to rebuild better-sqlite3.');
    throw new Error(
      'Failed to load SQLite modules. Run "pnpm run doctor:sqlite" to diagnose the environment.'
    );
  }
}

/**
 * Save an underline highlight for a user and chapter.
 * SQLite-only operation.
 *
 * @param highlight - Highlight object without id and createdAt
 * @returns The document ID of the saved highlight
 */
export async function saveHighlight(highlight: Omit<Highlight, 'id' | 'createdAt'>) {
  if (!SQLITE_SERVER_ENABLED) {
    throw new Error('[HighlightService] Cannot save highlight: SQLite only available server-side');
  }

  const highlightId = highlightRepository.createHighlight(highlight);
  console.log(`✅ [HighlightService] Saved highlight to SQLite: ${highlightId}`);
  return highlightId;
}

/**
 * Fetch all underline highlights for a user and chapter.
 * SQLite-only operation.
 *
 * @param userId - The user's unique ID
 * @param chapterId - The chapter number
 * @returns Array of Highlight objects
 */
export async function getHighlightsByUserAndChapter(userId: string, chapterId: number): Promise<Highlight[]> {
  if (!SQLITE_SERVER_ENABLED) {
    throw new Error('[HighlightService] Cannot get highlights: SQLite only available server-side');
  }

  const highlights = highlightRepository.getHighlightsByUserAndChapter(userId, chapterId);
  console.log(`✅ [HighlightService] Retrieved ${highlights.length} highlights from SQLite (user: ${userId}, chapter: ${chapterId})`);
  return highlights;
}

/**
 * Delete a highlight by ID.
 * SQLite-only operation.
 *
 * @param id - The highlight ID
 */
export async function deleteHighlightById(id: string) {
  if (!SQLITE_SERVER_ENABLED) {
    throw new Error('[HighlightService] Cannot delete highlight: SQLite only available server-side');
  }

  highlightRepository.deleteHighlight(id);
  console.log(`✅ [HighlightService] Deleted highlight from SQLite: ${id}`);
}
