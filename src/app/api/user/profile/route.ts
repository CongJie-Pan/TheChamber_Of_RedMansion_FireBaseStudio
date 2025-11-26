/**
 * @fileOverview User Profile API Route
 *
 * Provides server-side endpoints for user profile operations.
 * Handles SQLite database operations that cannot run in the browser.
 *
 * Features:
 * - GET: Fetch user profile by userId
 * - POST: Initialize new user profile
 * - Protected by NextAuth authentication
 * - Returns user level, XP, attributes, and progress data
 *
 * @phase Phase 4 - SQLite Migration
 * @task SQLITE-022
 * @date 2025-10-30
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { userLevelService } from '@/lib/user-level-service';

/**
 * GET /api/user/profile
 *
 * Fetches user profile data from SQLite database.
 * Requires authentication via NextAuth session.
 *
 * Query parameters:
 * - userId: User ID to fetch profile for (optional, defaults to session user)
 *
 * Response:
 * - 200: User profile data
 * - 401: Not authenticated
 * - 404: User profile not found
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    }

    // Get userId from query params or use session user
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || session.user.id;

    // Security: Only allow users to fetch their own profile
    if (userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden - Can only access own profile' },
        { status: 403 }
      );
    }

    console.log(`📖 [API /user/profile] Fetching profile for user: ${userId}`);

    // Fetch profile from SQLite via userLevelService
    const profile = await userLevelService.getUserProfile(userId);

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found', userId },
        { status: 404 }
      );
    }

    console.log(`✅ [API /user/profile] Profile fetched successfully for ${userId}`);

    return NextResponse.json({
      success: true,
      profile,
    });

  } catch (error: any) {
    console.error('❌ [API /user/profile GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user profile', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/profile
 *
 * Initializes a new user profile in SQLite database.
 * Called when a new user logs in for the first time.
 * Requires authentication via NextAuth session.
 *
 * Request body:
 * - userId: User ID (optional, defaults to session user)
 * - displayName: User's display name
 * - email: User's email address
 *
 * Response:
 * - 201: Profile created successfully
 * - 400: Invalid request data
 * - 401: Not authenticated
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { userId, displayName, email } = body;

    // Use session data if not provided in body
    const finalUserId = userId || session.user.id;
    const finalDisplayName = displayName || session.user.name || 'User';
    const finalEmail = email || session.user.email || '';

    // Security: Only allow users to create their own profile
    if (finalUserId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden - Can only create own profile' },
        { status: 403 }
      );
    }

    console.log(`🆕 [API /user/profile] Initializing profile for user: ${finalUserId}`);

    // Initialize profile in SQLite via userLevelService
    const profile = await userLevelService.initializeUserProfile(
      finalUserId,
      finalDisplayName,
      finalEmail
    );

    console.log(`✅ [API /user/profile] Profile initialized successfully for ${finalUserId}`);

    return NextResponse.json({
      success: true,
      message: 'User profile initialized successfully',
      profile,
    }, { status: 201 });

  } catch (error: any) {
    console.error('❌ [API /user/profile POST] Error:', error);

    // Check if profile already exists
    if (error.message && error.message.includes('already exists')) {
      return NextResponse.json(
        { error: 'Profile already exists', details: error.message },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to initialize user profile', details: error.message },
      { status: 500 }
    );
  }
}
