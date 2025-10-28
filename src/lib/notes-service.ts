/**
 * @fileOverview Service functions for saving and retrieving user notes.
 *
 * This module provides functions to save a note and fetch notes for a specific user and chapter.
 * It is designed for integration with the Red Mansion reading system's note-taking feature.
 *
 * Supports dual-mode operation:
 * - SQLite (preferred when available)
 * - Firebase Firestore (fallback)
 *
 * @phase Phase 2 - SQLITE-006 - Simple Services Migration (Notes)
 */

import { db } from './firebase';
import { collection, addDoc, getDocs, query, where, Timestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';

// Type definition for a user note
export interface Note {
  id?: string; // Document ID (Firestore) or generated ID (SQLite)
  userId: string; // User's unique ID
  chapterId: number; // Chapter number
  selectedText: string; // The text user selected
  note: string; // The user's note content
  createdAt: Date; // Timestamp of creation
  tags?: string[]; // User-defined tags for categorization
  isPublic?: boolean; // Whether note is shared publicly
  wordCount?: number; // Calculated word count of note content
  lastModified?: Date; // Last modification timestamp
  noteType?: string; // Optional categorization (general, vocabulary, character, theme, question)
}

// Phase 2: SQLite Database Integration
// Conditional import: only load SQLite modules on server-side
// Avoid loading better-sqlite3 native module on client-side (browser)
let noteRepository: any;
let isSQLiteAvailable: any;

const SQLITE_FLAG_ENABLED = process.env.USE_SQLITE !== '0' && process.env.USE_SQLITE !== 'false';
const SQLITE_SERVER_ENABLED = typeof window === 'undefined' && SQLITE_FLAG_ENABLED;
let sqliteModulesLoaded = false;

if (SQLITE_SERVER_ENABLED) {
  try {
    noteRepository = require('./repositories/note-repository');
    const sqliteDb = require('./sqlite-db');
    isSQLiteAvailable = sqliteDb.isSQLiteAvailable;
    sqliteModulesLoaded = true;
    console.log('✅ [NotesService] SQLite modules loaded successfully');
  } catch (error: any) {
    sqliteModulesLoaded = false;
    console.warn('⚠️  [NotesService] Failed to load SQLite modules, falling back to Firebase');
    console.warn('   Run "pnpm run doctor:sqlite" to rebuild better-sqlite3 if needed.');
  }
} else if (typeof window === 'undefined') {
  console.warn('⚠️  [NotesService] USE_SQLITE flag disabled; Firebase fallback active.');
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
 * Calculate word count for note content
 * @param text - Text to count words in
 * @returns Word count
 */
function calculateWordCount(text: string): number {
  // Remove extra whitespace and count words
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Save a note for a user and chapter.
 * Uses SQLite if available, otherwise falls back to Firestore.
 *
 * @param note - Note object without id and createdAt
 * @returns The document ID of the saved note
 */
export async function saveNote(note: Omit<Note, 'id' | 'createdAt'>) {
  // Try SQLite first
  if (checkSQLiteAvailability()) {
    try {
      const noteId = noteRepository.createNote(note);
      console.log(`✅ [NotesService] Saved note to SQLite: ${noteId}`);
      return noteId;
    } catch (error: any) {
      console.error('❌ [NotesService] SQLite save failed, falling back to Firebase:', error.message);
    }
  }

  // Fallback to Firebase
  const now = Timestamp.now();
  const docRef = await addDoc(collection(db, 'notes'), {
    ...note,
    createdAt: now,
    lastModified: now,
    wordCount: calculateWordCount(note.note),
    tags: note.tags || [],
    isPublic: note.isPublic || false,
  });
  console.log(`✅ [NotesService] Saved note to Firebase: ${docRef.id}`);
  return docRef.id;
}

/**
 * Update an existing note.
 * Uses SQLite if available, otherwise falls back to Firestore.
 *
 * @param id - The document ID of the note to update
 * @param content - The new content of the note
 */
export async function updateNote(id: string, content: string) {
  // Try SQLite first
  if (checkSQLiteAvailability()) {
    try {
      noteRepository.updateNoteContent(id, content);
      console.log(`✅ [NotesService] Updated note in SQLite: ${id}`);
      return;
    } catch (error: any) {
      console.error('❌ [NotesService] SQLite update failed, falling back to Firebase:', error.message);
    }
  }

  // Fallback to Firebase
  const noteRef = doc(db, 'notes', id);
  await updateDoc(noteRef, {
    note: content,
    wordCount: calculateWordCount(content),
    lastModified: Timestamp.now(),
  });
  console.log(`✅ [NotesService] Updated note in Firebase: ${id}`);
}

/**
 * Fetch all notes for a user and chapter.
 * Uses SQLite if available, otherwise falls back to Firestore.
 *
 * @param userId - The user's unique ID
 * @param chapterId - The chapter number
 * @returns Array of Note objects
 */
export async function getNotesByUserAndChapter(userId: string, chapterId: number): Promise<Note[]> {
  // Try SQLite first
  if (checkSQLiteAvailability()) {
    try {
      const notes = noteRepository.getNotesByUserAndChapter(userId, chapterId);
      console.log(`✅ [NotesService] Retrieved ${notes.length} notes from SQLite (user: ${userId}, chapter: ${chapterId})`);
      return notes;
    } catch (error: any) {
      console.error('❌ [NotesService] SQLite retrieval failed, falling back to Firebase:', error.message);
    }
  }

  // Fallback to Firebase
  const q = query(
    collection(db, 'notes'),
    where('userId', '==', userId),
    where('chapterId', '==', chapterId)
  );
  const querySnapshot = await getDocs(q);
  const notes = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate(),
  } as Note));
  console.log(`✅ [NotesService] Retrieved ${notes.length} notes from Firebase (user: ${userId}, chapter: ${chapterId})`);
  return notes;
}

/**
 * Delete a note by ID.
 * Uses SQLite if available, otherwise falls back to Firestore.
 *
 * @param id - The note ID
 */
export async function deleteNoteById(id: string) {
  // Try SQLite first
  if (checkSQLiteAvailability()) {
    try {
      noteRepository.deleteNote(id);
      console.log(`✅ [NotesService] Deleted note from SQLite: ${id}`);
      return;
    } catch (error: any) {
      console.error('❌ [NotesService] SQLite delete failed, falling back to Firebase:', error.message);
    }
  }

  // Fallback to Firebase
  await deleteDoc(doc(db, 'notes', id));
  console.log(`✅ [NotesService] Deleted note from Firebase: ${id}`);
}

/**
 * Fetch all notes for a user across all chapters.
 * Uses SQLite if available, otherwise falls back to Firestore.
 * Used for the notes dashboard page.
 *
 * @param userId - The user's unique ID
 * @returns Array of Note objects sorted by creation date (newest first)
 */
export async function getAllNotesByUser(userId: string): Promise<Note[]> {
  // Try SQLite first
  if (checkSQLiteAvailability()) {
    try {
      const notes = noteRepository.getAllNotesByUser(userId);
      console.log(`✅ [NotesService] Retrieved ${notes.length} notes from SQLite (user: ${userId})`);
      return notes;
    } catch (error: any) {
      console.error('❌ [NotesService] SQLite retrieval failed, falling back to Firebase:', error.message);
    }
  }

  // Fallback to Firebase
  const q = query(
    collection(db, 'notes'),
    where('userId', '==', userId)
  );
  const querySnapshot = await getDocs(q);
  const notes = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate(),
    lastModified: doc.data().lastModified?.toDate() || doc.data().createdAt.toDate(),
  } as Note));

  console.log(`✅ [NotesService] Retrieved ${notes.length} notes from Firebase (user: ${userId})`);
  // Sort by creation date, newest first
  return notes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Update the visibility (public/private) of a note.
 * Uses SQLite if available, otherwise falls back to Firestore.
 *
 * @param noteId - The document ID of the note
 * @param isPublic - Whether the note should be public
 */
export async function updateNoteVisibility(noteId: string, isPublic: boolean) {
  // Try SQLite first
  if (checkSQLiteAvailability()) {
    try {
      noteRepository.updateNoteVisibility(noteId, isPublic);
      console.log(`✅ [NotesService] Updated note visibility in SQLite: ${noteId} (public: ${isPublic})`);
      return;
    } catch (error: any) {
      console.error('❌ [NotesService] SQLite update failed, falling back to Firebase:', error.message);
    }
  }

  // Fallback to Firebase
  const noteRef = doc(db, 'notes', noteId);
  await updateDoc(noteRef, {
    isPublic,
    lastModified: Timestamp.now(),
  });
  console.log(`✅ [NotesService] Updated note visibility in Firebase: ${noteId} (public: ${isPublic})`);
}

/**
 * Fetch public notes from all users for the community feed.
 * Uses SQLite if available, otherwise falls back to Firestore.
 *
 * @param limit - Maximum number of notes to fetch (default: 50)
 * @returns Array of public Note objects sorted by creation date (newest first)
 */
export async function getPublicNotes(limit: number = 50): Promise<Note[]> {
  // Try SQLite first
  if (checkSQLiteAvailability()) {
    try {
      const notes = noteRepository.getPublicNotes(limit);
      console.log(`✅ [NotesService] Retrieved ${notes.length} public notes from SQLite`);
      return notes;
    } catch (error: any) {
      console.error('❌ [NotesService] SQLite retrieval failed, falling back to Firebase:', error.message);
    }
  }

  // Fallback to Firebase
  const q = query(
    collection(db, 'notes'),
    where('isPublic', '==', true)
  );
  const querySnapshot = await getDocs(q);
  const notes = querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt.toDate(),
    lastModified: doc.data().lastModified?.toDate() || doc.data().createdAt.toDate(),
  } as Note));

  console.log(`✅ [NotesService] Retrieved ${notes.length} public notes from Firebase`);
  // Sort by creation date, newest first, and limit results
  return notes
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limit);
}

/**
 * Update note tags.
 * Uses SQLite if available, otherwise falls back to Firestore.
 *
 * @param noteId - The document ID of the note
 * @param tags - Array of tag strings
 */
export async function updateNoteTags(noteId: string, tags: string[]) {
  // Try SQLite first
  if (checkSQLiteAvailability()) {
    try {
      noteRepository.updateNoteTags(noteId, tags);
      console.log(`✅ [NotesService] Updated note tags in SQLite: ${noteId} (${tags.length} tags)`);
      return;
    } catch (error: any) {
      console.error('❌ [NotesService] SQLite update failed, falling back to Firebase:', error.message);
    }
  }

  // Fallback to Firebase
  const noteRef = doc(db, 'notes', noteId);
  await updateDoc(noteRef, {
    tags,
    lastModified: Timestamp.now(),
  });
  console.log(`✅ [NotesService] Updated note tags in Firebase: ${noteId} (${tags.length} tags)`);
} 