/**
 * @jest-environment node
 *
 * @fileOverview Tests for Daily Tasks Fetch by IDs API Route
 *
 * Verifies server-side GET endpoint:
 * - GET /api/daily-tasks/tasks?taskIds=id1,id2,id3
 *
 * This endpoint was created in Phase 2-T1 to prevent task regeneration.
 * It allows fetching existing tasks by their IDs without triggering generation.
 *
 * @phase Phase 2-T1 - Task Generation Cache Control
 * @created 2025-10-31
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
import type { DailyTask } from '@/lib/types/daily-task';

let TasksGET: any;

// Utility to read JSON from NextResponse
async function readJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

describe('Daily Tasks API - Fetch by IDs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  beforeAll(() => {
    // Import route handler after mocking next/server
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const tasksRoute = require('@/app/api/daily-tasks/tasks/route');
    TasksGET = tasksRoute.GET;
  });

  describe('GET /api/daily-tasks/tasks - Query Parameter Validation', () => {
    it('should return 400 when taskIds parameter is missing', async () => {
      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/tasks');

      const res = await TasksGET(req);
      expect(res.status).toBe(400);
      const body = await readJson(res);
      expect(body.error).toMatch(/taskIds parameter is required/i);
    });

    it('should return 400 when taskIds parameter is empty string', async () => {
      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/tasks?taskIds=');

      const res = await TasksGET(req);
      expect(res.status).toBe(400);
      const body = await readJson(res);
      // Empty string is falsy, so it triggers the first validation check
      expect(body.error).toMatch(/taskIds parameter is required/i);
    });

    it('should return 400 when taskIds contains only whitespace', async () => {
      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/tasks?taskIds=   ,  , ');

      const res = await TasksGET(req);
      expect(res.status).toBe(400);
      const body = await readJson(res);
      expect(body.error).toMatch(/At least one valid task ID is required/i);
    });
  });

  describe('GET /api/daily-tasks/tasks - Single Task Fetch', () => {
    it('should fetch single task successfully', async () => {
      const mockTask: DailyTask = {
        id: 'task-123',
        taskType: 'quiz',
        difficulty: 'medium',
        title: 'Test Quiz',
        description: 'Test description',
        baseXP: 50,
        content: 'Test content',
        createdAt: new Date('2025-10-31'),
      };

      const spy = jest.spyOn(dailyTaskService, 'getTaskById')
        .mockResolvedValue(mockTask);

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/tasks?taskIds=task-123');

      const res = await TasksGET(req);
      expect(res.status).toBe(200);
      const body = await readJson(res);

      expect(body.success).toBe(true);
      expect(body.tasks).toHaveLength(1);
      // Verify task fields (dates get serialized to ISO strings in JSON)
      expect(body.tasks[0].id).toBe('task-123');
      expect(body.tasks[0].taskType).toBe('quiz');
      expect(body.tasks[0].difficulty).toBe('medium');
      expect(body.tasks[0].title).toBe('Test Quiz');
      expect(body.tasks[0].baseXP).toBe(50);
      expect(body.tasks[0].createdAt).toBe('2025-10-31T00:00:00.000Z');
      expect(body.requestedCount).toBe(1);
      expect(body.returnedCount).toBe(1);
      expect(spy).toHaveBeenCalledWith('task-123');
    });

    it('should return 404 when single task does not exist', async () => {
      const spy = jest.spyOn(dailyTaskService, 'getTaskById')
        .mockResolvedValue(null);

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/tasks?taskIds=nonexistent-task');

      const res = await TasksGET(req);
      expect(res.status).toBe(404);
      const body = await readJson(res);

      expect(body.error).toMatch(/No tasks found with the provided IDs/i);
      expect(spy).toHaveBeenCalledWith('nonexistent-task');
    });
  });

  describe('GET /api/daily-tasks/tasks - Multiple Tasks Fetch', () => {
    it('should fetch multiple tasks successfully', async () => {
      const mockTasks: DailyTask[] = [
        {
          id: 'task-1',
          taskType: 'quiz',
          difficulty: 'easy',
          title: 'Quiz 1',
          baseXP: 30,
          content: 'Content 1',
          createdAt: new Date('2025-10-31'),
        },
        {
          id: 'task-2',
          taskType: 'reading_comprehension',
          difficulty: 'hard',
          title: 'Reading 2',
          baseXP: 100,
          content: 'Content 2',
          createdAt: new Date('2025-10-31'),
        },
        {
          id: 'task-3',
          taskType: 'poetry',
          difficulty: 'medium',
          title: 'Poetry 3',
          baseXP: 50,
          content: 'Content 3',
          createdAt: new Date('2025-10-31'),
        },
      ];

      const spy = jest.spyOn(dailyTaskService, 'getTaskById')
        .mockImplementation(async (id: string) => {
          return mockTasks.find(t => t.id === id) || null;
        });

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/tasks?taskIds=task-1,task-2,task-3');

      const res = await TasksGET(req);
      expect(res.status).toBe(200);
      const body = await readJson(res);

      expect(body.success).toBe(true);
      expect(body.tasks).toHaveLength(3);
      expect(body.requestedCount).toBe(3);
      expect(body.returnedCount).toBe(3);
      expect(spy).toHaveBeenCalledTimes(3);
      expect(spy).toHaveBeenCalledWith('task-1');
      expect(spy).toHaveBeenCalledWith('task-2');
      expect(spy).toHaveBeenCalledWith('task-3');
    });

    it('should handle whitespace in comma-separated task IDs', async () => {
      const mockTask: DailyTask = {
        id: 'task-1',
        taskType: 'quiz',
        difficulty: 'easy',
        title: 'Test',
        baseXP: 30,
        content: 'Content',
        createdAt: new Date(),
      };

      const spy = jest.spyOn(dailyTaskService, 'getTaskById')
        .mockResolvedValue(mockTask);

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/tasks?taskIds=task-1 , task-2  ,task-3');

      const res = await TasksGET(req);
      expect(res.status).toBe(200);

      // Verify IDs were trimmed properly
      expect(spy).toHaveBeenCalledWith('task-1');
      expect(spy).toHaveBeenCalledWith('task-2');
      expect(spy).toHaveBeenCalledWith('task-3');
    });
  });

  describe('GET /api/daily-tasks/tasks - Partial Success Scenarios', () => {
    it('should return found tasks when some tasks do not exist', async () => {
      const mockTask1: DailyTask = {
        id: 'task-1',
        taskType: 'quiz',
        difficulty: 'easy',
        title: 'Quiz 1',
        baseXP: 30,
        content: 'Content',
        createdAt: new Date(),
      };

      const spy = jest.spyOn(dailyTaskService, 'getTaskById')
        .mockImplementation(async (id: string) => {
          if (id === 'task-1') return mockTask1;
          if (id === 'task-999') return null; // Not found
          return null;
        });

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/tasks?taskIds=task-1,task-999');

      const res = await TasksGET(req);
      expect(res.status).toBe(200);
      const body = await readJson(res);

      expect(body.success).toBe(true);
      expect(body.tasks).toHaveLength(1);
      expect(body.tasks[0].id).toBe('task-1');
      expect(body.requestedCount).toBe(2);
      expect(body.returnedCount).toBe(1);
    });

    it('should filter out all null results and return 404 if all tasks missing', async () => {
      const spy = jest.spyOn(dailyTaskService, 'getTaskById')
        .mockResolvedValue(null);

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/tasks?taskIds=missing-1,missing-2,missing-3');

      const res = await TasksGET(req);
      expect(res.status).toBe(404);
      const body = await readJson(res);

      expect(body.error).toMatch(/No tasks found with the provided IDs/i);
      expect(spy).toHaveBeenCalledTimes(3);
    });
  });

  describe('GET /api/daily-tasks/tasks - Error Handling', () => {
    it('should return 500 when database error occurs', async () => {
      const spy = jest.spyOn(dailyTaskService, 'getTaskById')
        .mockRejectedValue(new Error('Database connection lost'));

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/tasks?taskIds=task-1');

      const res = await TasksGET(req);
      expect(res.status).toBe(500);
      const body = await readJson(res);

      expect(body.error).toBe('Failed to fetch tasks');
      expect(body.details).toMatch(/Database connection lost/);
    });

    it('should handle service throwing non-Error objects', async () => {
      const spy = jest.spyOn(dailyTaskService, 'getTaskById')
        .mockRejectedValue('String error');

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/tasks?taskIds=task-1');

      const res = await TasksGET(req);
      expect(res.status).toBe(500);
      const body = await readJson(res);

      expect(body.error).toBe('Failed to fetch tasks');
      expect(body.details).toBe('Unknown error');
    });
  });

  describe('GET /api/daily-tasks/tasks - Edge Cases', () => {
    it('should handle URL-encoded task IDs', async () => {
      const mockTask: DailyTask = {
        id: 'task@123',
        taskType: 'quiz',
        difficulty: 'easy',
        title: 'Test',
        baseXP: 30,
        content: 'Content',
        createdAt: new Date(),
      };

      const spy = jest.spyOn(dailyTaskService, 'getTaskById')
        .mockResolvedValue(mockTask);

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/tasks?taskIds=task%40123');

      const res = await TasksGET(req);
      expect(res.status).toBe(200);

      expect(spy).toHaveBeenCalledWith('task@123');
    });

    it('should handle duplicate task IDs in request', async () => {
      const mockTask: DailyTask = {
        id: 'task-1',
        taskType: 'quiz',
        difficulty: 'easy',
        title: 'Test',
        baseXP: 30,
        content: 'Content',
        createdAt: new Date(),
      };

      const spy = jest.spyOn(dailyTaskService, 'getTaskById')
        .mockResolvedValue(mockTask);

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/tasks?taskIds=task-1,task-1,task-1');

      const res = await TasksGET(req);
      expect(res.status).toBe(200);
      const body = await readJson(res);

      // Should call service 3 times (doesn't deduplicate)
      expect(spy).toHaveBeenCalledTimes(3);
      expect(body.tasks).toHaveLength(3);
    });

    it('should handle large number of task IDs', async () => {
      const mockTask: DailyTask = {
        id: 'task',
        taskType: 'quiz',
        difficulty: 'easy',
        title: 'Test',
        baseXP: 30,
        content: 'Content',
        createdAt: new Date(),
      };

      const spy = jest.spyOn(dailyTaskService, 'getTaskById')
        .mockResolvedValue(mockTask);

      // Generate 50 task IDs
      const taskIds = Array.from({ length: 50 }, (_, i) => `task-${i}`).join(',');

      const { NextRequest } = require('next/server');
      const req = new NextRequest(`http://localhost/api/daily-tasks/tasks?taskIds=${taskIds}`);

      const res = await TasksGET(req);
      expect(res.status).toBe(200);
      const body = await readJson(res);

      expect(body.tasks).toHaveLength(50);
      expect(spy).toHaveBeenCalledTimes(50);
    });
  });

  describe('GET /api/daily-tasks/tasks - Response Format Validation', () => {
    it('should return correct response structure with all fields', async () => {
      const mockTask: DailyTask = {
        id: 'task-1',
        taskType: 'quiz',
        difficulty: 'easy',
        title: 'Test',
        baseXP: 30,
        content: 'Content',
        createdAt: new Date(),
      };

      jest.spyOn(dailyTaskService, 'getTaskById')
        .mockResolvedValue(mockTask);

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/tasks?taskIds=task-1');

      const res = await TasksGET(req);
      const body = await readJson(res);

      // Verify response structure
      expect(body).toHaveProperty('success');
      expect(body).toHaveProperty('tasks');
      expect(body).toHaveProperty('requestedCount');
      expect(body).toHaveProperty('returnedCount');

      expect(typeof body.success).toBe('boolean');
      expect(Array.isArray(body.tasks)).toBe(true);
      expect(typeof body.requestedCount).toBe('number');
      expect(typeof body.returnedCount).toBe('number');
    });

    it('should preserve all task fields in response', async () => {
      const mockTask: DailyTask = {
        id: 'task-full',
        taskType: 'reading_comprehension',
        difficulty: 'hard',
        title: 'Full Task',
        description: 'Complete description',
        baseXP: 100,
        content: 'Full content',
        sourceChapter: 5,
        sourceVerseStart: 10,
        sourceVerseEnd: 15,
        createdAt: new Date('2025-10-31T12:00:00Z'),
      };

      jest.spyOn(dailyTaskService, 'getTaskById')
        .mockResolvedValue(mockTask);

      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/tasks?taskIds=task-full');

      const res = await TasksGET(req);
      const body = await readJson(res);

      const returnedTask = body.tasks[0];
      expect(returnedTask.id).toBe('task-full');
      expect(returnedTask.taskType).toBe('reading_comprehension');
      expect(returnedTask.difficulty).toBe('hard');
      expect(returnedTask.title).toBe('Full Task');
      expect(returnedTask.description).toBe('Complete description');
      expect(returnedTask.baseXP).toBe(100);
      expect(returnedTask.sourceChapter).toBe(5);
      expect(returnedTask.sourceVerseStart).toBe(10);
      expect(returnedTask.sourceVerseEnd).toBe(15);
    });
  });
});
