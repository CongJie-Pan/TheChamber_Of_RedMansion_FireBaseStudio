#!/usr/bin/env tsx
/**
 * @fileOverview Users Migration Script - Firebase to SQLite
 *
 * Migrates user profiles, level-ups, XP transactions, and XP locks from Firebase
 * Firestore to SQLite database using atomic batch transactions.
 *
 * Collections migrated:
 * - users (main collection) → users table
 * - levelUps (separate collection, userId foreign key) → level_ups table
 * - xpTransactions (separate collection, userId foreign key) → xp_transactions table
 * - xp_transaction_locks (separate collection, userId foreign key) → xp_transaction_locks table
 *
 * Usage:
 *   npm run migrate:users           # Normal migration
 *   npm run migrate:users -- --dry-run  # Test without writing
 *   npm run migrate:users -- --verbose  # Detailed logging
 *   npm run migrate:users -- --batch-size=50  # Custom batch size
 *
 * @phase Phase 3 - SQLITE-018 - Users & Community Migration
 */

import { BaseMigrator, type MigrationOptions, type MigrationStats } from './base-migrator';
import { db } from '../../src/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import {
  batchCreateUsers,
  batchCreateLevelUps,
  batchCreateXPTransactions,
  batchCreateXPLocks,
  type UserProfile,
  type UserStats,
} from '../../src/lib/repositories/user-repository';
import type { AttributePoints } from '../../src/lib/types/user-level';

/**
 * Firestore User document structure
 */
interface FirestoreUser {
  id: string; // Document ID (userId)
  username: string;
  email?: string;
  currentLevel: number;
  currentXP: number;
  totalXP: number;
  attributes: AttributePoints | Record<string, number>;
  completedTasks?: string[]; // Task IDs array
  unlockedContent?: string[]; // Content IDs array
  completedChapters?: number[]; // Chapter numbers array
  hasReceivedWelcomeBonus?: boolean;
  stats?: UserStats | Record<string, number>;
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  lastActivityAt?: any; // Firestore Timestamp
}

/**
 * Firestore Level-Up Record structure
 */
interface FirestoreLevelUp {
  id: string; // Document ID (levelUpId)
  userId: string;
  fromLevel: number;
  toLevel: number;
  unlockedContent?: string[];
  unlockedPermissions?: string[];
  timestamp: any; // Firestore Timestamp
}

/**
 * Firestore XP Transaction structure
 */
interface FirestoreXPTransaction {
  id: string; // Document ID (transactionId)
  userId: string;
  amount: number;
  reason: string;
  source: string;
  sourceId: string;
  timestamp: any; // Firestore Timestamp
}

/**
 * Firestore XP Lock structure
 */
interface FirestoreXPLock {
  id: string; // Document ID (lockId)
  userId: string;
  sourceId: string;
  createdAt: any; // Firestore Timestamp
}

/**
 * Default values for missing fields
 */
const DEFAULT_ATTRIBUTES: AttributePoints = {
  poetrySkill: 0,
  culturalKnowledge: 0,
  analyticalThinking: 0,
  socialInfluence: 0,
  learningPersistence: 0,
};

const DEFAULT_STATS: UserStats = {
  chaptersCompleted: 0,
  totalReadingTimeMinutes: 0,
  notesCount: 0,
  currentStreak: 0,
  longestStreak: 0,
  aiInteractionsCount: 0,
  communityPostsCount: 0,
  communityLikesReceived: 0,
};

/**
 * Users Migrator Class
 */
class UsersMigrator extends BaseMigrator {
  private users: UserProfile[] = [];
  private levelUps: Array<{
    levelUpId: string;
    userId: string;
    fromLevel: number;
    toLevel: number;
    unlockedContent?: string[];
    unlockedPermissions?: string[];
    timestamp: number;
  }> = [];
  private xpTransactions: Array<{
    transactionId: string;
    userId: string;
    amount: number;
    reason: string;
    source: string;
    sourceId: string;
    timestamp: number;
  }> = [];
  private xpLocks: Array<{
    lockId: string;
    userId: string;
    sourceId: string;
    timestamp: number;
  }> = [];

  /**
   * Validate a user record before migration
   */
  protected validateUser(record: FirestoreUser): boolean {
    if (!record.id || typeof record.id !== 'string') {
      this.log(`Invalid userId in user document`, 'warn');
      return false;
    }

    if (!record.username || typeof record.username !== 'string') {
      this.log(`Invalid username in user: ${record.id}`, 'warn');
      return false;
    }

    if (typeof record.currentLevel !== 'number') {
      this.log(`Invalid currentLevel in user: ${record.id}`, 'warn');
      return false;
    }

    if (typeof record.currentXP !== 'number' || typeof record.totalXP !== 'number') {
      this.log(`Invalid XP values in user: ${record.id}`, 'warn');
      return false;
    }

    return true;
  }

  /**
   * Validate a level-up record
   */
  protected validateLevelUp(record: FirestoreLevelUp): boolean {
    if (!record.userId || !record.id) {
      this.log(`Invalid level-up record: missing userId or id`, 'warn');
      return false;
    }

    if (typeof record.fromLevel !== 'number' || typeof record.toLevel !== 'number') {
      this.log(`Invalid level values in level-up: ${record.id}`, 'warn');
      return false;
    }

    return true;
  }

  /**
   * Validate an XP transaction record
   */
  protected validateXPTransaction(record: FirestoreXPTransaction): boolean {
    if (!record.userId || !record.id) {
      this.log(`Invalid XP transaction: missing userId or id`, 'warn');
      return false;
    }

    if (typeof record.amount !== 'number') {
      this.log(`Invalid amount in XP transaction: ${record.id}`, 'warn');
      return false;
    }

    return true;
  }

  /**
   * Fetch all users from Firestore
   */
  private async fetchUsers(): Promise<FirestoreUser[]> {
    this.log('📥 Fetching users from Firestore...');

    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);

    const users: FirestoreUser[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        id: doc.id,
        ...data,
      } as FirestoreUser);
    });

    this.log(`📥 Fetched ${users.length} users from Firestore`);
    return users;
  }

  /**
   * Fetch level-ups for a specific user
   */
  private async fetchLevelUpsForUser(userId: string): Promise<FirestoreLevelUp[]> {
    const levelUpsRef = collection(db, 'levelUps');
    const q = query(levelUpsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const levelUps: FirestoreLevelUp[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      levelUps.push({
        id: doc.id,
        ...data,
      } as FirestoreLevelUp);
    });

    if (this.options.verbose && levelUps.length > 0) {
      this.log(`  📥 Fetched ${levelUps.length} level-ups for user ${userId}`);
    }

    return levelUps;
  }

  /**
   * Fetch XP transactions for a specific user
   */
  private async fetchXPTransactionsForUser(userId: string): Promise<FirestoreXPTransaction[]> {
    const xpTransactionsRef = collection(db, 'xpTransactions');
    const q = query(xpTransactionsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const transactions: FirestoreXPTransaction[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      transactions.push({
        id: doc.id,
        ...data,
      } as FirestoreXPTransaction);
    });

    if (this.options.verbose && transactions.length > 0) {
      this.log(`  📥 Fetched ${transactions.length} XP transactions for user ${userId}`);
    }

    return transactions;
  }

  /**
   * Fetch XP locks for a specific user
   */
  private async fetchXPLocksForUser(userId: string): Promise<FirestoreXPLock[]> {
    const xpLocksRef = collection(db, 'xp_transaction_locks');
    const q = query(xpLocksRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);

    const locks: FirestoreXPLock[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      locks.push({
        id: doc.id,
        ...data,
      } as FirestoreXPLock);
    });

    if (this.options.verbose && locks.length > 0) {
      this.log(`  📥 Fetched ${locks.length} XP locks for user ${userId}`);
    }

    return locks;
  }

  /**
   * Transform user from Firestore to SQLite format
   */
  private transformUser(firestoreUser: FirestoreUser): UserProfile {
    const now = Date.now();
    const createdAt = this.normalizeTimestamp(firestoreUser.createdAt, now);
    const updatedAt = this.normalizeTimestamp(firestoreUser.updatedAt, now);
    const lastActivityAt = firestoreUser.lastActivityAt
      ? this.normalizeTimestamp(firestoreUser.lastActivityAt, now)
      : undefined;

    return {
      userId: firestoreUser.id,
      username: firestoreUser.username,
      email: firestoreUser.email,
      currentLevel: firestoreUser.currentLevel || 0,
      currentXP: firestoreUser.currentXP || 0,
      totalXP: firestoreUser.totalXP || 0,
      attributes: firestoreUser.attributes ? { ...DEFAULT_ATTRIBUTES, ...firestoreUser.attributes } : { ...DEFAULT_ATTRIBUTES },
      completedTasks: Array.isArray(firestoreUser.completedTasks) ? firestoreUser.completedTasks : [],
      unlockedContent: Array.isArray(firestoreUser.unlockedContent) ? firestoreUser.unlockedContent : [],
      completedChapters: Array.isArray(firestoreUser.completedChapters) ? firestoreUser.completedChapters : [],
      hasReceivedWelcomeBonus: firestoreUser.hasReceivedWelcomeBonus || false,
      stats: firestoreUser.stats ? { ...DEFAULT_STATS, ...firestoreUser.stats } : { ...DEFAULT_STATS },
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt),
      lastActivityAt: lastActivityAt ? new Date(lastActivityAt) : undefined,
    };
  }

  /**
   * Transform level-up record from Firestore to SQLite format
   */
  private transformLevelUp(firestoreLevelUp: FirestoreLevelUp): {
    levelUpId: string;
    userId: string;
    fromLevel: number;
    toLevel: number;
    unlockedContent?: string[];
    unlockedPermissions?: string[];
    timestamp: number;
  } {
    const now = Date.now();
    const timestamp = this.normalizeTimestamp(firestoreLevelUp.timestamp, now);

    return {
      levelUpId: firestoreLevelUp.id,
      userId: firestoreLevelUp.userId,
      fromLevel: firestoreLevelUp.fromLevel,
      toLevel: firestoreLevelUp.toLevel,
      unlockedContent: firestoreLevelUp.unlockedContent,
      unlockedPermissions: firestoreLevelUp.unlockedPermissions,
      timestamp,
    };
  }

  /**
   * Transform XP transaction from Firestore to SQLite format
   */
  private transformXPTransaction(firestoreTransaction: FirestoreXPTransaction): {
    transactionId: string;
    userId: string;
    amount: number;
    reason: string;
    source: string;
    sourceId: string;
    timestamp: number;
  } {
    const now = Date.now();
    const timestamp = this.normalizeTimestamp(firestoreTransaction.timestamp, now);

    return {
      transactionId: firestoreTransaction.id,
      userId: firestoreTransaction.userId,
      amount: firestoreTransaction.amount,
      reason: firestoreTransaction.reason || 'Unknown',
      source: firestoreTransaction.source || 'unknown',
      sourceId: firestoreTransaction.sourceId || 'unknown',
      timestamp,
    };
  }

  /**
   * Transform XP lock from Firestore to SQLite format
   */
  private transformXPLock(firestoreLock: FirestoreXPLock): {
    lockId: string;
    userId: string;
    sourceId: string;
    timestamp: number;
  } {
    const now = Date.now();
    const timestamp = this.normalizeTimestamp(firestoreLock.createdAt, now);

    return {
      lockId: firestoreLock.id,
      userId: firestoreLock.userId,
      sourceId: firestoreLock.sourceId,
      timestamp,
    };
  }

  /**
   * Insert batch of users and related data into SQLite
   */
  private async insertBatch(): Promise<void> {
    if (this.options.dryRun) {
      this.log(`[DRY RUN] Would insert ${this.users.length} users, ${this.levelUps.length} level-ups, ${this.xpTransactions.length} XP transactions, ${this.xpLocks.length} XP locks`);
      this.stats.successfulRecords += this.users.length;
      this.users = [];
      this.levelUps = [];
      this.xpTransactions = [];
      this.xpLocks = [];
      return;
    }

    try {
      // Insert users
      if (this.users.length > 0) {
        const usersCreated = batchCreateUsers(this.users);
        this.log(`✅ Inserted ${usersCreated} users into SQLite`);
        this.stats.successfulRecords += usersCreated;
      }

      // Insert level-ups
      if (this.levelUps.length > 0) {
        const levelUpsCreated = batchCreateLevelUps(this.levelUps);
        this.log(`✅ Inserted ${levelUpsCreated} level-ups into SQLite`);
      }

      // Insert XP transactions
      if (this.xpTransactions.length > 0) {
        const transactionsCreated = batchCreateXPTransactions(this.xpTransactions);
        this.log(`✅ Inserted ${transactionsCreated} XP transactions into SQLite`);
      }

      // Insert XP locks
      if (this.xpLocks.length > 0) {
        const locksCreated = batchCreateXPLocks(this.xpLocks);
        this.log(`✅ Inserted ${locksCreated} XP locks into SQLite`);
      }

      // Clear arrays for next batch
      this.users = [];
      this.levelUps = [];
      this.xpTransactions = [];
      this.xpLocks = [];
    } catch (error: any) {
      this.log(`❌ Failed to insert batch: ${error.message}`, 'error');
      this.stats.failedRecords += this.users.length;
      throw error;
    }
  }

  /**
   * Main migration execution
   */
  async migrate(): Promise<MigrationStats> {
    this.log('🚀 Starting users migration (Firebase → SQLite)...');
    this.log(`⚙️  Configuration: batch size=${this.options.batchSize}, dry-run=${this.options.dryRun}, validate=${this.options.validateData}`);

    try {
      // Step 1: Fetch all users from Firestore
      const firestoreUsers = await this.fetchUsers();
      this.stats.totalRecords = firestoreUsers.length;

      if (firestoreUsers.length === 0) {
        this.log('⚠️  No users found in Firestore', 'warn');
        this.stats.endTime = Date.now();
        this.stats.duration = this.stats.endTime - this.stats.startTime;
        return this.stats;
      }

      this.log(`📊 Total users to migrate: ${firestoreUsers.length}`);

      // Step 2: Process users in batches
      for (let i = 0; i < firestoreUsers.length; i++) {
        const firestoreUser = firestoreUsers[i];

        // Validate user
        if (this.options.validateData && !this.validateUser(firestoreUser)) {
          this.stats.skippedRecords++;
          continue;
        }

        // Transform user
        const user = this.transformUser(firestoreUser);
        this.users.push(user);

        // Fetch and transform related data for this user
        try {
          // Fetch level-ups
          const userLevelUps = await this.fetchLevelUpsForUser(firestoreUser.id);
          for (const levelUp of userLevelUps) {
            if (this.options.validateData && !this.validateLevelUp(levelUp)) {
              continue;
            }
            this.levelUps.push(this.transformLevelUp(levelUp));
          }

          // Fetch XP transactions
          const userXPTransactions = await this.fetchXPTransactionsForUser(firestoreUser.id);
          for (const transaction of userXPTransactions) {
            if (this.options.validateData && !this.validateXPTransaction(transaction)) {
              continue;
            }
            this.xpTransactions.push(this.transformXPTransaction(transaction));
          }

          // Fetch XP locks
          const userXPLocks = await this.fetchXPLocksForUser(firestoreUser.id);
          for (const lock of userXPLocks) {
            this.xpLocks.push(this.transformXPLock(lock));
          }
        } catch (error: any) {
          this.log(`⚠️  Failed to fetch related data for user ${firestoreUser.id}: ${error.message}`, 'warn');
          // Continue with migration even if related data fetch fails
        }

        // Insert batch when batch size is reached
        if (this.users.length >= this.options.batchSize) {
          await this.insertBatch();
          this.log(`📈 Progress: ${i + 1}/${firestoreUsers.length} users processed (${Math.round((i + 1) / firestoreUsers.length * 100)}%)`);
        }
      }

      // Insert remaining records
      if (this.users.length > 0) {
        await this.insertBatch();
      }

      // Step 3: Final statistics
      this.stats.endTime = Date.now();
      this.stats.duration = this.stats.endTime - this.stats.startTime;

      this.log('');
      this.log('========================================');
      this.log('✅ Users migration completed!');
      this.log('========================================');
      this.log(`📊 Statistics:`);
      this.log(`   Total records: ${this.stats.totalRecords}`);
      this.log(`   Successful: ${this.stats.successfulRecords}`);
      this.log(`   Failed: ${this.stats.failedRecords}`);
      this.log(`   Skipped: ${this.stats.skippedRecords}`);
      this.log(`   Duration: ${(this.stats.duration / 1000).toFixed(2)}s`);
      this.log(`   Speed: ${(this.stats.successfulRecords / (this.stats.duration / 1000)).toFixed(2)} records/sec`);
      this.log('========================================');

      if (this.options.dryRun) {
        this.log('⚠️  DRY RUN MODE - No data was actually written to SQLite');
      }

      return this.stats;
    } catch (error: any) {
      this.log(`❌ Migration failed: ${error.message}`, 'error');
      throw error;
    }
  }
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    validateData: !args.includes('--no-validate'),
  };

  // Parse custom batch size
  const batchSizeArg = args.find((arg) => arg.startsWith('--batch-size='));
  if (batchSizeArg) {
    const batchSize = parseInt(batchSizeArg.split('=')[1], 10);
    if (!isNaN(batchSize) && batchSize > 0) {
      options.batchSize = batchSize;
    }
  }

  const migrator = new UsersMigrator(options);

  try {
    await migrator.migrate();
    process.exit(0);
  } catch (error: any) {
    console.error(`\n❌ Migration failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run migration if executed directly
if (require.main === module) {
  main();
}
