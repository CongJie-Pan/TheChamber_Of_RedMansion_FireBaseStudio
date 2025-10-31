/**
 * @fileOverview Community Post Like API Route
 *
 * Handles liking and unliking community posts
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
 * Validation schema for like operation
 */
const LikeSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

/**
 * POST /api/community/posts/[postId]/like
 *
 * Like a community post
 *
 * Path parameters:
 * - postId: string (post ID)
 *
 * Request body:
 * - userId: string
 *
 * Response:
 * {
 *   success: true,
 *   likeChanged: boolean
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
    let body;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid JSON in request body',
          details: [{ message: 'Request body must be valid JSON' }],
        },
        { status: 400 }
      );
    }

    const validationResult = LikeSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { userId } = validationResult.data;

    // Step 3: Authorization check - users can only like as themselves
    if (userId !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - Cannot like posts on behalf of others',
        },
        { status: 403 }
      );
    }

    console.log(`👍 [API] User ${userId} liking post ${postId}`);

    // Step 4: Toggle like via community service (isLiking = true)
    const likeChanged = await communityService.togglePostLike(postId, userId, true);

    console.log(`✅ [API] Like ${likeChanged ? 'added' : 'already existed'} for post ${postId}`);

    // Step 5: Return success response
    return NextResponse.json(
      {
        success: true,
        likeChanged,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('❌ [API] Error liking post:', error);

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
        error: 'Failed to like post',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/community/posts/[postId]/like
 *
 * Unlike a community post
 *
 * Path parameters:
 * - postId: string (post ID)
 *
 * Query parameters:
 * - userId: string
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
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing userId parameter',
          details: [{ message: 'userId query parameter is required' }],
        },
        { status: 400 }
      );
    }

    // Step 3: Await params (Next.js 15 requirement)
    const { postId } = await params;

    // Step 3: Authorization check
    if (userId !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - Cannot unlike posts on behalf of others',
        },
        { status: 403 }
      );
    }

    console.log(`👎 [API] User ${userId} unliking post ${postId}`);

    // Step 4: Toggle like via community service (isLiking = false)
    await communityService.togglePostLike(postId, userId, false);

    console.log(`✅ [API] Like removed for post ${postId}`);

    // Step 5: Return success response
    return NextResponse.json(
      {
        success: true,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('❌ [API] Error unliking post:', error);

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
        error: 'Failed to unlike post',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
