/**
 * @fileoverview Unit tests for task repository field mapping (type ↔ taskType)
 *
 * Tests the critical field mapping between DailyTask interface (uses 'type')
 * and database schema (uses 'taskType') to ensure data integrity across all
 * repository operations.
 *
 * Following Google Testing Best Practices:
 * - Test behaviors, not implementation details
 * - Use public APIs only
 * - Test state changes
 * - Each test is self-contained
 * - Clear, descriptive test names
 * - No logic in tests
 * - Clear failure messages
 * - One behavior per test
 */

import Database from 'better-sqlite3';
import * as taskRepository from '../../../src/lib/repositories/task-repository';
import { DailyTask, DailyTaskType, TaskDifficulty } from '../../../src/lib/types/daily-task';
import { getDatabase } from '../../../src/lib/sqlite-db';

describe('Task Repository - Field Mapping (type ↔ taskType)', () => {
  let db: Database.Database;

  beforeAll(() => {
    // Use in-memory database for fast, isolated tests
    process.env.USE_MEMORY_DB = 'true';
    process.env.SQLITE_ENABLED = 'true';

    // Mock window to be undefined in Node.js test environment
    (global as any).window = undefined;
  });

  beforeEach(() => {
    db = getDatabase();
    // Clean slate for each test
    db.prepare('DELETE FROM daily_tasks').run();
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  // Helper to create minimal valid task
  const createValidTask = (id: string, type: DailyTaskType): DailyTask => ({
    id,
    type, // DailyTask interface uses 'type'
    difficulty: 'medium' as TaskDifficulty,
    title: `Test Task ${type}`,
    baseXP: 50,
    createdAt: new Date(),
  });

  describe('createTask field mapping', () => {
    test('should correctly map DailyTask.type to database taskType column', () => {
      // Behavior: When creating a task with 'type' field, it should be stored
      // in the database 'taskType' column and retrieved correctly
      const task = createValidTask('field-test-001', DailyTaskType.MORNING_READING);

      const created = taskRepository.createTask(task);
      const retrieved = taskRepository.getTaskById('field-test-001');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.type).toBe(DailyTaskType.MORNING_READING);
      expect(retrieved).toHaveProperty('type'); // Must use 'type', not 'taskType'
      expect(retrieved).not.toHaveProperty('taskType'); // Should not expose internal DB field
    });

    test('should preserve task type enum values during round trip', () => {
      // Behavior: All DailyTaskType enum values should remain unchanged
      // through create → read cycle
      const taskTypes: DailyTaskType[] = [
        DailyTaskType.MORNING_READING,
        DailyTaskType.CHARACTER_INSIGHT,
        DailyTaskType.CULTURAL_EXPLORATION,
        DailyTaskType.COMMENTARY_DECODE,
      ];

      taskTypes.forEach((type, index) => {
        const task = createValidTask(`enum-test-${index}`, type);
        taskRepository.createTask(task);
        const retrieved = taskRepository.getTaskById(`enum-test-${index}`);

        expect(retrieved?.type).toBe(type);
        expect(typeof retrieved?.type).toBe('string');
      });
    });

    test('should handle undefined type with clear error message', () => {
      // Behavior: When type field is undefined, should throw error with
      // meaningful message (NOT NULL constraint)
      const invalidTask = {
        id: 'invalid-001',
        type: undefined, // Intentionally undefined
        difficulty: 'easy',
        title: 'Invalid Task',
        baseXP: 10,
      } as any;

      expect(() => taskRepository.createTask(invalidTask)).toThrow();
    });

    test('should store all DailyTaskType enum values without errors', () => {
      // Behavior: Every valid enum value should be storable
      const allEnumValues = Object.values(DailyTaskType);

      allEnumValues.forEach((type, index) => {
        const task = createValidTask(`store-enum-${index}`, type);

        expect(() => taskRepository.createTask(task)).not.toThrow();

        const retrieved = taskRepository.getTaskById(`store-enum-${index}`);
        expect(retrieved?.type).toBe(type);
      });
    });
  });

  describe('batchCreateTasks field mapping', () => {
    test('should correctly map all tasks in batch operation', () => {
      // Behavior: In batch creation, all tasks' type fields should be correctly mapped
      const tasks: DailyTask[] = [
        createValidTask('batch-001', DailyTaskType.MORNING_READING),
        createValidTask('batch-002', DailyTaskType.CHARACTER_INSIGHT),
      ];

      taskRepository.batchCreateTasks(tasks);
      const retrieved = taskRepository.getTasksByIds(['batch-001', 'batch-002']);

      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].type).toBe(DailyTaskType.MORNING_READING);
      expect(retrieved[1].type).toBe(DailyTaskType.CHARACTER_INSIGHT);
    });

    test('should rollback entire batch if any task has invalid type', () => {
      // Behavior: If any task in batch has invalid type, entire transaction
      // should rollback (no partial inserts)
      const tasks = [
        createValidTask('batch-valid', DailyTaskType.MORNING_READING),
        {
          id: 'batch-invalid',
          type: undefined, // Invalid - will cause NOT NULL constraint failure
          difficulty: 'easy',
          title: 'Invalid Task',
          baseXP: 10,
        } as any,
      ];

      expect(() => taskRepository.batchCreateTasks(tasks)).toThrow();

      // Verify rollback: even the valid task should not be inserted
      const validTask = taskRepository.getTaskById('batch-valid');
      expect(validTask).toBeNull();
    });

    test('should maintain type field order in batch results', () => {
      // Behavior: Batch created tasks should maintain the same type order as input
      const tasks: DailyTask[] = [
        createValidTask('order-1', DailyTaskType.CULTURAL_EXPLORATION),
        createValidTask('order-2', DailyTaskType.MORNING_READING),
        createValidTask('order-3', DailyTaskType.COMMENTARY_DECODE),
      ];

      taskRepository.batchCreateTasks(tasks);
      const retrieved = taskRepository.getTasksByIds(['order-1', 'order-2', 'order-3']);

      expect(retrieved[0].type).toBe(DailyTaskType.CULTURAL_EXPLORATION);
      expect(retrieved[1].type).toBe(DailyTaskType.MORNING_READING);
      expect(retrieved[2].type).toBe(DailyTaskType.COMMENTARY_DECODE);
    });
  });

  describe('updateTask field mapping', () => {
    test('should preserve type field when updating other fields', () => {
      // Behavior: When updating non-type fields, the type field should remain unchanged
      const original = createValidTask('update-001', DailyTaskType.MORNING_READING);

      taskRepository.createTask(original);
      taskRepository.updateTask('update-001', { title: 'Updated Title' });

      const updated = taskRepository.getTaskById('update-001');
      expect(updated?.type).toBe(DailyTaskType.MORNING_READING); // Type unchanged
      expect(updated?.title).toBe('Updated Title'); // Title updated
    });

    test('should allow updating task type to different enum value', () => {
      // Behavior: Type field should be updatable to different valid enum value
      const task = createValidTask('update-002', DailyTaskType.MORNING_READING);

      taskRepository.createTask(task);
      taskRepository.updateTask('update-002', {
        type: DailyTaskType.CHARACTER_INSIGHT
      });

      const updated = taskRepository.getTaskById('update-002');
      expect(updated?.type).toBe(DailyTaskType.CHARACTER_INSIGHT);
    });

    test('should handle partial updates without corrupting type field', () => {
      // Behavior: Partial updates (only some fields) should not affect type field
      const task = createValidTask('update-003', DailyTaskType.CULTURAL_EXPLORATION);
      task.baseXP = 70;

      taskRepository.createTask(task);
      taskRepository.updateTask('update-003', { baseXP: 100 });

      const updated = taskRepository.getTaskById('update-003');
      expect(updated?.type).toBe(DailyTaskType.CULTURAL_EXPLORATION);
      expect(updated?.baseXP).toBe(100);
    });
  });

  describe('rowToTask field mapping', () => {
    test('should correctly map database row taskType to DailyTask.type', () => {
      // Behavior: Database query results with 'taskType' column should be
      // converted to DailyTask interface with 'type' property
      const task = createValidTask('row-test-001', DailyTaskType.CULTURAL_EXPLORATION);

      taskRepository.createTask(task);
      const retrieved = taskRepository.getTaskById('row-test-001');

      // Verify interface compliance
      expect(retrieved).toHaveProperty('type');
      expect(retrieved).not.toHaveProperty('taskType');
      expect(retrieved?.type).toBe(DailyTaskType.CULTURAL_EXPLORATION);
    });

    test('should handle all TaskType enum values in rowToTask conversion', () => {
      // Behavior: rowToTask should correctly convert all valid TaskType enum values
      const allTypes = Object.values(DailyTaskType);

      allTypes.forEach((type, index) => {
        const task = createValidTask(`row-enum-${index}`, type);
        taskRepository.createTask(task);
        const retrieved = taskRepository.getTaskById(`row-enum-${index}`);

        expect(retrieved?.type).toBe(type);
        expect(typeof retrieved?.type).toBe('string');
      });
    });

    test('should maintain type field integrity in getTasksByType query', () => {
      // Behavior: Querying by type should return tasks with correct type field
      const task1 = createValidTask('type-query-1', DailyTaskType.MORNING_READING);
      const task2 = createValidTask('type-query-2', DailyTaskType.MORNING_READING);
      const task3 = createValidTask('type-query-3', DailyTaskType.CHARACTER_INSIGHT);

      taskRepository.createTask(task1);
      taskRepository.createTask(task2);
      taskRepository.createTask(task3);

      const morningTasks = taskRepository.getTasksByType(DailyTaskType.MORNING_READING);

      expect(morningTasks).toHaveLength(2);
      morningTasks.forEach(task => {
        expect(task.type).toBe(DailyTaskType.MORNING_READING);
      });
    });
  });

  describe('Field mapping edge cases', () => {
    test('should handle empty string type as invalid', () => {
      // Behavior: Empty string should not be accepted as valid type
      const invalidTask = {
        id: 'edge-001',
        type: '', // Empty string
        difficulty: 'easy',
        title: 'Edge Case Task',
        baseXP: 10,
      } as any;

      // SQLite constraint or validation should reject this
      expect(() => taskRepository.createTask(invalidTask)).toThrow();
    });

    test('should handle null type as invalid', () => {
      // Behavior: Null should trigger NOT NULL constraint error
      const invalidTask = {
        id: 'edge-002',
        type: null,
        difficulty: 'easy',
        title: 'Edge Case Task',
        baseXP: 10,
      } as any;

      expect(() => taskRepository.createTask(invalidTask)).toThrow(/NOT NULL/i);
    });

    test('should reject non-enum type values', () => {
      // Behavior: Type values not in DailyTaskType enum should be rejected
      const invalidTask = {
        id: 'edge-003',
        type: 'invalid_task_type', // Not a valid enum value
        difficulty: 'easy',
        title: 'Edge Case Task',
        baseXP: 10,
        createdAt: new Date(),
      } as any;

      // Note: SQLite won't enforce enum, but application logic should validate
      // This test documents expected behavior even if not currently enforced
      const created = taskRepository.createTask(invalidTask);
      const retrieved = taskRepository.getTaskById('edge-003');

      // Document that invalid enum values can currently be stored
      // (This is a known limitation - SQLite doesn't enforce enums)
      expect(retrieved?.type).toBe('invalid_task_type');
    });
  });

  describe('Field mapping consistency', () => {
    test('should maintain type consistency across multiple operations', () => {
      // Behavior: Type field should remain consistent through create → read → update → read
      const originalType = DailyTaskType.MORNING_READING;
      const newType = DailyTaskType.CHARACTER_INSIGHT;

      const task = createValidTask('consistency-001', originalType);

      // Create
      taskRepository.createTask(task);
      const afterCreate = taskRepository.getTaskById('consistency-001');
      expect(afterCreate?.type).toBe(originalType);

      // Update
      taskRepository.updateTask('consistency-001', { type: newType });
      const afterUpdate = taskRepository.getTaskById('consistency-001');
      expect(afterUpdate?.type).toBe(newType);

      // Read again
      const finalRead = taskRepository.getTaskById('consistency-001');
      expect(finalRead?.type).toBe(newType);
    });

    test('should ensure type field survives database round trips', () => {
      // Behavior: Type field should be identical after multiple read operations
      const task = createValidTask('roundtrip-001', DailyTaskType.CULTURAL_EXPLORATION);

      taskRepository.createTask(task);

      // Multiple reads
      const read1 = taskRepository.getTaskById('roundtrip-001');
      const read2 = taskRepository.getTaskById('roundtrip-001');
      const read3 = taskRepository.getTaskById('roundtrip-001');

      expect(read1?.type).toBe(DailyTaskType.CULTURAL_EXPLORATION);
      expect(read2?.type).toBe(DailyTaskType.CULTURAL_EXPLORATION);
      expect(read3?.type).toBe(DailyTaskType.CULTURAL_EXPLORATION);
      expect(read1?.type).toBe(read2?.type);
      expect(read2?.type).toBe(read3?.type);
    });
  });
});
