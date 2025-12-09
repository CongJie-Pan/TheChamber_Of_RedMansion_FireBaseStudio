/**
 * @fileOverview Temporary Migration & Admin API Route
 *
 * This is a ONE-TIME USE endpoint to run database migrations and check users.
 * DELETE THIS FILE after use!
 *
 * @temporary DELETE AFTER USE
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/sqlite-db';
import bcrypt from 'bcryptjs';

/**
 * GET /api/admin/run-migration
 *
 * Actions:
 * - ?key=run-migration-2024 - Run migrations
 * - ?key=run-migration-2024&action=list-users - List all users
 * - ?key=run-migration-2024&action=reset-password&email=xxx&newpass=xxx - Reset password
 */
export async function GET(request: NextRequest) {
  // Simple security check
  const { searchParams } = new URL(request.url);
  const key = searchParams.get('key');
  const action = searchParams.get('action');

  if (key !== 'run-migration-2024') {
    return NextResponse.json(
      { error: 'Unauthorized - Invalid key' },
      { status: 401 }
    );
  }

  try {
    const db = getDatabase();

    // Action: List users
    if (action === 'list-users') {
      const usersResult = await db.execute(
        'SELECT id, username, email, isGuest, currentLevel, createdAt FROM users'
      );
      return NextResponse.json({
        success: true,
        users: usersResult.rows,
        count: usersResult.rows.length,
      });
    }

    // Action: Reset password
    if (action === 'reset-password') {
      const email = searchParams.get('email');
      const newpass = searchParams.get('newpass');

      if (!email || !newpass) {
        return NextResponse.json({
          success: false,
          error: 'Missing email or newpass parameter',
          usage: '?key=run-migration-2024&action=reset-password&email=YOUR_EMAIL&newpass=NEW_PASSWORD'
        }, { status: 400 });
      }

      // Hash the new password
      const passwordHash = await bcrypt.hash(newpass, 10);

      // Update password
      const result = await db.execute({
        sql: 'UPDATE users SET passwordHash = ?, updatedAt = ? WHERE email = ?',
        args: [passwordHash, Date.now(), email]
      });

      if (result.rowsAffected === 0) {
        return NextResponse.json({
          success: false,
          error: `No user found with email: ${email}`
        }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: `Password reset for ${email}`,
      });
    }

    // Default action: Run migrations
    const results: string[] = [];

    // Helper function to check if a column exists
    async function columnExists(table: string, column: string): Promise<boolean> {
      const result = await db.execute(`PRAGMA table_info(${table})`);
      return result.rows.some((row: any) => row.name === column);
    }

    // Check and add displayName column to users table
    const hasDisplayName = await columnExists('users', 'displayName');
    if (!hasDisplayName) {
      await db.execute('ALTER TABLE users ADD COLUMN displayName TEXT');
      results.push('Added displayName column to users table');
    } else {
      results.push('displayName column already exists');
    }

    // Verify the column was added
    const verifyResult = await db.execute('PRAGMA table_info(users)');
    const columns = verifyResult.rows.map((row: any) => row.name);

    // Also list users for convenience
    const usersResult = await db.execute(
      'SELECT id, username, email, isGuest, currentLevel FROM users'
    );

    return NextResponse.json({
      success: true,
      message: 'Migration completed',
      results,
      usersTableColumns: columns,
      existingUsers: usersResult.rows,
      userCount: usersResult.rows.length,
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}
