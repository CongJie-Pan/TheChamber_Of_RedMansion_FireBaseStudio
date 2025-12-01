/**
 * @fileOverview Database Migration API - Add editedAt and sourceNoteId columns to posts table
 *
 * This is a one-time migration endpoint to fix the Turso database schema.
 * The posts table was created before Task 4.9 and is missing these columns:
 * - editedAt (INTEGER) - Timestamp of last edit
 * - sourceNoteId (TEXT) - Reference to source note if shared from reading notes
 *
 * Usage:
 * 1. Deploy to Vercel
 * 2. Visit: https://your-app.vercel.app/api/admin/migrate-posts-schema
 * 3. Verify the response shows success
 * 4. Delete this file after migration is complete (optional)
 *
 * @phase Task 4.9 - Note-Post Sync (Database Schema Fix)
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/sqlite-db';

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

/**
 * GET /api/admin/migrate-posts-schema
 *
 * Executes the database migration to add missing columns to the posts table.
 * Safe to run multiple times - checks if columns exist before adding.
 */
export async function GET() {
  const results: string[] = [];
  const errors: string[] = [];

  try {
    const db = getDatabase();
    results.push('✅ Database connection established');

    // Step 1: Get current posts table schema
    const schemaResult = await db.execute({
      sql: 'PRAGMA table_info(posts)',
      args: []
    });

    const columns = schemaResult.rows as unknown as ColumnInfo[];
    const columnNames = columns.map(col => col.name);
    results.push(`📋 Current columns: ${columnNames.join(', ')}`);

    // Step 2: Check and add editedAt column
    if (!columnNames.includes('editedAt')) {
      try {
        await db.execute({
          sql: 'ALTER TABLE posts ADD COLUMN editedAt INTEGER',
          args: []
        });
        results.push('✅ Added column: editedAt (INTEGER)');
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes('duplicate column')) {
          results.push('⏭️ Column editedAt already exists (skipped)');
        } else {
          errors.push(`❌ Failed to add editedAt: ${errMsg}`);
        }
      }
    } else {
      results.push('⏭️ Column editedAt already exists (skipped)');
    }

    // Step 3: Check and add sourceNoteId column
    if (!columnNames.includes('sourceNoteId')) {
      try {
        await db.execute({
          sql: 'ALTER TABLE posts ADD COLUMN sourceNoteId TEXT',
          args: []
        });
        results.push('✅ Added column: sourceNoteId (TEXT)');
      } catch (error: unknown) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes('duplicate column')) {
          results.push('⏭️ Column sourceNoteId already exists (skipped)');
        } else {
          errors.push(`❌ Failed to add sourceNoteId: ${errMsg}`);
        }
      }
    } else {
      results.push('⏭️ Column sourceNoteId already exists (skipped)');
    }

    // Step 4: Create index for sourceNoteId (optional optimization)
    try {
      await db.execute({
        sql: 'CREATE INDEX IF NOT EXISTS idx_posts_sourceNoteId ON posts(sourceNoteId)',
        args: []
      });
      results.push('✅ Created index: idx_posts_sourceNoteId');
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      results.push(`⚠️ Index creation note: ${errMsg}`);
    }

    // Step 5: Verify the migration
    const verifyResult = await db.execute({
      sql: 'PRAGMA table_info(posts)',
      args: []
    });
    const newColumns = (verifyResult.rows as unknown as ColumnInfo[]).map(col => col.name);
    const hasEditedAt = newColumns.includes('editedAt');
    const hasSourceNoteId = newColumns.includes('sourceNoteId');

    results.push('');
    results.push('=== VERIFICATION ===');
    results.push(`editedAt column: ${hasEditedAt ? '✅ EXISTS' : '❌ MISSING'}`);
    results.push(`sourceNoteId column: ${hasSourceNoteId ? '✅ EXISTS' : '❌ MISSING'}`);
    results.push(`New column list: ${newColumns.join(', ')}`);

    const success = hasEditedAt && hasSourceNoteId && errors.length === 0;

    return NextResponse.json({
      success,
      message: success
        ? '🎉 Migration completed successfully! You can now create posts.'
        : '⚠️ Migration completed with issues. Please check the errors.',
      results,
      errors,
      timestamp: new Date().toISOString()
    }, { status: success ? 200 : 500 });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error('❌ [Migration] Fatal error:', error);

    return NextResponse.json({
      success: false,
      message: 'Migration failed with fatal error',
      results,
      errors: [...errors, `Fatal: ${errMsg}`],
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
