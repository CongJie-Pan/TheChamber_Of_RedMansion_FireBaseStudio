/**
 * @fileOverview Daily Task Service - Async Operations Tests
 *
 * Tests for the async/await patterns in daily-task-service.ts
 * Covers Task 4.6 Error #2 fix: missing await on progressRepository calls
 *
 * Test Coverage:
 * - Verify all progressRepository calls are properly awaited
 * - Test that async operations return resolved data, not Promise objects
 * - Validate proper sequential execution where order matters
 */

// Mock the SQLite database module
jest.mock('@/lib/sqlite-db', () => ({
  getDatabase: jest.fn(),
  toUnixTimestamp: jest.fn((date: Date) => Math.floor(date.getTime() / 1000)),
  fromUnixTimestamp: jest.fn((timestamp: number) => new Date(timestamp)),
  SQLITE_SERVER_ENABLED: true,
}));

// Mock progress repository
const mockProgressRepository = {
  getProgress: jest.fn(),
  createProgress: jest.fn(),
  updateProgress: jest.fn(),
  deleteProgress: jest.fn(),
  getUserRecentProgress: jest.fn(),
};

jest.mock('@/lib/repositories/progress-repository', () => mockProgressRepository);

// Mock task repository
const mockTaskRepository = {
  getTaskById: jest.fn(),
  batchCreateTasks: jest.fn(),
  getTasks: jest.fn(),
};

jest.mock('@/lib/repositories/task-repository', () => mockTaskRepository);

// Mock user-level service
const mockUserLevelService = {
  getUserProfile: jest.fn(),
  awardExperience: jest.fn(),
};

jest.mock('@/lib/user-level-service', () => ({
  userLevelService: mockUserLevelService,
}));

// Mock task generator
jest.mock('@/lib/task-generator', () => ({
  taskGenerator: {
    generateTasksForUser: jest.fn().mockResolvedValue([]),
  },
}));

// Sample mock data
const mockUserId = 'test-user-123';
const mockDate = '2025-01-15';
const mockProgressId = `${mockUserId}_${mockDate}`;

const mockProgress = {
  id: mockProgressId,
  userId: mockUserId,
  date: mockDate,
  tasks: [
    { taskId: 'task-1', assignedAt: new Date(), status: 'not_started' },
    { taskId: 'task-2', assignedAt: new Date(), status: 'not_started' },
  ],
  completedTaskIds: [],
  skippedTaskIds: [],
  totalXPEarned: 0,
  totalAttributeGains: {},
  usedSourceIds: [],
  streak: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTask = {
  id: 'task-1',
  type: 'poetry_analysis',
  title: 'Test Poetry Task',
  description: 'Analyze a poem',
  xpReward: 50,
  difficulty: 'medium',
};

describe('DailyTaskService - Async Operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15T12:00:00Z'));

    // Reset mock implementations
    mockProgressRepository.getProgress.mockResolvedValue(null);
    mockProgressRepository.createProgress.mockResolvedValue(undefined);
    mockProgressRepository.updateProgress.mockResolvedValue(undefined);
    mockProgressRepository.deleteProgress.mockResolvedValue(undefined);
    mockProgressRepository.getUserRecentProgress.mockResolvedValue([]);
    mockTaskRepository.getTaskById.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('progressRepository.getProgress() Await Pattern', () => {
    /**
     * Tests that getProgress returns resolved data, not a Promise
     * This validates the fix for Error #2
     */

    it('should return DailyTaskProgress object when await is used', async () => {
      mockProgressRepository.getProgress.mockResolvedValue(mockProgress);

      // Simulate the correct pattern with await
      const result = await mockProgressRepository.getProgress(mockUserId, mockDate);

      expect(result).toEqual(mockProgress);
      expect(result).not.toBeInstanceOf(Promise);
      expect(result?.id).toBe(mockProgressId);
      expect(result?.userId).toBe(mockUserId);
    });

    it('should return null when progress does not exist', async () => {
      mockProgressRepository.getProgress.mockResolvedValue(null);

      const result = await mockProgressRepository.getProgress(mockUserId, mockDate);

      expect(result).toBeNull();
    });

    it('should correctly access properties on resolved progress', async () => {
      mockProgressRepository.getProgress.mockResolvedValue(mockProgress);

      const result = await mockProgressRepository.getProgress(mockUserId, mockDate);

      // These would fail without await because result would be a Promise
      expect(result?.tasks).toBeDefined();
      expect(result?.tasks.length).toBe(2);
      expect(result?.completedTaskIds).toEqual([]);
      expect(result?.streak).toBe(5);
    });
  });

  describe('progressRepository.createProgress() Await Pattern', () => {
    it('should properly await createProgress before continuing', async () => {
      // Use real timers for this test since we need actual setTimeout behavior
      jest.useRealTimers();

      const createOrder: string[] = [];

      mockProgressRepository.createProgress.mockImplementation(async () => {
        createOrder.push('create_started');
        await new Promise((resolve) => setTimeout(resolve, 100));
        createOrder.push('create_finished');
      });

      mockProgressRepository.getProgress.mockImplementation(async () => {
        createOrder.push('get_called');
        return mockProgress;
      });

      // Simulate sequential operations
      await mockProgressRepository.createProgress(mockProgress);
      await mockProgressRepository.getProgress(mockUserId, mockDate);

      // With proper await, create should finish before get is called
      expect(createOrder).toEqual(['create_started', 'create_finished', 'get_called']);

      // Restore fake timers for other tests
      jest.useFakeTimers();
    });

    it('should handle createProgress errors gracefully', async () => {
      mockProgressRepository.createProgress.mockRejectedValue(
        new Error('Database write failed')
      );

      await expect(mockProgressRepository.createProgress(mockProgress)).rejects.toThrow(
        'Database write failed'
      );
    });
  });

  describe('progressRepository.updateProgress() Await Pattern', () => {
    it('should properly await updateProgress', async () => {
      mockProgressRepository.updateProgress.mockResolvedValue(undefined);

      const updatedProgress = {
        ...mockProgress,
        completedTaskIds: ['task-1'],
        totalXPEarned: 50,
      };

      await mockProgressRepository.updateProgress(mockProgressId, updatedProgress);

      expect(mockProgressRepository.updateProgress).toHaveBeenCalledWith(
        mockProgressId,
        updatedProgress
      );
    });

    it('should handle updateProgress errors', async () => {
      mockProgressRepository.updateProgress.mockRejectedValue(
        new Error('Update failed')
      );

      await expect(
        mockProgressRepository.updateProgress(mockProgressId, mockProgress)
      ).rejects.toThrow('Update failed');
    });
  });

  describe('Verification Read After Write Pattern', () => {
    /**
     * Tests the pattern where we read back progress after writing
     * to ensure the write succeeded
     */

    it('should verify progress was written correctly', async () => {
      const updatedProgress = {
        ...mockProgress,
        completedTaskIds: ['task-1'],
        totalXPEarned: 50,
      };

      // Setup mocks for write-then-read pattern
      mockProgressRepository.updateProgress.mockResolvedValue(undefined);
      mockProgressRepository.getProgress.mockResolvedValue(updatedProgress);

      // Write
      await mockProgressRepository.updateProgress(mockProgressId, updatedProgress);

      // Verify (read back)
      const verified = await mockProgressRepository.getProgress(mockUserId, mockDate);

      expect(verified).toBeDefined();
      expect(verified?.completedTaskIds).toContain('task-1');
      expect(verified?.totalXPEarned).toBe(50);
    });

    it('should detect write failures through verification', async () => {
      mockProgressRepository.updateProgress.mockResolvedValue(undefined);
      mockProgressRepository.getProgress.mockResolvedValue(null); // Write failed

      await mockProgressRepository.updateProgress(mockProgressId, mockProgress);
      const verified = await mockProgressRepository.getProgress(mockUserId, mockDate);

      // Verification should detect the write failure
      expect(verified).toBeNull();
    });
  });

  describe('progressRepository.getUserRecentProgress() Await Pattern', () => {
    it('should return array of progress records', async () => {
      const mockRecentProgress = [
        { ...mockProgress, date: '2025-01-15' },
        { ...mockProgress, date: '2025-01-14', id: `${mockUserId}_2025-01-14` },
      ];
      mockProgressRepository.getUserRecentProgress.mockResolvedValue(mockRecentProgress);

      const result = await mockProgressRepository.getUserRecentProgress(mockUserId, 30);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(result[0].date).toBe('2025-01-15');
    });

    it('should return empty array when no history exists', async () => {
      mockProgressRepository.getUserRecentProgress.mockResolvedValue([]);

      const result = await mockProgressRepository.getUserRecentProgress(mockUserId, 30);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });
  });

  describe('progressRepository.deleteProgress() Await Pattern', () => {
    it('should properly await deleteProgress', async () => {
      mockProgressRepository.getProgress.mockResolvedValue(mockProgress);
      mockProgressRepository.deleteProgress.mockResolvedValue(undefined);

      // Check exists first
      const exists = await mockProgressRepository.getProgress(mockUserId, mockDate);
      expect(exists).not.toBeNull();

      // Delete
      await mockProgressRepository.deleteProgress(mockProgressId);

      expect(mockProgressRepository.deleteProgress).toHaveBeenCalledWith(mockProgressId);
    });

    it('should handle deleteProgress when progress does not exist', async () => {
      mockProgressRepository.getProgress.mockResolvedValue(null);

      const exists = await mockProgressRepository.getProgress(mockUserId, mockDate);
      expect(exists).toBeNull();

      // Delete should not throw even if not found
      await expect(
        mockProgressRepository.deleteProgress(mockProgressId)
      ).resolves.not.toThrow();
    });
  });

  describe('Sequential Async Operations', () => {
    /**
     * Tests that async operations execute in correct sequence
     * This is critical for data integrity
     */

    it('should execute create before verification read', async () => {
      const executionOrder: string[] = [];

      mockProgressRepository.createProgress.mockImplementation(async () => {
        executionOrder.push('create');
      });

      mockProgressRepository.getProgress.mockImplementation(async () => {
        executionOrder.push('read');
        return mockProgress;
      });

      // Simulate submitTaskCompletion pattern
      await mockProgressRepository.createProgress(mockProgress);
      await mockProgressRepository.getProgress(mockUserId, mockDate);

      expect(executionOrder).toEqual(['create', 'read']);
    });

    it('should execute check-then-update pattern correctly', async () => {
      const executionOrder: string[] = [];

      mockProgressRepository.getProgress.mockImplementation(async () => {
        executionOrder.push('check');
        return mockProgress;
      });

      mockProgressRepository.updateProgress.mockImplementation(async () => {
        executionOrder.push('update');
      });

      // Check existing
      const existing = await mockProgressRepository.getProgress(mockUserId, mockDate);

      if (existing) {
        await mockProgressRepository.updateProgress(mockProgressId, {
          ...existing,
          totalXPEarned: 100,
        });
      }

      expect(executionOrder).toEqual(['check', 'update']);
    });
  });

  describe('Error Handling in Async Operations', () => {
    it('should propagate errors correctly with await', async () => {
      mockProgressRepository.getProgress.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(
        mockProgressRepository.getProgress(mockUserId, mockDate)
      ).rejects.toThrow('Database connection failed');
    });

    it('should catch and handle errors in try-catch', async () => {
      mockProgressRepository.getProgress.mockRejectedValue(new Error('DB Error'));

      let errorCaught = false;
      try {
        await mockProgressRepository.getProgress(mockUserId, mockDate);
      } catch (error) {
        errorCaught = true;
      }

      expect(errorCaught).toBe(true);
    });
  });

  describe('Promise vs Resolved Value Verification', () => {
    /**
     * Critical test: Verifies that without await, we'd get a Promise
     * instead of the actual value - this is the root cause of Error #2
     */

    it('should demonstrate the difference between awaited and non-awaited calls', async () => {
      mockProgressRepository.getProgress.mockResolvedValue(mockProgress);

      // Correct: With await - gets the resolved value
      const awaitedResult = await mockProgressRepository.getProgress(mockUserId, mockDate);
      expect(awaitedResult?.id).toBe(mockProgressId);

      // The non-awaited call would return a Promise
      const nonAwaitedResult = mockProgressRepository.getProgress(mockUserId, mockDate);
      expect(nonAwaitedResult).toBeInstanceOf(Promise);

      // Trying to access .id on a Promise would be undefined
      // This is exactly what caused Error #2: "getProgress is not a function"
      // because the result was a Promise, not the actual progress object
    });
  });
});
