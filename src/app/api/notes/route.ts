/**
 * @fileOverview Notes API Routes
 *
 * CRUD endpoints for user notes
 * This API is called from client components to avoid loading SQLite on the browser
 *
 * @phase SQLITE-026 - Client-Server Separation
 * @created 2025-10-30
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import {
  saveNote,
  getNotesByUserAndChapter,
  updateNote,
  deleteNoteById,
  updateNoteVisibility,
} from '@/lib/notes-service';
import { z } from 'zod';
import type {
  CreateNoteRequest,
  CreateNoteResponse,
  GetNotesResponse,
  UpdateNoteRequest,
  UpdateNoteResponse,
  DeleteNoteResponse,
} from '@/types/notes-api';

/**
 * Zod schema for creating a note
 */
const CreateNoteSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  chapterId: z.number().int().positive('Chapter ID must be positive'),
  selectedText: z.string().min(1, 'Selected text is required'),
  note: z.string().min(1, 'Note content is required').max(10000, 'Note too long'),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  noteType: z.string().optional(),
});

/**
 * Zod schema for updating a note
 */
const UpdateNoteSchema = z.object({
  id: z.string().min(1, 'Note ID is required'),
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
});

/**
 * GET /api/notes
 *
 * Fetches notes for a user and chapter
 *
 * Query Parameters:
 * - userId: string (required)
 * - chapterId: number (required)
 *
 * Returns:
 * - GetNotesResponse with array of notes
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Please log in',
        } as GetNotesResponse,
        { status: 401 }
      );
    }

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const chapterIdStr = searchParams.get('chapterId');

    if (!userId || !chapterIdStr) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing userId or chapterId parameter',
        } as GetNotesResponse,
        { status: 400 }
      );
    }

    const chapterId = parseInt(chapterIdStr, 10);
    if (isNaN(chapterId)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid chapterId - must be a number',
        } as GetNotesResponse,
        { status: 400 }
      );
    }

    // 3. Authorization check - users can only fetch their own notes
    if (userId !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - Cannot access other users notes',
        } as GetNotesResponse,
        { status: 403 }
      );
    }

    console.log(`📖 [API] Fetching notes for user ${userId}, chapter ${chapterId}`);

    // 4. Fetch notes
    const notes = await getNotesByUserAndChapter(userId, chapterId);

    console.log(`✅ [API] Fetched ${notes.length} notes successfully`);

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        notes,
      } as GetNotesResponse,
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ [API] Error fetching notes:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch notes',
        details: error.message,
      } as GetNotesResponse,
      { status: 500 }
    );
  }
}

/**
 * POST /api/notes
 *
 * Creates a new note
 *
 * Request Body:
 * - userId, chapterId, selectedText, note (required)
 * - tags, isPublic, noteType (optional)
 *
 * Returns:
 * - CreateNoteResponse with created note ID
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Please log in',
        } as CreateNoteResponse,
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body: CreateNoteRequest = await request.json();
    const validationResult = CreateNoteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validationResult.error.issues,
        } as CreateNoteResponse,
        { status: 400 }
      );
    }

    const { userId, chapterId, selectedText, note, tags, isPublic, noteType } =
      validationResult.data;

    // 3. Authorization check
    if (userId !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - Cannot create notes for other users',
        } as CreateNoteResponse,
        { status: 403 }
      );
    }

    console.log(`📝 [API] Creating note for user ${userId}, chapter ${chapterId}`);

    // 4. Save note
    const noteId = await saveNote({
      userId,
      chapterId,
      selectedText,
      note,
      tags,
      isPublic,
      noteType,
    });

    console.log(`✅ [API] Note created successfully: ${noteId}`);

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        noteId,
      } as CreateNoteResponse,
      { status: 201 }
    );
  } catch (error: any) {
    console.error('❌ [API] Error creating note:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create note',
        details: error.message,
      } as CreateNoteResponse,
      { status: 500 }
    );
  }
}

/**
 * PUT /api/notes
 *
 * Updates an existing note's content
 *
 * Request Body:
 * - id: string (required)
 * - content: string (required)
 *
 * Returns:
 * - UpdateNoteResponse
 */
export async function PUT(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Please log in',
        } as UpdateNoteResponse,
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body: UpdateNoteRequest = await request.json();
    const validationResult = UpdateNoteSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validationResult.error.issues,
        } as UpdateNoteResponse,
        { status: 400 }
      );
    }

    const { id, content } = validationResult.data;

    console.log(`✏️ [API] Updating note ${id}`);

    // 3. Update note
    await updateNote(id, content);

    console.log(`✅ [API] Note updated successfully: ${id}`);

    // 4. Return success response
    return NextResponse.json(
      {
        success: true,
      } as UpdateNoteResponse,
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ [API] Error updating note:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update note',
        details: error.message,
      } as UpdateNoteResponse,
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes
 *
 * Deletes a note
 *
 * Query Parameters:
 * - id: string (required)
 *
 * Returns:
 * - DeleteNoteResponse
 */
export async function DELETE(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Please log in',
        } as DeleteNoteResponse,
        { status: 401 }
      );
    }

    // 2. Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing id parameter',
        } as DeleteNoteResponse,
        { status: 400 }
      );
    }

    console.log(`🗑️ [API] Deleting note ${id}`);

    // 3. Delete note
    await deleteNoteById(id);

    console.log(`✅ [API] Note deleted successfully: ${id}`);

    // 4. Return success response
    return NextResponse.json(
      {
        success: true,
      } as DeleteNoteResponse,
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ [API] Error deleting note:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete note',
        details: error.message,
      } as DeleteNoteResponse,
      { status: 500 }
    );
  }
}
