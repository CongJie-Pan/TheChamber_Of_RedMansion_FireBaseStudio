/**
 * Guest Account Constants - Phase 4-T1
 *
 * Centralized constants for guest test account functionality.
 * This file is in src/ to ensure it's included in the production bundle.
 */

/**
 * Fixed guest user ID
 * This ID is used across the application to identify the guest test account
 */
export const GUEST_USER_ID = 'guest-test-user-00000000';

/**
 * Guest user email
 */
export const GUEST_EMAIL = 'guest@redmansion.test';

/**
 * Guest user display name
 */
export const GUEST_USERNAME = '訪客測試帳號';

/**
 * Fixed XP for guest account
 * Always resets to this value on server restart
 */
export const GUEST_FIXED_XP = 70;

/**
 * Guest user level
 */
export const GUEST_LEVEL = 1;

/**
 * Fixed task IDs for guest account
 * These tasks are created by the seed script and never change
 */
export const GUEST_TASK_IDS = {
  READING_COMPREHENSION: 'guest-task-reading-comprehension',
  CHARACTER_ANALYSIS: 'guest-task-character-analysis',
} as const;

/**
 * Get all guest task IDs as an array
 */
export function getGuestTaskIdsArray(): string[] {
  return Object.values(GUEST_TASK_IDS);
}
