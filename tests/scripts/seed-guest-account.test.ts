/**
 * Unit Tests - Guest Account Seeding Script (Phase 4-T1)
 *
 * Tests database seeding functionality for guest test account.
 * Follows Google's testing best practices: test state changes, not interactions.
 *
 * @jest-environment node
 */

import { seedGuestAccount } from '../../scripts/seed-guest-account';
import { getDatabase } from '@/lib/sqlite-db';
import {
  GUEST_USER_ID,
  GUEST_EMAIL,
  GUEST_USERNAME,
  GUEST_FIXED_XP,
  GUEST_LEVEL,
  GUEST_TASK_IDS,
} from '@/lib/constants/guest-account';
import type Database from 'better-sqlite3';

describe('Guest Account Seeding', () => {
  let db: Database.Database;

  beforeAll(() => {
    db = getDatabase();
  });

  afterEach(() => {
    // Clean up guest data after each test
    try {
      db.prepare('DELETE FROM level_ups WHERE userId = ?').run(GUEST_USER_ID);
      db.prepare('DELETE FROM xp_transaction_locks WHERE userId = ?').run(GUEST_USER_ID);
      db.prepare('DELETE FROM xp_transactions WHERE userId = ?').run(GUEST_USER_ID);
      db.prepare('DELETE FROM task_submissions WHERE userId = ?').run(GUEST_USER_ID);
      db.prepare('DELETE FROM daily_progress WHERE userId = ?').run(GUEST_USER_ID);
      db.prepare('DELETE FROM daily_tasks WHERE id IN (?, ?)').run(
        GUEST_TASK_IDS.READING_COMPREHENSION,
        GUEST_TASK_IDS.CHARACTER_ANALYSIS
      );
      db.prepare('DELETE FROM users WHERE id = ?').run(GUEST_USER_ID);
    } catch (error) {
      // Ignore cleanup errors in case tables don't exist
    }
  });

  describe('seedGuestAccount', () => {
    it('should create guest user with correct attributes', () => {
      seedGuestAccount(true);

      const user = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(GUEST_USER_ID) as any;

      expect(user).toBeDefined();
      expect(user.id).toBe(GUEST_USER_ID);
      expect(user.username).toBe(GUEST_USERNAME);
      expect(user.email).toBe(GUEST_EMAIL);
      expect(user.currentLevel).toBe(GUEST_LEVEL);
      expect(user.currentXP).toBe(GUEST_FIXED_XP);
      expect(user.totalXP).toBe(GUEST_FIXED_XP);
    });

    it('should create exactly 2 fixed daily tasks', () => {
      seedGuestAccount(true);

      const tasks = db
        .prepare(
          'SELECT * FROM daily_tasks WHERE id IN (?, ?) ORDER BY baseXP DESC'
        )
        .all(
          GUEST_TASK_IDS.READING_COMPREHENSION,
          GUEST_TASK_IDS.CHARACTER_ANALYSIS
        ) as any[];

      expect(tasks.length).toBe(2);

      // Verify first task (reading comprehension - higher XP)
      expect(tasks[0].id).toBe(GUEST_TASK_IDS.READING_COMPREHENSION);
      expect(tasks[0].taskType).toBe('reading_comprehension');
      expect(tasks[0].difficulty).toBe('medium');
      expect(tasks[0].baseXP).toBe(50);
      expect(tasks[0].title).toContain('林黛玉進賈府');

      // Verify second task (character analysis - lower XP)
      expect(tasks[1].id).toBe(GUEST_TASK_IDS.CHARACTER_ANALYSIS);
      expect(tasks[1].taskType).toBe('character_analysis');
      expect(tasks[1].difficulty).toBe('easy');
      expect(tasks[1].baseXP).toBe(30);
      expect(tasks[1].title).toContain('賈寶玉');
    });

    it('should create daily progress with no completed tasks', () => {
      seedGuestAccount(true);

      const today = new Date().toISOString().split('T')[0];
      const progress = db
        .prepare('SELECT * FROM daily_progress WHERE userId = ? AND date = ?')
        .get(GUEST_USER_ID, today) as any;

      expect(progress).toBeDefined();
      expect(progress.userId).toBe(GUEST_USER_ID);
      expect(progress.date).toBe(today);
      expect(progress.totalXPEarned).toBe(0);
      expect(progress.streak).toBe(1);

      // Parse JSON fields
      const tasks = JSON.parse(progress.tasks);
      const completedTaskIds = JSON.parse(progress.completedTaskIds);
      const skippedTaskIds = JSON.parse(progress.skippedTaskIds);

      expect(tasks).toContain(GUEST_TASK_IDS.READING_COMPREHENSION);
      expect(tasks).toContain(GUEST_TASK_IDS.CHARACTER_ANALYSIS);
      expect(completedTaskIds).toEqual([]);
      expect(skippedTaskIds).toEqual([]);
    });

    it('should handle reset flag to replace existing data', () => {
      // First seeding
      seedGuestAccount(true);
      const firstUser = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(GUEST_USER_ID) as any;
      const firstCreatedAt = firstUser.createdAt;

      // Wait a bit to ensure different timestamp
      jest.advanceTimersByTime(100);

      // Second seeding with reset
      seedGuestAccount(true);
      const secondUser = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(GUEST_USER_ID) as any;

      // Should still have exactly one user
      const userCount = db
        .prepare('SELECT COUNT(*) as count FROM users WHERE id = ?')
        .get(GUEST_USER_ID) as any;
      expect(userCount.count).toBe(1);

      // XP should still be 70 (not doubled)
      expect(secondUser.currentXP).toBe(GUEST_FIXED_XP);
    });
  });

  describe('Error handling', () => {
    it('should rollback transaction on error', () => {
      // Mock db.exec to throw error during commit
      const originalExec = db.exec;
      let callCount = 0;

      db.exec = jest.fn((sql: string) => {
        callCount++;
        if (sql === 'COMMIT') {
          throw new Error('Simulated commit failure');
        }
        return originalExec.call(db, sql);
      });

      // Expect the seeding to throw
      expect(() => seedGuestAccount(true)).toThrow('Simulated commit failure');

      // Restore original exec
      db.exec = originalExec;

      // Verify no partial data was committed
      const user = db
        .prepare('SELECT * FROM users WHERE id = ?')
        .get(GUEST_USER_ID);
      expect(user).toBeUndefined();
    });
  });
});
