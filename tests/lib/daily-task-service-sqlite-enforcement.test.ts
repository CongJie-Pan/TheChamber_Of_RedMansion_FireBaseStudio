/**
 * @jest-environment node
 *
 * @fileoverview Verifies that DailyTaskService enforces SQLite usage when the USE_SQLITE flag is enabled.
 *
 * Phase 4.6 Update: Removed test for dynamic require() failure since we now use static imports.
 * Static imports are resolved at build time by the bundler, not at runtime.
 */

describe('DailyTaskService SQLite enforcement', () => {
  const loadDailyTaskService = () => require('@/lib/daily-task-service');

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    process.env.USE_SQLITE = '1';

    jest.doMock('@/lib/repositories/user-repository', () => ({
      getUserById: jest.fn(),
      createUser: jest.fn(),
      updateAttributes: jest.fn(),
    }), { virtual: true });
    jest.doMock('@/lib/repositories/task-repository', () => ({
      getTaskById: jest.fn(),
      batchCreateTasks: jest.fn(),
    }), { virtual: true });
    jest.doMock('@/lib/repositories/progress-repository', () => ({
      getProgress: jest.fn(),
      createProgress: jest.fn(),
      updateProgress: jest.fn(),
      getUserRecentProgress: jest.fn(),
      deleteProgress: jest.fn(),
    }), { virtual: true });

    jest.doMock('@/lib/sqlite-db', () => ({
      fromUnixTimestamp: jest.fn((timestamp: number) => ({
        seconds: Math.floor(timestamp / 1000),
        nanoseconds: (timestamp % 1000) * 1_000_000,
        toMillis: () => timestamp,
      })),
      isSQLiteAvailable: jest.fn(() => true),
    }));

    jest.doMock('@/lib/user-level-service', () => ({
      userLevelService: {
        getUserProfile: jest.fn().mockResolvedValue({
          userId: 'user',
          currentLevel: 1,
          totalXP: 0,
        }),
        checkDuplicateReward: jest.fn(),
        awardXP: jest.fn(),
      },
    }));

    jest.doMock('@/lib/task-generator', () => ({
      taskGenerator: {
        generateTasksForUser: jest.fn().mockResolvedValue([]),
      },
    }));

    jest.doMock('@/lib/ai-feedback-generator', () => ({
      generatePersonalizedFeedback: jest.fn().mockResolvedValue('feedback'),
    }));

    jest.doMock('firebase/firestore', () => ({
      collection: jest.fn(),
      doc: jest.fn(),
      getDoc: jest.fn(),
      setDoc: jest.fn(),
      updateDoc: jest.fn(),
      query: jest.fn(),
      where: jest.fn(),
      orderBy: jest.fn(),
      limit: jest.fn(),
      getDocs: jest.fn(),
      serverTimestamp: jest.fn(),
      Timestamp: { now: jest.fn() },
    }));

    jest.doMock('@/lib/firebase', () => ({ db: {} }), { virtual: true });
  });

  afterEach(() => {
    delete process.env.USE_SQLITE;
    jest.restoreAllMocks();
  });

  // Phase 4.6: Removed obsolete test 'throws when SQLite repositories cannot be loaded'
  // With static imports, module loading errors are caught at build time by the bundler,
  // not at runtime. The previous dynamic require() pattern has been replaced.

  test('imports successfully when USE_SQLITE is disabled', () => {
    process.env.USE_SQLITE = '0';
    const loadedModule = loadDailyTaskService();

    expect(typeof loadedModule.DailyTaskService).toBe('function');
  });

  test('exports DailyTaskService class with expected methods', () => {
    const loadedModule = loadDailyTaskService();

    expect(typeof loadedModule.DailyTaskService).toBe('function');
    expect(typeof loadedModule.dailyTaskService).toBe('object');
  });

  test('exports singleton instance', () => {
    const loadedModule = loadDailyTaskService();

    expect(loadedModule.dailyTaskService).toBeDefined();
    expect(loadedModule.dailyTaskService).toBeInstanceOf(loadedModule.DailyTaskService);
  });
});
