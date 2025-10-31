/**
 * @fileOverview User Level Award XP API Route
 *
 * POST endpoint to award XP to users
 * This API is called from client components to avoid loading SQLite on the browser
 *
 * @phase SQLITE-026 - Client-Server Separation
 * @created 2025-10-30
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { userLevelService } from '@/lib/user-level-service';
import { z } from 'zod';
import type { AwardXPRequest, AwardXPResponse } from '@/types/user-level-api';

/**
 * Zod schema for validating award XP request
 */
const AwardXPSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  amount: z.number().int().positive('Amount must be a positive integer'),
  reason: z.string().min(1, 'Reason is required').max(200, 'Reason too long'),
  source: z.enum([
    'reading',
    'daily_task',
    'community',
    'note',
    'achievement',
    'admin',
  ]),
  sourceId: z.string().optional(),
});

/**
 * POST /api/user-level/award-xp
 *
 * Awards XP to a user and handles level-ups
 *
 * Request Body:
 * - userId: string (required)
 * - amount: number (required, positive integer)
 * - reason: string (required)
 * - source: XPSource (required)
 * - sourceId: string (optional)
 *
 * Returns:
 * - AwardXPResponse with level-up information
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Please log in',
        } as AwardXPResponse,
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body: AwardXPRequest = await request.json();
    const validationResult = AwardXPSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validationResult.error.errors,
          newTotalXP: 0,
          newLevel: 0,
          leveledUp: false,
        } as AwardXPResponse,
        { status: 400 }
      );
    }

    const { userId, amount, reason, source, sourceId } = validationResult.data;

    // 3. Authorization check - users can only award XP to themselves
    // (unless admin, but we'll skip admin check for now)
    if (userId !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden - Cannot award XP to other users',
          newTotalXP: 0,
          newLevel: 0,
          leveledUp: false,
        } as AwardXPResponse,
        { status: 403 }
      );
    }

    console.log(
      `🎁 [API] Awarding ${amount} XP to user ${userId} for: ${reason}`
    );

    // 4. Call service to award XP
    const result = await userLevelService.awardXP(
      userId,
      amount,
      reason,
      source,
      sourceId
    );

    console.log(`✅ [API] XP awarded successfully. Level up: ${result.leveledUp}`);

    // 5. Return success response
    return NextResponse.json(
      {
        success: true,
        newTotalXP: result.newTotalXP,
        newLevel: result.newLevel,
        leveledUp: result.leveledUp,
        levelUpRewards: result.levelUpRewards,
      } as AwardXPResponse,
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ [API] Error awarding XP:', error);

    // Categorize errors
    if (error.message?.includes('SQLite')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Database error',
          details: error.message,
          newTotalXP: 0,
          newLevel: 0,
          leveledUp: false,
        } as AwardXPResponse,
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to award XP',
        details: error.message,
        newTotalXP: 0,
        newLevel: 0,
        leveledUp: false,
      } as AwardXPResponse,
      { status: 500 }
    );
  }
}
