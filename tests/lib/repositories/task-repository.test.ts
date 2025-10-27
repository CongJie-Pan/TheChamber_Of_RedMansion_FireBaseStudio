/**
 * @fileOverview Task Repository Tests
 *
 * Unit tests for task CRUD operations with SQLite
 *
 * @phase Phase 2.9 - Local SQLite Database Implementation
 */

import Database from 'better-sqlite3';
import * as taskRepository from '@/lib/repositories/task-repository';
import { getDatabase } from '@/lib/sqlite-db';
import type { DailyTask, TaskType, TaskDifficulty } from '@/lib/types/daily-task';

// Mock the database module
jest.mock('@/lib/sqlite-db', () => {
  let mockDb: Database.Database;

  return {
    getDatabase: jest.fn(() => {
      if (!mockDb) {
        mockDb = new Database(':memory:');
        // Initialize schema
        mockDb.exec(`
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
      }
      return mockDb;
    }),
    toUnixTimestamp: (date: Date) => date.getTime(),
    fromUnixTimestamp: (timestamp: number) => new Date(timestamp),
  };
});

describe('Task Repository', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase();
    // Clean up tasks table
    db.prepare('DELETE FROM daily_tasks').run();
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  const createMockTask = (id: string, taskType: TaskType, difficulty: TaskDifficulty): DailyTask => ({
    id,
    taskType,
    difficulty,
    title: `Test ${taskType} Task`,
    description: 'A test task',
    baseXP: 50,
    question: 'What is the test question?',
    correctAnswer: 'Test answer',
    sourceChapter: 1,
    sourceVerseStart: 1,
    sourceVerseEnd: 10,
    createdAt: new Date(),
  });

  describe('createTask', () => {
    test('should create a comprehension task', () => {
      const task = createMockTask('task_001', 'comprehension', 'medium');

      const created = taskRepository.createTask(task);

      expect(created.id).toBe('task_001');
      expect(created.taskType).toBe('comprehension');
      expect(created.difficulty).toBe('medium');
      expect(created.baseXP).toBe(50);
    });

    test('should create a vocabulary task', () => {
      const task = createMockTask('task_002', 'vocabulary', 'easy');

      const created = taskRepository.createTask(task);

      expect(created.id).toBe('task_002');
      expect(created.taskType).toBe('vocabulary');
      expect(created.difficulty).toBe('easy');
    });

    test('should create a creative task', () => {
      const task = createMockTask('task_003', 'creative', 'hard');

      const created = taskRepository.createTask(task);

      expect(created.id).toBe('task_003');
      expect(created.taskType).toBe('creative');
      expect(created.difficulty).toBe('hard');
    });

    test('should store task with content fields', () => {
      const task: DailyTask = {
        id: 'task_004',
        taskType: 'comprehension',
        difficulty: 'medium',
        title: 'Character Analysis',
        baseXP: 60,
        question: 'Analyze the character',
        correctAnswer: 'Expected analysis',
        options: ['A', 'B', 'C', 'D'],
        createdAt: new Date(),
      };

      taskRepository.createTask(task);
      const retrieved = taskRepository.getTaskById('task_004');

      expect(retrieved?.question).toBe('Analyze the character');
      expect(retrieved?.correctAnswer).toBe('Expected analysis');
      expect(retrieved?.options).toEqual(['A', 'B', 'C', 'D']);
    });
  });

  describe('getTaskById', () => {
    test('should retrieve existing task', () => {
      const task = createMockTask('task_005', 'comprehension', 'medium');
      taskRepository.createTask(task);

      const retrieved = taskRepository.getTaskById('task_005');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('task_005');
      expect(retrieved?.taskType).toBe('comprehension');
    });

    test('should return null for non-existent task', () => {
      const task = taskRepository.getTaskById('non_existent');

      expect(task).toBeNull();
    });

    test('should retrieve task with correct data types', () => {
      const task = createMockTask('task_006', 'vocabulary', 'easy');
      taskRepository.createTask(task);

      const retrieved = taskRepository.getTaskById('task_006');

      expect(typeof retrieved?.baseXP).toBe('number');
      expect(retrieved?.createdAt).toBeInstanceOf(Date);
      expect(typeof retrieved?.question).toBe('string');
    });
  });

  describe('getTasksByType', () => {
    beforeEach(() => {
      taskRepository.createTask(createMockTask('task_007', 'comprehension', 'easy'));
      taskRepository.createTask(createMockTask('task_008', 'comprehension', 'medium'));
      taskRepository.createTask(createMockTask('task_009', 'vocabulary', 'easy'));
      taskRepository.createTask(createMockTask('task_010', 'creative', 'hard'));
    });

    test('should retrieve all comprehension tasks', () => {
      const tasks = taskRepository.getTasksByType('comprehension');

      expect(tasks).toHaveLength(2);
      expect(tasks.every(t => t.taskType === 'comprehension')).toBe(true);
    });

    test('should retrieve all vocabulary tasks', () => {
      const tasks = taskRepository.getTasksByType('vocabulary');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].taskType).toBe('vocabulary');
    });

    test('should retrieve all creative tasks', () => {
      const tasks = taskRepository.getTasksByType('creative');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].taskType).toBe('creative');
    });

    test('should return empty array for type with no tasks', () => {
      const tasks = taskRepository.getTasksByType('analysis' as TaskType);

      expect(tasks).toHaveLength(0);
    });
  });

  describe('getTasksByDifficulty', () => {
    beforeEach(() => {
      taskRepository.createTask(createMockTask('task_011', 'comprehension', 'easy'));
      taskRepository.createTask(createMockTask('task_012', 'vocabulary', 'easy'));
      taskRepository.createTask(createMockTask('task_013', 'comprehension', 'medium'));
      taskRepository.createTask(createMockTask('task_014', 'creative', 'hard'));
    });

    test('should retrieve all easy tasks', () => {
      const tasks = taskRepository.getTasksByDifficulty('easy');

      expect(tasks).toHaveLength(2);
      expect(tasks.every(t => t.difficulty === 'easy')).toBe(true);
    });

    test('should retrieve all medium tasks', () => {
      const tasks = taskRepository.getTasksByDifficulty('medium');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].difficulty).toBe('medium');
    });

    test('should retrieve all hard tasks', () => {
      const tasks = taskRepository.getTasksByDifficulty('hard');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].difficulty).toBe('hard');
    });
  });

  describe('getTasksByIds', () => {
    beforeEach(() => {
      taskRepository.createTask(createMockTask('task_015', 'comprehension', 'easy'));
      taskRepository.createTask(createMockTask('task_016', 'vocabulary', 'medium'));
      taskRepository.createTask(createMockTask('task_017', 'creative', 'hard'));
    });

    test('should retrieve multiple tasks by IDs', () => {
      const tasks = taskRepository.getTasksByIds(['task_015', 'task_017']);

      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.id)).toContain('task_015');
      expect(tasks.map(t => t.id)).toContain('task_017');
    });

    test('should return empty array for empty IDs', () => {
      const tasks = taskRepository.getTasksByIds([]);

      expect(tasks).toHaveLength(0);
    });

    test('should handle mix of existing and non-existent IDs', () => {
      const tasks = taskRepository.getTasksByIds(['task_015', 'non_existent', 'task_016']);

      expect(tasks).toHaveLength(2);
      expect(tasks.map(t => t.id)).toContain('task_015');
      expect(tasks.map(t => t.id)).toContain('task_016');
    });
  });

  describe('updateTask', () => {
    test('should update task title', () => {
      const task = createMockTask('task_018', 'comprehension', 'medium');
      taskRepository.createTask(task);

      const updated = taskRepository.updateTask('task_018', {
        title: 'Updated Title'
      });

      expect(updated.title).toBe('Updated Title');
    });

    test('should update task difficulty', () => {
      const task = createMockTask('task_019', 'vocabulary', 'easy');
      taskRepository.createTask(task);

      const updated = taskRepository.updateTask('task_019', {
        difficulty: 'hard'
      });

      expect(updated.difficulty).toBe('hard');
    });

    test('should update task baseXP', () => {
      const task = createMockTask('task_020', 'creative', 'medium');
      taskRepository.createTask(task);

      const updated = taskRepository.updateTask('task_020', {
        baseXP: 100
      });

      expect(updated.baseXP).toBe(100);
    });

    test('should throw error for non-existent task', () => {
      expect(() => {
        taskRepository.updateTask('non_existent', { title: 'Test' });
      }).toThrow('Task not found');
    });
  });

  describe('deleteTask', () => {
    test('should delete existing task', () => {
      const task = createMockTask('task_021', 'comprehension', 'easy');
      taskRepository.createTask(task);

      taskRepository.deleteTask('task_021');

      const retrieved = taskRepository.getTaskById('task_021');
      expect(retrieved).toBeNull();
    });

    test('should not throw error when deleting non-existent task', () => {
      expect(() => {
        taskRepository.deleteTask('non_existent');
      }).not.toThrow();
    });
  });

  describe('batchCreateTasks', () => {
    test('should create multiple tasks in transaction', () => {
      const tasks = [
        createMockTask('task_022', 'comprehension', 'easy'),
        createMockTask('task_023', 'vocabulary', 'medium'),
        createMockTask('task_024', 'creative', 'hard')
      ];

      taskRepository.batchCreateTasks(tasks);

      const task1 = taskRepository.getTaskById('task_022');
      const task2 = taskRepository.getTaskById('task_023');
      const task3 = taskRepository.getTaskById('task_024');

      expect(task1).not.toBeNull();
      expect(task2).not.toBeNull();
      expect(task3).not.toBeNull();
    });

    test('should handle empty array', () => {
      expect(() => {
        taskRepository.batchCreateTasks([]);
      }).not.toThrow();
    });

    test('should create all tasks or none (transaction)', () => {
      const tasks = [
        createMockTask('task_025', 'comprehension', 'easy'),
        createMockTask('task_026', 'vocabulary', 'medium')
      ];

      taskRepository.batchCreateTasks(tasks);

      const count = taskRepository.getTaskCount();
      expect(count).toBe(2);
    });
  });

  describe('getTaskCount', () => {
    beforeEach(() => {
      taskRepository.createTask(createMockTask('task_027', 'comprehension', 'easy'));
      taskRepository.createTask(createMockTask('task_028', 'comprehension', 'medium'));
      taskRepository.createTask(createMockTask('task_029', 'vocabulary', 'easy'));
    });

    test('should count all tasks', () => {
      const count = taskRepository.getTaskCount();

      expect(count).toBe(3);
    });

    test('should count tasks by type', () => {
      const comprehensionCount = taskRepository.getTaskCount('comprehension');
      const vocabularyCount = taskRepository.getTaskCount('vocabulary');

      expect(comprehensionCount).toBe(2);
      expect(vocabularyCount).toBe(1);
    });

    test('should return 0 for type with no tasks', () => {
      const count = taskRepository.getTaskCount('creative');

      expect(count).toBe(0);
    });
  });
});
