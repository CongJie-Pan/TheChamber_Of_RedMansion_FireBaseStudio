/**
 * @fileOverview Service functions for saving and retrieving user notes.
 *
 * This module provides functions to save a note and fetch notes for a specific user and chapter.
 * It is designed for integration with the Red Mansion reading system's note-taking feature.
 *
 * **SQLITE-025**: Migrated to SQLite-only (Firebase removed)
 * - Uses SQLite database exclusively via note-repository
 * - No Firebase/Firestore fallback
 *
 * @phase Phase 2 - SQLITE-006 - Simple Services Migration (Notes)
 * @updated SQLITE-025 - Firebase removal
 */

// Type definition for a user note
export interface Note {
  id?: string; // Generated ID from SQLite
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

// SQLite Database Integration
// Standard ESM imports - these are resolved at build time by Next.js
// The @libsql/client is excluded from client bundles via next.config.ts serverComponentsExternalPackages
import * as noteRepository from './repositories/note-repository';

const SQLITE_SERVER_ENABLED = typeof window === 'undefined';

// Log initialization status on server-side only
if (typeof window === 'undefined') {
  console.log('✅ [NotesService] SQLite modules loaded successfully');
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
 * SQLite-only operation.
 *
 * @param note - Note object without id and createdAt
 * @returns The document ID of the saved note
 */
export async function saveNote(note: Omit<Note, 'id' | 'createdAt'>) {
  if (!SQLITE_SERVER_ENABLED) {
    throw new Error('[NotesService] Cannot save note: SQLite only available server-side');
  }

  const noteId = noteRepository.createNote(note);
  console.log(`✅ [NotesService] Saved note to SQLite: ${noteId}`);
  return noteId;
}

/**
 * Update an existing note.
 * SQLite-only operation.
 *
 * @param id - The document ID of the note to update
 * @param content - The new content of the note
 */
export async function updateNote(id: string, content: string) {
  if (!SQLITE_SERVER_ENABLED) {
    throw new Error('[NotesService] Cannot update note: SQLite only available server-side');
  }

  noteRepository.updateNoteContent(id, content);
  console.log(`✅ [NotesService] Updated note in SQLite: ${id}`);
}

/**
 * Fetch all notes for a user and chapter.
 * SQLite-only operation.
 *
 * @param userId - The user's unique ID
 * @param chapterId - The chapter number
 * @returns Array of Note objects
 */
export async function getNotesByUserAndChapter(userId: string, chapterId: number): Promise<Note[]> {
  if (!SQLITE_SERVER_ENABLED) {
    throw new Error('[NotesService] Cannot get notes: SQLite only available server-side');
  }

  const notes = await noteRepository.getNotesByUserAndChapter(userId, chapterId);
  console.log(`✅ [NotesService] Retrieved ${notes.length} notes from SQLite (user: ${userId}, chapter: ${chapterId})`);
  return notes;
}

/**
 * Delete a note by ID.
 * SQLite-only operation.
 *
 * @param id - The note ID
 */
export async function deleteNoteById(id: string) {
  if (!SQLITE_SERVER_ENABLED) {
    throw new Error('[NotesService] Cannot delete note: SQLite only available server-side');
  }

  noteRepository.deleteNote(id);
  console.log(`✅ [NotesService] Deleted note from SQLite: ${id}`);
}

/**
 * Fetch all notes for a user across all chapters.
 * SQLite-only operation.
 * Used for the notes dashboard page.
 *
 * @param userId - The user's unique ID
 * @returns Array of Note objects sorted by creation date (newest first)
 */
export async function getAllNotesByUser(userId: string): Promise<Note[]> {
  if (!SQLITE_SERVER_ENABLED) {
    throw new Error('[NotesService] Cannot get notes: SQLite only available server-side');
  }

  const notes = await noteRepository.getAllNotesByUser(userId);
  console.log(`✅ [NotesService] Retrieved ${notes.length} notes from SQLite (user: ${userId})`);
  return notes;
}

/**
 * Update the visibility (public/private) of a note.
 * SQLite-only operation.
 *
 * @param noteId - The document ID of the note
 * @param isPublic - Whether the note should be public
 */
export async function updateNoteVisibility(noteId: string, isPublic: boolean) {
  if (!SQLITE_SERVER_ENABLED) {
    throw new Error('[NotesService] Cannot update note visibility: SQLite only available server-side');
  }

  noteRepository.updateNoteVisibility(noteId, isPublic);
  console.log(`✅ [NotesService] Updated note visibility in SQLite: ${noteId} (public: ${isPublic})`);
}

/**
 * Fetch public notes from all users for the community feed.
 * SQLite-only operation.
 *
 * @param limit - Maximum number of notes to fetch (default: 50)
 * @returns Array of public Note objects sorted by creation date (newest first)
 */
export async function getPublicNotes(limit: number = 50): Promise<Note[]> {
  if (!SQLITE_SERVER_ENABLED) {
    throw new Error('[NotesService] Cannot get public notes: SQLite only available server-side');
  }

  const notes = await noteRepository.getPublicNotes(limit);
  console.log(`✅ [NotesService] Retrieved ${notes.length} public notes from SQLite`);
  return notes;
}

/**
 * Update note tags.
 * SQLite-only operation.
 *
 * @param noteId - The document ID of the note
 * @param tags - Array of tag strings
 */
export async function updateNoteTags(noteId: string, tags: string[]) {
  if (!SQLITE_SERVER_ENABLED) {
    throw new Error('[NotesService] Cannot update note tags: SQLite only available server-side');
  }

  noteRepository.updateNoteTags(noteId, tags);
  console.log(`✅ [NotesService] Updated note tags in SQLite: ${noteId} (${tags.length} tags)`);
}
