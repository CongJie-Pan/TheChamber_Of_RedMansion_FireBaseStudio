/**
 * @fileOverview Notes Visibility API Route
 *
 * PATCH endpoint to update note visibility (public/private)
 * This API is called from client components to avoid loading SQLite on the browser
 *
 * @phase SQLITE-026 - Client-Server Separation
 * @created 2025-10-30
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { updateNoteVisibility } from '@/lib/notes-service';
import { z } from 'zod';
import type {
  UpdateNoteVisibilityRequest,
  UpdateNoteVisibilityResponse,
} from '@/types/notes-api';

/**
 * Zod schema for updating note visibility
 */
const UpdateVisibilitySchema = z.object({
  id: z.string().min(1, 'Note ID is required'),
  isPublic: z.boolean(),
});

/**
 * PATCH /api/notes/visibility
 *
 * Updates note visibility (public/private)
 *
 * Request Body:
 * - id: string (required)
 * - isPublic: boolean (required)
 *
 * Returns:
 * - UpdateNoteVisibilityResponse
 */
export async function PATCH(request: NextRequest) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized - Please log in',
        } as UpdateNoteVisibilityResponse,
        { status: 401 }
      );
    }

    // 2. Parse and validate request body
    const body: UpdateNoteVisibilityRequest = await request.json();
    const validationResult = UpdateVisibilitySchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validationResult.error.issues,
        } as UpdateNoteVisibilityResponse,
        { status: 400 }
      );
    }

    const { id, isPublic } = validationResult.data;

    console.log(`🔒 [API] Updating note ${id} visibility to ${isPublic ? 'public' : 'private'}`);

    // 3. Update visibility
    await updateNoteVisibility(id, isPublic);

    console.log(`✅ [API] Note visibility updated successfully: ${id}`);

    // 4. Return success response
    return NextResponse.json(
      {
        success: true,
      } as UpdateNoteVisibilityResponse,
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ [API] Error updating note visibility:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update note visibility',
        details: error.message,
      } as UpdateNoteVisibilityResponse,
      { status: 500 }
    );
  }
}
