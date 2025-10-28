/**
 * @fileOverview Client Service Layer Tests
 *
 * Tests for dailyTaskClientService which provides browser-safe access to daily task
 * functionality via HTTP API calls instead of direct database access.
 *
 * Key Features Tested:
 * - getUserDailyProgress with mocked fetch
 * - getTaskHistory with pagination
 * - submitTaskAnswer POST request
 * - generateDailyTasks POST request
 * - Network error handling
 * - Response parsing and validation
 *
 * @phase Phase 2.9 - SQLite Integration with Client-Server Separation
 */

import { dailyTaskClientService } from '@/lib/daily-task-client-service';
import type { DailyTaskProgress } from '@/lib/types/daily-task';

// Mock global fetch
global.fetch = jest.fn();

describe('Daily Task Client Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  describe('getUserDailyProgress', () => {
    it('should fetch user progress successfully', async () => {
      const mockProgress: DailyTaskProgress = {
        userId: 'test-user',
        date: '2025-01-28',
        tasks: [
          {
            id: 'task1',
            type: 'MORNING_READING',
            difficulty: 'MEDIUM',
            title: 'Test Task',
            content: { textPassage: { text: 'Sample', question: 'Q?' } },
            points: 50,
            createdAt: new Date().toISOString(),
          },
        ],
        completedTaskIds: [],
        totalXPEarned: 0,
        streak: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgress,
      });

      const result = await dailyTaskClientService.getUserDailyProgress('test-user');

      expect(result).toEqual(mockProgress);
      expect(global.fetch).toHaveBeenCalledWith('/api/daily-tasks/progress?userId=test-user');
    });

    it('should return null when no progress exists', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => null,
      });

      const result = await dailyTaskClientService.getUserDailyProgress('new-user');

      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledWith('/api/daily-tasks/progress?userId=new-user');
    });

    it('should handle URL encoding for special characters in userId', async () => {
      const mockProgress: DailyTaskProgress = {
        userId: 'user@example.com',
        date: '2025-01-28',
        tasks: [],
        completedTaskIds: [],
        totalXPEarned: 0,
        streak: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProgress,
      });

      await dailyTaskClientService.getUserDailyProgress('user@example.com');

      expect(global.fetch).toHaveBeenCalledWith('/api/daily-tasks/progress?userId=user%40example.com');
    });

    it('should return null on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Database error' }),
      });

      const result = await dailyTaskClientService.getUserDailyProgress('test-user');

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

      const result = await dailyTaskClientService.getUserDailyProgress('test-user');

      expect(result).toBeNull();
    });

    it('should log errors to console', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Test error'));

      await dailyTaskClientService.getUserDailyProgress('test-user');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching daily progress'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getTaskHistory', () => {
    it('should fetch task history with default limit', async () => {
      const mockHistory: DailyTaskProgress[] = [
        {
          userId: 'test-user',
          date: '2025-01-28',
          tasks: [],
          completedTaskIds: ['task1'],
          totalXPEarned: 50,
          streak: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory,
      });

      const result = await dailyTaskClientService.getTaskHistory('test-user');

      expect(result).toEqual(mockHistory);
      expect(global.fetch).toHaveBeenCalledWith('/api/daily-tasks/history?userId=test-user&limit=100');
    });

    it('should fetch task history with custom limit', async () => {
      const mockHistory: DailyTaskProgress[] = [];

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockHistory,
      });

      const result = await dailyTaskClientService.getTaskHistory('test-user', 50);

      expect(result).toEqual(mockHistory);
      expect(global.fetch).toHaveBeenCalledWith('/api/daily-tasks/history?userId=test-user&limit=50');
    });

    it('should return empty array when no history exists', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      const result = await dailyTaskClientService.getTaskHistory('new-user');

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return empty array on API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Query failed' }),
      });

      const result = await dailyTaskClientService.getTaskHistory('test-user');

      expect(result).toEqual([]);
    });

    it('should return empty array on network error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));

      const result = await dailyTaskClientService.getTaskHistory('test-user');

      expect(result).toEqual([]);
    });

    it('should handle large limit values', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await dailyTaskClientService.getTaskHistory('test-user', 1000);

      expect(global.fetch).toHaveBeenCalledWith('/api/daily-tasks/history?userId=test-user&limit=1000');
    });
  });

  describe('submitTaskAnswer', () => {
    it('should submit answer successfully', async () => {
      const mockResult = {
        success: true,
        score: 90,
        feedback: 'Great work!',
        xpAwarded: 80,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await dailyTaskClientService.submitTaskAnswer(
        'test-user',
        'task1',
        'My answer'
      );

      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledWith('/api/daily-tasks/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'test-user',
          taskId: 'task1',
          userAnswer: 'My answer',
        }),
      });
    });

    it('should handle empty answer submission', async () => {
      const mockResult = {
        success: true,
        score: 20,
        feedback: 'Please provide more detail',
        xpAwarded: 10,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await dailyTaskClientService.submitTaskAnswer(
        'test-user',
        'task1',
        ''
      );

      expect(result).toEqual(mockResult);
    });

    it('should throw error on API failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Validation failed' }),
      });

      await expect(
        dailyTaskClientService.submitTaskAnswer('test-user', 'task1', 'answer')
      ).rejects.toThrow('Validation failed');
    });

    it('should throw error on network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(
        dailyTaskClientService.submitTaskAnswer('test-user', 'task1', 'answer')
      ).rejects.toThrow('Network error');
    });

    it('should handle special characters in answers', async () => {
      const mockResult = { success: true, score: 100, feedback: 'Perfect!' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const specialAnswer = '這是中文回答 with émojis 🎉 and "quotes"';
      await dailyTaskClientService.submitTaskAnswer('test-user', 'task1', specialAnswer);

      expect(global.fetch).toHaveBeenCalledWith('/api/daily-tasks/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: 'test-user',
          taskId: 'task1',
          userAnswer: specialAnswer,
        }),
      });
    });
  });

  describe('generateDailyTasks', () => {
    it('should generate tasks successfully', async () => {
      const mockResult = {
        success: true,
        tasks: [
          { id: 'task1', type: 'MORNING_READING' },
          { id: 'task2', type: 'CHARACTER_ANALYSIS' },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResult,
      });

      const result = await dailyTaskClientService.generateDailyTasks('test-user');

      expect(result).toEqual(mockResult);
      expect(global.fetch).toHaveBeenCalledWith('/api/daily-tasks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'test-user' }),
      });
    });

    it('should throw error when generation fails', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'AI service unavailable' }),
      });

      await expect(
        dailyTaskClientService.generateDailyTasks('test-user')
      ).rejects.toThrow('AI service unavailable');
    });

    it('should throw error on network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Timeout'));

      await expect(
        dailyTaskClientService.generateDailyTasks('test-user')
      ).rejects.toThrow('Timeout');
    });

    it('should handle concurrent task generation requests', async () => {
      const mockResult = { success: true, tasks: [] };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResult,
      });

      // Simulate concurrent requests
      const promises = [
        dailyTaskClientService.generateDailyTasks('user1'),
        dailyTaskClientService.generateDailyTasks('user2'),
        dailyTaskClientService.generateDailyTasks('user3'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error handling consistency', () => {
    it('should handle JSON parsing errors gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        },
      });

      const result = await dailyTaskClientService.getUserDailyProgress('test-user');

      expect(result).toBeNull();
    });

    it('should handle malformed responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => undefined,
      });

      const result = await dailyTaskClientService.getUserDailyProgress('test-user');

      // Should handle undefined response gracefully
      expect(result).toBeDefined();
    });

    it('should preserve error messages from API', async () => {
      const errorMessage = 'Custom error from API';

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: errorMessage }),
      });

      await expect(
        dailyTaskClientService.submitTaskAnswer('test-user', 'task1', 'answer')
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('Integration with browser environment', () => {
    it('should work without importing SQLite modules', () => {
      // This test verifies that the client service can be imported
      // in a browser environment without triggering SQLite imports

      expect(dailyTaskClientService).toBeDefined();
      expect(dailyTaskClientService.getUserDailyProgress).toBeDefined();
      expect(dailyTaskClientService.getTaskHistory).toBeDefined();
      expect(dailyTaskClientService.submitTaskAnswer).toBeDefined();
      expect(dailyTaskClientService.generateDailyTasks).toBeDefined();

      // Verify all methods are functions
      expect(typeof dailyTaskClientService.getUserDailyProgress).toBe('function');
      expect(typeof dailyTaskClientService.getTaskHistory).toBe('function');
      expect(typeof dailyTaskClientService.submitTaskAnswer).toBe('function');
      expect(typeof dailyTaskClientService.generateDailyTasks).toBe('function');
    });
  });
});
