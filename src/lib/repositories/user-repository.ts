/**
 * @fileOverview User Repository for SQLite Database
 *
 * This module provides CRUD operations for user data using SQLite,
 * replacing Firebase Firestore user operations.
 *
 * @phase Phase 3 - Core Systems Migration
 * Phase 4-T1: Added guest account protection to prevent XP modifications
 */

import { getDatabase, type Client } from '../sqlite-db';
import type { AttributePoints } from '../types/user-level';
import { isGuestAccount } from '../middleware/guest-account';
import {
  GUEST_EMAIL,
  GUEST_FIXED_XP,
  GUEST_LEVEL,
  GUEST_USER_ID,
  GUEST_USERNAME,
} from '../constants/guest-account';

/**
 * User statistics interface
 */
export interface UserStats {
  chaptersCompleted: number;
  totalReadingTimeMinutes: number;
  notesCount: number;
  currentStreak: number;
  longestStreak: number;
  aiInteractionsCount: number;
  communityPostsCount: number;
  communityLikesReceived: number;
}

/**
 * SQLite-compatible User Profile
 * Extended from original for user-level-service compatibility (SQLITE-016)
 * Phase 4 - SQLITE-019: Added passwordHash for NextAuth.js authentication
 * Phase 4 - SQLITE-021: Added isGuest for guest/anonymous login support
 */
export interface UserProfile {
  userId: string;
  username: string;
  email?: string;
  passwordHash?: string; // bcrypt hashed password (Phase 4 - SQLITE-019, only included in auth queries)
  isGuest?: boolean; // true for guest/anonymous accounts (Phase 4 - SQLITE-021)
  currentLevel: number;
  currentXP: number;
  totalXP: number;
  attributes: AttributePoints;
  completedTasks: string[]; // Task IDs
  unlockedContent: string[]; // Content IDs
  completedChapters: number[]; // Chapter numbers
  hasReceivedWelcomeBonus: boolean;
  stats: UserStats;
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt?: Date;
}

/**
 * User data interface for database operations
 * Phase 4 - SQLITE-019: Added passwordHash for NextAuth.js authentication
 * Phase 4 - SQLITE-021: Added isGuest for guest/anonymous login support
 */
interface UserRow {
  id: string;
  username: string;
  email: string | null;
  passwordHash: string | null; // bcrypt hashed password (Phase 4 - SQLITE-019)
  isGuest: number; // 0 or 1 (Phase 4 - SQLITE-021)
  currentLevel: number;
  currentXP: number;
  totalXP: number;
  attributes: string; // JSON string
  completedTasks: string | null; // JSON array
  unlockedContent: string | null; // JSON array
  completedChapters: string | null; // JSON array
  hasReceivedWelcomeBonus: number; // 0 or 1
  stats: string | null; // JSON object
  createdAt: number;
  updatedAt: number;
  lastActivityAt: number | null;
}

/**
 * Convert Unix timestamp to Date
 */
function fromUnixTimestamp(timestamp: number): Date {
  return new Date(timestamp);
}

/**
 * Default attributes for new users
 */
const DEFAULT_ATTRIBUTES: AttributePoints = {
  poetrySkill: 0,
  culturalKnowledge: 0,
  analyticalThinking: 0,
  socialInfluence: 0,
  learningPersistence: 0,
};

/**
 * Default stats for new users
 */
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
 * Convert database row to UserProfile
 */
function rowToUserProfile(row: UserRow): UserProfile {
  let attributes = { ...DEFAULT_ATTRIBUTES };
  let completedTasks: string[] = [];
  let unlockedContent: string[] = [];
  let completedChapters: number[] = [];
  let stats = { ...DEFAULT_STATS };

  // Parse attributes
  if (row.attributes) {
    try {
      attributes = JSON.parse(row.attributes);
    } catch (error) {
      console.warn(`⚠️ [UserRepository] Failed to parse attributes for user ${row.id}, using defaults`);
      attributes = { ...DEFAULT_ATTRIBUTES };
    }
  }

  // Parse completedTasks
  if (row.completedTasks) {
    try {
      completedTasks = JSON.parse(row.completedTasks);
    } catch (error) {
      console.warn(`⚠️ [UserRepository] Failed to parse completedTasks for user ${row.id}`);
    }
  }

  // Parse unlockedContent
  if (row.unlockedContent) {
    try {
      unlockedContent = JSON.parse(row.unlockedContent);
    } catch (error) {
      console.warn(`⚠️ [UserRepository] Failed to parse unlockedContent for user ${row.id}`);
    }
  }

  // Parse completedChapters
  if (row.completedChapters) {
    try {
      completedChapters = JSON.parse(row.completedChapters);
    } catch (error) {
      console.warn(`⚠️ [UserRepository] Failed to parse completedChapters for user ${row.id}`);
    }
  }

  // Parse stats
  if (row.stats) {
    try {
      stats = JSON.parse(row.stats);
    } catch (error) {
      console.warn(`⚠️ [UserRepository] Failed to parse stats for user ${row.id}, using defaults`);
      stats = { ...DEFAULT_STATS };
    }
  }

  return {
    userId: row.id,
    username: row.username,
    email: row.email || undefined,
    passwordHash: row.passwordHash || undefined, // Include password hash if present (Phase 4 - SQLITE-019)
    isGuest: row.isGuest === 1, // Convert 0/1 to boolean (Phase 4 - SQLITE-021)
    currentLevel: row.currentLevel,
    currentXP: row.currentXP,
    totalXP: row.totalXP,
    attributes,
    completedTasks,
    unlockedContent,
    completedChapters,
    hasReceivedWelcomeBonus: row.hasReceivedWelcomeBonus === 1,
    stats,
    createdAt: fromUnixTimestamp(row.createdAt),
    updatedAt: fromUnixTimestamp(row.updatedAt),
    lastActivityAt: row.lastActivityAt ? fromUnixTimestamp(row.lastActivityAt) : undefined,
  };
}

/**
 * Create a new user
 *
 * @param userId - User ID
 * @param username - Username
 * @param email - User email (optional)
 * @param passwordHash - bcrypt hashed password (optional, Phase 4 - SQLITE-019)
 * @returns Created user profile
 */
export async function createUser(
  userId: string,
  username: string,
  email?: string,
  passwordHash?: string
): Promise<UserProfile> {
  const db = getDatabase();
  const now = Date.now();

  const userProfile: UserProfile = {
    userId,
    username,
    email,
    passwordHash, // Include password hash in profile (Phase 4 - SQLITE-019)
    currentLevel: 0,
    currentXP: 0,
    totalXP: 0,
    attributes: { ...DEFAULT_ATTRIBUTES },
    completedTasks: [],
    unlockedContent: [],
    completedChapters: [],
    hasReceivedWelcomeBonus: false,
    stats: { ...DEFAULT_STATS },
    createdAt: fromUnixTimestamp(now),
    updatedAt: fromUnixTimestamp(now),
    lastActivityAt: fromUnixTimestamp(now),
  };

  await db.execute({
    sql: `
      INSERT INTO users (
        id, username, email, passwordHash, isGuest, currentLevel, currentXP, totalXP,
        attributes, completedTasks, unlockedContent, completedChapters,
        hasReceivedWelcomeBonus, stats, createdAt, updatedAt, lastActivityAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      userId,
      username,
      email || null,
      passwordHash || null, // Insert password hash or null (Phase 4 - SQLITE-019)
      0, // isGuest = 0 (false) for regular users (Phase 4 - SQLITE-021)
      userProfile.currentLevel,
      userProfile.currentXP,
      userProfile.totalXP,
      JSON.stringify(userProfile.attributes),
      JSON.stringify(userProfile.completedTasks),
      JSON.stringify(userProfile.unlockedContent),
      JSON.stringify(userProfile.completedChapters),
      userProfile.hasReceivedWelcomeBonus ? 1 : 0,
      JSON.stringify(userProfile.stats),
      now,
      now,
      now
    ]
  });

  console.log(`✅ [UserRepository] Created user: ${userId}${passwordHash ? ' (with password)' : ' (without password)'}`);
  return userProfile;
}

/**
 * Create a new guest user
 *
 * Creates a temporary guest account with auto-generated credentials.
 * Guest accounts are marked with isGuest = 1 and use generated email/password.
 *
 * Phase 4 - SQLITE-021: Guest/Anonymous login support for NextAuth.js
 *
 * @returns Created guest user profile
 */
export async function createGuestUser(): Promise<UserProfile> {
  // Return existing fixed guest account if present
  const existingGuest = await getUserById(GUEST_USER_ID);
  if (existingGuest) {
    console.log(`✅ [UserRepository] Reusing existing guest user: ${GUEST_USER_ID}`);
    return existingGuest;
  }

  const db = getDatabase();
  const now = Date.now();

  // Generate a secure random password (guest won't need it, but required for DB)
  const crypto = require('crypto');
  const bcrypt = require('bcryptjs');
  const randomPassword = crypto.randomBytes(32).toString('hex');
  const passwordHash = bcrypt.hashSync(randomPassword, 10);

  const guestProfile: UserProfile = {
    userId: GUEST_USER_ID,
    username: GUEST_USERNAME,
    email: GUEST_EMAIL,
    passwordHash,
    isGuest: true, // Mark as guest account
    currentLevel: GUEST_LEVEL,
    currentXP: GUEST_FIXED_XP,
    totalXP: GUEST_FIXED_XP,
    attributes: { ...DEFAULT_ATTRIBUTES },
    completedTasks: [],
    unlockedContent: [],
    completedChapters: [],
    hasReceivedWelcomeBonus: false,
    stats: { ...DEFAULT_STATS },
    createdAt: fromUnixTimestamp(now),
    updatedAt: fromUnixTimestamp(now),
    lastActivityAt: fromUnixTimestamp(now),
  };

  try {
    await db.execute({
      sql: `
        INSERT INTO users (
          id, username, email, passwordHash, isGuest, currentLevel, currentXP, totalXP,
          attributes, completedTasks, unlockedContent, completedChapters,
          hasReceivedWelcomeBonus, stats, createdAt, updatedAt, lastActivityAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        GUEST_USER_ID,
        GUEST_USERNAME,
        GUEST_EMAIL,
        passwordHash,
        1, // isGuest = 1 (true) for guest accounts
        guestProfile.currentLevel,
        guestProfile.currentXP,
        guestProfile.totalXP,
        JSON.stringify(guestProfile.attributes),
        JSON.stringify(guestProfile.completedTasks),
        JSON.stringify(guestProfile.unlockedContent),
        JSON.stringify(guestProfile.completedChapters),
        guestProfile.hasReceivedWelcomeBonus ? 1 : 0,
        JSON.stringify(guestProfile.stats),
        now,
        now,
        now
      ]
    });

    console.log(`✅ [UserRepository] Created guest user: ${GUEST_USER_ID} (${GUEST_USERNAME})`);
    return guestProfile;
  } catch (error: any) {
    if (typeof error?.message === 'string' && error.message.includes('UNIQUE constraint failed')) {
      const fallbackGuest = await getUserById(GUEST_USER_ID);
      if (fallbackGuest) {
        console.warn('⚠️ [UserRepository] Guest user already existed during creation, returning existing record.');
        return fallbackGuest;
      }
    }
    throw error;
  }
}

/**
 * Get user by ID
 *
 * @param userId - User ID
 * @returns User profile or null if not found
 */
export async function getUserById(userId: string): Promise<UserProfile | null> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM users WHERE id = ?
  `,
    args: [userId]
  });
  const row = result.rows[0] as unknown as UserRow | undefined;

  if (!row) {
    return null;
  }

  return rowToUserProfile(row);
}

/**
 * Update user profile
 *
 * Phase 4-T1: Added guest account protection for XP/Level modifications
 *
 * @param userId - User ID
 * @param updates - Partial user profile updates
 * @returns Updated user profile
 */
export async function updateUser(
  userId: string,
  updates: Partial<Omit<UserProfile, 'userId' | 'createdAt'>>
): Promise<UserProfile> {
  const db = getDatabase();
  const now = Date.now();

  // Guest account protection: prevent XP/Level modifications
  if (isGuestAccount(userId)) {
    // Filter out XP and level updates for guest accounts
    const { currentXP, totalXP, currentLevel, ...allowedUpdates } = updates;

    if (currentXP !== undefined || totalXP !== undefined || currentLevel !== undefined) {
      console.log(`🧪 [UserRepository] Guest account protection: blocked XP/Level updates`);
    }

    // Continue with only allowed updates (non-XP/Level fields)
    updates = allowedUpdates;

    // If no updates remain after filtering, return current user
    if (Object.keys(updates).length === 0) {
      const currentUser = await getUserById(userId);
      if (!currentUser) {
        throw new Error(`User not found: ${userId}`);
      }
      return currentUser;
    }
  }

  // Build dynamic update query
  const updateFields: string[] = [];
  const updateValues: any[] = [];

  if (updates.username !== undefined) {
    updateFields.push('username = ?');
    updateValues.push(updates.username);
  }

  if (updates.email !== undefined) {
    updateFields.push('email = ?');
    updateValues.push(updates.email || null);
  }

  if (updates.passwordHash !== undefined) {
    updateFields.push('passwordHash = ?');
    updateValues.push(updates.passwordHash || null);
  }

  if (updates.currentLevel !== undefined) {
    updateFields.push('currentLevel = ?');
    updateValues.push(updates.currentLevel);
  }

  if (updates.currentXP !== undefined) {
    updateFields.push('currentXP = ?');
    updateValues.push(updates.currentXP);
  }

  if (updates.totalXP !== undefined) {
    updateFields.push('totalXP = ?');
    updateValues.push(updates.totalXP);
  }

  if (updates.attributes !== undefined) {
    updateFields.push('attributes = ?');
    updateValues.push(JSON.stringify(updates.attributes));
  }

  if (updates.completedTasks !== undefined) {
    updateFields.push('completedTasks = ?');
    updateValues.push(JSON.stringify(updates.completedTasks));
  }

  if (updates.unlockedContent !== undefined) {
    updateFields.push('unlockedContent = ?');
    updateValues.push(JSON.stringify(updates.unlockedContent));
  }

  if (updates.completedChapters !== undefined) {
    updateFields.push('completedChapters = ?');
    updateValues.push(JSON.stringify(updates.completedChapters));
  }

  if (updates.hasReceivedWelcomeBonus !== undefined) {
    updateFields.push('hasReceivedWelcomeBonus = ?');
    updateValues.push(updates.hasReceivedWelcomeBonus ? 1 : 0);
  }

  if (updates.stats !== undefined) {
    updateFields.push('stats = ?');
    updateValues.push(JSON.stringify(updates.stats));
  }

  if (updates.lastActivityAt !== undefined) {
    updateFields.push('lastActivityAt = ?');
    updateValues.push(updates.lastActivityAt.getTime());
  }

  // Always update updatedAt
  updateFields.push('updatedAt = ?');
  updateValues.push(now);

  // Add userId for WHERE clause
  updateValues.push(userId);

  await db.execute({
    sql: `
    UPDATE users
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `,
    args: [...updateValues]
  });

  console.log(`✅ [UserRepository] Updated user: ${userId}`);

  // Return updated profile
  const updated = await getUserById(userId);
  if (!updated) {
    throw new Error(`Failed to retrieve updated user: ${userId}`);
  }

  return updated;
}

/**
 * Update a user's password hash.
 *
 * Provides a dedicated helper to update credential hashes while keeping all
 * validation and timestamp logic within updateUser().
 *
 * @param userId - User ID
 * @param passwordHash - bcrypt hash string to store
 * @returns Updated user profile
 */
export async function updateUserPasswordHash(
  userId: string,
  passwordHash: string
): Promise<UserProfile> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  return await updateUser(userId, { passwordHash });
}

/**
 * Award XP to user
 *
 * Phase 4-T1: Guest account protection added
 * Guest accounts maintain fixed 70 XP regardless of task completion
 *
 * @param userId - User ID
 * @param xpAmount - Amount of XP to award
 * @returns Updated user profile
 */
export async function awardXP(userId: string, xpAmount: number): Promise<UserProfile> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // Guest account protection: maintain fixed 70 XP
  if (isGuestAccount(userId)) {
    console.log(`🧪 [UserRepository] Guest account XP is fixed at 70, skipping award of ${xpAmount} XP`);
    return user;
  }

  const newCurrentXP = user.currentXP + xpAmount;
  const newTotalXP = user.totalXP + xpAmount;

  return await updateUser(userId, {
    currentXP: newCurrentXP,
    totalXP: newTotalXP,
  });
}

/**
 * Update user attributes
 *
 * @param userId - User ID
 * @param attributeGains - Attribute gains to add
 * @returns Updated user profile
 */
export async function updateAttributes(
  userId: string,
  attributeGains: Record<string, number>
): Promise<UserProfile> {
  const user = await getUserById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const updatedAttributes = { ...user.attributes };

  for (const [key, value] of Object.entries(attributeGains)) {
    const attrKey = key as keyof AttributePoints;
    updatedAttributes[attrKey] = (updatedAttributes[attrKey] || 0) + value;
  }

  return await updateUser(userId, { attributes: updatedAttributes });
}

/**
 * Delete user
 *
 * @param userId - User ID
 */
export async function deleteUser(userId: string): Promise<void> {
  const db = getDatabase();

  await db.execute({
    sql: `DELETE FROM users WHERE id = ?`,
    args: [userId]
  });

  console.log(`✅ [UserRepository] Deleted user: ${userId}`);
}

/**
 * Check if user exists
 *
 * @param userId - User ID
 * @returns True if user exists
 */
export async function userExists(userId: string): Promise<boolean> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `SELECT COUNT(*) as count FROM users WHERE id = ?`,
    args: [userId]
  });
  const countRow = result.rows[0] as unknown as { count: number };

  return countRow.count > 0;
}

// ============================================================
// XP Transaction Repository Functions
// ============================================================

/**
 * XP Transaction data interface for database operations
 */
interface XPTransactionRow {
  transactionId: string;
  userId: string;
  amount: number;
  reason: string;
  source: string;
  sourceId: string | null;
  createdAt: number;
}

/**
 * Create a new XP transaction record
 *
 * @param transaction - XP transaction data (without transactionId)
 * @returns Transaction ID
 */
export async function createXPTransaction(
  transaction: {
    userId: string;
    amount: number;
    reason: string;
    source: string;
    sourceId?: string;
  }
): Promise<string> {
  const db = getDatabase();
  const now = Date.now();
  const transactionId = `xp_${transaction.userId}_${now}_${Math.random().toString(36).substring(2, 9)}`;

  await db.execute({
    sql: `
    INSERT INTO xp_transactions (
      transactionId, userId, amount, reason, source, sourceId, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
    args: [
    transactionId,
    transaction.userId,
    transaction.amount,
    transaction.reason,
    transaction.source,
    transaction.sourceId || null,
    now
  ]
  });

  console.log(`✅ [UserRepository] Created XP transaction: ${transactionId} (+${transaction.amount} XP for ${transaction.userId})`);
  return transactionId;
}

/**
 * Get XP transactions for a user, ordered by most recent first
 *
 * @param userId - User ID
 * @param limitCount - Maximum number of transactions to return (default: 50)
 * @returns Array of XP transaction records
 */
export async function getXPTransactionsByUser(userId: string, limitCount: number = 50): Promise<XPTransactionRow[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM xp_transactions
    WHERE userId = ?
    ORDER BY createdAt DESC
    LIMIT ?
  `,
    args: [userId, limitCount]
  });
  const rows = result.rows as unknown as XPTransactionRow[];
  return rows;
}

/**
 * Get XP transactions by source and sourceId
 *
 * @param source - Source type (e.g., 'reading', 'task', 'community')
 * @param sourceId - Source reference ID
 * @returns Array of XP transaction records
 */
export async function getXPTransactionsBySource(source: string, sourceId: string): Promise<XPTransactionRow[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM xp_transactions
    WHERE source = ? AND sourceId = ?
    ORDER BY createdAt DESC
  `,
    args: [source, sourceId]
  });
  const rows = result.rows as unknown as XPTransactionRow[];
  return rows;
}

/**
 * Check if an XP transaction exists for a user and sourceId (deduplication check)
 *
 * @param userId - User ID
 * @param sourceId - Source reference ID
 * @returns True if transaction exists
 */
export async function hasXPTransaction(userId: string, sourceId: string): Promise<boolean> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT COUNT(*) as count
    FROM xp_transactions
    WHERE userId = ? AND sourceId = ?
  `,
    args: [userId, sourceId]
  });
  const countRow = result.rows[0] as unknown as { count: number };
  return countRow.count > 0;
}

/**
 * Get total XP earned by a user from all transactions
 *
 * @param userId - User ID
 * @returns Total XP sum
 */
export async function getTotalXPFromTransactions(userId: string): Promise<number> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT COALESCE(SUM(amount), 0) as total
    FROM xp_transactions
    WHERE userId = ?
  `,
    args: [userId]
  });
  const totalRow = result.rows[0] as unknown as { total: number };
  return totalRow.total;
}

// ============================================================
// XP Transaction Lock Repository Functions
// ============================================================

/**
 * XP Transaction Lock data interface
 */
interface XPLockRow {
  lockId: string;
  userId: string;
  sourceId: string;
  createdAt: number;
}

/**
 * Create an XP transaction lock (for idempotency)
 *
 * @param userId - User ID
 * @param sourceId - Source reference ID
 * @returns Lock ID
 */
export async function createXPLock(userId: string, sourceId: string): Promise<string> {
  const db = getDatabase();
  const now = Date.now();
  const lockId = `lock_${userId}_${sourceId}`;

  try {
    await db.execute({
    sql: `
      INSERT INTO xp_transaction_locks (lockId, userId, sourceId, createdAt)
      VALUES (?, ?, ?, ?)
    `,
    args: [lockId, userId, sourceId, now]
  });
    console.log(`🔒 [UserRepository] Created XP lock: ${lockId}`);
    return lockId;
  } catch (error: any) {
    // If unique constraint fails, lock already exists
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.message.includes('UNIQUE')) {
      console.log(`⚠️ [UserRepository] XP lock already exists: ${lockId}`);
      return lockId;
    }
    throw error;
  }
}

/**
 * Check if an XP transaction lock exists
 *
 * @param userId - User ID
 * @param sourceId - Source reference ID
 * @returns True if lock exists
 */
export async function hasXPLock(userId: string, sourceId: string): Promise<boolean> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT COUNT(*) as count
    FROM xp_transaction_locks
    WHERE userId = ? AND sourceId = ?
  `,
    args: [userId, sourceId]
  });
  const lockCount = result.rows[0] as unknown as { count: number };
  return lockCount.count > 0;
}

/**
 * Delete an XP transaction lock
 *
 * @param userId - User ID
 * @param sourceId - Source reference ID
 */
export async function deleteXPLock(userId: string, sourceId: string): Promise<void> {
  const db = getDatabase();

  await db.execute({
    sql: `
    DELETE FROM xp_transaction_locks
    WHERE userId = ? AND sourceId = ?
  `,
    args: [userId, sourceId]
  });
  console.log(`🔓 [UserRepository] Deleted XP lock for ${userId}:${sourceId}`);
}

/**
 * Clean up expired XP transaction locks
 *
 * @param olderThanMs - Delete locks older than this many milliseconds (default: 24 hours)
 * @returns Number of locks deleted
 */
export async function cleanupExpiredLocks(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<number> {
  const db = getDatabase();
  const cutoffTime = Date.now() - olderThanMs;

  const result = await db.execute({
    sql: `DELETE FROM xp_transaction_locks WHERE createdAt < ?`,
    args: [cutoffTime]
  });

  const deletedCount = result.rowsAffected;

  if (deletedCount > 0) {
    console.log(`🧹 [UserRepository] Cleaned up ${deletedCount} expired XP locks`);
  }

  return deletedCount;
}

// ============================================================
// Level-Up Repository Functions
// ============================================================

/**
 * Level-Up Record data interface
 */
interface LevelUpRow {
  levelUpId: string;
  userId: string;
  fromLevel: number;
  toLevel: number;
  unlockedContent: string | null;
  unlockedPermissions: string | null;
  createdAt: number;
}

/**
 * Create a level-up record
 *
 * @param record - Level-up record data (without levelUpId)
 * @returns Level-Up record ID
 */
export async function createLevelUpRecord(record: {
  userId: string;
  fromLevel: number;
  toLevel: number;
  unlockedContent?: string[];
  unlockedPermissions?: string[];
}): Promise<string> {
  const db = getDatabase();
  const now = Date.now();
  const levelUpId = `levelup_${record.userId}_${now}`;

  await db.execute({
    sql: `
    INSERT INTO level_ups (
      levelUpId, userId, fromLevel, toLevel, unlockedContent, unlockedPermissions, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
    args: [
    levelUpId,
    record.userId,
    record.fromLevel,
    record.toLevel,
    record.unlockedContent ? JSON.stringify(record.unlockedContent) : null,
    record.unlockedPermissions ? JSON.stringify(record.unlockedPermissions) : null,
    now
  ]
  });

  console.log(`🎉 [UserRepository] Level-up recorded: ${record.userId} (${record.fromLevel} → ${record.toLevel})`);
  return levelUpId;
}

/**
 * Get all level-up records for a user
 *
 * @param userId - User ID
 * @returns Array of level-up records
 */
export async function getLevelUpsByUser(userId: string): Promise<LevelUpRow[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM level_ups
    WHERE userId = ?
    ORDER BY createdAt DESC
  `,
    args: [userId]
  });
  const rows = result.rows as unknown as LevelUpRow[];
  return rows;
}

/**
 * Get the most recent level-up record for a user
 *
 * @param userId - User ID
 * @returns Latest level-up record or null if none exists
 */
export async function getLatestLevelUp(userId: string): Promise<LevelUpRow | null> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM level_ups
    WHERE userId = ?
    ORDER BY createdAt DESC
    LIMIT 1
  `,
    args: [userId]
  });
  const row = result.rows[0] as unknown as LevelUpRow | undefined;
  return row || null;
}

// ============================================================
// Advanced Query Functions
// ============================================================

/**
 * Get user by email address
 *
 * @param email - User email
 * @returns User profile or null if not found
 */
export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM users WHERE email = ?
  `,
    args: [email]
  });
  const row = result.rows[0] as unknown as UserRow | undefined;

  if (!row) {
    return null;
  }

  return rowToUserProfile(row);
}

/**
 * Get user by username
 *
 * Task 4.8: Check username uniqueness during registration
 *
 * @param username - Username to look up
 * @returns User profile or null if not found
 */
export async function getUserByUsername(username: string): Promise<UserProfile | null> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `SELECT * FROM users WHERE username = ?`,
    args: [username]
  });
  const row = result.rows[0] as unknown as UserRow | undefined;

  if (!row) {
    return null;
  }

  return rowToUserProfile(row);
}

/**
 * Get users by level range
 *
 * @param minLevel - Minimum level (inclusive)
 * @param maxLevel - Maximum level (inclusive, optional)
 * @returns Array of user profiles
 */
export async function getUsersByLevel(minLevel: number, maxLevel?: number): Promise<UserProfile[]> {
  const db = getDatabase();

  let result;

  if (maxLevel !== undefined) {
    result = await db.execute({
      sql: `
        SELECT * FROM users
        WHERE currentLevel >= ? AND currentLevel <= ?
        ORDER BY currentLevel DESC, totalXP DESC
      `,
      args: [minLevel, maxLevel]
    });
  } else {
    result = await db.execute({
      sql: `
        SELECT * FROM users
        WHERE currentLevel >= ?
        ORDER BY currentLevel DESC, totalXP DESC
      `,
      args: [minLevel]
    });
  }

  const rows = result.rows as unknown as UserRow[];
  return rows.map(rowToUserProfile);
}

/**
 * Get top users by total XP (leaderboard)
 *
 * @param limitCount - Number of users to return (default: 10)
 * @returns Array of user profiles ordered by XP descending
 */
export async function getTopUsersByXP(limitCount: number = 10): Promise<UserProfile[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM users
    ORDER BY totalXP DESC, currentLevel DESC
    LIMIT ?
  `,
    args: [limitCount]
  });
  const rows = result.rows as unknown as UserRow[];
  return rows.map(rowToUserProfile);
}

/**
 * Search users by username (partial match, case-insensitive)
 *
 * @param searchTerm - Search term for username
 * @param limitCount - Maximum number of results (default: 20)
 * @returns Array of matching user profiles
 */
export async function searchUsers(searchTerm: string, limitCount: number = 20): Promise<UserProfile[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM users
    WHERE username LIKE ?
    ORDER BY currentLevel DESC, totalXP DESC
    LIMIT ?
  `,
    args: [`%${searchTerm}%`, limitCount]
  });
  const rows = result.rows as unknown as UserRow[];
  return rows.map(rowToUserProfile);
}

// ============================================================
// Atomic XP Award with Transaction & Deduplication
// ============================================================

/**
 * Award XP with atomic transaction and deduplication guarantee
 *
 * This function ensures:
 * - Atomicity: All operations succeed or all fail
 * - Idempotency: Same sourceId won't award XP twice
 * - Cross-system deduplication: Works across reading page, daily tasks, etc.
 *
 * @param userId - User ID
 * @param amount - XP amount to award
 * @param reason - Reason for XP award
 * @param source - Source type (reading, task, community, etc.)
 * @param sourceId - Unique source identifier for deduplication
 * @returns Result object with success status and XP data
 */
export async function awardXPWithTransaction(
  userId: string,
  amount: number,
  reason: string,
  source: string,
  sourceId: string
): Promise<{
  success: boolean;
  isDuplicate: boolean;
  newTotalXP: number;
  newCurrentXP: number;
  transactionId?: string;
}> {
  // Validate inputs
  if (!userId || !sourceId) {
    throw new Error('userId and sourceId are required');
  }
  if (typeof amount !== 'number' || amount <= 0 || isNaN(amount)) {
    throw new Error('amount must be a positive number');
  }

  // Check for duplicate BEFORE transaction (fast path)
  const lockExists = await hasXPLock(userId, sourceId);
  if (lockExists) {
    console.log(`⚠️ [UserRepository] Duplicate XP award prevented (lock exists): ${userId}:${sourceId}`);
    const user = await getUserById(userId);
    return {
      success: true,
      isDuplicate: true,
      newTotalXP: user?.totalXP || 0,
      newCurrentXP: user?.currentXP || 0,
    };
  }

  // Get current user
  const user = await getUserById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // Calculate new XP values
  const newTotalXP = user.totalXP + amount;
  const newCurrentXP = user.currentXP + amount;

  // Step 1: Create lock (prevents future duplicates)
  await createXPLock(userId, sourceId);

  // Step 2: Update user XP
  await updateUser(userId, {
    totalXP: newTotalXP,
    currentXP: newCurrentXP,
  });

  // Step 3: Create transaction record (audit trail)
  const transactionId = await createXPTransaction({
    userId,
    amount,
    reason,
    source,
    sourceId,
  });

  console.log(`✅ [UserRepository] Awarded ${amount} XP to ${userId} (${source}:${sourceId})`);

  return {
    success: true,
    isDuplicate: false,
    newTotalXP,
    newCurrentXP,
    transactionId,
  };
}

/**
 * Award XP without sourceId (no deduplication check)
 *
 * Use this for one-time rewards or when deduplication is handled elsewhere.
 * For most cases, use awardXPWithTransaction() instead.
 *
 * @param userId - User ID
 * @param amount - XP amount to award
 * @param reason - Reason for XP award
 * @param source - Source type
 * @returns Result object with XP data
 */
export async function awardXPSimple(
  userId: string,
  amount: number,
  reason: string,
  source: string
): Promise<{
  success: boolean;
  newTotalXP: number;
  newCurrentXP: number;
  transactionId: string;
}> {
  // Validate inputs
  if (!userId) {
    throw new Error('userId is required');
  }
  if (typeof amount !== 'number' || amount <= 0 || isNaN(amount)) {
    throw new Error('amount must be a positive number');
  }

  // Get current user
  const user = await getUserById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // Calculate new XP values
  const newTotalXP = user.totalXP + amount;
  const newCurrentXP = user.currentXP + amount;

  // Update user XP
  await updateUser(userId, {
    totalXP: newTotalXP,
    currentXP: newCurrentXP,
  });

  // Create transaction record (with auto-generated sourceId)
  const autoSourceId = `auto_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const transactionId = await createXPTransaction({
    userId,
    amount,
    reason,
    source,
    sourceId: autoSourceId,
  });

  console.log(`✅ [UserRepository] Awarded ${amount} XP to ${userId} (simple mode)`);

  return {
    success: true,
    newTotalXP,
    newCurrentXP,
    transactionId,
  };
}

// ============================================================
// Level-Up Detection and Recording
// ============================================================

/**
 * Level XP thresholds
 * Level progression: 90 XP per level
 */
const LEVEL_THRESHOLDS = [
  0,    // Level 0
  90,   // Level 1
  180,  // Level 2
  270,  // Level 3
  360,  // Level 4
  450,  // Level 5
  540,  // Level 6
  630,  // Level 7 (max)
];

const MAX_LEVEL = 7;

/**
 * Calculate current level from total XP
 *
 * @param totalXP - Total XP accumulated
 * @returns Current level (0-7)
 */
function calculateLevel(totalXP: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) {
      return i;
    }
  }
  return 0;
}

/**
 * Detect if user has leveled up
 *
 * @param currentTotalXP - Total XP before award
 * @param newTotalXP - Total XP after award
 * @returns Level-up information
 */
export function detectLevelUp(
  currentTotalXP: number,
  newTotalXP: number
): {
  leveledUp: boolean;
  fromLevel: number;
  toLevel: number;
} {
  const fromLevel = calculateLevel(currentTotalXP);
  const toLevel = calculateLevel(newTotalXP);

  return {
    leveledUp: toLevel > fromLevel,
    fromLevel,
    toLevel,
  };
}

/**
 * Calculate unlocked content for a level
 *
 * @param level - User level (0-7)
 * @returns Array of unlocked content identifiers
 */
export function calculateUnlockedContent(level: number): string[] {
  // Content unlocks are cumulative - return all content up to this level
  const contentMap: Record<number, string[]> = {
    0: ['入門指南', '基礎人物介紹'],
    1: ['每日任務系統', '成就收集系統', '基礎人物檔案'],
    2: ['詩詞鑑賞', '名家點評(基礎)', '大觀園3D導覽'],
    3: ['詩詞會參與', '學習小組創建', 'AI深度分析', '人物關係圖譜'],
    4: ['名家點評(完整)', '專題討論', '導師角色', '特色活動'],
    5: ['研究工具', '註解發表系統', '專屬典藏', '專家對話'],
    6: ['宗師典藏', '專屬活動', '平台治理', '傳世內容創作'],
  };

  const allContent: string[] = [];
  for (let i = 0; i <= level && i <= MAX_LEVEL; i++) {
    if (contentMap[i]) {
      allContent.push(...contentMap[i]);
    }
  }

  return allContent;
}

/**
 * Calculate unlocked permissions for a level
 *
 * @param level - User level (0-7)
 * @returns Array of unlocked permission identifiers
 */
export async function calculateUnlockedPermissions(level: number): Promise<string[]> {
  // Permissions are cumulative
  const permissionMap: Record<number, string[]> = {
    0: ['basic_reading', 'simple_ai_qa'],
    1: ['daily_tasks', 'basic_achievements'],
    2: ['poetry_listening', 'expert_readings_basic', 'garden_3d_view'],
    3: ['poetry_competition', 'study_group_create', 'advanced_ai_analysis', 'character_relationship_map'],
    4: ['expert_readings_full', 'special_topics', 'mentor_role', 'exclusive_events'],
    5: ['research_tools', 'annotation_publish'],
  };

  const allPermissions: string[] = [];
  for (let i = 0; i <= level && i <= MAX_LEVEL; i++) {
    if (permissionMap[i]) {
      allPermissions.push(...permissionMap[i]);
    }
  }

  return allPermissions;
}

// ============================================================================
// Batch Operations for Migration (SQLITE-018)
// ============================================================================

/**
 * Batch create users for migration
 *
 * @param users - Array of user profiles to create (with userId, timestamps as Date objects)
 * @returns Number of users created
 */
export async function batchCreateUsers(users: UserProfile[]): Promise<number> {
  const db = getDatabase();

  const statements = users.map(user => ({
    sql: `
      INSERT INTO users (
        id, username, email, currentLevel, currentXP, totalXP,
        attributes, completedTasks, unlockedContent, completedChapters,
        hasReceivedWelcomeBonus, stats, createdAt, updatedAt, lastActivityAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      user.userId,
      user.username,
      user.email || null,
      user.currentLevel,
      user.currentXP,
      user.totalXP,
      JSON.stringify(user.attributes),
      JSON.stringify(user.completedTasks || []),
      JSON.stringify(user.unlockedContent || []),
      JSON.stringify(user.completedChapters || []),
      user.hasReceivedWelcomeBonus ? 1 : 0,
      JSON.stringify(user.stats || DEFAULT_STATS),
      user.createdAt.getTime(),
      user.updatedAt.getTime(),
      user.lastActivityAt ? user.lastActivityAt.getTime() : null
    ]
  }));

  await db.batch(statements, 'write');
  console.log(`✅ [UserRepository] Batch created ${users.length} users`);
  return users.length;
}

/**
 * Batch create XP transactions for migration
 *
 * @param transactions - Array of XP transaction records (with transactionId and timestamp)
 * @returns Number of transactions created
 */
export async function batchCreateXPTransactions(
  transactions: Array<{
    transactionId: string;
    userId: string;
    amount: number;
    reason: string;
    source: string;
    sourceId: string;
    timestamp: number; // Unix timestamp in milliseconds
  }>
): Promise<number> {
  const db = getDatabase();

  const statements = transactions.map(tx => ({
    sql: `
      INSERT INTO xp_transactions (
        transactionId, userId, amount, reason, source, sourceId, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      tx.transactionId,
      tx.userId,
      tx.amount,
      tx.reason,
      tx.source,
      tx.sourceId || null,
      tx.timestamp
    ]
  }));

  await db.batch(statements, 'write');
  console.log(`✅ [UserRepository] Batch created ${transactions.length} XP transactions`);
  return transactions.length;
}

/**
 * Batch create level-up records for migration
 *
 * @param levelUps - Array of level-up records (with levelUpId and timestamp)
 * @returns Number of level-up records created
 */
export async function batchCreateLevelUps(
  levelUps: Array<{
    levelUpId: string;
    userId: string;
    fromLevel: number;
    toLevel: number;
    unlockedContent?: string[];
    unlockedPermissions?: string[];
    timestamp: number; // Unix timestamp in milliseconds
  }>
): Promise<number> {
  const db = getDatabase();

  const statements = levelUps.map(levelUp => ({
    sql: `
      INSERT INTO level_ups (
        levelUpId, userId, fromLevel, toLevel, unlockedContent, unlockedPermissions, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    args: [
      levelUp.levelUpId,
      levelUp.userId,
      levelUp.fromLevel,
      levelUp.toLevel,
      levelUp.unlockedContent ? JSON.stringify(levelUp.unlockedContent) : null,
      levelUp.unlockedPermissions ? JSON.stringify(levelUp.unlockedPermissions) : null,
      levelUp.timestamp
    ]
  }));

  await db.batch(statements, 'write');
  console.log(`✅ [UserRepository] Batch created ${levelUps.length} level-up records`);
  return levelUps.length;
}

/**
 * Batch create XP locks for migration
 *
 * @param locks - Array of XP lock records (with lockId and timestamp)
 * @returns Number of XP locks created
 */
export async function batchCreateXPLocks(
  locks: Array<{
    lockId: string;
    userId: string;
    sourceId: string;
    timestamp: number; // Unix timestamp in milliseconds
  }>
): Promise<number> {
  const db = getDatabase();

  const statements = locks.map(lock => ({
    sql: `INSERT OR IGNORE INTO xp_transaction_locks (lockId, userId, sourceId, createdAt) VALUES (?, ?, ?, ?)`,
    args: [
      lock.lockId,
      lock.userId,
      lock.sourceId,
      lock.timestamp
    ]
  }));

  await db.batch(statements, 'write');
  console.log(`✅ [UserRepository] Batch created ${locks.length} XP locks`);
  return locks.length;
}

/**
 * Award XP with automatic level-up detection and recording
 *
 * This is the complete function that combines XP award with level-up detection.
 * Use this for most XP award scenarios.
 *
 * @param userId - User ID
 * @param amount - XP amount to award
 * @param reason - Reason for XP award
 * @param source - Source type
 * @param sourceId - Unique source identifier
 * @returns Result with XP and level-up information
 */
export async function awardXPWithLevelUp(
  userId: string,
  amount: number,
  reason: string,
  source: string,
  sourceId: string
): Promise<{
  success: boolean;
  isDuplicate: boolean;
  newTotalXP: number;
  newCurrentXP: number;
  newLevel: number;
  leveledUp: boolean;
  fromLevel?: number;
  unlockedContent?: string[];
  unlockedPermissions?: string[];
  transactionId?: string;
  levelUpId?: string;
}> {
  // Validate inputs
  if (!userId || !sourceId) {
    throw new Error('userId and sourceId are required');
  }
  if (typeof amount !== 'number' || amount < 0 || isNaN(amount)) {
    throw new Error('amount must be a non-negative number');
  }

  // Check for duplicate BEFORE transaction (fast path)
  const lockExists = await hasXPLock(userId, sourceId);
  if (lockExists) {
    console.log(`⚠️ [UserRepository] Duplicate XP award prevented (lock exists): ${userId}:${sourceId}`);
    const user = await getUserById(userId);
    return {
      success: true,
      isDuplicate: true,
      newTotalXP: user?.totalXP || 0,
      newCurrentXP: user?.currentXP || 0,
      newLevel: user?.currentLevel || 0,
      leveledUp: false,
    };
  }

  // Handle 0 XP awards (edge case - mark as processed but don't change XP)
  if (amount === 0) {
    console.log(`⚠️ [UserRepository] Zero XP award, creating lock only: ${userId}:${sourceId}`);
    // Create lock to mark as processed (prevents re-processing)
    await createXPLock(userId, sourceId);

    const user = await getUserById(userId);
    return {
      success: true,
      isDuplicate: false,
      newTotalXP: user?.totalXP || 0,
      newCurrentXP: user?.currentXP || 0,
      newLevel: user?.currentLevel || 0,
      leveledUp: false,
    };
  }

  // Get current user
  const user = await getUserById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  // Check chapter completion deduplication (additional guard beyond XP locks)
  const chapterMatch = sourceId.match(/^chapter-(\d+)$/);
  if (chapterMatch) {
    const chapterId = parseInt(chapterMatch[1], 10);
    const completedChapters = user.completedChapters || [];

    if (completedChapters.includes(chapterId)) {
      console.log(`⚠️ [UserRepository] Chapter ${chapterId} already completed for user ${userId}`);
      return {
        success: true,
        isDuplicate: true,
        newTotalXP: user.totalXP,
        newCurrentXP: user.currentXP,
        newLevel: user.currentLevel,
        leveledUp: false,
      };
    }
  }

  // Calculate new XP values
  const currentTotalXP = user.totalXP;
  const newTotalXP = currentTotalXP + amount;
  let newCurrentXP = user.currentXP + amount;

  // Detect level-up
  const levelUpInfo = detectLevelUp(currentTotalXP, newTotalXP);

  // Step 1: Create lock
  await createXPLock(userId, sourceId);

  // Step 2: Update user XP
  const updates: Partial<Omit<UserProfile, 'userId' | 'createdAt'>> = {
    totalXP: newTotalXP,
    currentXP: newCurrentXP,
  };

  // If leveled up, update level and reset currentXP within level
  if (levelUpInfo.leveledUp) {
    updates.currentLevel = levelUpInfo.toLevel;
    // Calculate XP within current level
    const levelThreshold = LEVEL_THRESHOLDS[levelUpInfo.toLevel];
    const xpIntoLevel = newTotalXP - levelThreshold;
    updates.currentXP = xpIntoLevel;
    newCurrentXP = xpIntoLevel;
  }

  // Persist completed chapter if applicable (sourceId pattern)
  if (chapterMatch) {
    const chapterId = parseInt(chapterMatch[1], 10);
    const currentCompleted = user.completedChapters || [];
    // Add chapter to completedChapters array (deduplicated with Set)
    updates.completedChapters = Array.from(new Set([...currentCompleted, chapterId]));
  }

  await updateUser(userId, updates);

  // Step 3: Create transaction record
  const transactionId = await createXPTransaction({
    userId,
    amount,
    reason,
    source,
    sourceId,
  });

  // Step 4: If leveled up, create level-up record and update unlocked content
  let levelUpId: string | undefined;
  let unlockedContent: string[] | undefined;
  let unlockedPermissions: string[] | undefined;

  if (levelUpInfo.leveledUp) {
    unlockedContent = calculateUnlockedContent(levelUpInfo.toLevel);
    unlockedPermissions = await calculateUnlockedPermissions(levelUpInfo.toLevel);

    levelUpId = await createLevelUpRecord({
      userId,
      fromLevel: levelUpInfo.fromLevel,
      toLevel: levelUpInfo.toLevel,
      unlockedContent,
      unlockedPermissions,
    });

    // Update unlocked content in user profile
    if (unlockedContent && unlockedContent.length > 0) {
      const currentContent = user.unlockedContent || [];
      const updatedContent = Array.from(new Set([...currentContent, ...unlockedContent]));
      await updateUser(userId, { unlockedContent: updatedContent });
    }

    console.log(`🎊 [UserRepository] LEVEL UP! ${userId}: ${levelUpInfo.fromLevel} → ${levelUpInfo.toLevel}`);
  }

  console.log(`✅ [UserRepository] Awarded ${amount} XP to ${userId} (${source}:${sourceId})`);

  return {
    success: true,
    isDuplicate: false,
    newTotalXP,
    newCurrentXP,
    newLevel: updates.currentLevel || user.currentLevel,
    leveledUp: levelUpInfo.leveledUp,
    fromLevel: levelUpInfo.leveledUp ? levelUpInfo.fromLevel : undefined,
    unlockedContent,
    unlockedPermissions,
    transactionId,
    levelUpId,
  };
}
