/**
 * @fileOverview Shared type definitions for User Level API
 *
 * These types are safe for both client and server-side imports.
 * They define the contract between client components and server-side API routes.
 *
 * IMPORTANT: This file must NOT import any server-only dependencies
 * (e.g., better-sqlite3, node:fs, etc.) to avoid webpack bundling issues.
 *
 * @created 2025-10-30
 * @phase SQLITE-026 - Client-Server Separation
 */

/**
 * XP reward amounts for different actions
 * Central configuration for XP economy balance
 */
export const XP_REWARDS = {
  // Reading actions
  CHAPTER_COMPLETED: 10,
  FIRST_CHAPTER_COMPLETED: 20,
  NEW_USER_WELCOME_BONUS: 15,
  READING_TIME_15MIN: 3,

  // Daily tasks
  DAILY_TASK_SIMPLE: 5,
  DAILY_TASK_MEDIUM: 10,
  DAILY_TASK_COMPLEX: 15,

  // Community actions
  POST_CREATED: 5,
  POST_QUALITY_BONUS: 5,
  COMMENT_CREATED: 2,
  COMMENT_HELPFUL: 3,
  LIKE_RECEIVED: 1,

  // Note-taking
  NOTE_CREATED: 3,
  NOTE_WITH_TAGS: 2,
  PUBLIC_NOTE: 5,

  // Achievements
  ACHIEVEMENT_UNLOCKED: 20,
  MILESTONE_REACHED: 15,
} as const;

/**
 * XP transaction source types
 */
export type XPSource =
  | 'reading'
  | 'daily_task'
  | 'community'
  | 'note'
  | 'achievement'
  | 'admin';

/**
 * Request payload for awarding XP
 */
export interface AwardXPRequest {
  userId: string;
  amount: number;
  reason: string;
  source: XPSource;
  sourceId?: string;
}

/**
 * Response from awarding XP
 */
export interface AwardXPResponse {
  success: boolean;
  newTotalXP: number;
  newLevel: number;
  leveledUp: boolean;
  levelUpRewards?: {
    unlockedContent?: string[];
    attributePoints?: number;
    title?: string;
  };
  error?: string;
  details?: any;
}
