/**
 * @fileOverview SQLite Test Setup and Utilities
 *
 * Provides test database setup, teardown, and utilities for testing
 * SQLite-based features in isolation.
 *
 * @phase Phase 1 - SQLITE-004 - SQLite Testing Framework
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

/**
 * In-memory test database instance
 */
let testDb: Database.Database | null = null;

/**
 * Test database configuration
 */
export const TEST_DB_CONFIG = {
  useInMemory: true,
  verbose: process.env.TEST_VERBOSE === 'true',
} as const;

/**
 * Create an in-memory test database with schema
 *
 * @returns In-memory SQLite database instance
 */
export function createTestDatabase(): Database.Database {
  if (testDb) {
    console.warn('⚠️  [Test] Database already exists, closing and recreating...');
    testDb.close();
  }

  console.log('🧪 [Test] Creating in-memory test database...');
  testDb = new Database(':memory:', {
    verbose: TEST_DB_CONFIG.verbose ? console.log : undefined,
  });

  testDb.pragma('foreign_keys = ON');
  testDb.pragma('journal_mode = WAL');

  initializeTestSchema(testDb);

  console.log('✅ [Test] In-memory test database created');
  return testDb;
}

/**
 * Initialize test database schema
 */
function initializeTestSchema(db: Database.Database): void {
  console.log('🔧 [Test] Initializing test database schema...');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT,
      currentLevel INTEGER DEFAULT 1,
      currentXP INTEGER DEFAULT 0,
      totalXP INTEGER DEFAULT 0,
      attributes TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `);

  // Daily tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_tasks (
      id TEXT PRIMARY KEY,
      taskType TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      baseXP INTEGER NOT NULL,
      content TEXT,
      sourceChapter INTEGER,
      sourceVerseStart INTEGER,
      sourceVerseEnd INTEGER,
      createdAt INTEGER NOT NULL
    );
  `);

  // Daily progress table
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_progress (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      tasks TEXT,
      completedTaskIds TEXT,
      skippedTaskIds TEXT,
      totalXPEarned INTEGER DEFAULT 0,
      totalAttributeGains TEXT,
      usedSourceIds TEXT,
      streak INTEGER DEFAULT 0,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);

  // Task submissions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_submissions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      taskId TEXT NOT NULL,
      userAnswer TEXT NOT NULL,
      score INTEGER NOT NULL,
      feedback TEXT,
      xpEarned INTEGER DEFAULT 0,
      attributeGains TEXT,
      submittedAt INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (taskId) REFERENCES daily_tasks(id)
    );
  `);

  // XP transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS xp_transactions (
      transactionId TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT,
      source TEXT,
      sourceId TEXT,
      createdAt INTEGER NOT NULL,
      UNIQUE(userId, sourceId)
    );
  `);

  // XP transaction locks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS xp_transaction_locks (
      lockId TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      sourceId TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      UNIQUE(userId, sourceId)
    );
  `);

  // Level ups table
  db.exec(`
    CREATE TABLE IF NOT EXISTS level_ups (
      levelUpId TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      fromLevel INTEGER NOT NULL,
      toLevel INTEGER NOT NULL,
      unlockedContent TEXT,
      unlockedPermissions TEXT,
      createdAt INTEGER NOT NULL
    );
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date
    ON daily_progress(userId, date);

    CREATE INDEX IF NOT EXISTS idx_task_submissions_user_task
    ON task_submissions(userId, taskId);

    CREATE INDEX IF NOT EXISTS idx_daily_tasks_type
    ON daily_tasks(taskType);

    CREATE INDEX IF NOT EXISTS idx_xp_transactions_user
    ON xp_transactions(userId, createdAt DESC);

    CREATE INDEX IF NOT EXISTS idx_level_ups_user
    ON level_ups(userId, createdAt DESC);
  `);

  console.log('✅ [Test] Test database schema initialized');
}

/**
 * Get current test database instance
 *
 * @returns Test database instance or null
 */
export function getTestDatabase(): Database.Database | null {
  return testDb;
}

/**
 * Clean up test database
 */
export function cleanupTestDatabase(): void {
  if (testDb) {
    console.log('🧹 [Test] Cleaning up test database...');
    testDb.close();
    testDb = null;
    console.log('✅ [Test] Test database closed');
  }
}

/**
 * Clear all data from test database (keep schema)
 */
export function clearTestData(): void {
  if (!testDb) {
    console.warn('⚠️  [Test] No database to clear');
    return;
  }

  console.log('🧹 [Test] Clearing test data...');

  const tables = [
    'task_submissions',
    'daily_progress',
    'daily_tasks',
    'level_ups',
    'xp_transactions',
    'xp_transaction_locks',
    'users',
  ];

  for (const table of tables) {
    testDb.prepare(`DELETE FROM ${table}`).run();
  }

  console.log('✅ [Test] Test data cleared');
}

/**
 * Load test fixtures into database
 *
 * @param fixtureName - Name of the fixture file (without .json extension)
 */
export function loadTestFixture(fixtureName: string): void {
  if (!testDb) {
    throw new Error('Test database not initialized');
  }

  const fixturePath = path.join(__dirname, '../fixtures', `${fixtureName}.json`);

  if (!fs.existsSync(fixturePath)) {
    throw new Error(`Fixture file not found: ${fixturePath}`);
  }

  console.log(`📦 [Test] Loading fixture: ${fixtureName}`);

  const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'));

  // Load data for each table in the fixture
  for (const [tableName, rows] of Object.entries(fixtureData)) {
    if (!Array.isArray(rows) || rows.length === 0) {
      continue;
    }

    const columns = Object.keys(rows[0]);
    const placeholders = columns.map(() => '?').join(', ');
    const stmt = testDb.prepare(
      `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`
    );

    for (const row of rows) {
      const values = columns.map((col) => row[col]);
      stmt.run(...values);
    }

    console.log(`  ✅ Loaded ${rows.length} rows into ${tableName}`);
  }

  console.log(`✅ [Test] Fixture loaded: ${fixtureName}`);
}

/**
 * Get row count for a table
 *
 * @param tableName - Name of the table
 * @returns Row count
 */
export function getTableRowCount(tableName: string): number {
  if (!testDb) {
    throw new Error('Test database not initialized');
  }

  const result = testDb.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as {
    count: number;
  };
  return result.count;
}

/**
 * Jest setup hook - creates test database before all tests
 */
export function setupTestDatabase(): void {
  beforeAll(() => {
    createTestDatabase();
  });

  afterAll(() => {
    cleanupTestDatabase();
  });

  beforeEach(() => {
    clearTestData();
  });
}

/**
 * Export utilities for test modules
 */
export const testUtils = {
  createTestDatabase,
  getTestDatabase,
  cleanupTestDatabase,
  clearTestData,
  loadTestFixture,
  getTableRowCount,
  setupTestDatabase,
};
