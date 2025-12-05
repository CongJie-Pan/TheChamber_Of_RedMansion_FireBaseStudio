/**
 * @fileOverview Learning Stats API Route
 *
 * Provides server-side endpoints for user learning statistics.
 * Fetches actual data from SQLite database for achievements page.
 *
 * Features:
 * - GET: Fetch user learning statistics (reading time, chapters, notes, streak)
 * - Protected by NextAuth authentication
 *
 * @phase Task 2.2 - Learning Progress Dynamic Data
 * @date 2025-12-01
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import * as userRepository from '@/lib/repositories/user-repository';
import * as noteRepository from '@/lib/repositories/note-repository';

/**
 * Learning stats response structure
 */
interface LearningStats {
  totalReadingTime: string;
  totalReadingTimeMinutes: number;
  chaptersCompleted: number;
  totalChapters: number;
  notesTaken: number;
  currentStreak: number;
}

/**
 * Format reading time from minutes to human-readable string
 *
 * @param minutes - Total reading time in minutes
 * @param isEnglish - Whether to use English labels
 * @returns Formatted time string (e.g., "2 小時 30 分鐘" or "2 Hours 30 Minutes")
 */
function formatReadingTime(minutes: number, isEnglish: boolean = false): string {
  if (minutes === 0) {
    return isEnglish ? '0 Minutes' : '0 分鐘';
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return isEnglish ? `${remainingMinutes} Minutes` : `${remainingMinutes} 分鐘`;
  }

  if (remainingMinutes === 0) {
    return isEnglish ? `${hours} Hours` : `${hours} 小時`;
  }

  return isEnglish
    ? `${hours} Hours ${remainingMinutes} Minutes`
    : `${hours} 小時 ${remainingMinutes} 分鐘`;
}

/**
 * GET /api/user/learning-stats
 *
 * Fetches user learning statistics from SQLite database.
 * Requires authentication via NextAuth session.
 *
 * Response:
 * - 200: Learning stats data
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

    const userId = session.user.id;

    console.log(`📊 [API /user/learning-stats] Fetching stats for user: ${userId}`);

    // Fetch user profile from SQLite
    const profile = await userRepository.getUserById(userId);

    if (!profile) {
      return NextResponse.json(
        { error: 'User profile not found', userId },
        { status: 404 }
      );
    }

    // Get note count from notes table
    const noteCount = await noteRepository.getNoteCount(userId);

    // Extract stats from profile with defensive fallbacks
    // Note: profile.stats could be malformed or have missing fields
    const userStats = profile.stats || {};

    // Use actual completedChapters array length for accurate count
    // The completedChapters array tracks which chapters have been completed
    // This is more accurate than stats.chaptersCompleted which may not be updated
    const actualChaptersCompleted = Array.isArray(profile.completedChapters)
      ? profile.completedChapters.length
      : 0;

    // Check Accept-Language header for language preference
    const acceptLanguage = request.headers.get('accept-language') || '';
    const isEnglish = acceptLanguage.toLowerCase().startsWith('en');

    // Build response with nullish coalescing for safety
    const readingMinutes = userStats.totalReadingTimeMinutes ?? 0;
    const stats: LearningStats = {
      totalReadingTime: formatReadingTime(readingMinutes, isEnglish),
      totalReadingTimeMinutes: readingMinutes,
      chaptersCompleted: actualChaptersCompleted,
      totalChapters: 120, // Fixed total chapters for 紅樓夢
      notesTaken: noteCount, // Use actual count from notes table
      currentStreak: userStats.currentStreak ?? 0,
    };

    console.log(`✅ [API /user/learning-stats] Stats fetched successfully for ${userId}:`, {
      readingMinutes: stats.totalReadingTimeMinutes,
      chapters: stats.chaptersCompleted,
      notes: stats.notesTaken,
      streak: stats.currentStreak,
    });

    return NextResponse.json({
      success: true,
      stats,
    });

  } catch (error: any) {
    console.error('❌ [API /user/learning-stats GET] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch learning stats', details: error.message },
      { status: 500 }
    );
  }
}
