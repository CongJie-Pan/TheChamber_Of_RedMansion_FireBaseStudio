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
 *
 * ⚠️ IMPORTANT: This must be kept in sync with src/lib/user-level-service.ts
 * Any changes here should be reflected there and vice versa.
 *
 * @updated 2025-11-01 - Fixed sync issue: Added missing achievement constants
 */
export const XP_REWARDS = {
  // Reading actions
  CHAPTER_COMPLETED: 10,
  FIRST_CHAPTER_COMPLETED: 20,
  NEW_USER_WELCOME_BONUS: 15,      // One-time bonus for new users entering reading page
  READING_TIME_15MIN: 3,           // Re-enabled: Award XP for sustained reading

  // Daily tasks
  DAILY_TASK_SIMPLE: 5,
  DAILY_TASK_MEDIUM: 10,
  DAILY_TASK_COMPLEX: 15,

  // Community actions
  POST_CREATED: 5,
  POST_QUALITY_BONUS: 5,      // For high-quality posts (AI evaluated)
  COMMENT_CREATED: 2,
  COMMENT_HELPFUL: 3,          // When marked as helpful
  LIKE_RECEIVED: 1,

  // AI interactions - Achievement (one-time rewards)
  AI_FIRST_QUESTION_ACHIEVEMENT: 20,  // 心有疑，隨札記 - First AI question asked

  // Notes and annotations
  NOTE_CREATED: 3,
  NOTE_QUALITY_BONUS: 5,       // For well-written notes
  ANNOTATION_PUBLISHED: 10,

  // Achievements
  ACHIEVEMENT_UNLOCKED: 15,
  MILESTONE_REACHED: 20,

  // Poetry and cultural
  POETRY_COMPETITION_PARTICIPATION: 10,
  POETRY_COMPETITION_WIN: 30,
  CULTURAL_QUIZ_PASSED: 15,

  // Social and mentoring
  HELP_NEW_USER: 5,
  MENTOR_SESSION: 10,

  // Special events
  SPECIAL_EVENT_PARTICIPATION: 20,
  SPECIAL_EVENT_COMPLETION: 50,
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
  fromLevel?: number;
  isDuplicate?: boolean;
  unlockedContent?: string[];
  unlockedPermissions?: string[];
  levelUpRewards?: {
    unlockedContent?: string[];
    attributePoints?: number;
    title?: string;
  };
  error?: string;
  details?: any;
}
