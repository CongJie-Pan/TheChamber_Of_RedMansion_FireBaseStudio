/**
 * @fileOverview Daily Tasks History API Route
 *
 * GET endpoint to fetch user's task completion history
 * This API is called from client components to avoid loading SQLite on the browser
 *
 * @phase Phase 2.9 - SQLite Integration with Client-Server Separation
 */

import { NextRequest, NextResponse } from 'next/server';
import { dailyTaskService } from '@/lib/daily-task-service';

/**
 * GET /api/daily-tasks/history
 *
 * Fetches the task completion history for a user
 *
 * Query Parameters:
 * - userId: string (required) - The user ID to fetch history for
 * - limit: number (optional) - Maximum number of history entries to return (default: 100)
 *
 * Returns:
 * - Array of DailyTaskProgress objects representing historical progress
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');
    const limitStr = searchParams.get('limit');
    const limit = limitStr ? parseInt(limitStr, 10) : 100;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Validate limit
    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return NextResponse.json(
        { error: 'limit must be a number between 1 and 1000' },
        { status: 400 }
      );
    }

    console.log(`📚 [API] Fetching task history for user: ${userId}, limit: ${limit}`);

    const history = await dailyTaskService.getTaskHistory(userId, limit);

    console.log(`✅ [API] History fetched successfully: ${history.length} entries`);

    return NextResponse.json(history);
  } catch (error) {
    console.error('❌ [API] Error fetching task history:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch task history',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
