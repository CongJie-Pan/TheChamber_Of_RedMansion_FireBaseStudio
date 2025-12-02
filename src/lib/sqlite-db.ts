/**
 * @fileOverview Turso LibSQL Database Configuration
 *
 * This module provides Turso LibSQL database initialization and connection management
 * for cloud-based data storage, replacing local SQLite (better-sqlite3).
 *
 * Key features:
 * - Cloud-based database with edge replication
 * - Automatic database schema creation
 * - Connection pooling and management
 * - Transaction support
 * - Type-safe database operations
 *
 * Migration from better-sqlite3 to @libsql/client:
 * - Synchronous APIs → Asynchronous APIs (async/await)
 * - Local file-based → Cloud-based (Turso)
 * - db.prepare().get() → await db.execute()
 * - db.prepare().all() → await db.execute()
 * - db.prepare().run() → await db.execute()
 *
 * @phase Phase 5.1 - Vercel Deployment - Turso Database Migration
 */

import { createClient, type Client, type ResultSet } from '@libsql/client';

/**
 * Database configuration
 */
const DB_CONFIG = {
  url: process.env.TURSO_DATABASE_URL || '',
  authToken: process.env.TURSO_AUTH_TOKEN || '',
  verbose: process.env.NODE_ENV === 'development',
} as const;

const SQLITE_ENABLED = process.env.USE_SQLITE !== '0' && process.env.USE_SQLITE !== 'false';

/**
 * Singleton database instance
 */
let dbInstance: Client | null = null;

/**
 * Initialize database schema
 */
async function initializeSchema(db: Client): Promise<void> {
  console.log('🔧 [Turso] Initializing database schema...');

  // Users table (Phase 3 - SQLITE-016: Extended for user-level-service compatibility)
  // Phase 4 - SQLITE-019: Added passwordHash for NextAuth.js authentication
  // Phase 4 - SQLITE-021: Added isGuest for guest/anonymous login support
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT UNIQUE, -- UNIQUE constraint for email uniqueness (Phase 4 - SQLITE-019)
      passwordHash TEXT, -- bcrypt hashed password for NextAuth.js (Phase 4 - SQLITE-019)
      isGuest INTEGER DEFAULT 0, -- 0=false (regular user), 1=true (guest account) (Phase 4 - SQLITE-021)
      currentLevel INTEGER DEFAULT 0,
      currentXP INTEGER DEFAULT 0,
      totalXP INTEGER DEFAULT 0,
      attributes TEXT, -- JSON format for user attributes
      completedTasks TEXT, -- JSON array of completed task IDs
      unlockedContent TEXT, -- JSON array of unlocked content IDs
      completedChapters TEXT, -- JSON array of completed chapter numbers
      hasReceivedWelcomeBonus INTEGER DEFAULT 0, -- 0=false, 1=true
      stats TEXT, -- JSON object with user statistics (chaptersCompleted, totalReadingTimeMinutes, etc.)
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      lastActivityAt INTEGER -- Last user activity timestamp
    );
  `);

  // Daily tasks table
  await db.execute(`
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
  await db.execute(`
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
  await db.execute(`
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
  await db.execute(`
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
  await db.execute(`
    CREATE TABLE IF NOT EXISTS xp_transaction_locks (
      lockId TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      sourceId TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      UNIQUE(userId, sourceId)
    );
  `);

  // Level ups table
  await db.execute(`
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
  await db.execute(`
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
  // Task 4.9: Added sharedPostId for bi-directional note-post linking
  await db.execute(`
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
      sharedPostId TEXT, -- Task 4.9: Reference to community post if note is shared
      FOREIGN KEY (userId) REFERENCES users(id),
      FOREIGN KEY (sharedPostId) REFERENCES posts(id)
    );
  `);

  // Posts table (Phase 3 - SQLITE-014)
  // Task 4.9: Added sourceNoteId and editedAt for bi-directional note-post linking
  await db.execute(`
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
      editedAt INTEGER, -- Task 4.9: Timestamp of last edit
      sourceNoteId TEXT, -- Task 4.9: Reference to source note if shared from reading notes
      moderationAction TEXT,
      originalContent TEXT,
      moderationWarning TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (authorId) REFERENCES users(id),
      FOREIGN KEY (sourceNoteId) REFERENCES notes(id)
    );
  `);

  // Comments table (Phase 3 - SQLITE-015)
  await db.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      postId TEXT NOT NULL,
      authorId TEXT NOT NULL,
      authorName TEXT NOT NULL,
      content TEXT NOT NULL,
      parentCommentId TEXT, -- NULL for root comments, commentId for nested replies
      depth INTEGER DEFAULT 0, -- 0 for root, 1 for first-level reply, etc.
      replyCount INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      likedBy TEXT, -- JSON array of userIds
      status TEXT DEFAULT 'active', -- 'active', 'hidden', 'deleted'
      isEdited INTEGER DEFAULT 0,
      moderationAction TEXT,
      originalContent TEXT,
      moderationWarning TEXT,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (authorId) REFERENCES users(id),
      FOREIGN KEY (parentCommentId) REFERENCES comments(id) ON DELETE CASCADE
    );
  `);

  // Create indexes for better query performance
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_daily_progress_user_date
    ON daily_progress(userId, date);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_task_submissions_user_task
    ON task_submissions(userId, taskId);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_daily_tasks_type
    ON daily_tasks(taskType);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_xp_transactions_user
    ON xp_transactions(userId, createdAt DESC);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_level_ups_user
    ON level_ups(userId, createdAt DESC);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_highlights_user_chapter
    ON highlights(userId, chapterId);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_notes_user_chapter
    ON notes(userId, chapterId);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_notes_user
    ON notes(userId, createdAt DESC);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_notes_public
    ON notes(isPublic, createdAt DESC);
  `);
  // Task 4.9: Index for note-post linking
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_notes_shared_post
    ON notes(sharedPostId);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_posts_author
    ON posts(authorId, createdAt DESC);
  `);
  // Task 4.9: Index for post-note linking
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_posts_source_note
    ON posts(sourceNoteId);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_posts_category
    ON posts(category, createdAt DESC);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_posts_status
    ON posts(status, createdAt DESC);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_posts_trending
    ON posts(likes DESC, viewCount DESC, createdAt DESC);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_comments_postId
    ON comments(postId, createdAt ASC);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_comments_authorId
    ON comments(authorId, createdAt DESC);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_comments_parentId
    ON comments(parentCommentId, createdAt ASC);
  `);
  await db.execute(`
    CREATE INDEX IF NOT EXISTS idx_comments_status
    ON comments(status);
  `);

  console.log('✅ [Turso] Database schema initialized');
}

/**
 * Verify database schema integrity
 * Checks if all required tables exist and reports any issues
 */
async function verifySchema(db: Client): Promise<void> {
  console.log('🔍 [Turso] Verifying database schema...');

  const requiredTables = [
    'users',
    'daily_tasks',
    'daily_progress',
    'task_submissions',
    'xp_transactions',
    'xp_transaction_locks',
    'level_ups',
    'highlights',
    'notes',
    'posts',
    'comments',
  ];

  try {
    // Get all existing tables
    const result: ResultSet = await db.execute(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    );

    const existingTables = result.rows.map(row => row.name as string);

    console.log('📊 [Turso] Existing tables:', existingTables.join(', '));

    // Check for missing tables
    const missingTables = requiredTables.filter(
      table => !existingTables.includes(table)
    );

    if (missingTables.length > 0) {
      console.error('❌ [Turso] Missing tables:', missingTables.join(', '));
      throw new Error(
        `Database schema incomplete. Missing tables: ${missingTables.join(', ')}`
      );
    }

    console.log('✅ [Turso] Schema verification passed');
  } catch (error: any) {
    console.error('❌ [Turso] Schema verification failed:', error);
    throw error;
  }
}

/**
 * Background schema initialization (non-blocking for lazy initialization)
 * This runs asynchronously without blocking the main request
 *
 * @param db - Database client instance
 */
async function initializeSchemaAsync(db: Client): Promise<void> {
  try {
    console.log('🔄 [Turso] Background: Testing database connection...');
    await db.execute('SELECT 1');

    console.log('🔄 [Turso] Background: Initializing schema...');
    await initializeSchema(db);

    console.log('🔄 [Turso] Background: Verifying schema...');
    await verifySchema(db);

    console.log('✅ [Turso] Background schema initialization complete');
  } catch (error: any) {
    console.error('❌ [Turso] Background schema initialization error:', error.message);
    // Don't throw - this is a background operation
    // The database client is still usable, queries will handle missing tables gracefully
  }
}

/**
 * Flag to track if Turso initialization has been attempted
 */
let initializationAttempted = false;
let initializationFailed = false;

/**
 * Initialize database connection asynchronously (called once on app startup)
 * This ensures schema is set up before any repository code runs
 *
 * @returns Promise that resolves when database is ready
 */
export async function initializeDatabase(): Promise<void> {
  if (typeof window !== 'undefined') {
    throw new Error('[Turso] Attempted to initialize database in browser environment.');
  }

  if (!SQLITE_ENABLED) {
    throw new Error('[Turso] USE_SQLITE environment flag is disabled. Set USE_SQLITE=1 to enable database persistence.');
  }

  if (dbInstance) {
    return; // Already initialized
  }

  if (initializationFailed) {
    throw new Error(
      'Failed to initialize Turso database in this process. Check earlier logs or environment variables before retrying.'
    );
  }

  if (initializationAttempted) {
    throw new Error(
      'Turso initialization already attempted without success. Restart the process after resolving the issue.'
    );
  }
  initializationAttempted = true;

  try {
    console.log('\n' + '━'.repeat(80));
    console.log('🔧 [Turso] Initializing database connection');
    console.log('━'.repeat(80));

    // Validate environment variables
    if (!DB_CONFIG.url) {
      throw new Error('TURSO_DATABASE_URL environment variable is not set');
    }
    if (!DB_CONFIG.authToken) {
      throw new Error('TURSO_AUTH_TOKEN environment variable is not set');
    }

    console.log(`📁 Database URL: ${DB_CONFIG.url.substring(0, 40)}...`);

    dbInstance = createClient({
      url: DB_CONFIG.url,
      authToken: DB_CONFIG.authToken,
    });

    // Test connection
    await dbInstance.execute('SELECT 1');

    await initializeSchema(dbInstance);

    // Verify schema integrity after initialization
    await verifySchema(dbInstance);

    console.log('✅ [Turso] Database connection established');
    console.log('━'.repeat(80) + '\n');
  } catch (error: any) {
    initializationFailed = true;
    console.error('\n' + '━'.repeat(80));
    console.error('❌ [Turso] Failed to initialize Turso database');
    console.error('━'.repeat(80));
    console.error('Error details:', error);

    if (error?.message?.includes('TURSO_DATABASE_URL')) {
      console.warn('⚠️  [Turso] Missing TURSO_DATABASE_URL environment variable');
      console.warn('⚠️  Please add to .env.local:');
      console.warn('⚠️  TURSO_DATABASE_URL=libsql://your-database.turso.io');
      console.warn('⚠️  TURSO_AUTH_TOKEN=your_auth_token');
    }
    console.error('━'.repeat(80) + '\n');

    const guidance =
      'Failed to initialize Turso database. Ensure TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set in .env.local';
    const initializationError = new Error(`${guidance}\nOriginal error: ${error?.message ?? error}`);
    initializationError.stack = error?.stack;
    throw initializationError;
  }
}

/**
 * Get database instance (singleton pattern) with lazy initialization
 *
 * This function supports both startup initialization (via instrumentation hook)
 * and lazy initialization (for serverless environments where startup hooks are unreliable).
 *
 * @returns Turso database client instance
 * @throws Error if database initialization fails or environment is invalid
 */
export function getDatabase(): Client {
  if (typeof window !== 'undefined') {
    throw new Error('[Turso] Attempted to access database in browser environment.');
  }

  if (!SQLITE_ENABLED) {
    throw new Error('[Turso] USE_SQLITE environment flag is disabled. Set USE_SQLITE=1 to enable database persistence.');
  }

  if (initializationFailed) {
    throw new Error(
      'Database initialization failed. Check earlier logs or environment variables before retrying.'
    );
  }

  // Lazy initialization: Initialize on first access if not already done
  if (!dbInstance && !initializationAttempted) {
    console.warn('⚡ [Turso] Lazy initialization triggered (serverless cold start or instrumentation hook failed)');

    // Mark as attempted to prevent concurrent initialization
    initializationAttempted = true;

    try {
      // Validate environment variables
      if (!DB_CONFIG.url) {
        throw new Error('TURSO_DATABASE_URL environment variable is not set');
      }
      if (!DB_CONFIG.authToken) {
        throw new Error('TURSO_AUTH_TOKEN environment variable is not set');
      }

      console.log('🔄 [Turso] Creating database client...');

      // Create client (connection is lazy in LibSQL - actual connection happens on first query)
      dbInstance = createClient({
        url: DB_CONFIG.url,
        authToken: DB_CONFIG.authToken,
      });

      console.log('✅ [Turso] Database client created successfully');
      console.log('🔄 [Turso] Schema will be initialized in background...');

      // Schedule async schema initialization in background (non-blocking)
      // This ensures the first request isn't blocked by schema creation
      initializeSchemaAsync(dbInstance).catch(err => {
        console.error('❌ [Turso] Background schema initialization failed:', err);
        // Don't set initializationFailed here - client is still usable
      });

    } catch (error: any) {
      initializationFailed = true;
      const errorMessage = `Database lazy initialization failed: ${error.message}`;
      console.error('❌ [Turso]', errorMessage);
      throw new Error(errorMessage);
    }
  }

  if (!dbInstance) {
    throw new Error(
      'Database initialization failed. This should not happen after lazy initialization attempt. ' +
      'Check logs for detailed error information.'
    );
  }

  return dbInstance;
}

/**
 * Check if database is available in the current environment
 *
 * @returns true if database is successfully initialized, false otherwise
 */
export function isDatabaseAvailable(): boolean {
  return Boolean(dbInstance) && !initializationFailed;
}

/**
 * Health check for database connection
 *
 * @returns Object with health status and details
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  initialized: boolean;
  accessible: boolean;
  error?: string;
}> {
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
    const testResult = await dbInstance.execute('SELECT 1 as test');
    result.accessible = testResult.rows.length > 0 && testResult.rows[0].test === 1;
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
export async function getDatabaseStats(): Promise<{
  size: number;
  pageCount: number;
  pageSize: number;
  tables: number;
} | null> {
  if (!dbInstance) {
    return null;
  }

  try {
    const sizeQuery = `SELECT page_count * page_size as size, page_count, page_size
                       FROM pragma_page_count(), pragma_page_size()`;
    const sizeResult = await dbInstance.execute(sizeQuery);
    const sizeRow = sizeResult.rows[0] as unknown as {
      size: number;
      page_count: number;
      page_size: number;
    };

    const tablesQuery = `SELECT COUNT(*) as count FROM sqlite_master
                         WHERE type='table' AND name NOT LIKE 'sqlite_%'`;
    const tablesResult = await dbInstance.execute(tablesQuery);
    const tablesRow = tablesResult.rows[0] as unknown as { count: number };

    return {
      size: sizeRow.size,
      pageCount: sizeRow.page_count,
      pageSize: sizeRow.page_size,
      tables: tablesRow.count,
    };
  } catch (error: any) {
    console.error('❌ [Turso] Failed to get database stats:', error.message);
    return null;
  }
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    try {
      await dbInstance.close();
      dbInstance = null;
      console.log('✅ [Turso] Database connection closed');
    } catch (error: any) {
      console.error('❌ [Turso] Error closing database:', error.message);
    }
  }
}

/**
 * Execute a transaction
 * Note: Turso supports transactions but with different API than better-sqlite3
 *
 * Bug Fix (2025-12-02): Added safe rollback handling for serverless/Turso environments.
 * In HTTP-based connections, transactions may become inactive due to timeouts or
 * network issues. The rollback now gracefully handles "no transaction is active" errors.
 *
 * @param callback - Transaction callback function
 * @returns Transaction result
 */
export async function transaction<T>(
  callback: (db: Client) => Promise<T>
): Promise<T> {
  const db = getDatabase();

  try {
    await db.execute('BEGIN');
    const result = await callback(db);
    await db.execute('COMMIT');
    return result;
  } catch (error) {
    // 🛡️ Safe rollback: Handle case where transaction is already inactive
    // This can happen in serverless/Turso environments where:
    // 1. HTTP connection times out
    // 2. Transaction already auto-rolled back
    // 3. Network interruption occurred
    try {
      await db.execute('ROLLBACK');
    } catch (rollbackError) {
      // Log warning but don't throw - the original error is more important
      console.warn(
        '[Turso] Rollback failed (transaction may already be inactive):',
        rollbackError instanceof Error ? rollbackError.message : rollbackError
      );
    }
    throw error;
  }
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
 *
 * @param unixMs - Unix timestamp in milliseconds (can be null/undefined)
 * @returns Timestamp-like object with methods (toDate, toMillis, etc.)
 *
 * Fixed: Handle null/undefined timestamps by using current time as fallback
 * This prevents NaN errors when database fields are null
 */
export function fromUnixTimestamp(unixMs: number | null | undefined): {
  seconds: number;
  nanoseconds: number;
  toMillis: () => number;
  toDate: () => Date;
  isEqual: (other: any) => boolean;
  toJSON: () => object;
} {
  // 🛡️ Defensive check: handle null/undefined timestamps
  // Use current time as fallback to prevent NaN errors
  const validUnixMs = unixMs ?? Date.now();

  // Log warning in development mode to help identify data integrity issues
  if (process.env.NODE_ENV === 'development' && (unixMs === null || unixMs === undefined)) {
    console.warn('[fromUnixTimestamp] Received null/undefined timestamp, using current time as fallback');
  }

  return {
    seconds: Math.floor(validUnixMs / 1000),
    nanoseconds: (validUnixMs % 1000) * 1000000,
    toMillis: () => validUnixMs,
    toDate: () => new Date(validUnixMs),
    isEqual: (other: any) => {
      if (!other || typeof other.toMillis !== 'function') return false;
      return other.toMillis() === validUnixMs;
    },
    toJSON: () => ({
      seconds: Math.floor(validUnixMs / 1000),
      nanoseconds: (validUnixMs % 1000) * 1000000,
    }),
  };
}

/**
 * Export database configuration for external use
 */
export const TURSO_CONFIG = {
  url: DB_CONFIG.url,
  verbose: DB_CONFIG.verbose,
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
    console.log(`\n📴 [Turso] Received ${signal}, closing database connection...`);
    closeDatabase().then(() => {
      process.exit(0);
    });
  };

  // Register handlers for termination signals
  process.on('SIGTERM', () => shutdownHandler('SIGTERM'));
  process.on('SIGINT', () => shutdownHandler('SIGINT'));

  // Handle uncaught exceptions
  process.on('beforeExit', () => {
    if (dbInstance) {
      console.log('📴 [Turso] Process exiting, closing database connection...');
      closeDatabase();
    }
  });
}

// Setup graceful shutdown handlers
setupGracefulShutdown();

// Export Client type for use in other modules
export type { Client, ResultSet };
