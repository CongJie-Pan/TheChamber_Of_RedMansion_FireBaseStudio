/**
 * @fileOverview Tests for Daily Tasks API Routes (Progress & History)
 *
 * Verifies server-side GET endpoints:
 * - GET /api/daily-tasks/progress
 * - GET /api/daily-tasks/history
 *
 * These endpoints were created to allow client-side components to access
 * daily task data without loading SQLite modules in the browser.
 *
 * @phase Phase 2.9 - SQLite Integration with Client-Server Separation
 */

// Mock next/server to avoid DOM Request dependency in test env
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      async text() { return JSON.stringify(data) },
      async json() { return data },
    }),
  },
  NextRequest: class MockNextRequest {
    public nextUrl: any;
    constructor(url: string) {
      const urlObj = new URL(url, 'http://localhost');
      this.nextUrl = {
        searchParams: urlObj.searchParams,
      };
    }
  },
}));

import { dailyTaskService } from '@/lib/daily-task-service';
import type { DailyTaskProgress } from '@/lib/types/daily-task';

let ProgressGET: any;
let HistoryGET: any;

// Utility to read JSON from NextResponse
async function readJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

describe('Daily Tasks API Routes - Progress & History', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    // Import route handlers after mocking next/server
     
    const progressRoute = require('@/app/api/daily-tasks/progress/route');
    ProgressGET = progressRoute.GET;

     
    const historyRoute = require('@/app/api/daily-tasks/history/route');
    HistoryGET = historyRoute.GET;
  });

  describe('GET /api/daily-tasks/progress', () => {
    it('should return 400 when userId is missing', async () => {
      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/progress');

      const res = await ProgressGET(req);
      expect(res.status).toBe(400);
      const body = await readJson(res);
      expect(body.error).toMatch(/userId is required/i);
    });

    it('should return user progress when userId is provided', async () => {
      const mockProgress: DailyTaskProgress = {
        userId: 'test-user',
        date: '2025-01-28',
        tasks: [
          {
            id: 'task1',
            type: 'MORNING_READING',
            difficulty: 'MEDIUM',
            title: 'Test Task',
            content: { textPassage: { text: 'Sample text', question: 'Q?' } },
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

      const spy = jest.spyOn(dailyTaskService, 'getUserDailyProgress')
        .mockResolvedValue(mockProgress);

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/progress?userId=test-user');

      const res = await ProgressGET(req);
      expect(res.status).toBe(200);
      const body = await readJson(res);

      expect(body).toEqual(mockProgress);
      expect(spy).toHaveBeenCalledWith('test-user');
    });

    it('should return null when no progress exists for user', async () => {
      const spy = jest.spyOn(dailyTaskService, 'getUserDailyProgress')
        .mockResolvedValue(null);

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/progress?userId=new-user');

      const res = await ProgressGET(req);
      expect(res.status).toBe(200);
      const body = await readJson(res);

      expect(body).toBeNull();
      expect(spy).toHaveBeenCalledWith('new-user');
    });

    it('should return 500 when database error occurs', async () => {
      const spy = jest.spyOn(dailyTaskService, 'getUserDailyProgress')
        .mockRejectedValue(new Error('Database connection failed'));

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/progress?userId=test-user');

      const res = await ProgressGET(req);
      expect(res.status).toBe(500);
      const body = await readJson(res);

      expect(body.error).toBe('Failed to fetch daily task progress');
      expect(body.details).toMatch(/Database connection failed/);
    });

    it('should handle URL encoding in userId parameter', async () => {
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

      const spy = jest.spyOn(dailyTaskService, 'getUserDailyProgress')
        .mockResolvedValue(mockProgress);

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/progress?userId=user%40example.com');

      const res = await ProgressGET(req);
      expect(res.status).toBe(200);

      expect(spy).toHaveBeenCalledWith('user@example.com');
    });
  });

  describe('GET /api/daily-tasks/history', () => {
    it('should return 400 when userId is missing', async () => {
      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/history');

      const res = await HistoryGET(req);
      expect(res.status).toBe(400);
      const body = await readJson(res);
      expect(body.error).toMatch(/userId is required/i);
    });

    it('should return task history with default limit', async () => {
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

      const spy = jest.spyOn(dailyTaskService, 'getTaskHistory')
        .mockResolvedValue(mockHistory);

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/history?userId=test-user');

      const res = await HistoryGET(req);
      expect(res.status).toBe(200);
      const body = await readJson(res);

      expect(body).toEqual(mockHistory);
      expect(spy).toHaveBeenCalledWith('test-user', 100); // Default limit
    });

    it('should respect custom limit parameter', async () => {
      const mockHistory: DailyTaskProgress[] = [];

      const spy = jest.spyOn(dailyTaskService, 'getTaskHistory')
        .mockResolvedValue(mockHistory);

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/history?userId=test-user&limit=50');

      const res = await HistoryGET(req);
      expect(res.status).toBe(200);

      expect(spy).toHaveBeenCalledWith('test-user', 50);
    });

    it('should validate limit parameter is a number', async () => {
      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/history?userId=test-user&limit=abc');

      const res = await HistoryGET(req);
      expect(res.status).toBe(400);
      const body = await readJson(res);
      expect(body.error).toMatch(/limit must be a number/i);
    });

    it('should validate limit is within valid range (1-1000)', async () => {
      const { NextRequest } = require('next/server');

      // Test limit = 0 (too low)
      let req = new NextRequest('http://localhost/api/daily-tasks/history?userId=test-user&limit=0');
      let res = await HistoryGET(req);
      expect(res.status).toBe(400);
      let body = await readJson(res);
      expect(body.error).toMatch(/limit must be a number between 1 and 1000/i);

      // Test limit = 1001 (too high)
      req = new NextRequest('http://localhost/api/daily-tasks/history?userId=test-user&limit=1001');
      res = await HistoryGET(req);
      expect(res.status).toBe(400);
      body = await readJson(res);
      expect(body.error).toMatch(/limit must be a number between 1 and 1000/i);
    });

    it('should return empty array when no history exists', async () => {
      const spy = jest.spyOn(dailyTaskService, 'getTaskHistory')
        .mockResolvedValue([]);

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/history?userId=new-user');

      const res = await HistoryGET(req);
      expect(res.status).toBe(200);
      const body = await readJson(res);

      expect(body).toEqual([]);
      expect(Array.isArray(body)).toBe(true);
    });

    it('should return 500 when database error occurs', async () => {
      const spy = jest.spyOn(dailyTaskService, 'getTaskHistory')
        .mockRejectedValue(new Error('Query execution failed'));

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/history?userId=test-user');

      const res = await HistoryGET(req);
      expect(res.status).toBe(500);
      const body = await readJson(res);

      expect(body.error).toBe('Failed to fetch task history');
      expect(body.details).toMatch(/Query execution failed/);
    });

    it('should handle large result sets efficiently', async () => {
      // Create 100 history entries
      const mockHistory: DailyTaskProgress[] = Array.from({ length: 100 }, (_, i) => ({
        userId: 'test-user',
        date: `2025-01-${String(i + 1).padStart(2, '0')}`,
        tasks: [],
        completedTaskIds: [],
        totalXPEarned: 0,
        streak: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const spy = jest.spyOn(dailyTaskService, 'getTaskHistory')
        .mockResolvedValue(mockHistory);

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/history?userId=test-user&limit=100');

      const res = await HistoryGET(req);
      expect(res.status).toBe(200);
      const body = await readJson(res);

      expect(body).toHaveLength(100);
      expect(spy).toHaveBeenCalledWith('test-user', 100);
    });
  });

  describe('Cross-endpoint consistency', () => {
    it('should handle same userId across progress and history endpoints', async () => {
      const mockProgress: DailyTaskProgress = {
        userId: 'test-user',
        date: '2025-01-28',
        tasks: [],
        completedTaskIds: [],
        totalXPEarned: 100,
        streak: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const mockHistory: DailyTaskProgress[] = [mockProgress];

      jest.spyOn(dailyTaskService, 'getUserDailyProgress')
        .mockResolvedValue(mockProgress);
      jest.spyOn(dailyTaskService, 'getTaskHistory')
        .mockResolvedValue(mockHistory);

      const { NextRequest } = require('next/server');

      // Get progress
      const progressReq = new NextRequest('http://localhost/api/daily-tasks/progress?userId=test-user');
      const progressRes = await ProgressGET(progressReq);
      const progressBody = await readJson(progressRes);

      // Get history
      const historyReq = new NextRequest('http://localhost/api/daily-tasks/history?userId=test-user');
      const historyRes = await HistoryGET(historyReq);
      const historyBody = await readJson(historyRes);

      // Verify consistency
      expect(progressBody.userId).toBe('test-user');
      expect(historyBody[0].userId).toBe('test-user');
      expect(progressBody.totalXPEarned).toBe(historyBody[0].totalXPEarned);
    });
  });
});
