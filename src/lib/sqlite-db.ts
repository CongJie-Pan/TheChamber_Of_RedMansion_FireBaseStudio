/**
 * @fileOverview SQLite Local Database Configuration
 *
 * This module provides SQLite database initialization and connection management
 * for local data storage, replacing Firebase Firestore.
 *
 * Key features:
 * - Automatic database schema creation
 * - Connection pooling and management
 * - Transaction support
 * - Type-safe database operations
 *
 * @phase Phase 2.9 - Local SQLite Database Implementation
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Database configuration
 */
const DB_CONFIG = {
  dbPath: path.join(process.cwd(), 'data', 'local-db', 'redmansion.db'),
  verbose: process.env.NODE_ENV === 'development',
} as const;

const SQLITE_ENABLED = process.env.USE_SQLITE !== '0' && process.env.USE_SQLITE !== 'false';

/**
 * Singleton database instance
 */
let dbInstance: Database.Database | null = null;

/**
 * Ensure the database directory exists
 */
function ensureDbDirectory(): void {
  const dbDir = path.dirname(DB_CONFIG.dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
    console.log(`✅ [SQLite] Created database directory: ${dbDir}`);
  }
}

/**
 * Initialize database schema
 */
function initializeSchema(db: Database.Database): void {
  console.log('🔧 [SQLite] Initializing database schema...');

  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT,
      currentLevel INTEGER DEFAULT 0,
      currentXP INTEGER DEFAULT 0,
      totalXP INTEGER DEFAULT 0,
      attributes TEXT, -- JSON format for user attributes
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
      content TEXT, -- JSON format for task content
      sourceChapter INTEGER,
      sourceVerseStart INTEGER,
      sourceVerseEnd INTEGER,
      createdAt INTEGER NOT NULL
    );
  `);

  // Daily progress table
  db.exec(`
    CREATE TABLE IF NOT EXISTS daily_progress (
      id TEXT PRIMARY KEY, -- userId_date format
      userId TEXT NOT NULL,
      date TEXT NOT NULL,
      tasks TEXT, -- JSON format for task assignments
      completedTaskIds TEXT, -- JSON array of completed task IDs
      skippedTaskIds TEXT, -- JSON array of skipped task IDs
      totalXPEarned INTEGER DEFAULT 0,
      totalAttributeGains TEXT, -- JSON format for attribute gains
      usedSourceIds TEXT, -- JSON array for anti-farming
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
      attributeGains TEXT, -- JSON format
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
      unlockedContent TEXT, -- JSON array
      unlockedPermissions TEXT, -- JSON array
      createdAt INTEGER NOT NULL
    );
  `);

  // Highlights table (Phase 2 - SQLITE-005)
  db.exec(`
    CREATE TABLE IF NOT EXISTS highlights (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      chapterId INTEGER NOT NULL,
      selectedText TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);

  // Notes table (Phase 2 - SQLITE-006)
  db.exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      chapterId INTEGER NOT NULL,
      selectedText TEXT NOT NULL,
      note TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      lastModified INTEGER NOT NULL,
      tags TEXT, -- JSON array
      isPublic INTEGER DEFAULT 0,
      wordCount INTEGER DEFAULT 0,
      noteType TEXT,
      FOREIGN KEY (userId) REFERENCES users(id)
    );
  `);

  // Posts table (Phase 3 - SQLITE-014)
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      authorId TEXT NOT NULL,
      authorName TEXT NOT NULL,
      title TEXT,
      content TEXT NOT NULL,
      tags TEXT, -- JSON array
      category TEXT,
      likes INTEGER DEFAULT 0,
      likedBy TEXT, -- JSON array of userIds
      bookmarkedBy TEXT, -- JSON array of userIds
      commentCount INTEGER DEFAULT 0,
      viewCount INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active', -- 'active', 'hidden', 'deleted'
      isEdited INTEGER DEFAULT 0,
      moderationAction TEXT,
      originalContent TEXT,
      moderationWarning TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (authorId) REFERENCES users(id)
    );
  `);

  // Create indexes for better query performance
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

    CREATE INDEX IF NOT EXISTS idx_highlights_user_chapter
    ON highlights(userId, chapterId);

    CREATE INDEX IF NOT EXISTS idx_notes_user_chapter
    ON notes(userId, chapterId);

    CREATE INDEX IF NOT EXISTS idx_notes_user
    ON notes(userId, createdAt DESC);

    CREATE INDEX IF NOT EXISTS idx_notes_public
    ON notes(isPublic, createdAt DESC);

    CREATE INDEX IF NOT EXISTS idx_posts_author
    ON posts(authorId, createdAt DESC);

    CREATE INDEX IF NOT EXISTS idx_posts_category
    ON posts(category, createdAt DESC);

    CREATE INDEX IF NOT EXISTS idx_posts_status
    ON posts(status, createdAt DESC);

    CREATE INDEX IF NOT EXISTS idx_posts_trending
    ON posts(likes DESC, viewCount DESC, createdAt DESC);
  `);

  console.log('✅ [SQLite] Database schema initialized');
}

/**
 * Flag to track if SQLite initialization has been attempted
 */
let initializationAttempted = false;
let initializationFailed = false;

/**
 * Get database instance (singleton pattern)
 * Returns null if initialization fails (e.g., architecture mismatch)
 *
 * @returns SQLite database instance or null if unavailable
 */
export function getDatabase(): Database.Database {
  if (typeof window !== 'undefined') {
    throw new Error('[SQLite] Attempted to initialize database in browser environment.');
  }

  if (!SQLITE_ENABLED) {
    throw new Error('[SQLite] USE_SQLITE environment flag is disabled. Set USE_SQLITE=1 to enable SQLite persistence.');
  }

  if (dbInstance) {
    return dbInstance;
  }

  if (initializationFailed) {
    throw new Error(
      'Failed to initialize SQLite database in this process. Check earlier logs or run "pnpm run doctor:sqlite" before retrying.'
    );
  }

  if (initializationAttempted) {
    throw new Error(
      'SQLite initialization already attempted without success. Restart the process after resolving the issue.'
    );
  }
  initializationAttempted = true;

  try {
    console.log('\n' + '━'.repeat(80));
    console.log('🔧 [SQLite] Initializing database connection');
    console.log('━'.repeat(80));
    console.log(`📁 Database path: ${DB_CONFIG.dbPath}`);

    ensureDbDirectory();

    dbInstance = new Database(DB_CONFIG.dbPath, {
      verbose: DB_CONFIG.verbose ? console.log : undefined,
    });

    dbInstance.pragma('foreign_keys = ON');
    dbInstance.pragma('journal_mode = WAL');

    initializeSchema(dbInstance);

    console.log('✅ [SQLite] Database connection established');
    console.log('━'.repeat(80) + '\n');

    return dbInstance;
  } catch (error: any) {
    initializationFailed = true;
    console.error('\n' + '━'.repeat(80));
    console.error('❌ [SQLite] Failed to initialize SQLite database');
    console.error('━'.repeat(80));
    console.error('Error details:', error);

    if (
      error?.code === 'ERR_DLOPEN_FAILED' ||
      error?.message?.includes('not a valid Win32 application') ||
      error?.message?.includes('wrong ELF class')
    ) {
      console.warn('⚠️  [SQLite] Architecture mismatch detected');
      console.warn('⚠️  This usually happens when:');
      console.warn('⚠️  1. Running Windows Node.js with WSL-compiled better-sqlite3');
      console.warn('⚠️  2. Running WSL Node.js with Windows-compiled better-sqlite3');
      console.warn('⚠️  Solution: Run "pnpm run doctor:sqlite" to inspect the environment and rebuild better-sqlite3');
    }
    console.error('━'.repeat(80) + '\n');

    const guidance =
      'Failed to initialize SQLite database. Run "pnpm run doctor:sqlite" and ensure better-sqlite3 is rebuilt for this environment.';
    const initializationError = new Error(`${guidance}\nOriginal error: ${error?.message ?? error}`);
    initializationError.stack = error?.stack;
    throw initializationError;
  }
}

/**
 * Check if SQLite is available in the current environment
 *
 * @returns true if SQLite is successfully initialized, false otherwise
 */
export function isSQLiteAvailable(): boolean {
  return Boolean(dbInstance) && !initializationFailed;
}

/**
 * Health check for database connection
 *
 * @returns Object with health status and details
 */
export function checkDatabaseHealth(): {
  healthy: boolean;
  initialized: boolean;
  accessible: boolean;
  error?: string;
} {
  const result = {
    healthy: false,
    initialized: Boolean(dbInstance),
    accessible: false,
    error: undefined as string | undefined,
  };

  if (!dbInstance) {
    result.error = 'Database not initialized';
    return result;
  }

  try {
    // Simple query to test database accessibility
    const stmt = dbInstance.prepare('SELECT 1 as test');
    const row = stmt.get() as { test: number };
    result.accessible = row.test === 1;
    result.healthy = result.accessible;
  } catch (error: any) {
    result.error = error.message;
    result.accessible = false;
  }

  return result;
}

/**
 * Get database statistics
 *
 * @returns Database statistics object
 */
export function getDatabaseStats(): {
  size: number;
  pageCount: number;
  pageSize: number;
  tables: number;
} | null {
  if (!dbInstance) {
    return null;
  }

  try {
    const sizeQuery = `SELECT page_count * page_size as size, page_count, page_size
                       FROM pragma_page_count(), pragma_page_size()`;
    const sizeRow = dbInstance.prepare(sizeQuery).get() as {
      size: number;
      page_count: number;
      page_size: number;
    };

    const tablesQuery = `SELECT COUNT(*) as count FROM sqlite_master
                         WHERE type='table' AND name NOT LIKE 'sqlite_%'`;
    const tablesRow = dbInstance.prepare(tablesQuery).get() as { count: number };

    return {
      size: sizeRow.size,
      pageCount: sizeRow.page_count,
      pageSize: sizeRow.page_size,
      tables: tablesRow.count,
    };
  } catch (error: any) {
    console.error('❌ [SQLite] Failed to get database stats:', error.message);
    return null;
  }
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
      dbInstance = null;
      console.log('✅ [SQLite] Database connection closed');
    } catch (error: any) {
      console.error('❌ [SQLite] Error closing database:', error.message);
    }
  }
}

/**
 * Execute a transaction
 *
 * @param callback - Transaction callback function
 * @returns Transaction result
 */
export function transaction<T>(
  callback: (db: Database.Database) => T
): T {
  const db = getDatabase();
  const txn = db.transaction(callback);
  return txn(db);
}

/**
 * Utility function to convert Timestamp-like objects to Unix timestamp
 */
export function toUnixTimestamp(timestamp?: { seconds?: number; toMillis?: () => number }): number {
  if (!timestamp) {
    return Date.now();
  }
  if (typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  if (timestamp.seconds) {
    return timestamp.seconds * 1000;
  }
  return Date.now();
}

/**
 * Utility function to create Timestamp-like object from Unix timestamp
 */
export function fromUnixTimestamp(unixMs: number): { seconds: number; nanoseconds: number; toMillis: () => number } {
  return {
    seconds: Math.floor(unixMs / 1000),
    nanoseconds: (unixMs % 1000) * 1000000,
    toMillis: () => unixMs,
  };
}

/**
 * Export database configuration for external use
 */
export const SQLITE_CONFIG = {
  ...DB_CONFIG,
} as const;

/**
 * Graceful shutdown handler
 * Closes database connection on process termination signals
 */
function setupGracefulShutdown(): void {
  // Only setup handlers in server environment
  if (typeof window !== 'undefined') {
    return;
  }

  const shutdownHandler = (signal: string) => {
    console.log(`\n📴 [SQLite] Received ${signal}, closing database connection...`);
    closeDatabase();
    process.exit(0);
  };

  // Register handlers for termination signals
  process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
  process.on('SIGINT', () => shutdownHandler('SIGINT'));

  // Handle uncaught exceptions
  process.on('beforeExit', () => {
    if (dbInstance) {
      console.log('📴 [SQLite] Process exiting, closing database connection...');
      closeDatabase();
    }
  });
}

// Setup graceful shutdown handlers
setupGracefulShutdown();
