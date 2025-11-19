/**
 * @fileOverview User Account Reset API Route
 *
 * POST endpoint to reset a user account to its initial state
 * This API permanently deletes all user data and reinitializes the profile
 *
 * @created 2025-11-19
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { userLevelService } from '@/lib/user-level-service';
import { z } from 'zod';

/**
 * Response type for account reset
 */
interface ResetAccountResponse {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Required confirmation text for account reset
 * Must match exactly for the reset to proceed
 */
const REQUIRED_CONFIRMATION_TEXT = '我確定要重設帳號';

/**
 * Zod schema for validating reset account request
 */
const ResetAccountSchema = z.object({
  userId: z.string({
    required_error: 'User ID is required',
    invalid_type_error: 'User ID must be a string',
  }).min(1, 'User ID is required'),
  confirmationText: z.string({
    required_error: 'Confirmation text is required',
    invalid_type_error: 'Confirmation text must be a string',
  }).min(1, 'Confirmation text is required'),
});

/**
 * POST /api/user/reset
 *
 * Resets a user account to its initial state
 *
 * Request Body:
 * - userId: string (required)
 * - confirmationText: string (required, must match exactly)
 *
 * Returns:
 * - ResetAccountResponse with success status
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Unauthorized',
          error: 'Please log in to reset your account',
        } as ResetAccountResponse,
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request',
          error: 'Invalid JSON body',
        } as ResetAccountResponse,
        { status: 400 }
      );
    }

    const validationResult = ResetAccountSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid request',
          error: validationResult.error.errors[0]?.message || 'Invalid request data',
        } as ResetAccountResponse,
        { status: 400 }
      );
    }

    const { userId, confirmationText } = validationResult.data;

    // 3. Authorization check - users can only reset their own account
    if (userId !== session.user.id) {
      return NextResponse.json(
        {
          success: false,
          message: 'Forbidden',
          error: 'Cannot reset other users\' accounts',
        } as ResetAccountResponse,
        { status: 403 }
      );
    }

    // 4. Validate confirmation text
    if (confirmationText !== REQUIRED_CONFIRMATION_TEXT) {
      return NextResponse.json(
        {
          success: false,
          message: 'Confirmation failed',
          error: 'Confirmation text does not match. Please enter the exact text.',
        } as ResetAccountResponse,
        { status: 400 }
      );
    }

    console.log(`🔄 [API] Resetting account for user ${userId}`);

    // 5. Call service to reset account
    const result = await userLevelService.resetUserAccount(
      userId,
      session.user.name || 'User',
      session.user.email || ''
    );

    if (result.success) {
      console.log(`✅ [API] Account reset successful for user ${userId}`);
      return NextResponse.json(
        {
          success: true,
          message: result.message,
        } as ResetAccountResponse,
        { status: 200 }
      );
    } else {
      console.error(`❌ [API] Account reset failed for user ${userId}: ${result.message}`);
      return NextResponse.json(
        {
          success: false,
          message: 'Reset failed',
          error: result.message,
        } as ResetAccountResponse,
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ [API] Error resetting account:', error);

    // Categorize errors
    if (error.message?.includes('SQLite')) {
      return NextResponse.json(
        {
          success: false,
          message: 'Database error',
          error: 'A database error occurred. Please try again later.',
        } as ResetAccountResponse,
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Internal error',
        error: error.message || 'An unexpected error occurred',
      } as ResetAccountResponse,
      { status: 500 }
    );
  }
}
