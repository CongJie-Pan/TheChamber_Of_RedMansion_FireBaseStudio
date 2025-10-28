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
      currentLevel INTEGER DEFAULT 1,
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

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date
    ON daily_progress(userId, date);

    CREATE INDEX IF NOT EXISTS idx_task_submissions_user_task
    ON task_submissions(userId, taskId);

    CREATE INDEX IF NOT EXISTS idx_daily_tasks_type
    ON daily_tasks(taskType);
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
export function getDatabase(): Database.Database | null {
  if (dbInstance) {
    return dbInstance;
  }

  // If we've already tried and failed, don't try again
  if (initializationFailed) {
    return null;
  }

  // Mark that we've attempted initialization
  if (initializationAttempted) {
    return null;
  }
  initializationAttempted = true;

  try {
    console.log('\n' + '━'.repeat(80));
    console.log('🔧 [SQLite] Initializing database connection');
    console.log('━'.repeat(80));
    console.log(`📁 Database path: ${DB_CONFIG.dbPath}`);

    // Ensure directory exists
    ensureDbDirectory();

    // Create database connection
    dbInstance = new Database(DB_CONFIG.dbPath, {
      verbose: DB_CONFIG.verbose ? console.log : undefined,
    });

    // Enable foreign keys
    dbInstance.pragma('foreign_keys = ON');

    // Set journal mode to WAL for better concurrency
    dbInstance.pragma('journal_mode = WAL');

    // Initialize schema
    initializeSchema(dbInstance);

    console.log('✅ [SQLite] Database connection established');
    console.log('━'.repeat(80) + '\n');

    return dbInstance;
  } catch (error: any) {
    initializationFailed = true;
    console.error('\n' + '━'.repeat(80));
    console.error('❌ [SQLite] Failed to initialize database');
    console.error('━'.repeat(80));
    console.error('Error details:', error);

    // Check if it's an architecture mismatch error
    if (error?.code === 'ERR_DLOPEN_FAILED' ||
        error?.message?.includes('not a valid Win32 application') ||
        error?.message?.includes('wrong ELF class')) {
      console.warn('⚠️  [SQLite] Architecture mismatch detected');
      console.warn('⚠️  This usually happens when:');
      console.warn('⚠️  1. Running Windows Node.js with WSL-compiled better-sqlite3');
      console.warn('⚠️  2. Running WSL Node.js with Windows-compiled better-sqlite3');
      console.warn('⚠️  Solution: Run "npm rebuild better-sqlite3" in the correct environment');
      console.warn('⚠️  Falling back to Firebase for data storage');
    }
    console.error('━'.repeat(80) + '\n');

    // Return null instead of throwing - allow graceful fallback to Firebase
    return null;
  }
}

/**
 * Check if SQLite is available in the current environment
 *
 * @returns true if SQLite is successfully initialized, false otherwise
 */
export function isSQLiteAvailable(): boolean {
  const db = getDatabase();
  return db !== null;
}

/**
 * Close database connection
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('✅ [SQLite] Database connection closed');
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
