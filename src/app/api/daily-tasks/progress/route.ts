/**
 * @fileOverview Daily Tasks Progress API Route
 *
 * GET endpoint to fetch user's daily task progress
 * This API is called from client components to avoid loading SQLite on the browser
 *
 * @phase Phase 2.9 - SQLite Integration with Client-Server Separation
 */

import { NextRequest, NextResponse } from 'next/server';
import { dailyTaskService } from '@/lib/daily-task-service';

/**
 * GET /api/daily-tasks/progress
 *
 * Fetches the current daily task progress for a user
 *
 * Query Parameters:
 * - userId: string (required) - The user ID to fetch progress for
 *
 * Returns:
 * - DailyTaskProgress object or null if no progress exists
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log(`📊 [API] Fetching daily progress for user: ${userId}`);

    const progress = await dailyTaskService.getUserDailyProgress(userId);

    console.log(`✅ [API] Progress fetched successfully for user: ${userId}`);

    return NextResponse.json(progress);
  } catch (error) {
    console.error('❌ [API] Error fetching daily progress:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch daily task progress',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
