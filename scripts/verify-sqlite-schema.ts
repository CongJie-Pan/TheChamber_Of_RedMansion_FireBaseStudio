#!/usr/bin/env tsx
/**
 * SQLite Schema Verification Script
 *
 * Verifies that all required tables and indexes exist in the SQLite database.
 * Used for SQLITE-001 verification deliverable.
 *
 * Usage: tsx scripts/verify-sqlite-schema.ts
 */

import { getDatabase, type Client } from '../src/lib/sqlite-db';

interface TableInfo {
  name: string;
  columns: string[];
  indexes: string[];
}

const REQUIRED_TABLES: Record<string, string[]> = {
  users: [
    'id', 'username', 'email', 'currentLevel', 'currentXP', 'totalXP',
    'attributes', 'createdAt', 'updatedAt'
  ],
  daily_tasks: [
    'id', 'taskType', 'difficulty', 'title', 'description', 'baseXP',
    'content', 'sourceChapter', 'sourceVerseStart', 'sourceVerseEnd', 'createdAt'
  ],
  daily_progress: [
    'id', 'userId', 'date', 'tasks', 'completedTaskIds', 'skippedTaskIds',
    'totalXPEarned', 'totalAttributeGains', 'usedSourceIds', 'streak',
    'createdAt', 'updatedAt'
  ],
  task_submissions: [
    'id', 'userId', 'taskId', 'userAnswer', 'score', 'feedback',
    'xpEarned', 'attributeGains', 'submittedAt'
  ],
  xp_transactions: [
    'transactionId', 'userId', 'amount', 'reason', 'source',
    'sourceId', 'createdAt'
  ],
  xp_transaction_locks: [
    'lockId', 'userId', 'sourceId', 'createdAt'
  ],
  level_ups: [
    'levelUpId', 'userId', 'fromLevel', 'toLevel', 'unlockedContent',
    'unlockedPermissions', 'createdAt'
  ]
};

const REQUIRED_INDEXES = [
  'idx_daily_progress_user_date',
  'idx_task_submissions_user_task',
  'idx_daily_tasks_type',
  'idx_xp_transactions_user',
  'idx_level_ups_user'
];

/**
 * Get all tables in the database
 */
async function getAllTables(db: Client): Promise<string[]> {
  const query = `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`;
  const result = await db.execute(query);
  const rows = result.rows as unknown as { name: string }[];
  return rows.map(row => row.name);
}

/**
 * Get columns for a specific table
 */
async function getTableColumns(db: Client, tableName: string): Promise<string[]> {
  const query = `PRAGMA table_info(${tableName})`;
  const result = await db.execute(query);
  const rows = result.rows as unknown as { name: string }[];
  return rows.map(row => row.name);
}

/**
 * Get all indexes in the database
 */
async function getAllIndexes(db: Client): Promise<string[]> {
  const query = `SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'`;
  const result = await db.execute(query);
  const rows = result.rows as unknown as { name: string }[];
  return rows.map(row => row.name);
}

/**
 * Get database file size
 */
async function getDatabaseSize(db: Client): Promise<number> {
  const query = `SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()`;
  const result = await db.execute(query);
  const row = result.rows[0] as unknown as { size: number };
  return row.size;
}

/**
 * Get row counts for all tables
 */
async function getRowCounts(db: Client, tables: string[]): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const query = `SELECT COUNT(*) as count FROM ${table}`;
    const result = await db.execute(query);
    const row = result.rows[0] as unknown as { count: number };
    counts[table] = row.count;
  }
  return counts;
}

/**
 * Main verification function
 */
async function verifySchema(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('SQLite Schema Verification Report');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Process: Node.js ${process.version}`);
  console.log(`Platform: ${process.platform} (${process.arch})`);
  console.log('='.repeat(80) + '\n');

  let db: Client;
  try {
    db = await getDatabase();
  } catch (error: any) {
    console.error('❌ CRITICAL ERROR: Failed to initialize SQLite database');
    console.error(`   Error: ${error.message}`);
    console.error('\n' + '='.repeat(80));
    console.error('VERIFICATION FAILED');
    console.error('='.repeat(80));
    process.exit(1);
  }

  // Get database information
  const dbSize = await getDatabaseSize(db);
  const allTables = await getAllTables(db);
  const allIndexes = await getAllIndexes(db);
  const rowCounts = await getRowCounts(db, allTables);

  console.log('📊 DATABASE INFORMATION');
  console.log('-'.repeat(80));
  console.log(`Database Size: ${(dbSize / 1024).toFixed(2)} KB`);
  console.log(`Total Tables: ${allTables.length}`);
  console.log(`Total Indexes: ${allIndexes.length}`);
  console.log('');

  // Verify tables
  console.log('🔍 TABLE VERIFICATION');
  console.log('-'.repeat(80));

  let allTablesValid = true;
  for (const [tableName, requiredColumns] of Object.entries(REQUIRED_TABLES)) {
    const exists = allTables.includes(tableName);

    if (!exists) {
      console.log(`❌ Table: ${tableName} - MISSING`);
      allTablesValid = false;
      continue;
    }

    const actualColumns = await getTableColumns(db, tableName);
    const missingColumns = requiredColumns.filter(col => !actualColumns.includes(col));
    const extraColumns = actualColumns.filter(col => !requiredColumns.includes(col));

    if (missingColumns.length === 0 && extraColumns.length === 0) {
      console.log(`✅ Table: ${tableName} (${rowCounts[tableName]} rows, ${actualColumns.length} columns)`);
    } else {
      console.log(`⚠️  Table: ${tableName} - COLUMN MISMATCH`);
      allTablesValid = false;

      if (missingColumns.length > 0) {
        console.log(`   Missing columns: ${missingColumns.join(', ')}`);
      }
      if (extraColumns.length > 0) {
        console.log(`   Extra columns: ${extraColumns.join(', ')}`);
      }
    }
  }
  console.log('');

  // Verify indexes
  console.log('🔍 INDEX VERIFICATION');
  console.log('-'.repeat(80));

  let allIndexesValid = true;
  for (const indexName of REQUIRED_INDEXES) {
    const exists = allIndexes.includes(indexName);

    if (exists) {
      console.log(`✅ Index: ${indexName}`);
    } else {
      console.log(`❌ Index: ${indexName} - MISSING`);
      allIndexesValid = false;
    }
  }
  console.log('');

  // Additional tables (not required but might exist)
  const extraTables = allTables.filter(t => !Object.keys(REQUIRED_TABLES).includes(t));
  if (extraTables.length > 0) {
    console.log('📋 ADDITIONAL TABLES');
    console.log('-'.repeat(80));
    for (const table of extraTables) {
      console.log(`   ${table} (${rowCounts[table]} rows)`);
    }
    console.log('');
  }

  // Summary
  console.log('='.repeat(80));
  console.log('VERIFICATION SUMMARY');
  console.log('='.repeat(80));
  console.log(`Tables: ${allTablesValid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`Indexes: ${allIndexesValid ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`Database Size: ${(dbSize / 1024).toFixed(2)} KB`);
  console.log(`Total Row Count: ${Object.values(rowCounts).reduce((a, b) => a + b, 0)}`);
  console.log('='.repeat(80));

  if (allTablesValid && allIndexesValid) {
    console.log('\n✅ VERIFICATION PASSED - Database schema is valid');
    process.exit(0);
  } else {
    console.log('\n❌ VERIFICATION FAILED - Database schema has issues');
    process.exit(1);
  }
}

// Run verification
async function main() {
  try {
    await verifySchema();
  } catch (error: any) {
    console.error('\n❌ VERIFICATION ERROR:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
