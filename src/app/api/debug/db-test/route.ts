/**
 * @fileOverview Diagnostic API for SQLite Database Testing
 *
 * Temporary debugging endpoint to diagnose community comments 500 error
 *
 * **⚠️ WARNING: DELETE THIS FILE AFTER DEBUGGING IS COMPLETE**
 *
 * @created 2025-11-01
 */

import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/sqlite-db';

export async function GET() {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    sqliteEnabled: process.env.USE_SQLITE,
    platform: process.platform,
    nodeVersion: process.version,
  };

  try {
    // Step 1: Get database instance
    console.log('\n' + '='.repeat(80));
    console.log('🔍 [Diagnostic] Step 1: Attempting to get database instance...');
    diagnostics.step1_getDatabase = '嘗試中...';

    const db = getDatabase();

    diagnostics.step1_getDatabase = '✅ 成功';
    console.log('✅ [Diagnostic] Step 1: Database instance obtained successfully');

    // Step 2: List all tables
    console.log('🔍 [Diagnostic] Step 2: Listing all tables...');
    diagnostics.step2_listTables = '嘗試中...';

    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all() as Array<{ name: string }>;

    diagnostics.step2_listTables = {
      success: true,
      count: tables.length,
      tables: tables.map(t => t.name),
    };
    console.log(`✅ [Diagnostic] Step 2: Found ${tables.length} tables:`, tables.map(t => t.name).join(', '));

    // Step 3: Check comments table structure
    console.log('🔍 [Diagnostic] Step 3: Checking comments table structure...');
    diagnostics.step3_commentsSchema = '嘗試中...';

    const commentsInfo = db.pragma('table_info(comments)') as Array<{ name: string; type: string }>;

    diagnostics.step3_commentsSchema = {
      success: true,
      columnCount: commentsInfo.length,
      columns: commentsInfo.map(col => ({ name: col.name, type: col.type })),
    };
    console.log(`✅ [Diagnostic] Step 3: Comments table has ${commentsInfo.length} columns`);

    // Step 4: Count comments
    console.log('🔍 [Diagnostic] Step 4: Counting comments...');
    diagnostics.step4_countComments = '嘗試中...';

    const commentCount = db.prepare('SELECT COUNT(*) as count FROM comments').get() as { count: number };

    diagnostics.step4_countComments = {
      success: true,
      count: commentCount.count,
    };
    console.log(`✅ [Diagnostic] Step 4: Found ${commentCount.count} comments in database`);

    // Step 5: Count posts
    console.log('🔍 [Diagnostic] Step 5: Counting posts...');
    diagnostics.step5_countPosts = '嘗試中...';

    const postCount = db.prepare('SELECT COUNT(*) as count FROM posts').get() as { count: number };

    diagnostics.step5_countPosts = {
      success: true,
      count: postCount.count,
    };
    console.log(`✅ [Diagnostic] Step 5: Found ${postCount.count} posts in database`);

    // Step 6: Try to get comments for a test post
    console.log('🔍 [Diagnostic] Step 6: Testing comments query...');
    diagnostics.step6_testQuery = '嘗試中...';

    const testComments = db.prepare(
      'SELECT * FROM comments WHERE status = ? LIMIT 5'
    ).all('active');

    diagnostics.step6_testQuery = {
      success: true,
      sampleCount: testComments.length,
    };
    console.log(`✅ [Diagnostic] Step 6: Successfully queried ${testComments.length} active comments`);
    console.log('='.repeat(80) + '\n');

    return NextResponse.json({
      success: true,
      message: '✅ 所有診斷步驟成功完成',
      diagnostics,
    }, { status: 200 });

  } catch (error: any) {
    console.error('\n' + '='.repeat(80));
    console.error('❌ [Diagnostic] Error occurred during diagnostic');
    console.error('='.repeat(80));
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error name:', error.name);
    console.error('Error code:', error.code);
    console.error('='.repeat(80) + '\n');

    diagnostics.error = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code,
    };

    return NextResponse.json({
      success: false,
      message: '❌ 診斷過程中發生錯誤',
      diagnostics,
    }, { status: 500 });
  }
}
