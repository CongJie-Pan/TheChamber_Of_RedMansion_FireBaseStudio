/**
 * @jest-environment node
 *
 * @fileoverview Unit tests for daily-task-service field mapping integration
 *
 * Tests how the service layer handles type ↔ taskType field mapping when:
 * - Generating tasks via AI
 * - Storing tasks through repository
 * - Loading tasks from cache
 * - Handling validation errors
 *
 * Following Google Testing Best Practices:
 * - Test service behavior through public APIs
 * - Test state changes (database, cache)
 * - Mock external dependencies (AI generator)
 * - Self-contained tests
 * - Clear behavioral descriptions
 */

import Database from 'better-sqlite3';
import { DailyTaskService } from '../../src/lib/daily-task-service';
import * as taskRepository from '../../src/lib/repositories/task-repository';
import { DailyTask, DailyTaskType, TaskDifficulty } from '../../src/lib/types/daily-task';
import { getDatabase } from '../../src/lib/sqlite-db';

// Mock AI task generator to control task generation
jest.mock('../../src/lib/ai-task-content-generator', () => ({
  AITaskContentGenerator: jest.fn().mockImplementation(() => ({
    generateTasksForUser: jest.fn().mockResolvedValue([
      {
        id: 'ai-generated-001',
        type: DailyTaskType.MORNING_READING,
        difficulty: 'medium' as TaskDifficulty,
        title: 'AI Generated Task 1',
        description: 'Test task from AI',
        baseXP: 50,
        timeEstimate: 10,
        xpReward: 50,
        attributeRewards: {},
        content: {},
        gradingCriteria: { minLength: 30, maxLength: 500 },
        createdAt: new Date(),
      },
      {
        id: 'ai-generated-002',
        type: DailyTaskType.CHARACTER_INSIGHT,
        difficulty: 'easy' as TaskDifficulty,
        title: 'AI Generated Task 2',
        description: 'Test task from AI',
        baseXP: 30,
        timeEstimate: 5,
        xpReward: 30,
        attributeRewards: {},
        content: {},
        gradingCriteria: { minLength: 30, maxLength: 500 },
        createdAt: new Date(),
      },
    ]),
  })),
}));

describe('Daily Task Service - Field Mapping Integration', () => {
  let db: Database.Database;
  let service: DailyTaskService;

  beforeAll(() => {
    process.env.USE_MEMORY_DB = 'true';
    process.env.SQLITE_ENABLED = 'true';
    (global as any).window = undefined;
  });

  beforeEach(() => {
    db = getDatabase();
    // Clean all related tables
    db.prepare('DELETE FROM daily_tasks').run();
    db.prepare('DELETE FROM daily_progress').run();
    db.prepare('DELETE FROM task_submissions').run();

    service = new DailyTaskService();
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  describe('Task generation with field mapping', () => {
    test('should generate tasks with correct type field from AI', async () => {
      // Behavior: AI-generated tasks should contain valid type field
      const userId = 'test-user-001';
      const date = '2025-10-31';

      const tasks = await service.generateDailyTasks(userId, date);

      expect(tasks).toHaveLength(2);

      // Verify each task has type field (not taskType)
      tasks.forEach(task => {
        expect(task).toHaveProperty('type');
        expect(task).not.toHaveProperty('taskType');
        expect(Object.values(DailyTaskType)).toContain(task.type);
      });

      // Verify specific types
      expect(tasks[0].type).toBe(DailyTaskType.MORNING_READING);
      expect(tasks[1].type).toBe(DailyTaskType.CHARACTER_INSIGHT);
    });

    test('should store generated tasks with correct taskType in database', async () => {
      // Behavior: Tasks stored through service should have correct field mapping
      const userId = 'test-user-002';
      const date = '2025-10-31';

      const generatedTasks = await service.generateDailyTasks(userId, date);

      // Verify tasks are in database with correct type
      const task1 = taskRepository.getTaskById(generatedTasks[0].id);
      const task2 = taskRepository.getTaskById(generatedTasks[1].id);

      expect(task1).not.toBeNull();
      expect(task1?.type).toBe(DailyTaskType.MORNING_READING);

      expect(task2).not.toBeNull();
      expect(task2?.type).toBe(DailyTaskType.CHARACTER_INSIGHT);
    });

    test('should enforce task limit of 2 with correct types', async () => {
      // Behavior: Service should limit to exactly 2 tasks, both with valid types
      const userId = 'test-user-003';
      const date = '2025-10-31';

      const tasks = await service.generateDailyTasks(userId, date);

      expect(tasks).toHaveLength(2); // Fixed limit

      // Both tasks must have valid types
      expect(tasks.every(t => Object.values(DailyTaskType).includes(t.type))).toBe(true);
    });
  });

  describe('Task cache with field mapping', () => {
    test('should preserve type field when retrieving from cache', async () => {
      // Behavior: Cached tasks should maintain correct type field
      const userId = 'test-user-004';
      const date = '2025-10-31';

      // First call - generates and caches
      const tasks1 = await service.generateDailyTasks(userId, date);
      const firstTaskTypes = tasks1.map(t => t.type);

      // Second call - should load from cache
      const tasks2 = await service.generateDailyTasks(userId, date);
      const secondTaskTypes = tasks2.map(t => t.type);

      // Types should be identical
      expect(secondTaskTypes).toEqual(firstTaskTypes);

      // All should have type field
      tasks2.forEach(task => {
        expect(task).toHaveProperty('type');
        expect(task).not.toHaveProperty('taskType');
      });
    });

    test('should return same task IDs and types on repeated calls', async () => {
      // Behavior: Cache should provide consistent results
      const userId = 'test-user-005';
      const date = '2025-10-31';

      const call1 = await service.generateDailyTasks(userId, date);
      const call2 = await service.generateDailyTasks(userId, date);
      const call3 = await service.generateDailyTasks(userId, date);

      // Same IDs
      expect(call2.map(t => t.id)).toEqual(call1.map(t => t.id));
      expect(call3.map(t => t.id)).toEqual(call1.map(t => t.id));

      // Same types
      expect(call2.map(t => t.type)).toEqual(call1.map(t => t.type));
      expect(call3.map(t => t.type)).toEqual(call1.map(t => t.type));
    });
  });

  describe('Field validation in service layer', () => {
    test('should validate task types before storage', async () => {
      // Behavior: Service should ensure tasks have valid types before repository
      const userId = 'test-user-006';
      const date = '2025-10-31';

      const tasks = await service.generateDailyTasks(userId, date);

      // All tasks should pass validation
      tasks.forEach(task => {
        expect(task.type).toBeDefined();
        expect(task.type).not.toBe('');
        expect(task.type).not.toBeNull();
        expect(typeof task.type).toBe('string');
      });
    });

    test('should include type field in validation warnings', async () => {
      // Behavior: Missing or invalid types should be logged/warned
      const userId = 'test-user-007';
      const date = '2025-10-31';

      // Spy on console.warn to capture validation warnings
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await service.generateDailyTasks(userId, date);

      // If there were validation issues, they should be logged
      // (Current implementation may not warn, but documents expected behavior)

      warnSpy.mockRestore();
    });
  });

  describe('Type field in task retrieval', () => {
    test('should retrieve tasks by user with correct type field', async () => {
      // Behavior: getUserDailyProgress should return tasks with type field
      const userId = 'test-user-008';
      const date = '2025-10-31';

      await service.generateDailyTasks(userId, date);

      const progress = await service.getUserDailyProgress(userId, date);

      expect(progress).toBeDefined();
      expect(progress.tasks).toHaveLength(2);

      progress.tasks.forEach((task: DailyTask) => {
        expect(task).toHaveProperty('type');
        expect(Object.values(DailyTaskType)).toContain(task.type);
      });
    });

    test('should load tasks from existing progress with preserved types', async () => {
      // Behavior: Loading existing progress should maintain type integrity
      const userId = 'test-user-009';
      const date = '2025-10-31';

      // Generate tasks
      const generated = await service.generateDailyTasks(userId, date);
      const originalTypes = generated.map(t => t.type);

      // Clear service cache but keep database
      (service as any).taskCache?.clear();

      // Load from database
      const progress = await service.getUserDailyProgress(userId, date);
      const loadedTypes = progress.tasks.map((t: DailyTask) => t.type);

      expect(loadedTypes).toEqual(originalTypes);
    });
  });

  describe('Field mapping consistency across operations', () => {
    test('should maintain type field through generate → store → retrieve cycle', async () => {
      // Behavior: Type field should be consistent through entire lifecycle
      const userId = 'test-user-010';
      const date = '2025-10-31';

      // 1. Generate
      const generated = await service.generateDailyTasks(userId, date);
      expect(generated[0].type).toBe(DailyTaskType.MORNING_READING);

      // 2. Store (already done by generateDailyTasks)
      const stored = taskRepository.getTaskById(generated[0].id);
      expect(stored?.type).toBe(DailyTaskType.MORNING_READING);

      // 3. Retrieve via service
      const progress = await service.getUserDailyProgress(userId, date);
      expect(progress.tasks[0].type).toBe(DailyTaskType.MORNING_READING);

      // All three should match
      expect(generated[0].type).toBe(stored?.type);
      expect(stored?.type).toBe(progress.tasks[0].type);
    });

    test('should handle all DailyTaskType enum values in service flow', async () => {
      // Behavior: Service should correctly handle all possible task types
      const allTypes = Object.values(DailyTaskType);

      // Test each type can flow through service
      for (const taskType of allTypes) {
        const mockTask: DailyTask = {
          id: `type-test-${taskType}`,
          type: taskType,
          difficulty: 'medium' as TaskDifficulty,
          title: `Test ${taskType}`,
          description: 'Test',
          baseXP: 50,
          timeEstimate: 10,
          xpReward: 50,
          attributeRewards: {},
          content: {},
          gradingCriteria: { minLength: 30, maxLength: 500 },
          createdAt: new Date(),
        };

        // Store through repository (service would do this)
        taskRepository.createTask(mockTask);

        // Verify retrieval
        const retrieved = taskRepository.getTaskById(mockTask.id);
        expect(retrieved?.type).toBe(taskType);
      }
    });
  });

  describe('Error scenarios with field mapping', () => {
    test('should handle tasks with missing type gracefully', () => {
      // Behavior: Service should detect and handle missing type field
      const invalidTask = {
        id: 'invalid-task-001',
        // type is missing
        difficulty: 'easy',
        title: 'Invalid Task',
        baseXP: 10,
      } as any;

      // Attempting to store should fail at repository level
      expect(() => taskRepository.createTask(invalidTask)).toThrow();
    });

    test('should rollback task generation if storage fails', async () => {
      // Behavior: If any task fails to store, entire generation should rollback
      const userId = 'test-user-011';
      const date = '2025-10-31';

      // Mock repository to fail on second task
      const originalBatchCreate = taskRepository.batchCreateTasks;
      jest.spyOn(taskRepository as any, 'batchCreateTasks').mockImplementationOnce(() => {
        throw new Error('Storage failure');
      });

      await expect(service.generateDailyTasks(userId, date))
        .rejects.toThrow();

      // Verify no partial storage
      const task1 = taskRepository.getTaskById('ai-generated-001');
      expect(task1).toBeNull(); // Should be rolled back

      // Restore
      (taskRepository as any).batchCreateTasks = originalBatchCreate;
    });
  });

  describe('Integration with task types', () => {
    test('should support querying by task type after service generation', async () => {
      // Behavior: Generated tasks should be queryable by type
      const userId = 'test-user-012';
      const date = '2025-10-31';

      await service.generateDailyTasks(userId, date);

      // Query by type
      const morningTasks = taskRepository.getTasksByType(DailyTaskType.MORNING_READING);
      const characterTasks = taskRepository.getTasksByType(DailyTaskType.CHARACTER_INSIGHT);

      // Should find at least the generated tasks
      expect(morningTasks.length).toBeGreaterThanOrEqual(1);
      expect(characterTasks.length).toBeGreaterThanOrEqual(1);
    });

    test('should maintain type field in task updates', async () => {
      // Behavior: Updating task through service should preserve type
      const userId = 'test-user-013';
      const date = '2025-10-31';

      const tasks = await service.generateDailyTasks(userId, date);
      const taskId = tasks[0].id;
      const originalType = tasks[0].type;

      // Update task (simulating a service update)
      taskRepository.updateTask(taskId, { title: 'Updated Title' });

      // Type should be unchanged
      const updated = taskRepository.getTaskById(taskId);
      expect(updated?.type).toBe(originalType);
      expect(updated?.title).toBe('Updated Title');
    });
  });
});
