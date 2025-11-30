/**
 * @fileOverview Community Post Sync API Route
 *
 * Task 4.9: Syncs community post content with its source note
 * When a note is edited, this endpoint updates the linked community post
 *
 * @phase Task 4.9 - Note-Post Sync
 * @created 2025-11-29
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import {
  getPostById,
  syncPostFromNote,
} from '@/lib/repositories/community-repository';
import { getNoteById } from '@/lib/repositories/note-repository';
import { z } from 'zod';

/**
 * Validation schema for sync operation
 */
const SyncSchema = z.object({
  noteId: z.string().min(1, 'Note ID is required'),
});

/**
 * POST /api/community/posts/[postId]/sync
 *
 * Sync a community post's content with its source note
 * This is called when a note is edited and needs to update the shared post
 *
 * Path parameters:
 * - postId: string (post ID)
 *
 * Request body:
 * - noteId: string (source note ID for verification)
 *
 * Response:
 * {
 *   success: true,
 *   post: CommunityPost,
 *   synced: true
 * }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // Fixed: Await params in Next.js 15
    const { postId } = await params;

    // Step 1: Authentication check
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Step 2: Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON body',
          code: 'INVALID_JSON',
        },
        { status: 400 }
      );
    }

    const validationResult = SyncSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: validationResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { noteId } = validationResult.data;

    // Step 3: Verify post exists
    const post = await getPostById(postId);
    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: 'Post not found',
          code: 'POST_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Step 4: Verify user owns the post
    if (post.authorId !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'You can only sync your own posts',
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Step 5: Verify post is linked to the provided note
    if (post.sourceNoteId !== noteId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Post is not linked to this note',
          code: 'NOTE_MISMATCH',
        },
        { status: 400 }
      );
    }

    // Step 6: Get the source note
    const note = await getNoteById(noteId);
    if (!note) {
      return NextResponse.json(
        {
          success: false,
          error: 'Source note not found',
          code: 'NOTE_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Step 7: Verify user owns the note
    if (note.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'You can only sync from your own notes',
          code: 'FORBIDDEN',
        },
        { status: 403 }
      );
    }

    // Step 8: Sync the post content from the note
    const updatedPost = await syncPostFromNote(
      postId,
      note.note,
      note.selectedText
    );

    console.log(`✅ [SyncAPI] Synced post ${postId} from note ${noteId}`);

    return NextResponse.json({
      success: true,
      post: updatedPost,
      synced: true,
    });
  } catch (error: any) {
    console.error('❌ [SyncAPI] Error syncing post:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred while syncing the post',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/community/posts/[postId]/sync
 *
 * Check if a post is synced with its source note
 *
 * Path parameters:
 * - postId: string (post ID)
 *
 * Response:
 * {
 *   success: true,
 *   hasSourceNote: boolean,
 *   sourceNoteId: string | null,
 *   isEdited: boolean,
 *   editedAt: number | null
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { postId } = await params;

    // Step 1: Verify post exists
    const post = await getPostById(postId);
    if (!post) {
      return NextResponse.json(
        {
          success: false,
          error: 'Post not found',
          code: 'POST_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      hasSourceNote: !!post.sourceNoteId,
      sourceNoteId: post.sourceNoteId || null,
      isEdited: post.isEdited,
      editedAt: post.editedAt?.toMillis() || null,
    });
  } catch (error: any) {
    console.error('❌ [SyncAPI] Error checking sync status:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR',
      },
      { status: 500 }
    );
  }
}
