/**
 * @fileOverview User Repository for SQLite Database
 *
 * This module provides CRUD operations for user data using SQLite,
 * replacing Firebase Firestore user operations.
 *
 * @phase Phase 2.9 - Local SQLite Database Implementation
 */

import { getDatabase, toUnixTimestamp, fromUnixTimestamp } from '../sqlite-db';
import type { UserProfile } from '../types/user-level';

/**
 * User data interface for database operations
 */
interface UserRow {
  id: string;
  username: string;
  email: string | null;
  currentLevel: number;
  currentXP: number;
  totalXP: number;
  attributes: string; // JSON string
  createdAt: number;
  updatedAt: number;
}

/**
 * Convert database row to UserProfile
 */
function rowToUserProfile(row: UserRow): UserProfile {
  return {
    userId: row.id,
    username: row.username,
    email: row.email || undefined,
    currentLevel: row.currentLevel,
    currentXP: row.currentXP,
    totalXP: row.totalXP,
    attributes: row.attributes ? JSON.parse(row.attributes) : {},
    createdAt: fromUnixTimestamp(row.createdAt),
    updatedAt: fromUnixTimestamp(row.updatedAt),
  };
}

/**
 * Create a new user
 *
 * @param userId - User ID
 * @param username - Username
 * @param email - User email (optional)
 * @returns Created user profile
 */
export function createUser(
  userId: string,
  username: string,
  email?: string
): UserProfile {
  const db = getDatabase();
  const now = Date.now();

  const userProfile: UserProfile = {
    userId,
    username,
    email,
    currentLevel: 1,
    currentXP: 0,
    totalXP: 0,
    attributes: {},
    createdAt: fromUnixTimestamp(now),
    updatedAt: fromUnixTimestamp(now),
  };

  const stmt = db.prepare(`
    INSERT INTO users (
      id, username, email, currentLevel, currentXP, totalXP,
      attributes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    userId,
    username,
    email || null,
    userProfile.currentLevel,
    userProfile.currentXP,
    userProfile.totalXP,
    JSON.stringify(userProfile.attributes),
    now,
    now
  );

  console.log(`✅ [UserRepository] Created user: ${userId}`);
  return userProfile;
}

/**
 * Get user by ID
 *
 * @param userId - User ID
 * @returns User profile or null if not found
 */
export function getUserById(userId: string): UserProfile | null {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM users WHERE id = ?
  `);

  const row = stmt.get(userId) as UserRow | undefined;

  if (!row) {
    return null;
  }

  return rowToUserProfile(row);
}

/**
 * Update user profile
 *
 * @param userId - User ID
 * @param updates - Partial user profile updates
 * @returns Updated user profile
 */
export function updateUser(
  userId: string,
  updates: Partial<Omit<UserProfile, 'userId' | 'createdAt'>>
): UserProfile {
  const db = getDatabase();
  const now = Date.now();

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

  // Always update updatedAt
  updateFields.push('updatedAt = ?');
  updateValues.push(now);

  // Add userId for WHERE clause
  updateValues.push(userId);

  const stmt = db.prepare(`
    UPDATE users
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...updateValues);

  console.log(`✅ [UserRepository] Updated user: ${userId}`);

  // Return updated profile
  const updated = getUserById(userId);
  if (!updated) {
    throw new Error(`Failed to retrieve updated user: ${userId}`);
  }

  return updated;
}

/**
 * Award XP to user
 *
 * @param userId - User ID
 * @param xpAmount - Amount of XP to award
 * @returns Updated user profile
 */
export function awardXP(userId: string, xpAmount: number): UserProfile {
  const user = getUserById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const newCurrentXP = user.currentXP + xpAmount;
  const newTotalXP = user.totalXP + xpAmount;

  return updateUser(userId, {
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
export function updateAttributes(
  userId: string,
  attributeGains: Record<string, number>
): UserProfile {
  const user = getUserById(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const updatedAttributes = { ...user.attributes };

  for (const [key, value] of Object.entries(attributeGains)) {
    updatedAttributes[key] = (updatedAttributes[key] || 0) + value;
  }

  return updateUser(userId, { attributes: updatedAttributes });
}

/**
 * Delete user
 *
 * @param userId - User ID
 */
export function deleteUser(userId: string): void {
  const db = getDatabase();

  const stmt = db.prepare(`DELETE FROM users WHERE id = ?`);
  stmt.run(userId);

  console.log(`✅ [UserRepository] Deleted user: ${userId}`);
}

/**
 * Check if user exists
 *
 * @param userId - User ID
 * @returns True if user exists
 */
export function userExists(userId: string): boolean {
  const db = getDatabase();

  const stmt = db.prepare(`SELECT COUNT(*) as count FROM users WHERE id = ?`);
  const result = stmt.get(userId) as { count: number };

  return result.count > 0;
}
