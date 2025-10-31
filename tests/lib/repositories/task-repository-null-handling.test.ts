/**
 * @jest-environment node
 *
 * @fileOverview Unit Tests for Task Repository - NULL Constraint Handling
 *
 * Tests the NULL constraint handling added in bug fix commit 1d6fb78.
 * Verifies that the repository provides appropriate default values for
 * nullable fields to prevent SQLITE_CONSTRAINT_NOT NULL errors.
 *
 * Key behaviors tested:
 * - Provides default title when title is undefined
 * - Provides default baseXP when baseXP is 0 or undefined
 * - Handles null optional fields correctly
 * - Preserves provided values when available
 * - Handles batch creation with mixed null/defined values
 *
 * Fix Location: src/lib/repositories/task-repository.ts:303
 *
 * @phase Testing Phase - Bug Fix Validation
 * @created 2025-10-31
 */

import Database from 'better-sqlite3';
import type { DailyTask, TaskType, TaskDifficulty } from '@/lib/types/daily-task';

// Create test database before mocking
let testDb: Database.Database;

// Mock the sqlite-db module to use in-memory database
jest.mock('@/lib/sqlite-db', () => ({
  getDatabase: jest.fn(() => testDb),
  toUnixTimestamp: jest.fn((date: Date | number) => {
    return typeof date === 'number' ? date : date.getTime();
  }),
  fromUnixTimestamp: jest.fn((timestamp: number) => {
    return new Date(timestamp);
  }),
}));

// Import repository after mocking
import * as taskRepository from '@/lib/repositories/task-repository';

describe('Task Repository - NULL Constraint Handling', () => {
  beforeEach(() => {
    // Create in-memory test database
    testDb = new Database(':memory:');

    // Initialize schema
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS daily_tasks (
        id TEXT PRIMARY KEY,
        taskType TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        baseXP INTEGER NOT NULL,
        content TEXT NOT NULL,
        sourceChapter INTEGER,
        sourceVerseStart INTEGER,
        sourceVerseEnd INTEGER,
        createdAt INTEGER NOT NULL
      )
    `);
  });

  /**
   * Helper function to create minimal task data
   */
  function createMinimalTask(overrides: Partial<DailyTask> = {}): DailyTask {
    return {
      id: 'test-task-' + Date.now(),
      taskType: 'quiz' as TaskType,
      difficulty: 'medium' as TaskDifficulty,
      title: 'Default Title',
      baseXP: 50,
      createdAt: new Date(),
      ...overrides,
    };
  }

  describe('Test 1: Should provide default title when title is undefined', () => {
    it('should use default title format when title is undefined', () => {
      // Setup: Create task with undefined title
      const taskWithoutTitle: DailyTask = {
        id: 'task-no-title-1',
        taskType: 'quiz',
        difficulty: 'medium',
        title: undefined as any, // Explicitly undefined
        baseXP: 50,
        createdAt: new Date(),
      };

      // Action: Batch create tasks
      taskRepository.batchCreateTasks([taskWithoutTitle]);

      // Assertion: Query DB and verify title has default value
      const result = testDb.prepare('SELECT title FROM daily_tasks WHERE id = ?')
        .get('task-no-title-1') as { title: string };

      expect(result.title).toBe('quiz 任務');
    });

    it('should use taskType in default title', () => {
      // Setup: Create tasks with different taskTypes but no title
      const tasks: DailyTask[] = [
        createMinimalTask({ id: 'task-1', taskType: 'reading_comprehension', title: undefined as any }),
        createMinimalTask({ id: 'task-2', taskType: 'poetry', title: undefined as any }),
        createMinimalTask({ id: 'task-3', taskType: 'cultural_quiz', title: undefined as any }),
      ];

      // Action: Batch create
      taskRepository.batchCreateTasks(tasks);

      // Assertion: Verify each has correct default title

      const task1 = testDb.prepare('SELECT title FROM daily_tasks WHERE id = ?').get('task-1') as { title: string };
      const task2 = testDb.prepare('SELECT title FROM daily_tasks WHERE id = ?').get('task-2') as { title: string };
      const task3 = testDb.prepare('SELECT title FROM daily_tasks WHERE id = ?').get('task-3') as { title: string };

      expect(task1.title).toBe('reading_comprehension 任務');
      expect(task2.title).toBe('poetry 任務');
      expect(task3.title).toBe('cultural_quiz 任務');
    });
  });

  describe('Test 2: Should provide default baseXP when baseXP is 0 or undefined', () => {
    it('should set baseXP to 10 when undefined', () => {
      // Setup: Task with undefined baseXP
      const taskWithoutXP: DailyTask = {
        id: 'task-no-xp',
        taskType: 'quiz',
        difficulty: 'medium',
        title: 'Test Task',
        baseXP: undefined as any,
        createdAt: new Date(),
      };

      // Action: Create task
      taskRepository.batchCreateTasks([taskWithoutXP]);

      // Assertion: Verify baseXP defaults to 10
      const result = testDb.prepare('SELECT baseXP FROM daily_tasks WHERE id = ?')
        .get('task-no-xp') as { baseXP: number };

      expect(result.baseXP).toBe(10);
    });

    it('should preserve baseXP of 0 when explicitly set', () => {
      // Setup: Task with explicit 0 baseXP
      const zeroXPTask = createMinimalTask({
        id: 'task-zero-xp',
        baseXP: 0
      });

      // Action: Create task
      taskRepository.batchCreateTasks([zeroXPTask]);

      // Assertion: Verify baseXP remains 0 (not changed to another default)
      const result = testDb.prepare('SELECT baseXP FROM daily_tasks WHERE id = ?')
        .get('task-zero-xp') as { baseXP: number };

      expect(result.baseXP).toBe(0);
    });
  });

  describe('Test 3: Should handle null optional fields correctly', () => {
    it('should provide default description and store null for truly optional fields when not provided', () => {
      // Setup: Task with minimal required fields only
      const minimalTask: DailyTask = {
        id: 'task-minimal',
        taskType: 'quiz',
        difficulty: 'medium',
        title: 'Minimal Task',
        baseXP: 50,
        createdAt: new Date(),
        // No description, sourceChapter, etc.
      };

      // Action: Create task
      taskRepository.batchCreateTasks([minimalTask]);

      // Assertion: Verify description gets default value, truly optional fields are null in DB
      const result = testDb.prepare(`
        SELECT description, sourceChapter, sourceVerseStart, sourceVerseEnd
        FROM daily_tasks
        WHERE id = ?
      `).get('task-minimal') as any;

      expect(result.description).toBe('請完成此 quiz 類型的學習任務');
      expect(result.sourceChapter).toBeNull();
      expect(result.sourceVerseStart).toBeNull();
      expect(result.sourceVerseEnd).toBeNull();
    });

    it('should provide default description and convert null source fields to undefined when retrieving tasks', () => {
      // Setup: Task with null optional fields
      const taskWithNulls = createMinimalTask({
        id: 'task-with-nulls',
        description: undefined,
        sourceChapter: undefined,
      });

      // Action: Create and retrieve task
      taskRepository.batchCreateTasks([taskWithNulls]);
      const retrieved = taskRepository.getTaskById('task-with-nulls');

      // Assertion: Description has default, truly optional fields return as undefined in TypeScript
      expect(retrieved).toBeDefined();
      expect(retrieved?.description).toBe('請完成此 quiz 類型的學習任務');
      expect(retrieved?.sourceChapter).toBeUndefined();
    });
  });

  describe('Test 4: Should preserve provided values when available', () => {
    it('should not apply defaults when values are explicitly provided', () => {
      // Setup: Task with explicit title and baseXP
      const fullTask = createMinimalTask({
        id: 'task-full',
        title: 'Custom Title',
        baseXP: 100,
        description: 'Custom description',
      });

      // Action: Create and retrieve
      taskRepository.batchCreateTasks([fullTask]);
      const retrieved = taskRepository.getTaskById('task-full');

      // Assertion: Verify original values preserved
      expect(retrieved?.title).toBe('Custom Title');
      expect(retrieved?.baseXP).toBe(100);
      expect(retrieved?.description).toBe('Custom description');
    });

    it('should preserve all provided optional fields', () => {
      // Setup: Task with all optional fields provided
      const completeTask = createMinimalTask({
        id: 'task-complete',
        title: 'Complete Task',
        description: 'Full description',
        baseXP: 150,
        sourceChapter: 12,
        sourceVerseStart: 5,
        sourceVerseEnd: 10,
      });

      // Action: Create and retrieve
      taskRepository.batchCreateTasks([completeTask]);
      const retrieved = taskRepository.getTaskById('task-complete');

      // Assertion: All values preserved
      expect(retrieved?.sourceChapter).toBe(12);
      expect(retrieved?.sourceVerseStart).toBe(5);
      expect(retrieved?.sourceVerseEnd).toBe(10);
    });
  });

  describe('Test 5: Should handle batch creation with mixed null/defined values', () => {
    it('should handle batch of tasks with varying field completeness', () => {
      // Setup: 3 tasks with different field completeness
      const tasks: DailyTask[] = [
        // Task 1: All fields provided
        createMinimalTask({
          id: 'task-full-1',
          title: 'Full Task',
          baseXP: 100,
          description: 'Description',
          sourceChapter: 5,
        }),
        // Task 2: Missing title (should get default)
        createMinimalTask({
          id: 'task-partial-2',
          title: undefined as any,
          baseXP: 75,
        }),
        // Task 3: Missing baseXP (should get 0)
        createMinimalTask({
          id: 'task-partial-3',
          title: 'Partial Task',
          baseXP: undefined as any,
        }),
      ];

      // Action: Batch create
      const result = taskRepository.batchCreateTasks(tasks);

      // Assertion: All 3 tasks stored successfully
      expect(result).toHaveLength(3);

      // Verify each task in database

      const task1 = testDb.prepare('SELECT * FROM daily_tasks WHERE id = ?').get('task-full-1') as any;
      const task2 = testDb.prepare('SELECT * FROM daily_tasks WHERE id = ?').get('task-partial-2') as any;
      const task3 = testDb.prepare('SELECT * FROM daily_tasks WHERE id = ?').get('task-partial-3') as any;

      // Task 1: Original values preserved
      expect(task1.title).toBe('Full Task');
      expect(task1.baseXP).toBe(100);

      // Task 2: Default title applied
      expect(task2.title).toBe('quiz 任務');
      expect(task2.baseXP).toBe(75);

      // Task 3: Default baseXP applied (10)
      expect(task3.title).toBe('Partial Task');
      expect(task3.baseXP).toBe(10);
    });

    it('should not fail batch operation when some tasks have missing fields', () => {
      // Setup: Mixed batch with undefined values
      const mixedTasks: DailyTask[] = [
        createMinimalTask({ id: 'mix-1', title: undefined as any }),
        createMinimalTask({ id: 'mix-2', baseXP: undefined as any }),
        createMinimalTask({ id: 'mix-3', title: undefined as any, baseXP: undefined as any }),
      ];

      // Action & Assertion: Should not throw error
      expect(() => {
        taskRepository.batchCreateTasks(mixedTasks);
      }).not.toThrow();

      // Verify all tasks created successfully
      const count = testDb.prepare('SELECT COUNT(*) as count FROM daily_tasks').get() as { count: number };

      expect(count.count).toBeGreaterThanOrEqual(3);
    });
  });
});
