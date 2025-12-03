/**
 * @fileOverview Reading Time API Route
 *
 * Provides endpoint to increment user's total reading time.
 * Called periodically from the read-book page to track reading progress.
 *
 * @date 2025-12-03
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import * as userRepository from '@/lib/repositories/user-repository';

/**
 * Maximum minutes that can be added in a single request
 * Prevents abuse by limiting single increments to one hour
 */
const MAX_MINUTES_PER_REQUEST = 60;

/**
 * POST /api/user/reading-time
 *
 * Increments the user's total reading time by the specified minutes.
 *
 * Request body:
 * - minutes: number - Minutes to add to total reading time
 *
 * Response:
 * - 200: Success with updated stats
 * - 400: Invalid request (missing or invalid minutes)
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

    const userId = session.user.id;

    // Parse request body
    const body = await request.json();
    const { minutes } = body;

    // Validate minutes
    if (typeof minutes !== 'number' || minutes < 0 || minutes > MAX_MINUTES_PER_REQUEST) {
      return NextResponse.json(
        { error: `Invalid minutes value. Must be a number between 0 and ${MAX_MINUTES_PER_REQUEST}.` },
        { status: 400 }
      );
    }

    // Skip if no time to add
    if (minutes === 0) {
      return NextResponse.json({
        success: true,
        message: 'No time to add',
        totalReadingTimeMinutes: 0,
      });
    }

    console.log(`📖 [API /user/reading-time] Adding ${minutes} minutes for user: ${userId}`);

    // Increment reading time
    const updatedProfile = await userRepository.incrementReadingTime(userId, minutes);

    const totalMinutes = updatedProfile.stats?.totalReadingTimeMinutes ?? 0;

    console.log(`✅ [API /user/reading-time] Updated total: ${totalMinutes} minutes for ${userId}`);

    return NextResponse.json({
      success: true,
      totalReadingTimeMinutes: totalMinutes,
    });

  } catch (error: unknown) {
    console.error('❌ [API /user/reading-time POST] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update reading time', details: errorMessage },
      { status: 500 }
    );
  }
}
