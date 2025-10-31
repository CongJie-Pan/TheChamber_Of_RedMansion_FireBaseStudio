/**
 * @jest-environment node
 *
 * @fileOverview Unit Tests for Daily Task Service - Task Quantity Enforcement
 *
 * Tests the 2-task limit enforcement added in bug fix commit 1d6fb78.
 * Verifies that regardless of AI task generation output, the service
 * always limits daily tasks to exactly 2 tasks per user per day.
 *
 * Key behaviors tested:
 * - Enforces 2-task limit when generator returns more tasks
 * - Handles empty task generation gracefully
 * - Handles single task generation without padding
 * - Stores only limited tasks in database
 * - Creates progress with correct task count
 *
 * Fix Location: src/lib/daily-task-service.ts:285 (slice(0, 2))
 *
 * @phase Testing Phase - Bug Fix Validation
 * @created 2025-10-31
 */

import { DailyTaskService } from '@/lib/daily-task-service';
import * as taskRepository from '@/lib/repositories/task-repository';
import * as progressRepository from '@/lib/repositories/progress-repository';
import * as userRepository from '@/lib/repositories/user-repository';
import { taskGenerator } from '@/lib/task-generator';
import { userLevelService } from '@/lib/user-level-service';
import type { DailyTask, TaskType, TaskDifficulty } from '@/lib/types/daily-task';

// Mock repository layers
jest.mock('@/lib/repositories/task-repository');
jest.mock('@/lib/repositories/progress-repository');
jest.mock('@/lib/repositories/user-repository');
jest.mock('@/lib/task-generator', () => ({
  taskGenerator: {
    generateTasksForUser: jest.fn(),
  },
}));
jest.mock('@/lib/user-level-service', () => ({
  userLevelService: {
    getUserProfile: jest.fn(),
  },
}));

describe('Daily Task Service - Task Quantity Enforcement', () => {
  let dailyTaskService: DailyTaskService;
  const TEST_USER_ID = 'test-user-123';
  const TEST_DATE = '2025-10-31';
  const TEST_USER_LEVEL = 5;

  beforeEach(() => {
    jest.clearAllMocks();
    dailyTaskService = new DailyTaskService();

    // Default mock: User exists with level 5
    (userRepository.getUserById as jest.Mock).mockReturnValue({
      id: TEST_USER_ID,
      currentLevel: TEST_USER_LEVEL,
      totalXP: 500,
    });

    // Mock userLevelService.getUserProfile
    (userLevelService.getUserProfile as jest.Mock).mockResolvedValue({
      userId: TEST_USER_ID,
      currentLevel: TEST_USER_LEVEL,
      totalXP: 500,
      levelProgress: 0,
    });

    // Mock instance methods
    jest.spyOn(dailyTaskService, 'getUserDailyProgress').mockResolvedValue(null);
    jest.spyOn(dailyTaskService, 'getTaskHistory').mockResolvedValue([]);
    jest.spyOn(dailyTaskService, 'calculateStreak').mockResolvedValue(0);
  });

  /**
   * Helper function to create mock task
   */
  function createMockTask(id: string, taskType: TaskType = 'quiz'): DailyTask {
    return {
      id,
      taskType,
      difficulty: 'medium' as TaskDifficulty,
      title: `Test Task ${id}`,
      description: 'Test description',
      baseXP: 50,
      createdAt: new Date(),
    };
  }

  describe('Test 1: Should generate exactly 2 tasks per day regardless of configuration', () => {
    it('should limit to 2 tasks when generator returns 5 tasks', async () => {
      // Setup: Mock task generator to return 5 tasks
      const fiveTasks = [
        createMockTask('task-1'),
        createMockTask('task-2'),
        createMockTask('task-3'),
        createMockTask('task-4'),
        createMockTask('task-5'),
      ];

      (taskGenerator.generateTasksForUser as jest.Mock).mockResolvedValue(fiveTasks);

      // Mock repository operations
      (taskRepository.batchCreateTasks as jest.Mock).mockReturnValue(fiveTasks.slice(0, 2));
      (progressRepository.getProgress as jest.Mock).mockReturnValue(null);
      (progressRepository.createProgress as jest.Mock).mockReturnValue({
        userId: TEST_USER_ID,
        date: TEST_DATE,
        tasks: [],
      });

      // Action: Generate daily tasks
      const result = await dailyTaskService.generateDailyTasks(TEST_USER_ID, TEST_DATE);

      // Assertion: Verify returned array has exactly 2 tasks
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('task-1');
      expect(result[1].id).toBe('task-2');
    });

    it('should limit to 2 tasks when generator returns 10 tasks', async () => {
      // Setup: Mock task generator to return 10 tasks
      const tenTasks = Array.from({ length: 10 }, (_, i) => createMockTask(`task-${i + 1}`));

      (taskGenerator.generateTasksForUser as jest.Mock).mockResolvedValue(tenTasks);

      (taskRepository.batchCreateTasks as jest.Mock).mockReturnValue(tenTasks.slice(0, 2));
      (progressRepository.getProgress as jest.Mock).mockReturnValue(null);
      (progressRepository.createProgress as jest.Mock).mockReturnValue({
        userId: TEST_USER_ID,
        date: TEST_DATE,
        tasks: [],
      });

      // Action: Generate daily tasks
      const result = await dailyTaskService.generateDailyTasks(TEST_USER_ID, TEST_DATE);

      // Assertion: Verify only first 2 tasks returned
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('task-1');
      expect(result[1].id).toBe('task-2');
    });
  });

  describe('Test 2: Should handle empty task generation gracefully', () => {
    it('should return empty array when generator returns no tasks', async () => {
      // Setup: Mock task generator to return empty array
      (taskGenerator.generateTasksForUser as jest.Mock).mockResolvedValue([]);

      (taskRepository.batchCreateTasks as jest.Mock).mockReturnValue([]);
      (progressRepository.getProgress as jest.Mock).mockReturnValue(null);
      (progressRepository.createProgress as jest.Mock).mockReturnValue({
        userId: TEST_USER_ID,
        date: TEST_DATE,
        tasks: [],
      });

      // Action: Generate daily tasks
      const result = await dailyTaskService.generateDailyTasks(TEST_USER_ID, TEST_DATE);

      // Assertion: Verify returns empty array without errors
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should not throw error when generator returns empty array', async () => {
      // Setup: Mock empty generation
      (taskGenerator.generateTasksForUser as jest.Mock).mockResolvedValue([]);

      (taskRepository.batchCreateTasks as jest.Mock).mockReturnValue([]);
      (progressRepository.getProgress as jest.Mock).mockReturnValue(null);
      (progressRepository.createProgress as jest.Mock).mockReturnValue({
        userId: TEST_USER_ID,
        date: TEST_DATE,
        tasks: [],
      });

      // Action & Assertion: Should not throw
      await expect(
        dailyTaskService.generateDailyTasks(TEST_USER_ID, TEST_DATE)
      ).resolves.not.toThrow();
    });
  });

  describe('Test 3: Should handle single task generation', () => {
    it('should return 1 task when generator returns only 1 task', async () => {
      // Setup: Mock task generator to return single task
      const singleTask = [createMockTask('task-1')];

      (taskGenerator.generateTasksForUser as jest.Mock).mockResolvedValue(singleTask);

      (taskRepository.batchCreateTasks as jest.Mock).mockReturnValue(singleTask);
      (progressRepository.getProgress as jest.Mock).mockReturnValue(null);
      (progressRepository.createProgress as jest.Mock).mockReturnValue({
        userId: TEST_USER_ID,
        date: TEST_DATE,
        tasks: [],
      });

      // Action: Generate daily tasks
      const result = await dailyTaskService.generateDailyTasks(TEST_USER_ID, TEST_DATE);

      // Assertion: Verify returns array with 1 task (not padded to 2)
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('task-1');
    });

    it('should not pad single task to 2 tasks', async () => {
      // Setup: Single task scenario
      const singleTask = [createMockTask('task-solo')];

      (taskGenerator.generateTasksForUser as jest.Mock).mockResolvedValue(singleTask);

      (taskRepository.batchCreateTasks as jest.Mock).mockReturnValue(singleTask);
      (progressRepository.getProgress as jest.Mock).mockReturnValue(null);
      (progressRepository.createProgress as jest.Mock).mockReturnValue({
        userId: TEST_USER_ID,
        date: TEST_DATE,
        tasks: [],
      });

      // Action: Generate daily tasks
      const result = await dailyTaskService.generateDailyTasks(TEST_USER_ID, TEST_DATE);

      // Assertion: Verify exactly 1 task, not padded
      expect(result).toHaveLength(1);
      expect(result.length).toBeLessThan(2);
    });
  });

  describe('Test 4: Should store only limited tasks in SQLite', () => {
    it('should call batchCreateTasks with array of length 2', async () => {
      // Setup: Mock task generator to return 5 tasks
      const fiveTasks = Array.from({ length: 5 }, (_, i) => createMockTask(`task-${i + 1}`));

      (taskGenerator.generateTasksForUser as jest.Mock).mockResolvedValue(fiveTasks);

      const batchCreateSpy = jest.spyOn(taskRepository, 'batchCreateTasks')
        .mockReturnValue(fiveTasks.slice(0, 2));

      (progressRepository.getProgress as jest.Mock).mockReturnValue(null);
      (progressRepository.createProgress as jest.Mock).mockReturnValue({
        userId: TEST_USER_ID,
        date: TEST_DATE,
        tasks: [],
      });

      // Action: Generate daily tasks
      await dailyTaskService.generateDailyTasks(TEST_USER_ID, TEST_DATE);

      // Assertion: Verify batchCreateTasks called with array of length 2
      expect(batchCreateSpy).toHaveBeenCalledTimes(1);
      const calledWithTasks = batchCreateSpy.mock.calls[0][0];
      expect(calledWithTasks).toHaveLength(2);
    });

    it('should only store first 2 tasks in database when generator returns many', async () => {
      // Setup: Generator returns 7 tasks
      const sevenTasks = Array.from({ length: 7 }, (_, i) => createMockTask(`task-${i + 1}`));

      (taskGenerator.generateTasksForUser as jest.Mock).mockResolvedValue(sevenTasks);

      const batchCreateSpy = jest.spyOn(taskRepository, 'batchCreateTasks')
        .mockReturnValue(sevenTasks.slice(0, 2));

      (progressRepository.getProgress as jest.Mock).mockReturnValue(null);
      (progressRepository.createProgress as jest.Mock).mockReturnValue({
        userId: TEST_USER_ID,
        date: TEST_DATE,
        tasks: [],
      });

      // Action: Generate daily tasks
      await dailyTaskService.generateDailyTasks(TEST_USER_ID, TEST_DATE);

      // Assertion: Verify database operations match business logic
      const storedTasks = batchCreateSpy.mock.calls[0][0];
      expect(storedTasks[0].id).toBe('task-1');
      expect(storedTasks[1].id).toBe('task-2');
      expect(storedTasks).not.toContainEqual(expect.objectContaining({ id: 'task-3' }));
    });
  });

  describe('Test 5: Should create progress with correct task count', () => {
    it('should create progress with tasks array containing 2 assignments', async () => {
      // Setup: Generator returns 5 tasks
      const fiveTasks = Array.from({ length: 5 }, (_, i) => createMockTask(`task-${i + 1}`));

      (taskGenerator.generateTasksForUser as jest.Mock).mockResolvedValue(fiveTasks);

      (taskRepository.batchCreateTasks as jest.Mock).mockReturnValue(fiveTasks.slice(0, 2));
      (progressRepository.getProgress as jest.Mock).mockReturnValue(null);

      const createProgressSpy = jest.spyOn(progressRepository, 'createProgress')
        .mockReturnValue({
          userId: TEST_USER_ID,
          date: TEST_DATE,
          tasks: [],
        });

      // Action: Generate daily tasks
      await dailyTaskService.generateDailyTasks(TEST_USER_ID, TEST_DATE);

      // Assertion: Verify progress data has tasks array with 2 assignments
      expect(createProgressSpy).toHaveBeenCalledTimes(1);
      const progressData = createProgressSpy.mock.calls[0][0];
      expect(progressData.tasks).toHaveLength(2);
    });

    it('should ensure consistency between tasks and progress tracking', async () => {
      // Setup: Generator returns 3 tasks
      const threeTasks = [
        createMockTask('task-A'),
        createMockTask('task-B'),
        createMockTask('task-C'),
      ];

      (taskGenerator.generateTasksForUser as jest.Mock).mockResolvedValue(threeTasks);

      (taskRepository.batchCreateTasks as jest.Mock).mockReturnValue(threeTasks.slice(0, 2));
      (progressRepository.getProgress as jest.Mock).mockReturnValue(null);

      const createProgressSpy = jest.spyOn(progressRepository, 'createProgress')
        .mockReturnValue({
          userId: TEST_USER_ID,
          date: TEST_DATE,
          tasks: [],
        });

      // Action: Generate daily tasks
      const result = await dailyTaskService.generateDailyTasks(TEST_USER_ID, TEST_DATE);

      // Assertion: Verify consistency
      const progressData = createProgressSpy.mock.calls[0][0];
      expect(result).toHaveLength(2);
      expect(progressData.tasks).toHaveLength(2);
      expect(progressData.tasks[0].taskId).toBe('task-A');
      expect(progressData.tasks[1].taskId).toBe('task-B');
    });
  });
});
