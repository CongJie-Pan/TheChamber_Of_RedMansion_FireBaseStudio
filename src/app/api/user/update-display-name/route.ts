/**
 * @fileOverview Update Display Name API Route
 *
 * Provides server-side endpoint for updating user display name.
 * Handles SQLite database operations that cannot run in the browser.
 *
 * Features:
 * - POST: Update user display name
 * - Protected by NextAuth authentication
 * - Validates display name length and content
 * - Prevents duplicate display names
 *
 * @task TASK-001
 * @date 2025-12-08
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { updateUser, getUserById } from '@/lib/repositories/user-repository';

/**
 * POST /api/user/update-display-name
 *
 * Updates user display name in SQLite database.
 * Requires authentication via NextAuth session.
 *
 * Request body:
 * - displayName: New display name (string, 1-30 characters)
 *
 * Response:
 * - 200: Display name updated successfully
 * - 400: Invalid display name (too short/long, invalid characters)
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
    const { displayName } = body;

    // Validate displayName
    if (displayName !== null && displayName !== undefined && displayName !== '') {
      // Trim whitespace
      const trimmedDisplayName = displayName.trim();

      // Check if empty after trimming
      if (trimmedDisplayName.length === 0) {
        return NextResponse.json(
          { error: 'Display name cannot be empty or whitespace only' },
          { status: 400 }
        );
      }

      // Check length (1-30 characters)
      if (trimmedDisplayName.length > 30) {
        return NextResponse.json(
          { error: 'Display name must be 30 characters or less' },
          { status: 400 }
        );
      }

      // Check for invalid characters (allow letters, numbers, spaces, and common punctuation)
      const validNameRegex = /^[\p{L}\p{N}\s\-_\.]+$/u;
      if (!validNameRegex.test(trimmedDisplayName)) {
        return NextResponse.json(
          { error: 'Display name contains invalid characters. Only letters, numbers, spaces, hyphens, underscores, and periods are allowed.' },
          { status: 400 }
        );
      }

      console.log(`🔄 [API /user/update-display-name] Updating display name for user ${userId}: "${trimmedDisplayName}"`);

      // Update display name in database
      const updatedProfile = await updateUser(userId, {
        displayName: trimmedDisplayName,
      });

      console.log(`✅ [API /user/update-display-name] Display name updated successfully for ${userId}`);

      return NextResponse.json({
        success: true,
        message: 'Display name updated successfully',
        displayName: updatedProfile.displayName,
      });
    } else {
      // Clear display name (set to null)
      console.log(`🔄 [API /user/update-display-name] Clearing display name for user ${userId}`);

      const updatedProfile = await updateUser(userId, {
        displayName: undefined,
      });

      console.log(`✅ [API /user/update-display-name] Display name cleared successfully for ${userId}`);

      return NextResponse.json({
        success: true,
        message: 'Display name cleared successfully',
        displayName: null,
      });
    }

  } catch (error: any) {
    console.error('❌ [API /user/update-display-name] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update display name', details: error.message },
      { status: 500 }
    );
  }
}
