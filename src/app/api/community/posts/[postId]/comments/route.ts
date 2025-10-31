/**
 * @fileOverview Community Post Comments API Route
 *
 * Handles comment operations for community posts
 *
 * @phase SQLITE-026 - Client-Server Separation
 * @created 2025-10-30
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { communityService } from '@/lib/community-service';
import { z } from 'zod';

/**
 * Validation schema for creating a comment
 */
const CreateCommentSchema = z.object({
  authorId: z.string().min(1, 'Author ID is required'),
  authorName: z.string().min(1, 'Author name is required'),
  content: z.string().min(1, 'Content is required').max(5000, 'Content too long'),
  parentCommentId: z.string().optional(),
});

/**
 * GET /api/community/posts/[postId]/comments
 *
 * Get all comments for a post
 *
 * Path parameters:
 * - postId: string (post ID)
 *
 * Query parameters:
 * - limit?: number (default: 50)
 *
 * Response:
 * {
 *   success: true,
 *   comments: PostComment[]
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // Fixed: Await params in Next.js 15
    const { postId } = await params;

    // Step 2: Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    console.log(`💬 [API] Fetching comments for post ${postId}`);

    // Step 3: Fetch comments via community service
    const comments = await communityService.getComments(postId, limit);

    console.log(`✅ [API] Fetched ${comments.length} comments for post ${postId}`);

    // Step 4: Return success response
    return NextResponse.json(
      {
        success: true,
        comments,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('❌ [API] Error fetching comments:', error);

    if (error.message?.toLowerCase().includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Post not found',
        },
        { status: 404 }
      );
    }

    if (error.message?.includes('SQLite')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database error - Please try again later',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch comments',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/community/posts/[postId]/comments
 *
 * Add a comment to a post
 *
 * Path parameters:
 * - postId: string (post ID)
 *
 * Request body:
 * {
 *   authorId: string,
 *   authorName: string,
 *   content: string,
 *   parentCommentId?: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   commentId: string,
 *   moderationAction?: string
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
        { success: false, error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Step 2: Parse and validate request body
    const body = await request.json();
    const validationResult = CreateCommentSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { authorId, authorName, content, parentCommentId } = validationResult.data;

    // Step 3: Await params (Next.js 15 requirement)
    const { postId } = await params;

    // Step 3: Authorization check - users can only comment as themselves
    if (authorId !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - Cannot create comments on behalf of others',
        },
        { status: 403 }
      );
    }

    console.log(`💬 [API] User ${authorId} adding comment to post ${postId}`);

    // Step 4: Add comment via community service
    // Note: Content moderation is handled within communityService.addComment()
    const result = await communityService.addComment({
      postId,
      authorId,
      authorName,
      content,
      parentCommentId,
    });

    console.log(`✅ [API] Comment created successfully: ${result.id}`);

    // Step 5: Return success response
    return NextResponse.json(
      {
        success: true,
        commentId: result.id,
        moderationAction: result.moderationAction,
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('❌ [API] Error adding comment:', error);

    if (error.message?.toLowerCase().includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Post not found',
        },
        { status: 404 }
      );
    }

    if (error.message?.includes('SQLite')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database error - Please try again later',
        },
        { status: 503 }
      );
    }

    if (error.message?.toLowerCase().includes('guideline') || error.message?.toLowerCase().includes('violate')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content moderation failed - Please review your content',
          details: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add comment',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/community/posts/[postId]/comments
 *
 * Delete a comment
 *
 * Path parameters:
 * - postId: string (post ID)
 *
 * Query parameters:
 * - commentId: string (required)
 *
 * Response:
 * {
 *   success: true
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // Step 1: Authentication check
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in' },
        { status: 401 }
      );
    }

    // Step 2: Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const commentId = searchParams.get('commentId');

    if (!commentId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing commentId parameter',
        },
        { status: 400 }
      );
    }

    // Step 3: Await params (Next.js 15 requirement)
    const { postId } = await params;

    console.log(`🗑️ [API] Deleting comment ${commentId} from post ${postId}`);

    // Step 3: Delete comment via community service
    // Note: Authorization check (user owns comment) should ideally be in service layer
    await communityService.deleteComment(postId, commentId);

    console.log(`✅ [API] Comment ${commentId} deleted successfully`);

    // Step 4: Return success response
    return NextResponse.json(
      {
        success: true,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('❌ [API] Error deleting comment:', error);

    if (error.message?.toLowerCase().includes('not found')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Comment not found',
        },
        { status: 404 }
      );
    }

    if (error.message?.toLowerCase().includes('unauthorized') || error.message?.toLowerCase().includes('forbidden')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - You can only delete your own comments',
        },
        { status: 403 }
      );
    }

    if (error.message?.includes('SQLite')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database error - Please try again later',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete comment',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
