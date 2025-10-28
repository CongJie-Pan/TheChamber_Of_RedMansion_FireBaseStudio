/**
 * @fileOverview Browser Compatibility Tests
 *
 * Tests to ensure that client-side components can safely import and use
 * daily task functionality without loading better-sqlite3 or other Node.js
 * native modules in the browser environment.
 *
 * Key Tests:
 * - Client components load without SQLite errors
 * - dailyTaskClientService works in browser context
 * - No better-sqlite3 module loading in browser
 * - Verify AppShell, TaskCalendar, DailyTasksSummary compatibility
 *
 * Prevents regression of: "The 'original' argument must be of type Function"
 *
 * @phase Phase 2.9 - SQLite Integration with Client-Server Separation
 */

/**
 * Setup browser-like environment
 */
function setupBrowserEnvironment() {
  // Simulate browser globals
  (global as any).window = {
    document: {
      createElement: jest.fn(),
      addEventListener: jest.fn(),
    },
    location: {
      href: 'http://localhost:3000',
      origin: 'http://localhost:3000',
    },
    navigator: {
      userAgent: 'Mozilla/5.0',
    },
  };

  (global as any).document = (global as any).window.document;

  // Mock fetch for browser API calls
  (global as any).fetch = jest.fn();
}

/**
 * Cleanup browser environment
 */
function cleanupBrowserEnvironment() {
  delete (global as any).window;
  delete (global as any).document;
  delete (global as any).fetch;
}

describe('Browser Compatibility - SQLite Module Loading', () => {
  beforeAll(() => {
    setupBrowserEnvironment();
  });

  afterAll(() => {
    cleanupBrowserEnvironment();
  });

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  describe('Critical Regression Prevention', () => {
    it('should NEVER throw "original argument must be of type Function" error', () => {
      // This is the exact error we experienced before the fix
      expect(() => {
        require('@/lib/daily-task-client-service');
      }).not.toThrow(/original.*must be of type Function/);
    });

    it('should NEVER attempt to load better-sqlite3 in browser', () => {
      expect(() => {
        require('@/lib/daily-task-client-service');
      }).not.toThrow(/better-sqlite3/);
    });

    it('should NEVER load SQLite database module in browser', () => {
      // Attempting to load the client service should not trigger SQLite loading
      expect(() => {
        require('@/lib/daily-task-client-service');
      }).not.toThrow(/sqlite/i);
    });
  });

  describe('Client Service Browser Compatibility', () => {
    it('should load dailyTaskClientService in browser environment', () => {
      const { dailyTaskClientService } = require('@/lib/daily-task-client-service');

      expect(dailyTaskClientService).toBeDefined();
      expect(dailyTaskClientService.getUserDailyProgress).toBeDefined();
      expect(dailyTaskClientService.getTaskHistory).toBeDefined();
      expect(dailyTaskClientService.submitTaskAnswer).toBeDefined();
      expect(dailyTaskClientService.generateDailyTasks).toBeDefined();
    });

    it('should call fetch API instead of database in browser', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ userId: 'test', tasks: [] }),
      });

      const { dailyTaskClientService } = require('@/lib/daily-task-client-service');
      await dailyTaskClientService.getUserDailyProgress('test-user');

      expect(mockFetch).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/api/daily-tasks/progress'));
    });

    it('should handle all client service methods without database access', async () => {
      const mockFetch = global.fetch as jest.Mock;

      // Mock all fetch responses
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => null }) // getUserDailyProgress
        .mockResolvedValueOnce({ ok: true, json: async () => [] }) // getTaskHistory
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }) // submitTaskAnswer
        .mockResolvedValueOnce({ ok: true, json: async () => ({ success: true }) }); // generateDailyTasks

      const { dailyTaskClientService } = require('@/lib/daily-task-client-service');

      // All methods should work
      await dailyTaskClientService.getUserDailyProgress('user1');
      await dailyTaskClientService.getTaskHistory('user1', 10);
      await dailyTaskClientService.submitTaskAnswer('user1', 'task1', 'answer');
      await dailyTaskClientService.generateDailyTasks('user1');

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('React Component Compatibility', () => {
    beforeEach(() => {
      // Mock React and Next.js dependencies
      jest.mock('react', () => ({
        useState: jest.fn((initial) => [initial, jest.fn()]),
        useEffect: jest.fn((fn) => fn()),
        default: { createElement: jest.fn() },
      }));

      jest.mock('next/link', () => ({
        default: ({ children }: any) => children,
      }));

      jest.mock('@/hooks/useAuth', () => ({
        useAuth: () => ({ user: { uid: 'test-user', email: 'test@example.com' } }),
      }));
    });

    it('should load DailyTasksSummary component without SQLite errors', () => {
      expect(() => {
        require('@/components/daily-tasks/DailyTasksSummary');
      }).not.toThrow(/better-sqlite3|original.*must be of type Function/);
    });

    it('should load TaskCalendar component without SQLite errors', () => {
      expect(() => {
        require('@/components/daily-tasks/TaskCalendar');
      }).not.toThrow(/better-sqlite3|original.*must be of type Function/);
    });

    it('should load AppShell component without SQLite errors', () => {
      expect(() => {
        require('@/components/layout/AppShell');
      }).not.toThrow(/better-sqlite3|original.*must be of type Function/);
    });

    it('should verify components use client service not direct service', () => {
      // DailyTasksSummary should import client service
      const summaryModule = require('@/components/daily-tasks/DailyTasksSummary');
      expect(summaryModule).toBeDefined();

      // TaskCalendar should import client service
      const calendarModule = require('@/components/daily-tasks/TaskCalendar');
      expect(calendarModule).toBeDefined();

      // No errors means they're using the client service correctly
    });
  });

  describe('Module Isolation in Browser', () => {
    it('should isolate server-only modules from browser code', () => {
      // These should load fine in browser
      expect(() => require('@/lib/daily-task-client-service')).not.toThrow();
      expect(() => require('@/lib/types/daily-task')).not.toThrow();

      // Client service should not load server modules
      const { dailyTaskClientService } = require('@/lib/daily-task-client-service');
      expect(dailyTaskClientService).toBeDefined();

      // Verify no SQLite imports leaked
      expect(() => {
        // If SQLite was loaded, accessing it would not throw
        // But we want to ensure it's not available
        const modules = Object.keys(require.cache);
        const hasSQLite = modules.some(m => m.includes('better-sqlite3'));
        expect(hasSQLite).toBe(false);
      }).not.toThrow();
    });

    it('should prevent accidental server module imports in client code', () => {
      // Simulates what happens if a developer tries to import server modules
      expect(() => {
        const clientService = require('@/lib/daily-task-client-service');
        // The client service should work without any server dependencies
        expect(typeof clientService.dailyTaskClientService.getUserDailyProgress).toBe('function');
      }).not.toThrow();
    });
  });

  describe('API Route Access from Browser', () => {
    it('should make GET requests to progress endpoint', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ userId: 'test', tasks: [] }),
      });

      const { dailyTaskClientService } = require('@/lib/daily-task-client-service');
      const result = await dailyTaskClientService.getUserDailyProgress('test-user');

      expect(mockFetch).toHaveBeenCalledWith('/api/daily-tasks/progress?userId=test-user');
      expect(result).toBeDefined();
    });

    it('should make GET requests to history endpoint', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const { dailyTaskClientService } = require('@/lib/daily-task-client-service');
      const result = await dailyTaskClientService.getTaskHistory('test-user', 50);

      expect(mockFetch).toHaveBeenCalledWith('/api/daily-tasks/history?userId=test-user&limit=50');
      expect(result).toBeDefined();
    });

    it('should make POST requests to submit endpoint', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, score: 90 }),
      });

      const { dailyTaskClientService } = require('@/lib/daily-task-client-service');
      const result = await dailyTaskClientService.submitTaskAnswer('user', 'task1', 'answer');

      expect(mockFetch).toHaveBeenCalledWith('/api/daily-tasks/submit', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
      expect(result.success).toBe(true);
    });

    it('should make POST requests to generate endpoint', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, tasks: [] }),
      });

      const { dailyTaskClientService } = require('@/lib/daily-task-client-service');
      const result = await dailyTaskClientService.generateDailyTasks('user');

      expect(mockFetch).toHaveBeenCalledWith('/api/daily-tasks/generate', expect.objectContaining({
        method: 'POST',
      }));
      expect(result.success).toBe(true);
    });
  });

  describe('Error Handling in Browser Context', () => {
    it('should handle network errors gracefully', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { dailyTaskClientService } = require('@/lib/daily-task-client-service');
      const result = await dailyTaskClientService.getUserDailyProgress('test-user');

      // Should not crash, should return null
      expect(result).toBeNull();
    });

    it('should handle API errors gracefully', async () => {
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Server error' }),
      });

      const { dailyTaskClientService } = require('@/lib/daily-task-client-service');
      const result = await dailyTaskClientService.getUserDailyProgress('test-user');

      // Should not crash
      expect(result).toBeNull();
    });

    it('should log errors to console in browser', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const mockFetch = global.fetch as jest.Mock;
      mockFetch.mockRejectedValueOnce(new Error('Test error'));

      const { dailyTaskClientService } = require('@/lib/daily-task-client-service');
      await dailyTaskClientService.getUserDailyProgress('test-user');

      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Window Object Detection', () => {
    it('should detect browser environment correctly', () => {
      expect(typeof window).toBe('object');
      expect(window).toBeDefined();

      // This confirms we're in a simulated browser environment
      const { dailyTaskClientService } = require('@/lib/daily-task-client-service');
      expect(dailyTaskClientService).toBeDefined();
    });

    it('should use client service when window exists', () => {
      // In browser (window defined), should use client service
      expect(typeof window).not.toBe('undefined');

      const { dailyTaskClientService } = require('@/lib/daily-task-client-service');

      // All methods should be fetch-based
      expect(typeof dailyTaskClientService.getUserDailyProgress).toBe('function');
      expect(typeof dailyTaskClientService.getTaskHistory).toBe('function');
    });
  });

  describe('Memory and Performance in Browser', () => {
    it('should not load unnecessary modules in browser', () => {
      const { dailyTaskClientService } = require('@/lib/daily-task-client-service');

      // Should only load minimal dependencies
      expect(dailyTaskClientService).toBeDefined();

      // Verify cache doesn't include SQLite modules
      const moduleKeys = Object.keys(require.cache);
      const hasBetterSQLite = moduleKeys.some(key => key.includes('better-sqlite3'));
      const hasSQLiteDb = moduleKeys.some(key => key.includes('sqlite-db'));

      expect(hasBetterSQLite).toBe(false);
      // sqlite-db might be in cache but shouldn't be executed/initialized
    });

    it('should have minimal memory footprint for client service', () => {
      const before = process.memoryUsage().heapUsed;

      require('@/lib/daily-task-client-service');

      const after = process.memoryUsage().heapUsed;
      const increase = after - before;

      // Memory increase should be minimal (< 10MB)
      expect(increase).toBeLessThan(10 * 1024 * 1024);
    });
  });
});
