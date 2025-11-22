/**
 * @jest-environment node
 *
 * @fileoverview Verifies that DailyTaskService enforces SQLite usage when the USE_SQLITE flag is enabled.
 */

describe('DailyTaskService SQLite enforcement', () => {
  const loadDailyTaskService = () => require('@/lib/daily-task-service');

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    process.env.USE_SQLITE = '1';

    jest.doMock('@/lib/repositories/user-repository', () => ({}), { virtual: true });
    jest.doMock('@/lib/repositories/task-repository', () => ({}), { virtual: true });
    jest.doMock('@/lib/repositories/progress-repository', () => ({}), { virtual: true });

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

  test('throws when SQLite repositories cannot be loaded under USE_SQLITE=1', () => {
    jest.doMock('@/lib/repositories/user-repository', () => {
      throw new Error('Cannot find module "@/lib/repositories/user-repository"');
    });

    expect(() => loadDailyTaskService()).toThrow(/Failed to load SQLite modules/);
  });

  test('imports successfully when USE_SQLITE is disabled', () => {
    process.env.USE_SQLITE = '0';
    const loadedModule = loadDailyTaskService();

    expect(typeof loadedModule.DailyTaskService).toBe('function');
  });
});
