/**
 * @fileOverview Shared type definitions for Notes API
 *
 * These types are safe for both client and server-side imports.
 * They define the contract between client components and server-side API routes.
 *
 * IMPORTANT: This file must NOT import any server-only dependencies
 * (e.g., better-sqlite3, node:fs, etc.) to avoid webpack bundling issues.
 *
 * @created 2025-10-30
 * @phase SQLITE-026 - Client-Server Separation
 */

/**
 * Note entity structure
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
 * Request payload for creating a note
 */
export interface CreateNoteRequest {
  userId: string;
  chapterId: number;
  selectedText: string;
  note: string;
  tags?: string[];
  isPublic?: boolean;
  noteType?: string;
}

/**
 * Response from creating a note
 */
export interface CreateNoteResponse {
  success: boolean;
  noteId?: string;
  error?: string;
  details?: any;
}

/**
 * Request payload for updating a note
 */
export interface UpdateNoteRequest {
  id: string;
  content: string;
}

/**
 * Response from updating a note
 */
export interface UpdateNoteResponse {
  success: boolean;
  error?: string;
  details?: any;
}

/**
 * Request payload for updating note visibility
 */
export interface UpdateNoteVisibilityRequest {
  id: string;
  isPublic: boolean;
}

/**
 * Response from updating note visibility
 */
export interface UpdateNoteVisibilityResponse {
  success: boolean;
  error?: string;
  details?: any;
}

/**
 * Response from getting notes
 */
export interface GetNotesResponse {
  success: boolean;
  notes?: Note[];
  error?: string;
  details?: any;
}

/**
 * Response from deleting a note
 */
export interface DeleteNoteResponse {
  success: boolean;
  error?: string;
  details?: any;
}
