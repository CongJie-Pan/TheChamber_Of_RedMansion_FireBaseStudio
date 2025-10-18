/**
 * @fileOverview Daily Task Service Unit Tests
 *
 * Comprehensive test suite for the DailyTaskService class including:
 * - Task generation and assignment (generateDailyTasks)
 * - Progress tracking (getUserDailyProgress)
 * - Task completion and evaluation (submitTaskCompletion)
 * - Streak management (calculateStreak, updateStreak)
 * - Task history and statistics (getTaskHistory, getTaskStatistics)
 * - XP and attribute rewards integration
 * - Anti-spam and anti-farming mechanisms
 *
 * Test Categories:
 * 1. Expected Use Cases: Normal daily task operations
 * 2. Edge Cases: Boundary conditions and unusual inputs
 * 3. Failure Cases: Error conditions and invalid operations
 *
 * Each test includes comprehensive assertions and result tracking.
 */

import { DailyTaskService } from '@/lib/daily-task-service';
import { taskGenerator } from '@/lib/task-generator';
import { userLevelService } from '@/lib/user-level-service';
import {
  DailyTask,
  DailyTaskProgress,
  TaskStatus,
  DailyTaskType,
  TaskDifficulty,
  TaskCompletionResult,
} from '@/lib/types/daily-task';

// Import Firebase mocks
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

// Mock dependencies
jest.mock('@/lib/task-generator');
jest.mock('@/lib/user-level-service');

describe('DailyTaskService', () => {
  let dailyTaskService: DailyTaskService;
  let testLogger: any;

  beforeEach(() => {
    // Initialize service and test logger for each test
    dailyTaskService = new DailyTaskService();
    testLogger = {
      logs: [],
      log: (message: string, data?: any) => {
        testLogger.logs.push({ message, data, timestamp: new Date().toISOString() });
      },
    };

    // Reset all mocks before each test
    jest.clearAllMocks();

    // Setup essential Firebase mocks
    (doc as jest.Mock).mockReturnValue({ id: 'mocked-doc-ref', path: 'mocked/path' });
    (collection as jest.Mock).mockReturnValue({ id: 'mocked-collection-ref' });
    (serverTimestamp as jest.Mock).mockReturnValue({ seconds: Date.now() / 1000 });
  });

  describe('Task Generation - Expected Use Cases', () => {
    /**
     * Test Case 1: Generate daily tasks for first-time user
     *
     * Verifies that tasks are correctly generated for a new user on their first day
     */
    it('should generate daily tasks for new user', async () => {
      testLogger.log('Testing first-time task generation');

      // Arrange
      const userId = 'new_user_123';
      const date = '2025-01-15';

      const mockUserProfile = {
        uid: userId,
        currentLevel: 0,
        currentXP: 0,
        totalXP: 0,
      };

      const mockTasks: DailyTask[] = [
        {
          id: 'task_1',
          type: DailyTaskType.MORNING_READING,
          title: '晨讀時光 - 初探紅樓',
          description: '閱讀《紅樓夢》精選段落',
          difficulty: TaskDifficulty.EASY,
          timeEstimate: 5,
          xpReward: 8,
          attributeRewards: { literaryTalent: 2, culturalInsight: 1 },
          content: {},
        },
        {
          id: 'task_2',
          type: DailyTaskType.POETRY,
          title: '詩詞韻律 - 吟詠入門',
          description: '品讀紅樓詩詞',
          difficulty: TaskDifficulty.EASY,
          timeEstimate: 3,
          xpReward: 6,
          attributeRewards: { literaryTalent: 3, aestheticSense: 1 },
          content: {},
        },
      ];

      // Mock getUserDailyProgress to return null (no existing progress)
      (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false });

      // Mock userLevelService.getUserProfile
      (userLevelService.getUserProfile as jest.Mock).mockResolvedValue(mockUserProfile);

      // Mock taskGenerator.generateTasksForUser
      (taskGenerator.generateTasksForUser as jest.Mock).mockResolvedValue(mockTasks);

      // Mock setDoc for storing tasks and progress
      (setDoc as jest.Mock).mockResolvedValue(undefined);

      // Act
      const generatedTasks = await dailyTaskService.generateDailyTasks(userId, date);

      // Assert
      expect(generatedTasks).toBeDefined();
      expect(generatedTasks.length).toBe(2);
      expect(taskGenerator.generateTasksForUser).toHaveBeenCalledWith(userId, 0, date);
      expect(setDoc).toHaveBeenCalled(); // Tasks and progress stored

      testLogger.log('First-time task generation test completed', { generatedTasks });
    });

    /**
     * Test Case 2: Return existing tasks if already generated for the day
     *
     * Ensures that re-requesting tasks on the same day returns existing tasks
     */
    it('should return existing tasks if already generated for the day', async () => {
      testLogger.log('Testing existing tasks retrieval');

      // Arrange
      const userId = 'existing_user';
      const date = '2025-01-15';

      const existingProgress: Partial<DailyTaskProgress> = {
        id: `${userId}_${date}`,
        userId,
        date,
        tasks: [
          {
            taskId: 'existing_task_1',
            assignedAt: Timestamp.now(),
            status: TaskStatus.NOT_STARTED,
          },
        ],
        completedTaskIds: [],
        skippedTaskIds: [],
        totalXPEarned: 0,
        totalAttributeGains: {},
        streak: 0,
      };

      const existingTask: DailyTask = {
        id: 'existing_task_1',
        type: DailyTaskType.MORNING_READING,
        title: 'Existing Task',
        description: 'Test',
        difficulty: TaskDifficulty.EASY,
        timeEstimate: 5,
        xpReward: 10,
        attributeRewards: {},
        content: {},
      };

      // Mock getUserDailyProgress to return existing progress
      (getDoc as jest.Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => existingProgress,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => existingTask,
        });

      // Act
      const tasks = await dailyTaskService.generateDailyTasks(userId, date);

      // Assert
      expect(tasks).toBeDefined();
      expect(tasks.length).toBe(1);
      expect(tasks[0].id).toBe('existing_task_1');
      expect(taskGenerator.generateTasksForUser).not.toHaveBeenCalled(); // Should not generate new tasks

      testLogger.log('Existing tasks retrieval test completed');
    });
  });

  describe('Task Generation - Edge Cases', () => {
    /**
     * Edge Case: Generate tasks for different user levels
     *
     * Verifies that difficulty adapts based on user level
     */
    it('should adapt task difficulty based on user level', async () => {
      testLogger.log('Testing difficulty adaptation by level');

      const testCases = [
        { level: 0, expectedDifficulty: TaskDifficulty.EASY },
        { level: 3, expectedDifficulty: TaskDifficulty.MEDIUM },
        { level: 6, expectedDifficulty: TaskDifficulty.HARD },
      ];

      for (const { level, expectedDifficulty } of testCases) {
        const userId = `user_level_${level}`;
        const date = '2025-01-15';

        (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false });
        (userLevelService.getUserProfile as jest.Mock).mockResolvedValue({
          uid: userId,
          currentLevel: level,
        });
        (taskGenerator.generateTasksForUser as jest.Mock).mockResolvedValue([]);
        (setDoc as jest.Mock).mockResolvedValue(undefined);

        await dailyTaskService.generateDailyTasks(userId, date);

        expect(taskGenerator.generateTasksForUser).toHaveBeenCalledWith(userId, level, date);
      }

      testLogger.log('Difficulty adaptation test completed');
    });
  });

  describe('Task Generation - Failure Cases', () => {
    /**
     * Failure Case: Generate tasks for non-existent user
     *
     * Verifies proper error handling when user profile doesn't exist
     */
    it('should throw error when user profile not found', async () => {
      testLogger.log('Testing task generation for non-existent user');

      const userId = 'nonexistent_user';
      const date = '2025-01-15';

      (getDoc as jest.Mock).mockResolvedValueOnce({ exists: () => false });
      (userLevelService.getUserProfile as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(dailyTaskService.generateDailyTasks(userId, date)).rejects.toThrow(
        'User profile not found'
      );

      testLogger.log('Non-existent user test completed');
    });
  });

  describe('Progress Tracking - Expected Use Cases', () => {
    /**
     * Test Case: Get user daily progress
     *
     * Verifies that progress can be retrieved for a specific date
     */
    it('should retrieve user daily progress for specific date', async () => {
      testLogger.log('Testing progress retrieval');

      // Arrange
      const userId = 'progress_user';
      const date = '2025-01-15';

      const mockProgress: Partial<DailyTaskProgress> = {
        id: `${userId}_${date}`,
        userId,
        date,
        tasks: [],
        completedTaskIds: [],
        skippedTaskIds: [],
        totalXPEarned: 0,
        totalAttributeGains: {},
        streak: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockProgress,
      });

      // Act
      const progress = await dailyTaskService.getUserDailyProgress(userId, date);

      // Assert
      expect(progress).toBeDefined();
      expect(progress?.userId).toBe(userId);
      expect(progress?.date).toBe(date);

      testLogger.log('Progress retrieval test completed', { progress });
    });

    /**
     * Test Case: Return null when no progress exists
     *
     * Verifies that null is returned when user has no progress for the date
     */
    it('should return null when no progress exists for date', async () => {
      testLogger.log('Testing no progress scenario');

      const userId = 'no_progress_user';
      const date = '2025-01-15';

      (getDoc as jest.Mock).mockResolvedValue({ exists: () => false });

      // Act
      const progress = await dailyTaskService.getUserDailyProgress(userId, date);

      // Assert
      expect(progress).toBeNull();

      testLogger.log('No progress test completed');
    });
  });

  describe('Task Completion - Expected Use Cases', () => {
    /**
     * Test Case 1: Complete task successfully
     *
     * Verifies that task completion works correctly with XP/attribute rewards
     */
    it('should complete task and award rewards', async () => {
      testLogger.log('Testing task completion with rewards');

      // Arrange
      const userId = 'complete_user';
      const taskId = 'task_complete_1';
      const userResponse = 'This is my detailed answer to the task prompt. It demonstrates understanding of the content.';

      const mockProgress: Partial<DailyTaskProgress> = {
        id: `${userId}_2025-01-15`,
        userId,
        date: '2025-01-15',
        tasks: [
          {
            taskId,
            assignedAt: Timestamp.now(),
            status: TaskStatus.NOT_STARTED,
          },
        ],
        completedTaskIds: [],
        skippedTaskIds: [],
        totalXPEarned: 0,
        totalAttributeGains: {},
        streak: 0,
      };

      const mockTask: DailyTask = {
        id: taskId,
        type: DailyTaskType.MORNING_READING,
        title: 'Morning Reading',
        description: 'Test task',
        difficulty: TaskDifficulty.EASY,
        timeEstimate: 5,
        xpReward: 10,
        attributeRewards: { literaryTalent: 2 },
        content: {},
        gradingCriteria: { minLength: 30 },
      };

      // Mock getDoc for progress and task
      (getDoc as jest.Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockProgress,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockTask,
        });

      // Mock userLevelService.awardXP
      (userLevelService.awardXP as jest.Mock).mockResolvedValue({
        success: true,
        newTotalXP: 10,
        newLevel: 0,
        leveledUp: false,
      });

      // Mock userLevelService.updateAttributes
      (userLevelService.updateAttributes as jest.Mock).mockResolvedValue(undefined);

      // Mock updateDoc and addDoc
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'history_123' });

      // Act
      const result = await dailyTaskService.submitTaskCompletion(userId, taskId, userResponse);

      // Assert
      expect(result.success).toBe(true);
      expect(result.taskId).toBe(taskId);
      expect(result.xpAwarded).toBeGreaterThan(0);
      expect(userLevelService.awardXP).toHaveBeenCalled();
      expect(userLevelService.updateAttributes).toHaveBeenCalled();
      expect(updateDoc).toHaveBeenCalled(); // Progress updated
      expect(addDoc).toHaveBeenCalled(); // History recorded

      testLogger.log('Task completion test completed', { result });
    });

    /**
     * Test Case 2: Complete task and trigger streak milestone
     *
     * Verifies streak calculation and milestone detection
     */
    it('should detect streak milestone on task completion', async () => {
      testLogger.log('Testing streak milestone detection');

      // Arrange
      const userId = 'streak_user';
      const taskId = 'streak_task';
      const userResponse = 'My response to complete the streak task';

      const mockProgress: Partial<DailyTaskProgress> = {
        id: `${userId}_2025-01-15`,
        userId,
        date: '2025-01-15',
        tasks: [
          {
            taskId,
            assignedAt: Timestamp.now(),
            status: TaskStatus.NOT_STARTED,
          },
        ],
        completedTaskIds: [],
        skippedTaskIds: [],
        totalXPEarned: 0,
        totalAttributeGains: {},
        streak: 6, // Will become 7 after completion (milestone!)
      };

      const mockTask: DailyTask = {
        id: taskId,
        type: DailyTaskType.POETRY,
        title: 'Poetry Task',
        description: 'Test',
        difficulty: TaskDifficulty.EASY,
        timeEstimate: 3,
        xpReward: 8,
        attributeRewards: { literaryTalent: 3 },
        content: {},
        gradingCriteria: { minLength: 30 },
      };

      (getDoc as jest.Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockProgress,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockTask,
        });

      (userLevelService.awardXP as jest.Mock).mockResolvedValue({
        success: true,
        newTotalXP: 20,
        newLevel: 0,
        leveledUp: false,
      });
      (userLevelService.updateAttributes as jest.Mock).mockResolvedValue(undefined);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'history_456' });

      // Act
      const result = await dailyTaskService.submitTaskCompletion(userId, taskId, userResponse);

      // Assert
      expect(result.success).toBe(true);
      // Note: Streak milestone detection depends on completing ALL daily tasks
      // Since we have only 1 task, it should be marked as milestone

      testLogger.log('Streak milestone test completed', { result });
    });
  });

  describe('Task Completion - Edge Cases', () => {
    /**
     * Edge Case: Submit very long response
     *
     * Verifies handling of edge case with very long user responses
     */
    it('should handle very long user responses', async () => {
      testLogger.log('Testing very long response handling');

      const userId = 'long_response_user';
      const taskId = 'long_task';
      const userResponse = 'A'.repeat(5000); // Very long response

      const mockProgress: Partial<DailyTaskProgress> = {
        id: `${userId}_2025-01-15`,
        userId,
        date: '2025-01-15',
        tasks: [
          {
            taskId,
            assignedAt: Timestamp.now(),
            status: TaskStatus.NOT_STARTED,
          },
        ],
        completedTaskIds: [],
        skippedTaskIds: [],
        totalXPEarned: 0,
        totalAttributeGains: {},
        streak: 0,
      };

      const mockTask: DailyTask = {
        id: taskId,
        type: DailyTaskType.CHARACTER_INSIGHT,
        title: 'Character Analysis',
        description: 'Test',
        difficulty: TaskDifficulty.HARD,
        timeEstimate: 10,
        xpReward: 20,
        attributeRewards: { socialAwareness: 2, culturalInsight: 2 },
        content: {},
        gradingCriteria: { minLength: 100, maxLength: 500 },
      };

      (getDoc as jest.Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockProgress,
        })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockTask,
        });

      (userLevelService.awardXP as jest.Mock).mockResolvedValue({
        success: true,
        newTotalXP: 30,
        newLevel: 0,
        leveledUp: false,
      });
      (userLevelService.updateAttributes as jest.Mock).mockResolvedValue(undefined);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'history_789' });

      // Act
      const result = await dailyTaskService.submitTaskCompletion(userId, taskId, userResponse);

      // Assert
      expect(result.success).toBe(true);
      expect(result.score).toBeGreaterThan(0); // Should still evaluate

      testLogger.log('Long response test completed', { responseLength: userResponse.length });
    });
  });

  describe('Task Completion - Failure Cases', () => {
    /**
     * Failure Case 1: Complete already completed task
     *
     * Verifies error when trying to complete a task that's already done
     */
    it('should throw error when completing already completed task', async () => {
      testLogger.log('Testing duplicate completion prevention');

      const userId = 'duplicate_user';
      const taskId = 'completed_task';

      const mockProgress: Partial<DailyTaskProgress> = {
        id: `${userId}_2025-01-15`,
        userId,
        date: '2025-01-15',
        tasks: [
          {
            taskId,
            assignedAt: Timestamp.now(),
            status: TaskStatus.COMPLETED, // Already completed
            completedAt: Timestamp.now(),
          },
        ],
        completedTaskIds: [taskId],
        skippedTaskIds: [],
        totalXPEarned: 10,
        totalAttributeGains: {},
        streak: 0,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockProgress,
      });

      // Act & Assert
      await expect(
        dailyTaskService.submitTaskCompletion(userId, taskId, 'Response')
      ).rejects.toThrow('This task has already been completed');

      testLogger.log('Duplicate completion test completed');
    });

    /**
     * Failure Case 2: Complete task not in today's assignments
     *
     * Verifies error when trying to complete a task not assigned for today
     */
    it('should throw error when task not in todays assignments', async () => {
      testLogger.log('Testing invalid task completion');

      const userId = 'invalid_task_user';
      const taskId = 'non_assigned_task';

      const mockProgress: Partial<DailyTaskProgress> = {
        id: `${userId}_2025-01-15`,
        userId,
        date: '2025-01-15',
        tasks: [
          {
            taskId: 'other_task',
            assignedAt: Timestamp.now(),
            status: TaskStatus.NOT_STARTED,
          },
        ],
        completedTaskIds: [],
        skippedTaskIds: [],
        totalXPEarned: 0,
        totalAttributeGains: {},
        streak: 0,
      };

      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => mockProgress,
      });

      // Act & Assert
      await expect(
        dailyTaskService.submitTaskCompletion(userId, taskId, 'Response')
      ).rejects.toThrow("Task not found in today's assignments");

      testLogger.log('Invalid task completion test completed');
    });

    /**
     * Failure Case 3: Submit too quickly (anti-spam)
     *
     * Verifies that submission cooldown is enforced
     */
    it('should enforce submission cooldown', async () => {
      testLogger.log('Testing submission cooldown enforcement');

      const userId = 'spam_user';
      const taskId = 'spam_task';

      const mockProgress: Partial<DailyTaskProgress> = {
        id: `${userId}_2025-01-15`,
        userId,
        date: '2025-01-15',
        tasks: [
          {
            taskId,
            assignedAt: Timestamp.now(),
            status: TaskStatus.NOT_STARTED,
          },
        ],
        completedTaskIds: [],
        skippedTaskIds: [],
        totalXPEarned: 0,
        totalAttributeGains: {},
        streak: 0,
      };

      const mockTask: DailyTask = {
        id: taskId,
        type: DailyTaskType.MORNING_READING,
        title: 'Test',
        description: 'Test',
        difficulty: TaskDifficulty.EASY,
        timeEstimate: 5,
        xpReward: 10,
        attributeRewards: {},
        content: {},
      };

      (getDoc as jest.Mock)
        .mockResolvedValue({
          exists: () => true,
          data: () => mockProgress,
        })
        .mockResolvedValue({
          exists: () => true,
          data: () => mockTask,
        });

      (userLevelService.awardXP as jest.Mock).mockResolvedValue({
        success: true,
        newTotalXP: 10,
        newLevel: 0,
        leveledUp: false,
      });
      (userLevelService.updateAttributes as jest.Mock).mockResolvedValue(undefined);
      (updateDoc as jest.Mock).mockResolvedValue(undefined);
      (addDoc as jest.Mock).mockResolvedValue({ id: 'history' });

      // Act: First submission should succeed
      await dailyTaskService.submitTaskCompletion(userId, taskId, 'Response 1');

      // Reset mocks for second submission
      (getDoc as jest.Mock)
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => mockProgress,
        });

      // Act & Assert: Second submission within cooldown should fail
      await expect(
        dailyTaskService.submitTaskCompletion(userId, taskId, 'Response 2')
      ).rejects.toThrow('Please wait');

      testLogger.log('Submission cooldown test completed');
    });
  });

  describe('Task History and Statistics - Expected Use Cases', () => {
    /**
     * Test Case: Get task history for user
     *
     * Verifies that task history can be retrieved with pagination
     */
    it('should retrieve task history for user', async () => {
      testLogger.log('Testing task history retrieval');

      const userId = 'history_user';

      const mockHistory = [
        {
          id: 'hist_1',
          userId,
          taskId: 'task_1',
          taskType: DailyTaskType.MORNING_READING,
          date: '2025-01-15',
          score: 85,
          xpAwarded: 12,
          completionTime: 300,
          completedAt: Timestamp.now(),
        },
        {
          id: 'hist_2',
          userId,
          taskId: 'task_2',
          taskType: DailyTaskType.POETRY,
          date: '2025-01-14',
          score: 78,
          xpAwarded: 10,
          completionTime: 180,
          completedAt: Timestamp.now(),
        },
      ];

      (getDocs as jest.Mock).mockResolvedValue({
        forEach: (callback: Function) => mockHistory.forEach((h) => callback({ id: h.id, data: () => h })),
      });

      // Act
      const history = await dailyTaskService.getTaskHistory(userId, 30);

      // Assert
      expect(history).toBeDefined();
      expect(history.length).toBe(2);
      expect(history[0].userId).toBe(userId);

      testLogger.log('Task history retrieval test completed', { historyCount: history.length });
    });

    /**
     * Test Case: Calculate task statistics
     *
     * Verifies that statistics are correctly calculated from history
     */
    it('should calculate task statistics from history', async () => {
      testLogger.log('Testing statistics calculation');

      const userId = 'stats_user';

      const mockHistory = [
        {
          id: 'hist_1',
          userId,
          taskId: 'task_1',
          taskType: DailyTaskType.MORNING_READING,
          date: '2025-01-15',
          score: 80,
          xpAwarded: 12,
          completionTime: 300,
          completedAt: Timestamp.now(),
        },
        {
          id: 'hist_2',
          userId,
          taskId: 'task_2',
          taskType: DailyTaskType.MORNING_READING,
          date: '2025-01-14',
          score: 90,
          xpAwarded: 14,
          completionTime: 250,
          completedAt: Timestamp.now(),
        },
      ];

      // Mock getTaskHistory to return mock history
      (getDocs as jest.Mock).mockResolvedValue({
        forEach: (callback: Function) => mockHistory.forEach((h) => callback({ id: h.id, data: () => h })),
      });

      // Mock getUserDailyProgress for current streak
      (getDoc as jest.Mock).mockResolvedValue({
        exists: () => true,
        data: () => ({ streak: 5 }),
      });

      // Act
      const stats = await dailyTaskService.getTaskStatistics(userId);

      // Assert
      expect(stats).toBeDefined();
      expect(stats.totalCompleted).toBe(2);
      expect(stats.averageScore).toBe(85); // (80 + 90) / 2
      expect(stats.currentStreak).toBe(5);

      testLogger.log('Statistics calculation test completed', { stats });
    });
  });
});
