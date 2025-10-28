/**
 * @fileOverview Service functions for saving and retrieving user underline highlights.
 *
 * This module provides functions to save a highlight and fetch highlights for a specific user and chapter.
 * It is designed for underline (not background highlight) integration with the Red Mansion reading system.
 *
 * Supports dual-mode operation:
 * - SQLite (preferred when available)
 * - Firebase Firestore (fallback)
 *
 * @phase Phase 2 - SQLITE-005 - Simple Services Migration (Highlights)
 */

import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, Timestamp, deleteDoc, doc } from 'firebase/firestore';

// Type definition for a user highlight (underline)
export interface Highlight {
  id?: string; // Document ID (Firestore) or generated ID (SQLite)
  userId: string; // User's unique ID
  chapterId: number; // Chapter number
  selectedText: string; // The text user underlined
  createdAt: Date; // Timestamp of creation
}

// Phase 2: SQLite Database Integration
// Conditional import: only load SQLite modules on server-side
// Avoid loading better-sqlite3 native module on client-side (browser)
let highlightRepository: any;
let isSQLiteAvailable: any;

const SQLITE_FLAG_ENABLED = process.env.USE_SQLITE !== '0' && process.env.USE_SQLITE !== 'false';
const SQLITE_SERVER_ENABLED = typeof window === 'undefined' && SQLITE_FLAG_ENABLED;
let sqliteModulesLoaded = false;

if (SQLITE_SERVER_ENABLED) {
  try {
    highlightRepository = require('./repositories/highlight-repository');
    const sqliteDb = require('./sqlite-db');
    isSQLiteAvailable = sqliteDb.isSQLiteAvailable;
    sqliteModulesLoaded = true;
    console.log('✅ [HighlightService] SQLite modules loaded successfully');
  } catch (error: any) {
    sqliteModulesLoaded = false;
    console.warn('⚠️  [HighlightService] Failed to load SQLite modules, falling back to Firebase');
    console.warn('   Run "pnpm run doctor:sqlite" to rebuild better-sqlite3 if needed.');
  }
} else if (typeof window === 'undefined') {
  console.warn('⚠️  [HighlightService] USE_SQLITE flag disabled; Firebase fallback active.');
}

/**
 * Check if SQLite is available and usable in the current environment
 */
function checkSQLiteAvailability(): boolean {
  if (!SQLITE_SERVER_ENABLED) {
    return false;
  }
  if (!sqliteModulesLoaded) {
    return false;
  }
  try {
    return isSQLiteAvailable();
  } catch (error) {
    return false;
  }
}

/**
 * Save an underline highlight for a user and chapter.
 * Uses SQLite if available, otherwise falls back to Firestore.
 *
 * @param highlight - Highlight object without id and createdAt
 * @returns The document ID of the saved highlight
 */
export async function saveHighlight(highlight: Omit<Highlight, 'id' | 'createdAt'>) {
  // Try SQLite first
  if (checkSQLiteAvailability()) {
    try {
      const highlightId = highlightRepository.createHighlight(highlight);
      console.log(`✅ [HighlightService] Saved highlight to SQLite: ${highlightId}`);
      return highlightId;
    } catch (error: any) {
      console.error('❌ [HighlightService] SQLite save failed, falling back to Firebase:', error.message);
    }
  }

  // Fallback to Firebase
  const docRef = await addDoc(collection(db, 'highlights'), {
    ...highlight,
    createdAt: Timestamp.now(),
  });
  console.log(`✅ [HighlightService] Saved highlight to Firebase: ${docRef.id}`);
  return docRef.id;
}

/**
 * Fetch all underline highlights for a user and chapter.
 * Uses SQLite if available, otherwise falls back to Firestore.
 *
 * @param userId - The user's unique ID
 * @param chapterId - The chapter number
 * @returns Array of Highlight objects
 */
export async function getHighlightsByUserAndChapter(userId: string, chapterId: number): Promise<Highlight[]> {
  // Try SQLite first
  if (checkSQLiteAvailability()) {
    try {
      const highlights = highlightRepository.getHighlightsByUserAndChapter(userId, chapterId);
      console.log(`✅ [HighlightService] Retrieved ${highlights.length} highlights from SQLite (user: ${userId}, chapter: ${chapterId})`);
      return highlights;
    } catch (error: any) {
      console.error('❌ [HighlightService] SQLite retrieval failed, falling back to Firebase:', error.message);
    }
  }

  // Fallback to Firebase
  const q = query(
    collection(db, 'highlights'),
    where('userId', '==', userId),
    where('chapterId', '==', chapterId)
  );
  const querySnapshot = await getDocs(q);
  const highlights = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate(),
  } as Highlight));
  console.log(`✅ [HighlightService] Retrieved ${highlights.length} highlights from Firebase (user: ${userId}, chapter: ${chapterId})`);
  return highlights;
}

/**
 * Delete a highlight by ID.
 * Uses SQLite if available, otherwise falls back to Firestore.
 *
 * @param id - The highlight ID
 */
export async function deleteHighlightById(id: string) {
  // Try SQLite first
  if (checkSQLiteAvailability()) {
    try {
      highlightRepository.deleteHighlight(id);
      console.log(`✅ [HighlightService] Deleted highlight from SQLite: ${id}`);
      return;
    } catch (error: any) {
      console.error('❌ [HighlightService] SQLite delete failed, falling back to Firebase:', error.message);
    }
  }

  // Fallback to Firebase
  await deleteDoc(doc(db, 'highlights', id));
  console.log(`✅ [HighlightService] Deleted highlight from Firebase: ${id}`);
} 