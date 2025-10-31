#!/usr/bin/env tsx
/**
 * SQLite Schema Verification Script
 *
 * Verifies that all required tables and indexes exist in the SQLite database.
 * Used for SQLITE-001 verification deliverable.
 *
 * Usage: tsx scripts/verify-sqlite-schema.ts
 */

import { getDatabase } from '../src/lib/sqlite-db';
import type Database from 'better-sqlite3';

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
function getAllTables(db: Database.Database): string[] {
  const query = `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`;
  const rows = db.prepare(query).all() as { name: string }[];
  return rows.map(row => row.name);
}

/**
 * Get columns for a specific table
 */
function getTableColumns(db: Database.Database, tableName: string): string[] {
  const query = `PRAGMA table_info(${tableName})`;
  const rows = db.prepare(query).all() as { name: string }[];
  return rows.map(row => row.name);
}

/**
 * Get all indexes in the database
 */
function getAllIndexes(db: Database.Database): string[] {
  const query = `SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'`;
  const rows = db.prepare(query).all() as { name: string }[];
  return rows.map(row => row.name);
}

/**
 * Get database file size
 */
function getDatabaseSize(db: Database.Database): number {
  const query = `SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()`;
  const row = db.prepare(query).get() as { size: number };
  return row.size;
}

/**
 * Get row counts for all tables
 */
function getRowCounts(db: Database.Database, tables: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const table of tables) {
    const query = `SELECT COUNT(*) as count FROM ${table}`;
    const row = db.prepare(query).get() as { count: number };
    counts[table] = row.count;
  }
  return counts;
}

/**
 * Main verification function
 */
function verifySchema(): void {
  console.log('\n' + '='.repeat(80));
  console.log('SQLite Schema Verification Report');
  console.log('='.repeat(80));
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log(`Process: Node.js ${process.version}`);
  console.log(`Platform: ${process.platform} (${process.arch})`);
  console.log('='.repeat(80) + '\n');

  let db: Database.Database;
  try {
    db = getDatabase();
  } catch (error: any) {
    console.error('❌ CRITICAL ERROR: Failed to initialize SQLite database');
    console.error(`   Error: ${error.message}`);
    console.error('\n' + '='.repeat(80));
    console.error('VERIFICATION FAILED');
    console.error('='.repeat(80));
    process.exit(1);
  }

  // Get database information
  const dbSize = getDatabaseSize(db);
  const allTables = getAllTables(db);
  const allIndexes = getAllIndexes(db);
  const rowCounts = getRowCounts(db, allTables);

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

    const actualColumns = getTableColumns(db, tableName);
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
try {
  verifySchema();
} catch (error: any) {
  console.error('\n❌ VERIFICATION ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
}
