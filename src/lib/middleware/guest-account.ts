/**
 * Guest Account Middleware - Phase 4-T1
 *
 * Provides utility functions for detecting and handling guest account behavior.
 * Guest accounts have special rules:
 * - Always return fixed tasks (no dynamic generation)
 * - Reset to 70 XP on re-login (via createGuestUser())
 * - Enable AI grading for all tasks
 */

import { GUEST_USER_ID, getGuestTaskIdsArray } from '../constants/guest-account';

/**
 * Check if a user ID belongs to the guest test account
 */
export function isGuestAccount(userId: string | undefined | null): boolean {
  if (!userId) return false;
  return userId === GUEST_USER_ID;
}

/**
 * Get fixed task IDs for guest account
 * These IDs match the tasks created in seed-guest-account.ts
 */
export function getGuestTaskIds(): string[] {
  return getGuestTaskIdsArray();
}

/**
 * Check if guest account features should be enabled
 * Only enabled in development environment for security
 */
export function isGuestModeEnabled(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.ENABLE_GUEST_ACCOUNT === 'true';
}

/**
 * Get guest account configuration
 */
export function getGuestConfig() {
  return {
    userId: GUEST_USER_ID,
    email: 'guest@redmansion.test',
    username: '訪客測試帳號',
    fixedXP: 70,
    level: 1,
    taskIds: getGuestTaskIds(),
    enabled: isGuestModeEnabled(),
  };
}

/**
 * Log guest account action for debugging
 */
export function logGuestAction(action: string, details?: any) {
  if (isGuestModeEnabled()) {
    console.log(`[Guest Account] ${action}`, details || '');
  }
}
