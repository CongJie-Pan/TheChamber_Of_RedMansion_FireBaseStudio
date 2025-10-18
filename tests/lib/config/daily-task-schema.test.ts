/**
 * @fileOverview Unit Tests for Daily Task Schema Validators
 *
 * Comprehensive test coverage for:
 * - Enum validators (task type, difficulty, status)
 * - Format validators (date, progress ID, XP, score, streak, time)
 * - Type guards (DailyTask, DailyTaskProgress, TaskHistoryRecord)
 *
 * @phase Phase 1.6 - Schema Validation Testing
 */

import {
  TaskSchemaValidators,
  isDailyTask,
  isDailyTaskProgress,
  isTaskHistoryRecord,
  DAILY_TASK_COLLECTIONS,
  DOCUMENT_ID_PATTERNS,
  QUERY_LIMITS,
} from '@/lib/config/daily-task-schema';

import {
  DailyTaskType,
  TaskDifficulty,
  TaskStatus,
  DailyTask,
  DailyTaskProgress,
  TaskHistoryRecord,
} from '@/lib/types/daily-task';

describe('Daily Task Schema Validators', () => {
  let testLogger: any;

  beforeEach(() => {
    testLogger = {
      logs: [],
      log: (message: string, data?: any) => {
        testLogger.logs.push({
          message,
          data,
          timestamp: new Date().toISOString(),
        });
      },
    };
  });

  // ============================================================================
  // ENUM VALIDATORS
  // ============================================================================

  describe('Enum Validators', () => {
    it('should validate task type enum values', () => {
      testLogger.log('Testing isValidTaskType validator');

      // Valid task types
      expect(TaskSchemaValidators.isValidTaskType(DailyTaskType.MORNING_READING)).toBe(true);
      expect(TaskSchemaValidators.isValidTaskType(DailyTaskType.POETRY)).toBe(true);
      expect(TaskSchemaValidators.isValidTaskType(DailyTaskType.CHARACTER_INSIGHT)).toBe(true);
      expect(TaskSchemaValidators.isValidTaskType(DailyTaskType.CULTURAL_EXPLORATION)).toBe(true);
      expect(TaskSchemaValidators.isValidTaskType(DailyTaskType.COMMENTARY_DECODE)).toBe(true);

      // String literal checks
      expect(TaskSchemaValidators.isValidTaskType('morning_reading')).toBe(true);
      expect(TaskSchemaValidators.isValidTaskType('poetry')).toBe(true);

      // Invalid task types
      expect(TaskSchemaValidators.isValidTaskType('invalid_type')).toBe(false);
      expect(TaskSchemaValidators.isValidTaskType('MORNING_READING')).toBe(false); // Wrong case
      expect(TaskSchemaValidators.isValidTaskType('')).toBe(false);
      expect(TaskSchemaValidators.isValidTaskType('quiz')).toBe(false);

      testLogger.log('Task type validation test completed', {
        validTypes: Object.values(DailyTaskType),
      });
    });

    it('should validate difficulty enum values', () => {
      testLogger.log('Testing isValidDifficulty validator');

      // Valid difficulties
      expect(TaskSchemaValidators.isValidDifficulty(TaskDifficulty.EASY)).toBe(true);
      expect(TaskSchemaValidators.isValidDifficulty(TaskDifficulty.MEDIUM)).toBe(true);
      expect(TaskSchemaValidators.isValidDifficulty(TaskDifficulty.HARD)).toBe(true);

      // String literal checks
      expect(TaskSchemaValidators.isValidDifficulty('easy')).toBe(true);
      expect(TaskSchemaValidators.isValidDifficulty('medium')).toBe(true);
      expect(TaskSchemaValidators.isValidDifficulty('hard')).toBe(true);

      // Invalid difficulties
      expect(TaskSchemaValidators.isValidDifficulty('EASY')).toBe(false); // Wrong case
      expect(TaskSchemaValidators.isValidDifficulty('normal')).toBe(false);
      expect(TaskSchemaValidators.isValidDifficulty('extreme')).toBe(false);
      expect(TaskSchemaValidators.isValidDifficulty('')).toBe(false);

      testLogger.log('Difficulty validation test completed', {
        validDifficulties: Object.values(TaskDifficulty),
      });
    });

    it('should validate status enum values', () => {
      testLogger.log('Testing isValidStatus validator');

      // Valid statuses
      expect(TaskSchemaValidators.isValidStatus(TaskStatus.NOT_STARTED)).toBe(true);
      expect(TaskSchemaValidators.isValidStatus(TaskStatus.IN_PROGRESS)).toBe(true);
      expect(TaskSchemaValidators.isValidStatus(TaskStatus.COMPLETED)).toBe(true);
      expect(TaskSchemaValidators.isValidStatus(TaskStatus.SKIPPED)).toBe(true);

      // String literal checks
      expect(TaskSchemaValidators.isValidStatus('not_started')).toBe(true);
      expect(TaskSchemaValidators.isValidStatus('in_progress')).toBe(true);
      expect(TaskSchemaValidators.isValidStatus('completed')).toBe(true);
      expect(TaskSchemaValidators.isValidStatus('skipped')).toBe(true);

      // Invalid statuses
      expect(TaskSchemaValidators.isValidStatus('pending')).toBe(false);
      expect(TaskSchemaValidators.isValidStatus('done')).toBe(false);
      expect(TaskSchemaValidators.isValidStatus('COMPLETED')).toBe(false); // Wrong case
      expect(TaskSchemaValidators.isValidStatus('')).toBe(false);

      testLogger.log('Status validation test completed', {
        validStatuses: Object.values(TaskStatus),
      });
    });
  });

  // ============================================================================
  // FORMAT VALIDATORS
  // ============================================================================

  describe('Format Validators', () => {
    it('should validate date format (YYYY-MM-DD)', () => {
      testLogger.log('Testing isValidDateFormat validator');

      // Valid date formats
      expect(TaskSchemaValidators.isValidDateFormat('2025-01-15')).toBe(true);
      expect(TaskSchemaValidators.isValidDateFormat('2024-12-31')).toBe(true);
      expect(TaskSchemaValidators.isValidDateFormat('2025-02-28')).toBe(true);
      expect(TaskSchemaValidators.isValidDateFormat('2024-02-29')).toBe(true); // Leap year

      // Invalid date formats
      expect(TaskSchemaValidators.isValidDateFormat('2025/01/15')).toBe(false); // Wrong separator
      expect(TaskSchemaValidators.isValidDateFormat('15-01-2025')).toBe(false); // Wrong order
      expect(TaskSchemaValidators.isValidDateFormat('2025-1-15')).toBe(false); // Missing leading zero
      expect(TaskSchemaValidators.isValidDateFormat('2025-01-32')).toBe(false); // Invalid day
      expect(TaskSchemaValidators.isValidDateFormat('2025-13-01')).toBe(false); // Invalid month
      expect(TaskSchemaValidators.isValidDateFormat('25-01-15')).toBe(false); // 2-digit year
      expect(TaskSchemaValidators.isValidDateFormat('')).toBe(false);
      expect(TaskSchemaValidators.isValidDateFormat('invalid')).toBe(false);

      testLogger.log('Date format validation test completed');
    });

    it('should validate progress ID format (userId_YYYY-MM-DD)', () => {
      testLogger.log('Testing isValidProgressId validator');

      // Valid progress IDs
      expect(TaskSchemaValidators.isValidProgressId('user123_2025-01-15')).toBe(true);
      expect(TaskSchemaValidators.isValidProgressId('abc-def_2024-12-31')).toBe(true);
      expect(TaskSchemaValidators.isValidProgressId('user_with_underscore_2025-06-01')).toBe(true);
      expect(TaskSchemaValidators.isValidProgressId('A1B2C3_2025-01-01')).toBe(true);

      // Invalid progress IDs
      expect(TaskSchemaValidators.isValidProgressId('user123-2025-01-15')).toBe(false); // Wrong separator
      expect(TaskSchemaValidators.isValidProgressId('2025-01-15')).toBe(false); // Missing user ID
      expect(TaskSchemaValidators.isValidProgressId('user123_2025/01/15')).toBe(false); // Invalid date format
      expect(TaskSchemaValidators.isValidProgressId('user@email_2025-01-15')).toBe(false); // Invalid char
      expect(TaskSchemaValidators.isValidProgressId('')).toBe(false);
      expect(TaskSchemaValidators.isValidProgressId('_2025-01-15')).toBe(false); // Empty user ID

      testLogger.log('Progress ID format validation test completed');
    });

    it('should validate XP reward range (0-1000)', () => {
      testLogger.log('Testing isValidXPReward validator');

      // Valid XP values
      expect(TaskSchemaValidators.isValidXPReward(0)).toBe(true); // Minimum
      expect(TaskSchemaValidators.isValidXPReward(10)).toBe(true);
      expect(TaskSchemaValidators.isValidXPReward(100)).toBe(true);
      expect(TaskSchemaValidators.isValidXPReward(500)).toBe(true);
      expect(TaskSchemaValidators.isValidXPReward(1000)).toBe(true); // Maximum

      // Invalid XP values
      expect(TaskSchemaValidators.isValidXPReward(-1)).toBe(false); // Negative
      expect(TaskSchemaValidators.isValidXPReward(1001)).toBe(false); // Too high
      expect(TaskSchemaValidators.isValidXPReward(-100)).toBe(false);
      expect(TaskSchemaValidators.isValidXPReward(9999)).toBe(false);

      testLogger.log('XP reward validation test completed', {
        validRange: '0-1000',
      });
    });

    it('should validate score range (0-100)', () => {
      testLogger.log('Testing isValidScore validator');

      // Valid scores
      expect(TaskSchemaValidators.isValidScore(0)).toBe(true); // Minimum
      expect(TaskSchemaValidators.isValidScore(50)).toBe(true);
      expect(TaskSchemaValidators.isValidScore(75)).toBe(true);
      expect(TaskSchemaValidators.isValidScore(100)).toBe(true); // Maximum
      expect(TaskSchemaValidators.isValidScore(85.5)).toBe(true); // Decimal scores

      // Invalid scores
      expect(TaskSchemaValidators.isValidScore(-1)).toBe(false); // Negative
      expect(TaskSchemaValidators.isValidScore(101)).toBe(false); // Too high
      expect(TaskSchemaValidators.isValidScore(-50)).toBe(false);
      expect(TaskSchemaValidators.isValidScore(200)).toBe(false);

      testLogger.log('Score validation test completed', {
        validRange: '0-100',
      });
    });

    it('should validate streak values (non-negative integers)', () => {
      testLogger.log('Testing isValidStreak validator');

      // Valid streak values
      expect(TaskSchemaValidators.isValidStreak(0)).toBe(true); // No streak
      expect(TaskSchemaValidators.isValidStreak(1)).toBe(true);
      expect(TaskSchemaValidators.isValidStreak(7)).toBe(true);
      expect(TaskSchemaValidators.isValidStreak(30)).toBe(true);
      expect(TaskSchemaValidators.isValidStreak(365)).toBe(true);

      // Invalid streak values
      expect(TaskSchemaValidators.isValidStreak(-1)).toBe(false); // Negative
      expect(TaskSchemaValidators.isValidStreak(5.5)).toBe(false); // Decimal
      expect(TaskSchemaValidators.isValidStreak(10.1)).toBe(false);
      expect(TaskSchemaValidators.isValidStreak(-100)).toBe(false);

      testLogger.log('Streak validation test completed', {
        requirement: 'Non-negative integer',
      });
    });

    it('should validate time estimate range (1-60 minutes)', () => {
      testLogger.log('Testing isValidTimeEstimate validator');

      // Valid time estimates
      expect(TaskSchemaValidators.isValidTimeEstimate(1)).toBe(true); // Minimum
      expect(TaskSchemaValidators.isValidTimeEstimate(5)).toBe(true);
      expect(TaskSchemaValidators.isValidTimeEstimate(15)).toBe(true);
      expect(TaskSchemaValidators.isValidTimeEstimate(30)).toBe(true);
      expect(TaskSchemaValidators.isValidTimeEstimate(60)).toBe(true); // Maximum

      // Invalid time estimates
      expect(TaskSchemaValidators.isValidTimeEstimate(0)).toBe(false); // Zero
      expect(TaskSchemaValidators.isValidTimeEstimate(-5)).toBe(false); // Negative
      expect(TaskSchemaValidators.isValidTimeEstimate(61)).toBe(false); // Too high
      expect(TaskSchemaValidators.isValidTimeEstimate(120)).toBe(false);

      testLogger.log('Time estimate validation test completed', {
        validRange: '1-60 minutes',
      });
    });
  });

  // ============================================================================
  // TYPE GUARDS
  // ============================================================================

  describe('Type Guards', () => {
    it('should validate DailyTask object structure', () => {
      testLogger.log('Testing isDailyTask type guard');

      // Valid DailyTask object
      const validTask: DailyTask = {
        id: 'task_12345',
        type: DailyTaskType.MORNING_READING,
        title: '晨讀時光：寶玉初見黛玉',
        description: '閱讀第三回寶玉初見黛玉的片段',
        difficulty: TaskDifficulty.EASY,
        xpReward: 10,
        timeEstimate: 10,
        content: {
          textPassage: {
            chapter: 3,
            text: '兩彎似蹙非蹙罥煙眉，一雙似喜非喜含情目...',
            context: '寶玉初見黛玉的經典描寫',
            question: '這段文字描寫了誰的外貌？',
            expectedKeywords: ['黛玉', '外貌', '眉目'],
          },
        },
        gradingCriteria: {
          minLength: 20,
          maxLength: 100,
          rubric: '正確識別人物並理解描寫手法',
          keyPoints: ['識別黛玉', '理解比喻手法'],
        },
      };

      expect(isDailyTask(validTask)).toBe(true);

      // Invalid DailyTask objects
      const invalidTask1 = {
        id: 'task_123',
        type: 'invalid_type', // Invalid type
        difficulty: TaskDifficulty.EASY,
        xpReward: 10,
        timeEstimate: 10,
      };
      expect(isDailyTask(invalidTask1)).toBe(false);

      const invalidTask2 = {
        id: 'task_123',
        type: DailyTaskType.POETRY,
        difficulty: 'super_hard', // Invalid difficulty
        xpReward: 10,
        timeEstimate: 10,
      };
      expect(isDailyTask(invalidTask2)).toBe(false);

      const invalidTask3 = {
        id: 'task_123',
        type: DailyTaskType.POETRY,
        difficulty: TaskDifficulty.EASY,
        xpReward: 9999, // Invalid XP (>1000)
        timeEstimate: 10,
      };
      expect(isDailyTask(invalidTask3)).toBe(false);

      const invalidTask4 = {
        id: 'task_123',
        type: DailyTaskType.POETRY,
        difficulty: TaskDifficulty.EASY,
        xpReward: 10,
        timeEstimate: 100, // Invalid time (>60)
      };
      expect(isDailyTask(invalidTask4)).toBe(false);

      testLogger.log('DailyTask type guard test completed');
    });

    it('should validate DailyTaskProgress object structure', () => {
      testLogger.log('Testing isDailyTaskProgress type guard');

      // Valid DailyTaskProgress object
      const validProgress: DailyTaskProgress = {
        id: 'user123_2025-01-15',
        userId: 'user123',
        date: '2025-01-15',
        tasks: [
          {
            taskId: 'task_001',
            status: TaskStatus.COMPLETED,
            score: 85,
            submittedAt: new Date('2025-01-15T10:00:00Z'),
          },
        ],
        totalXP: 10,
        tasksCompleted: 1,
        tasksTotal: 2,
        streak: 5,
        createdAt: new Date('2025-01-15T00:00:00Z'),
        updatedAt: new Date('2025-01-15T10:00:00Z'),
      };

      expect(isDailyTaskProgress(validProgress)).toBe(true);

      // Invalid DailyTaskProgress objects
      // Note: The type guard doesn't validate progress ID format, only checks it's a string

      const invalidProgress1 = {
        id: 'user123_2025-01-15',
        userId: 'user123',
        date: '2025/01/15', // Invalid date format
        tasks: [],
        streak: 0,
      };
      expect(isDailyTaskProgress(invalidProgress1)).toBe(false);

      const invalidProgress2 = {
        id: 'user123_2025-01-15',
        userId: 'user123',
        date: '2025-01-15',
        tasks: 'not_an_array', // Not an array
        streak: 0,
      };
      expect(isDailyTaskProgress(invalidProgress2)).toBe(false);

      const invalidProgress3 = {
        id: 'user123_2025-01-15',
        userId: 'user123',
        date: '2025-01-15',
        tasks: [],
        streak: 5.5, // Not an integer
      };
      expect(isDailyTaskProgress(invalidProgress3)).toBe(false);

      testLogger.log('DailyTaskProgress type guard test completed');
    });

    it('should validate TaskHistoryRecord object structure', () => {
      testLogger.log('Testing isTaskHistoryRecord type guard');

      // Valid TaskHistoryRecord object
      const validRecord: TaskHistoryRecord = {
        id: 'history_12345',
        userId: 'user123',
        taskId: 'task_001',
        taskType: DailyTaskType.POETRY,
        difficulty: TaskDifficulty.MEDIUM,
        score: 88,
        xpEarned: 15,
        completedAt: new Date('2025-01-15T10:00:00Z'),
        date: '2025-01-15',
      };

      expect(isTaskHistoryRecord(validRecord)).toBe(true);

      // Invalid TaskHistoryRecord objects
      const invalidRecord1 = {
        id: 'history_123',
        userId: 'user123',
        taskId: 'task_001',
        taskType: 'invalid_type', // Invalid task type
        score: 88,
      };
      expect(isTaskHistoryRecord(invalidRecord1)).toBe(false);

      const invalidRecord2 = {
        id: 'history_123',
        userId: 'user123',
        taskId: 'task_001',
        taskType: DailyTaskType.POETRY,
        score: 150, // Invalid score (>100)
      };
      expect(isTaskHistoryRecord(invalidRecord2)).toBe(false);

      const invalidRecord3 = {
        id: 'history_123',
        userId: 'user123',
        taskId: 'task_001',
        taskType: DailyTaskType.POETRY,
        score: -10, // Negative score
      };
      expect(isTaskHistoryRecord(invalidRecord3)).toBe(false);

      testLogger.log('TaskHistoryRecord type guard test completed');
    });
  });

  // ============================================================================
  // SCHEMA CONFIGURATION CONSTANTS
  // ============================================================================

  describe('Schema Configuration Constants', () => {
    it('should have correct collection names', () => {
      testLogger.log('Testing collection name constants');

      expect(DAILY_TASK_COLLECTIONS.TASKS).toBe('dailyTasks');
      expect(DAILY_TASK_COLLECTIONS.PROGRESS).toBe('dailyTaskProgress');
      expect(DAILY_TASK_COLLECTIONS.HISTORY).toBe('dailyTaskHistory');

      testLogger.log('Collection names verified');
    });

    it('should generate correct progress document IDs', () => {
      testLogger.log('Testing document ID pattern generation');

      const userId = 'user123';
      const date = '2025-01-15';

      const progressId = DOCUMENT_ID_PATTERNS.PROGRESS(userId, date);

      expect(progressId).toBe('user123_2025-01-15');
      expect(TaskSchemaValidators.isValidProgressId(progressId)).toBe(true);

      testLogger.log('Document ID pattern generation verified', { progressId });
    });

    it('should have reasonable query limits', () => {
      testLogger.log('Testing query limit constants');

      expect(QUERY_LIMITS.MAX_TASKS_PER_QUERY).toBe(50);
      expect(QUERY_LIMITS.MAX_HISTORY_PER_QUERY).toBe(100);
      expect(QUERY_LIMITS.DEFAULT_HISTORY_LIMIT).toBe(30);
      expect(QUERY_LIMITS.MAX_PROGRESS_RECORDS).toBe(365);

      // Verify limits are positive integers
      expect(QUERY_LIMITS.MAX_TASKS_PER_QUERY).toBeGreaterThan(0);
      expect(Number.isInteger(QUERY_LIMITS.MAX_TASKS_PER_QUERY)).toBe(true);

      testLogger.log('Query limits verified');
    });
  });
});
