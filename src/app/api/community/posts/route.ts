/**
 * @fileOverview Community Posts API Route
 *
 * This API route handles community post operations including:
 * - Creating new posts (POST)
 * - Retrieving posts (GET) - future enhancement
 *
 * Architecture:
 * - Server-side only (SQLite database access)
 * - Authenticated endpoints with NextAuth session validation
 * - Content moderation integration via community-service
 *
 * Security:
 * - Session-based authentication
 * - Input validation with Zod schemas
 * - Rate limiting (future enhancement)
 *
 * @phase Phase 3 - SQLITE-017 Community Service Integration
 * @date 2025-10-30
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { communityService } from '@/lib/community-service';
import { z } from 'zod';

/**
 * Validation schema for creating a community post
 */
const CreatePostSchema = z.object({
  authorId: z.string().min(1, 'Author ID is required'),
  authorName: z.string().min(1, 'Author name is required'),
  title: z.string().optional(),
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
  tags: z.array(z.string()).default([]),
  category: z.string().optional(),
});

/**
 * POST /api/community/posts
 *
 * Create a new community post
 *
 * Request body:
 * {
 *   authorId: string,
 *   authorName: string,
 *   title?: string,
 *   content: string,
 *   tags?: string[],
 *   category?: string
 * }
 *
 * Response:
 * {
 *   success: true,
 *   postId: string
 * }
 *
 * Error responses:
 * - 401: Unauthorized (no valid session)
 * - 400: Bad request (validation error)
 * - 500: Internal server error
 */
export async function POST(request: NextRequest) {
  try {
    // Step 1: Authentication check
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Please log in to create posts' },
        { status: 401 }
      );
    }

    // Step 2: Parse and validate request body
    const body = await request.json();

    const validationResult = CreatePostSchema.safeParse(body);

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

    const postData = validationResult.data;

    // Step 3: Verify author ID matches session user
    // Security: Prevent users from creating posts on behalf of others
    if (postData.authorId !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Author ID mismatch - You can only create posts as yourself',
        },
        { status: 403 }
      );
    }

    // Step 4: Create post via community service
    // Note: Content moderation is handled within communityService.createPost()
    const createdPost = await communityService.createPost(postData);

    console.log(`✅ [API] Community post created successfully: ${createdPost.id}`);

    // Step 5: Return success response
    return NextResponse.json(
      {
        success: true,
        postId: createdPost.id,
        post: createdPost,
      },
      { status: 201 }
    );

  } catch (error: any) {
    console.error('❌ [API] Error creating community post:', error);

    // Handle specific error types
    if (error.message?.includes('SQLite')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database error - Please try again later',
        },
        { status: 503 }
      );
    }

    if (error.message?.includes('moderation')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Content moderation failed - Please review your content',
          details: error.message,
        },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create post',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/community/posts
 *
 * Retrieve community posts with filters and pagination
 *
 * Query parameters:
 * - category?: string
 * - tags?: string (comma-separated)
 * - limit?: number (default: 20)
 *
 * Response:
 * {
 *   success: true,
 *   posts: CommunityPost[]
 * }
 */
export async function GET(request: NextRequest) {
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
    const category = searchParams.get('category') || undefined;
    const tagsParam = searchParams.get('tags');
    const tags = tagsParam ? tagsParam.split(',') : undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    // Step 3: Build filters
    const filters: any = {};
    if (category) filters.category = category;
    if (tags && tags.length > 0) filters.tags = tags;

    console.log(`📖 [API] Fetching posts with filters:`, filters);

    // Step 4: Fetch posts via community service
    const posts = await communityService.getPosts(filters, limit);

    console.log(`✅ [API] Fetched ${posts.length} posts successfully`);

    // Step 5: Return success response
    return NextResponse.json(
      {
        success: true,
        posts,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('❌ [API] Error fetching posts:', error);

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
        error: 'Failed to fetch posts',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/community/posts
 *
 * Delete a community post
 *
 * Query parameters:
 * - postId: string (required)
 *
 * Response:
 * {
 *   success: true
 * }
 *
 * Error responses:
 * - 401: Unauthorized
 * - 400: Missing postId
 * - 500: Internal server error
 */
export async function DELETE(request: NextRequest) {
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
    const postId = searchParams.get('postId');

    if (!postId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing postId parameter',
        },
        { status: 400 }
      );
    }

    console.log(`🗑️ [API] Deleting post ${postId}`);

    // Step 3: Delete post via community service
    // Note: Authorization check (user owns post) should ideally be in service layer
    await communityService.deletePost(postId);

    console.log(`✅ [API] Post ${postId} deleted successfully`);

    // Step 4: Return success response
    return NextResponse.json(
      {
        success: true,
      },
      { status: 200 }
    );

  } catch (error: any) {
    console.error('❌ [API] Error deleting post:', error);

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
        error: 'Failed to delete post',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
