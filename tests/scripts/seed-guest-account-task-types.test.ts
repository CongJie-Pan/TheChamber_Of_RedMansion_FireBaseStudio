/**
 * @jest-environment node
 *
 * @fileoverview Unit tests for guest account seed script task type validation
 *
 * Validates that the guest account seeding script uses correct DailyTaskType
 * enum values and creates tasks with proper field mapping.
 *
 * Following Google Testing Best Practices:
 * - Test behaviors through public APIs (seedGuestAccount function)
 * - Test state changes (database state after seeding)
 * - Self-contained tests with proper setup/teardown
 * - Clear test names describing expected behavior
 * - No test logic - straightforward assertions
 * - Meaningful failure messages
 */

import Database from 'better-sqlite3';
import { seedGuestAccount } from '../../scripts/seed-guest-account';
import * as taskRepository from '../../src/lib/repositories/task-repository';
import * as userRepository from '../../src/lib/repositories/user-repository';
import { DailyTaskType } from '../../src/lib/types/daily-task';
import {
  GUEST_USER_ID,
  GUEST_TASK_1_ID,
  GUEST_TASK_2_ID,
  GUEST_FIXED_XP,
  GUEST_LEVEL,
} from '../../src/lib/constants/guest-account';
import { getDatabase } from '../../src/lib/sqlite-db';

describe('Guest Account Seed Script - Task Types', () => {
  let db: Database.Database;

  beforeAll(() => {
    process.env.USE_MEMORY_DB = 'true';
    process.env.SQLITE_ENABLED = 'true';

    // Mock window to be undefined in Node.js test environment
    (global as any).window = undefined;
  });

  beforeEach(() => {
    db = getDatabase();
    // Clean database before each test
    db.prepare('DELETE FROM task_submissions WHERE userId = ?').run(GUEST_USER_ID);
    db.prepare('DELETE FROM daily_progress WHERE userId = ?').run(GUEST_USER_ID);
    db.prepare('DELETE FROM daily_tasks WHERE id IN (?, ?)').run(GUEST_TASK_1_ID, GUEST_TASK_2_ID);
    db.prepare('DELETE FROM users WHERE id = ?').run(GUEST_USER_ID);
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  describe('Guest task type validation', () => {
    test('should use valid DailyTaskType enum values for guest tasks', () => {
      // Behavior: Guest task types should be valid members of DailyTaskType enum
      const validTypes = Object.values(DailyTaskType);

      // Verify GUEST_TASK_1 type (morning_reading)
      expect(validTypes).toContain(DailyTaskType.MORNING_READING);

      // Verify GUEST_TASK_2 type (character_insight)
      expect(validTypes).toContain(DailyTaskType.CHARACTER_INSIGHT);

      // Ensure these are the correct constant values
      expect(DailyTaskType.MORNING_READING).toBe('morning_reading');
      expect(DailyTaskType.CHARACTER_INSIGHT).toBe('character_insight');
    });

    test('should create guest tasks with correct taskType field mapping', async () => {
      // Behavior: After seeding, guest tasks should exist in database with
      // correct type field (mapped from interface to database schema)
      await seedGuestAccount(true); // reset = true

      const task1 = taskRepository.getTaskById(GUEST_TASK_1_ID);
      const task2 = taskRepository.getTaskById(GUEST_TASK_2_ID);

      // Verify task 1
      expect(task1).not.toBeNull();
      expect(task1?.type).toBe('morning_reading'); // Uses interface field name 'type'
      expect(task1?.difficulty).toBe('medium');
      expect(task1?.baseXP).toBe(50);
      expect(task1?.title).toContain('林黛玉進賈府');

      // Verify task 2
      expect(task2).not.toBeNull();
      expect(task2?.type).toBe('character_insight');
      expect(task2?.difficulty).toBe('easy');
      expect(task2?.baseXP).toBe(30);
      expect(task2?.title).toContain('賈寶玉性格特點');
    });

    test('should match guest task types with DailyTaskType enum constants', () => {
      // Behavior: Guest task type values should exactly match enum constants
      // (not string literals)
      const task1Type = 'morning_reading';
      const task2Type = 'character_insight';

      expect(task1Type).toBe(DailyTaskType.MORNING_READING);
      expect(task2Type).toBe(DailyTaskType.CHARACTER_INSIGHT);

      // Verify no typos or mismatches
      expect(task1Type).not.toBe('reading_comprehension'); // Old incorrect value
      expect(task2Type).not.toBe('character_analysis'); // Old incorrect value
    });

    test('should not use deprecated task type values', () => {
      // Behavior: Should not use old incorrect type values that were fixed
      const deprecatedTypes = ['reading_comprehension', 'character_analysis'];
      const validTypes = Object.values(DailyTaskType);

      deprecatedTypes.forEach(deprecatedType => {
        expect(validTypes).not.toContain(deprecatedType);
      });
    });
  });

  describe('Guest account reset behavior', () => {
    test('should recreate tasks with correct types after reset', async () => {
      // Behavior: Reset should delete old tasks and create new ones with
      // same correct types
      await seedGuestAccount(true); // First seed

      const firstTask = taskRepository.getTaskById(GUEST_TASK_1_ID);
      expect(firstTask?.type).toBe('morning_reading');

      await seedGuestAccount(true); // Reset

      const secondTask = taskRepository.getTaskById(GUEST_TASK_1_ID);
      expect(secondTask?.type).toBe('morning_reading'); // Type should be same
      expect(secondTask?.id).toBe(GUEST_TASK_1_ID); // Same ID
    });

    test('should maintain task type consistency across multiple resets', async () => {
      // Behavior: Multiple resets should always create tasks with same types
      const resetCount = 3;
      const task1Types: string[] = [];
      const task2Types: string[] = [];

      for (let i = 0; i < resetCount; i++) {
        await seedGuestAccount(true);

        const task1 = taskRepository.getTaskById(GUEST_TASK_1_ID);
        const task2 = taskRepository.getTaskById(GUEST_TASK_2_ID);

        task1Types.push(task1!.type);
        task2Types.push(task2!.type);
      }

      // All iterations should have same types
      expect(new Set(task1Types).size).toBe(1); // Only one unique value
      expect(new Set(task2Types).size).toBe(1);
      expect(task1Types[0]).toBe('morning_reading');
      expect(task2Types[0]).toBe('character_insight');
    });

    test('should reset guest user XP and level correctly', async () => {
      // Behavior: Reset should set user to fixed XP and level
      await seedGuestAccount(true);

      const guestUser = userRepository.getUserById(GUEST_USER_ID);

      expect(guestUser).not.toBeNull();
      expect(guestUser?.xp).toBe(GUEST_FIXED_XP); // 70 XP
      expect(guestUser?.level).toBe(GUEST_LEVEL); // Level 1
    });
  });

  describe('Guest task data integrity', () => {
    test('should create tasks with all required fields populated', async () => {
      // Behavior: Guest tasks should have all mandatory fields
      await seedGuestAccount(true);

      const task1 = taskRepository.getTaskById(GUEST_TASK_1_ID);
      const task2 = taskRepository.getTaskById(GUEST_TASK_2_ID);

      // Verify task 1 completeness
      expect(task1?.id).toBeDefined();
      expect(task1?.type).toBeDefined();
      expect(task1?.difficulty).toBeDefined();
      expect(task1?.title).toBeDefined();
      expect(task1?.description).toBeDefined();
      expect(task1?.baseXP).toBeDefined();
      expect(task1?.createdAt).toBeDefined();

      // Verify task 2 completeness
      expect(task2?.id).toBeDefined();
      expect(task2?.type).toBeDefined();
      expect(task2?.difficulty).toBeDefined();
      expect(task2?.title).toBeDefined();
      expect(task2?.description).toBeDefined();
      expect(task2?.baseXP).toBeDefined();
      expect(task2?.createdAt).toBeDefined();
    });

    test('should create tasks with content field as valid JSON', async () => {
      // Behavior: Tasks should have content field with parseable JSON
      await seedGuestAccount(true);

      const task1 = taskRepository.getTaskById(GUEST_TASK_1_ID);
      const task2 = taskRepository.getTaskById(GUEST_TASK_2_ID);

      // Task 1 should have reading comprehension content
      expect(task1).toHaveProperty('question');
      expect(task1).toHaveProperty('correctAnswer');
      expect(task1).toHaveProperty('explanation');

      // Task 2 should have character analysis content
      expect(task2).toHaveProperty('question');
      expect(task2).toHaveProperty('characterName');
      expect(task2?.characterName).toBe('賈寶玉');
    });

    test('should assign correct XP rewards to tasks', async () => {
      // Behavior: Task 1 should have 50 XP, Task 2 should have 30 XP
      await seedGuestAccount(true);

      const task1 = taskRepository.getTaskById(GUEST_TASK_1_ID);
      const task2 = taskRepository.getTaskById(GUEST_TASK_2_ID);

      expect(task1?.baseXP).toBe(50);
      expect(task2?.baseXP).toBe(30);

      // Total should equal 80 XP (both tasks)
      const totalXP = (task1?.baseXP || 0) + (task2?.baseXP || 0);
      expect(totalXP).toBe(80);
    });
  });

  describe('Guest task type usage in actual queries', () => {
    test('should retrieve tasks by type using correct enum values', async () => {
      // Behavior: getTasksByType should work with guest task types
      await seedGuestAccount(true);

      const morningTasks = taskRepository.getTasksByType(DailyTaskType.MORNING_READING);
      const characterTasks = taskRepository.getTasksByType(DailyTaskType.CHARACTER_INSIGHT);

      // Should find at least the guest tasks
      expect(morningTasks.length).toBeGreaterThanOrEqual(1);
      expect(characterTasks.length).toBeGreaterThanOrEqual(1);

      // Guest task should be in results
      const hasGuestTask1 = morningTasks.some(t => t.id === GUEST_TASK_1_ID);
      const hasGuestTask2 = characterTasks.some(t => t.id === GUEST_TASK_2_ID);

      expect(hasGuestTask1).toBe(true);
      expect(hasGuestTask2).toBe(true);
    });

    test('should not retrieve guest tasks with deprecated type values', async () => {
      // Behavior: Queries with old incorrect types should not find guest tasks
      await seedGuestAccount(true);

      // These deprecated types should not exist
      const deprecatedQuery1 = taskRepository.getTasksByType('reading_comprehension' as any);
      const deprecatedQuery2 = taskRepository.getTasksByType('character_analysis' as any);

      expect(deprecatedQuery1).toHaveLength(0);
      expect(deprecatedQuery2).toHaveLength(0);
    });
  });

  describe('Seed script error handling', () => {
    test('should handle multiple seeds without errors', async () => {
      // Behavior: Running seed multiple times should not cause errors
      await expect(seedGuestAccount(true)).resolves.not.toThrow();
      await expect(seedGuestAccount(true)).resolves.not.toThrow();
      await expect(seedGuestAccount(true)).resolves.not.toThrow();

      // Tasks should still exist and be correct
      const task1 = taskRepository.getTaskById(GUEST_TASK_1_ID);
      expect(task1?.type).toBe('morning_reading');
    });

    test('should create exactly 2 tasks (no duplicates)', async () => {
      // Behavior: Should always create exactly 2 guest tasks
      await seedGuestAccount(true);

      const task1 = taskRepository.getTaskById(GUEST_TASK_1_ID);
      const task2 = taskRepository.getTaskById(GUEST_TASK_2_ID);

      expect(task1).not.toBeNull();
      expect(task2).not.toBeNull();

      // Verify no duplicate tasks with same IDs
      const allTasks = db.prepare('SELECT COUNT(*) as count FROM daily_tasks WHERE id IN (?, ?)').get(
        GUEST_TASK_1_ID,
        GUEST_TASK_2_ID
      ) as { count: number };

      expect(allTasks.count).toBe(2); // Exactly 2 tasks
    });
  });

  describe('Integration with task repository', () => {
    test('should create tasks that pass repository validation', async () => {
      // Behavior: Guest tasks should be valid according to repository constraints
      await seedGuestAccount(true);

      const task1 = taskRepository.getTaskById(GUEST_TASK_1_ID);
      const task2 = taskRepository.getTaskById(GUEST_TASK_2_ID);

      // Should be retrievable without errors
      expect(task1).not.toBeNull();
      expect(task2).not.toBeNull();

      // Should have proper type field (not taskType)
      expect(task1).toHaveProperty('type');
      expect(task1).not.toHaveProperty('taskType');

      expect(task2).toHaveProperty('type');
      expect(task2).not.toHaveProperty('taskType');
    });

    test('should allow updating guest tasks through repository', async () => {
      // Behavior: Guest tasks should be updatable like regular tasks
      await seedGuestAccount(true);

      taskRepository.updateTask(GUEST_TASK_1_ID, { title: 'Updated Title' });

      const updated = taskRepository.getTaskById(GUEST_TASK_1_ID);
      expect(updated?.title).toBe('Updated Title');
      expect(updated?.type).toBe('morning_reading'); // Type unchanged
    });
  });
});
