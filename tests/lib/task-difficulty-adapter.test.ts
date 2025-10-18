/**
 * @fileOverview Task Difficulty Adapter Unit Tests
 *
 * Comprehensive test suite for the TaskDifficultyAdapter class including:
 * - Performance analysis (analyzePerformance)
 * - Difficulty recommendations (getDifficultyRecommendation)
 * - Adaptive difficulty calculation (getAdaptiveDifficulty)
 * - Confidence level calculation
 * - Trend analysis
 * - Overall progress tracking
 *
 * Test Categories:
 * 1. Expected Use Cases: Normal adaptive learning operations
 * 2. Edge Cases: Boundary conditions and unusual patterns
 * 3. Failure Cases: Invalid inputs and error conditions
 *
 * Each test verifies the intelligent difficulty adaptation logic.
 */

import { TaskDifficultyAdapter } from '@/lib/task-difficulty-adapter';
import {
  DailyTaskType,
  TaskDifficulty,
  TaskHistoryRecord,
  TaskStatistics,
} from '@/lib/types/daily-task';
import { Timestamp } from 'firebase/firestore';

describe('TaskDifficultyAdapter', () => {
  let adapter: TaskDifficultyAdapter;
  let testLogger: any;

  beforeEach(() => {
    adapter = new TaskDifficultyAdapter();
    testLogger = {
      logs: [],
      log: (message: string, data?: any) => {
        testLogger.logs.push({ message, data, timestamp: new Date().toISOString() });
      },
    };
  });

  describe('Performance Analysis - Expected Use Cases', () => {
    /**
     * Test Case 1: Analyze performance with sufficient history
     *
     * Verifies correct analysis when user has completed several tasks
     */
    it('should analyze performance correctly with sufficient history', () => {
      testLogger.log('Testing performance analysis with sufficient history');

      // Arrange
      const history: TaskHistoryRecord[] = [
        {
          id: 'hist_1',
          userId: 'user_1',
          taskId: 'task_1',
          taskType: DailyTaskType.MORNING_READING,
          date: '2025-01-10',
          score: 85,
          xpAwarded: 12,
          completionTime: 300,
          completedAt: Timestamp.now(),
        },
        {
          id: 'hist_2',
          userId: 'user_1',
          taskId: 'task_2',
          taskType: DailyTaskType.MORNING_READING,
          date: '2025-01-11',
          score: 88,
          xpAwarded: 14,
          completionTime: 280,
          completedAt: Timestamp.now(),
        },
        {
          id: 'hist_3',
          userId: 'user_1',
          taskId: 'task_3',
          taskType: DailyTaskType.MORNING_READING,
          date: '2025-01-12',
          score: 90,
          xpAwarded: 15,
          completionTime: 270,
          completedAt: Timestamp.now(),
        },
      ];

      // Act
      const performance = adapter.analyzePerformance(
        DailyTaskType.MORNING_READING,
        history,
        TaskDifficulty.EASY
      );

      // Assert
      expect(performance).toBeDefined();
      expect(performance.taskType).toBe(DailyTaskType.MORNING_READING);
      expect(performance.averageScore).toBeCloseTo(87.67, 1); // (85 + 88 + 90) / 3
      expect(performance.completedCount).toBe(3);
      expect(performance.currentDifficulty).toBe(TaskDifficulty.EASY);
      expect(performance.trendDirection).toBe('improving'); // Scores increasing
      expect(performance.confidenceLevel).toBeGreaterThan(0);

      testLogger.log('Performance analysis test completed', { performance });
    });

    /**
     * Test Case 2: Analyze performance with no history
     *
     * Verifies handling when user has no task history
     */
    it('should handle empty history gracefully', () => {
      testLogger.log('Testing performance analysis with no history');

      // Arrange
      const emptyHistory: TaskHistoryRecord[] = [];

      // Act
      const performance = adapter.analyzePerformance(
        DailyTaskType.POETRY,
        emptyHistory,
        TaskDifficulty.MEDIUM
      );

      // Assert
      expect(performance).toBeDefined();
      expect(performance.averageScore).toBe(0);
      expect(performance.completedCount).toBe(0);
      expect(performance.confidenceLevel).toBe(0);
      expect(performance.recommendedDifficulty).toBe(TaskDifficulty.MEDIUM); // Should stay current

      testLogger.log('Empty history test completed');
    });
  });

  describe('Difficulty Recommendations - Expected Use Cases', () => {
    /**
     * Test Case 1: Recommend difficulty increase for high scores
     *
     * Verifies that difficulty increases when user consistently scores high
     */
    it('should recommend difficulty increase for consistently high scores', () => {
      testLogger.log('Testing difficulty increase recommendation');

      // Arrange: User with consistently high scores (avg 88)
      const history: TaskHistoryRecord[] = [
        {
          id: '1',
          userId: 'user_1',
          taskId: 't1',
          taskType: DailyTaskType.CHARACTER_INSIGHT,
          date: '2025-01-10',
          score: 86,
          xpAwarded: 15,
          completionTime: 300,
          completedAt: Timestamp.now(),
        },
        {
          id: '2',
          userId: 'user_1',
          taskId: 't2',
          taskType: DailyTaskType.CHARACTER_INSIGHT,
          date: '2025-01-11',
          score: 88,
          xpAwarded: 16,
          completionTime: 290,
          completedAt: Timestamp.now(),
        },
        {
          id: '3',
          userId: 'user_1',
          taskId: 't3',
          taskType: DailyTaskType.CHARACTER_INSIGHT,
          date: '2025-01-12',
          score: 90,
          xpAwarded: 18,
          completionTime: 280,
          completedAt: Timestamp.now(),
        },
      ];

      // Act
      const recommendation = adapter.getDifficultyRecommendation(
        DailyTaskType.CHARACTER_INSIGHT,
        history,
        TaskDifficulty.EASY
      );

      // Assert
      expect(recommendation).toBeDefined();
      expect(recommendation.shouldIncrease).toBe(true);
      expect(recommendation.recommended).toBe(TaskDifficulty.MEDIUM);
      expect(recommendation.reason).toContain('優異');

      testLogger.log('Difficulty increase recommendation test completed', { recommendation });
    });

    /**
     * Test Case 2: Recommend difficulty decrease for low scores
     *
     * Verifies that difficulty decreases when user struggles
     */
    it('should recommend difficulty decrease for consistently low scores', () => {
      testLogger.log('Testing difficulty decrease recommendation');

      // Arrange: User with consistently low scores (avg 55)
      const history: TaskHistoryRecord[] = [
        {
          id: '1',
          userId: 'user_1',
          taskId: 't1',
          taskType: DailyTaskType.CULTURAL_EXPLORATION,
          date: '2025-01-10',
          score: 58,
          xpAwarded: 8,
          completionTime: 600,
          completedAt: Timestamp.now(),
        },
        {
          id: '2',
          userId: 'user_1',
          taskId: 't2',
          taskType: DailyTaskType.CULTURAL_EXPLORATION,
          date: '2025-01-11',
          score: 52,
          xpAwarded: 7,
          completionTime: 650,
          completedAt: Timestamp.now(),
        },
        {
          id: '3',
          userId: 'user_1',
          taskId: 't3',
          taskType: DailyTaskType.CULTURAL_EXPLORATION,
          date: '2025-01-12',
          score: 55,
          xpAwarded: 7,
          completionTime: 620,
          completedAt: Timestamp.now(),
        },
      ];

      // Act
      const recommendation = adapter.getDifficultyRecommendation(
        DailyTaskType.CULTURAL_EXPLORATION,
        history,
        TaskDifficulty.HARD
      );

      // Assert
      expect(recommendation).toBeDefined();
      expect(recommendation.shouldDecrease).toBe(true);
      expect(recommendation.recommended).toBe(TaskDifficulty.MEDIUM);
      expect(recommendation.reason).toContain('分數偏低');

      testLogger.log('Difficulty decrease recommendation test completed');
    });

    /**
     * Test Case 3: Maintain difficulty for optimal range
     *
     * Verifies that difficulty stays same when scores are in optimal range
     */
    it('should maintain difficulty for scores in optimal range', () => {
      testLogger.log('Testing difficulty maintenance');

      // Arrange: User with scores in optimal range (avg 73)
      const history: TaskHistoryRecord[] = [
        {
          id: '1',
          userId: 'user_1',
          taskId: 't1',
          taskType: DailyTaskType.POETRY,
          date: '2025-01-10',
          score: 70,
          xpAwarded: 10,
          completionTime: 180,
          completedAt: Timestamp.now(),
        },
        {
          id: '2',
          userId: 'user_1',
          taskId: 't2',
          taskType: DailyTaskType.POETRY,
          date: '2025-01-11',
          score: 75,
          xpAwarded: 11,
          completionTime: 170,
          completedAt: Timestamp.now(),
        },
        {
          id: '3',
          userId: 'user_1',
          taskId: 't3',
          taskType: DailyTaskType.POETRY,
          date: '2025-01-12',
          score: 74,
          xpAwarded: 10,
          completionTime: 175,
          completedAt: Timestamp.now(),
        },
      ];

      // Act
      const recommendation = adapter.getDifficultyRecommendation(
        DailyTaskType.POETRY,
        history,
        TaskDifficulty.MEDIUM
      );

      // Assert
      expect(recommendation).toBeDefined();
      expect(recommendation.shouldIncrease).toBe(false);
      expect(recommendation.shouldDecrease).toBe(false);
      expect(recommendation.recommended).toBe(TaskDifficulty.MEDIUM); // Stay same
      expect(recommendation.reason).toContain('穩定');

      testLogger.log('Difficulty maintenance test completed');
    });
  });

  describe('Adaptive Difficulty - Expected Use Cases', () => {
    /**
     * Test Case: Get adaptive difficulty based on user level and performance
     *
     * Verifies that adaptive difficulty considers both level and history
     */
    it('should provide adaptive difficulty based on level and performance', () => {
      testLogger.log('Testing adaptive difficulty calculation');

      // Arrange
      const userLevel = 3; // Medium level
      const history: TaskHistoryRecord[] = [
        {
          id: '1',
          userId: 'user_1',
          taskId: 't1',
          taskType: DailyTaskType.COMMENTARY_DECODE,
          date: '2025-01-10',
          score: 90,
          xpAwarded: 18,
          completionTime: 480,
          completedAt: Timestamp.now(),
        },
        {
          id: '2',
          userId: 'user_1',
          taskId: 't2',
          taskType: DailyTaskType.COMMENTARY_DECODE,
          date: '2025-01-11',
          score: 92,
          xpAwarded: 19,
          completionTime: 450,
          completedAt: Timestamp.now(),
        },
        {
          id: '3',
          userId: 'user_1',
          taskId: 't3',
          taskType: DailyTaskType.COMMENTARY_DECODE,
          date: '2025-01-12',
          score: 88,
          xpAwarded: 18,
          completionTime: 470,
          completedAt: Timestamp.now(),
        },
      ];

      // Act
      const adaptiveDifficulty = adapter.getAdaptiveDifficulty(
        userLevel,
        DailyTaskType.COMMENTARY_DECODE,
        history
      );

      // Assert
      expect(adaptiveDifficulty).toBeDefined();
      // Should increase from MEDIUM to HARD due to high scores
      expect(adaptiveDifficulty).toBe(TaskDifficulty.HARD);

      testLogger.log('Adaptive difficulty test completed', { adaptiveDifficulty });
    });
  });

  describe('Adaptive Difficulty - Edge Cases', () => {
    /**
     * Edge Case 1: Insufficient history falls back to level-based difficulty
     *
     * Verifies that adaptive logic uses level when history is insufficient
     */
    it('should fall back to level-based difficulty with insufficient history', () => {
      testLogger.log('Testing fallback with insufficient history');

      const userLevel = 5; // Should map to MEDIUM
      const limitedHistory: TaskHistoryRecord[] = [
        {
          id: '1',
          userId: 'user_1',
          taskId: 't1',
          taskType: DailyTaskType.MORNING_READING,
          date: '2025-01-10',
          score: 60,
          xpAwarded: 8,
          completionTime: 300,
          completedAt: Timestamp.now(),
        },
      ]; // Only 1 task (< MIN_TASKS_FOR_ADAPTATION = 3)

      // Act
      const difficulty = adapter.getAdaptiveDifficulty(
        userLevel,
        DailyTaskType.MORNING_READING,
        limitedHistory
      );

      // Assert
      expect(difficulty).toBe(TaskDifficulty.MEDIUM); // Falls back to level-based

      testLogger.log('Fallback test completed');
    });

    /**
     * Edge Case 2: Prevent decreasing below EASY
     *
     * Verifies that difficulty doesn't go below minimum level
     */
    it('should not decrease difficulty below EASY', () => {
      testLogger.log('Testing minimum difficulty constraint');

      const history: TaskHistoryRecord[] = [
        {
          id: '1',
          userId: 'user_1',
          taskId: 't1',
          taskType: DailyTaskType.POETRY,
          date: '2025-01-10',
          score: 40,
          xpAwarded: 5,
          completionTime: 180,
          completedAt: Timestamp.now(),
        },
        {
          id: '2',
          userId: 'user_1',
          taskId: 't2',
          taskType: DailyTaskType.POETRY,
          date: '2025-01-11',
          score: 35,
          xpAwarded: 4,
          completionTime: 200,
          completedAt: Timestamp.now(),
        },
        {
          id: '3',
          userId: 'user_1',
          taskId: 't3',
          taskType: DailyTaskType.POETRY,
          date: '2025-01-12',
          score: 38,
          xpAwarded: 4,
          completionTime: 190,
          completedAt: Timestamp.now(),
        },
      ];

      const performance = adapter.analyzePerformance(
        DailyTaskType.POETRY,
        history,
        TaskDifficulty.EASY
      );

      // Assert
      expect(performance.recommendedDifficulty).toBe(TaskDifficulty.EASY); // Can't go lower

      testLogger.log('Minimum difficulty test completed');
    });

    /**
     * Edge Case 3: Prevent increasing above HARD
     *
     * Verifies that difficulty doesn't exceed maximum level
     */
    it('should not increase difficulty above HARD', () => {
      testLogger.log('Testing maximum difficulty constraint');

      const history: TaskHistoryRecord[] = [
        {
          id: '1',
          userId: 'user_1',
          taskId: 't1',
          taskType: DailyTaskType.CULTURAL_EXPLORATION,
          date: '2025-01-10',
          score: 95,
          xpAwarded: 24,
          completionTime: 600,
          completedAt: Timestamp.now(),
        },
        {
          id: '2',
          userId: 'user_1',
          taskId: 't2',
          taskType: DailyTaskType.CULTURAL_EXPLORATION,
          date: '2025-01-11',
          score: 98,
          xpAwarded: 25,
          completionTime: 580,
          completedAt: Timestamp.now(),
        },
        {
          id: '3',
          userId: 'user_1',
          taskId: 't3',
          taskType: DailyTaskType.CULTURAL_EXPLORATION,
          date: '2025-01-12',
          score: 96,
          xpAwarded: 24,
          completionTime: 590,
          completedAt: Timestamp.now(),
        },
      ];

      const performance = adapter.analyzePerformance(
        DailyTaskType.CULTURAL_EXPLORATION,
        history,
        TaskDifficulty.HARD
      );

      // Assert
      expect(performance.recommendedDifficulty).toBe(TaskDifficulty.HARD); // Can't go higher

      testLogger.log('Maximum difficulty test completed');
    });
  });

  describe('Confidence Level Calculation - Expected Use Cases', () => {
    /**
     * Test Case: Calculate confidence with consistent high scores
     *
     * Verifies high confidence for users with consistently high scores
     */
    it('should calculate high confidence for consistent high scores', () => {
      testLogger.log('Testing high confidence calculation');

      const history: TaskHistoryRecord[] = Array.from({ length: 5 }, (_, i) => ({
        id: `hist_${i}`,
        userId: 'user_1',
        taskId: `task_${i}`,
        taskType: DailyTaskType.MORNING_READING,
        date: `2025-01-${10 + i}`,
        score: 88 + i, // 88, 89, 90, 91, 92 (very consistent)
        xpAwarded: 15,
        completionTime: 300,
        completedAt: Timestamp.now(),
      }));

      const performance = adapter.analyzePerformance(
        DailyTaskType.MORNING_READING,
        history,
        TaskDifficulty.MEDIUM
      );

      // Assert
      expect(performance.confidenceLevel).toBeGreaterThan(85); // High confidence

      testLogger.log('High confidence test completed', {
        confidenceLevel: performance.confidenceLevel,
      });
    });
  });

  describe('Overall Progress Tracking - Expected Use Cases', () => {
    /**
     * Test Case: Get overall progress summary
     *
     * Verifies comprehensive progress tracking across all task types
     */
    it('should provide comprehensive overall progress summary', () => {
      testLogger.log('Testing overall progress tracking');

      const history: TaskHistoryRecord[] = [
        {
          id: '1',
          userId: 'user_1',
          taskId: 't1',
          taskType: DailyTaskType.MORNING_READING,
          date: '2025-01-10',
          score: 85,
          xpAwarded: 12,
          completionTime: 300,
          completedAt: Timestamp.now(),
        },
        {
          id: '2',
          userId: 'user_1',
          taskId: 't2',
          taskType: DailyTaskType.POETRY,
          date: '2025-01-11',
          score: 65,
          xpAwarded: 8,
          completionTime: 180,
          completedAt: Timestamp.now(),
        },
        {
          id: '3',
          userId: 'user_1',
          taskId: 't3',
          taskType: DailyTaskType.CHARACTER_INSIGHT,
          date: '2025-01-12',
          score: 90,
          xpAwarded: 18,
          completionTime: 300,
          completedAt: Timestamp.now(),
        },
      ];

      const stats: TaskStatistics = {
        totalCompleted: 3,
        totalSkipped: 0,
        averageScore: 80, // (85 + 65 + 90) / 3
        averageCompletionTime: 260,
        completionRate: 1.0,
        byType: {
          [DailyTaskType.MORNING_READING]: {
            completed: 1,
            averageScore: 85,
            averageTime: 300,
          },
          [DailyTaskType.POETRY]: {
            completed: 1,
            averageScore: 65,
            averageTime: 180,
          },
          [DailyTaskType.CHARACTER_INSIGHT]: {
            completed: 1,
            averageScore: 90,
            averageTime: 300,
          },
        } as any,
        longestStreak: 5,
        currentStreak: 5,
      };

      const overallProgress = adapter.getOverallProgress(history, stats);

      // Assert
      expect(overallProgress).toBeDefined();
      expect(overallProgress.overallConfidence).toBe(80);
      expect(overallProgress.strongestTaskType).toBe(DailyTaskType.CHARACTER_INSIGHT);
      expect(overallProgress.weakestTaskType).toBe(DailyTaskType.POETRY);
      expect(overallProgress.recommendedFocus).toContain(DailyTaskType.POETRY); // Score < 70

      testLogger.log('Overall progress test completed', { overallProgress });
    });
  });
});
