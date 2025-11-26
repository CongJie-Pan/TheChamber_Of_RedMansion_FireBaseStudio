/**
 * @fileOverview Migration Script: Add Password Fields to Users Table
 *
 * This script adds password authentication fields to the existing users table
 * for NextAuth.js integration (Phase 4 - SQLITE-019).
 *
 * Changes:
 * 1. Add `passwordHash` TEXT column for storing bcrypt hashed passwords
 * 2. Add UNIQUE constraint on `email` column for email uniqueness enforcement
 *
 * Usage:
 *   npm run migrate:add-password-fields
 *   npm run migrate:add-password-fields -- --dry-run  # Test without applying changes
 *
 * Rollback:
 *   See rollback section at the end of this file
 *
 * @phase Phase 4 - Authentication Replacement
 * @task SQLITE-019
 * @date 2025-10-30
 */

import { getDatabase } from '../../src/lib/sqlite-db';
import * as readline from 'readline';

/**
 * Check if the script is running in dry-run mode
 */
const isDryRun = process.argv.includes('--dry-run');
const verbose = process.argv.includes('--verbose') || process.argv.includes('-v');

/**
 * Console logging with dry-run indicator
 */
function log(message: string): void {
  const prefix = isDryRun ? '[DRY-RUN] ' : '';
  console.log(`${prefix}${message}`);
}

/**
 * Ask user for confirmation before proceeding
 */
async function confirmMigration(): Promise<boolean> {
  if (isDryRun) {
    log('⚠️  Dry-run mode enabled. No changes will be applied.');
    return true;
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      '\n⚠️  This migration will modify the users table schema.\n' +
      '   Please ensure you have a backup of your database.\n' +
      '   Continue? (yes/no): ',
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes');
      }
    );
  });
}

/**
 * Check if passwordHash column already exists
 */
async function checkColumnExists(db: any, tableName: string, columnName: string): Promise<boolean> {
  const result = await db.execute(`PRAGMA table_info(${tableName})`);
  return result.rows.some((col: any) => col.name === columnName);
}

/**
 * Check if email column has UNIQUE constraint
 */
async function checkEmailUniqueConstraint(db: any): Promise<boolean> {
  const result = await db.execute(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`);
  if (!result.rows[0]) return false;

  const sql: string = result.rows[0].sql as string;
  // Check if email has UNIQUE constraint in the CREATE TABLE statement
  return sql.includes('email TEXT UNIQUE') || sql.includes('UNIQUE(email)');
}

/**
 * Main migration function
 */
async function migrate(): Promise<void> {
  log('🚀 Starting migration: Add password fields to users table');
  log('================================================');

  try {
    // Get database instance
    const db = await getDatabase();
    if (!db) {
      throw new Error('Failed to get database instance');
    }

    log('✅ Database connection established');

    // Check if users table exists
    const tableExistsResult = await db.execute(`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`);
    const tableExists = tableExistsResult.rows[0];
    if (!tableExists) {
      log('⚠️  Users table does not exist. Migration not needed.');
      log('   If this is a new database, the schema will be created automatically.');
      return;
    }

    log('✅ Users table exists');

    // Check current state
    const passwordHashExists = await checkColumnExists(db, 'users', 'passwordHash');
    const emailUniqueExists = await checkEmailUniqueConstraint(db);

    log('\n📊 Current state:');
    log(`   - passwordHash column exists: ${passwordHashExists ? '✅ Yes' : '❌ No'}`);
    log(`   - email UNIQUE constraint exists: ${emailUniqueExists ? '✅ Yes' : '❌ No'}`);

    // Determine what needs to be done
    const needsPasswordHash = !passwordHashExists;
    const needsEmailUnique = !emailUniqueExists;

    if (!needsPasswordHash && !needsEmailUnique) {
      log('\n✅ Migration not needed. All fields already exist.');
      return;
    }

    log('\n📋 Migration plan:');
    if (needsPasswordHash) {
      log('   1. Add passwordHash TEXT column');
    }
    if (needsEmailUnique) {
      log('   2. Add UNIQUE constraint to email column (requires table recreation)');
    }

    // Ask for confirmation
    const confirmed = await confirmMigration();
    if (!confirmed) {
      log('\n❌ Migration cancelled by user');
      return;
    }

    // Begin migration
    log('\n🔧 Applying migration...');

    if (!isDryRun) {
      // Begin transaction
      await db.execute('BEGIN');

      try {
        // Step 1: Add passwordHash column if needed
        if (needsPasswordHash) {
          log('   Adding passwordHash column...');
          await db.execute(`ALTER TABLE users ADD COLUMN passwordHash TEXT`);
          log('   ✅ passwordHash column added');
        }

        // Step 2: Add UNIQUE constraint to email (requires table recreation)
        if (needsEmailUnique) {
          log('   Adding UNIQUE constraint to email column...');
          log('   This requires recreating the table with new schema...');

          // Get current table schema
          const currentSchemaResult = await db.execute(`SELECT sql FROM sqlite_master WHERE type='table' AND name='users'`);
          const currentSchema = currentSchemaResult.rows[0] as unknown as { sql: string } | undefined;
          if (verbose && currentSchema) {
            log(`   Current schema: ${currentSchema.sql}`);
          }

          // Create temporary table with all existing data
          log('   1. Creating temporary backup table...');
          await db.execute(`
            CREATE TABLE users_backup AS SELECT * FROM users;
          `);

          // Drop original table
          log('   2. Dropping original users table...');
          await db.execute(`DROP TABLE users`);

          // Recreate table with UNIQUE constraint on email
          log('   3. Recreating users table with UNIQUE email constraint...');
          await db.execute(`
            CREATE TABLE users (
              id TEXT PRIMARY KEY,
              username TEXT NOT NULL,
              email TEXT UNIQUE,
              passwordHash TEXT,
              currentLevel INTEGER DEFAULT 0,
              currentXP INTEGER DEFAULT 0,
              totalXP INTEGER DEFAULT 0,
              attributes TEXT,
              completedTasks TEXT,
              unlockedContent TEXT,
              completedChapters TEXT,
              hasReceivedWelcomeBonus INTEGER DEFAULT 0,
              stats TEXT,
              createdAt INTEGER NOT NULL,
              updatedAt INTEGER NOT NULL,
              lastActivityAt INTEGER
            );
          `);

          // Copy data back from temporary table
          log('   4. Restoring data from backup...');
          await db.execute(`
            INSERT INTO users SELECT * FROM users_backup;
          `);

          // Drop temporary table
          log('   5. Dropping backup table...');
          await db.execute(`DROP TABLE users_backup`);

          log('   ✅ UNIQUE constraint added to email column');
        }

        // Commit transaction
        await db.execute('COMMIT');
      } catch (error) {
        // Rollback on error
        await db.execute('ROLLBACK');
        throw error;
      }
    } else {
      log('   [Dry-run mode] Changes would be applied here');
    }

    // Verify migration
    log('\n🔍 Verifying migration...');
    const passwordHashFinal = await checkColumnExists(db, 'users', 'passwordHash');
    const emailUniqueFinal = await checkEmailUniqueConstraint(db);

    log('📊 Final state:');
    log(`   - passwordHash column exists: ${passwordHashFinal ? '✅ Yes' : '❌ No'}`);
    log(`   - email UNIQUE constraint exists: ${emailUniqueFinal ? '✅ Yes' : '❌ No'}`);

    if (passwordHashFinal && emailUniqueFinal) {
      log('\n✅ Migration completed successfully!');
    } else {
      log('\n⚠️  Migration may not have completed successfully. Please verify manually.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed with error:', error);
    console.error('\nStack trace:', (error as Error).stack);
    throw error;
  }
}

/**
 * Rollback instructions
 *
 * If you need to roll back this migration:
 *
 * 1. Remove passwordHash column:
 *    ALTER TABLE users DROP COLUMN passwordHash;
 *
 * 2. Remove UNIQUE constraint from email (requires table recreation):
 *    CREATE TABLE users_temp AS SELECT * FROM users;
 *    DROP TABLE users;
 *    CREATE TABLE users (...); -- Without UNIQUE on email
 *    INSERT INTO users SELECT * FROM users_temp;
 *    DROP TABLE users_temp;
 *
 * Note: SQLite does not support DROP COLUMN in all versions,
 *       so you may need to recreate the table to remove columns.
 */

// Run migration
if (require.main === module) {
  migrate()
    .then(() => {
      log('\n🎉 Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration script failed:', error);
      process.exit(1);
    });
}

export { migrate };
