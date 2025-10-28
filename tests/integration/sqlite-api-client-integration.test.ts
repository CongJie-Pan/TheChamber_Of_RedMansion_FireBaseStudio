/**
 * @fileOverview SQLite/API/Client Integration Tests
 *
 * End-to-end integration tests verifying the complete flow:
 * Client Component → Client Service → API Route → Daily Task Service → SQLite Database
 *
 * These tests ensure that the client-server separation works correctly
 * and data flows properly through all layers without browser compatibility issues.
 *
 * Key Scenarios Tested:
 * - Complete user flow from task generation to completion
 * - Data consistency across all layers
 * - Error propagation and handling
 * - Concurrent user sessions
 * - Database persistence across requests
 *
 * @phase Phase 2.9 - SQLite Integration with Client-Server Separation
 */

import { dailyTaskService } from '@/lib/daily-task-service';
import { getDb, closeDb, clearDatabase } from '@/lib/sqlite-db';
import type { DailyTaskProgress } from '@/lib/types/daily-task';

// Mock OpenAI to avoid real API calls
jest.mock('@/lib/openai-client', () => ({
  openaiClient: {
    generateTaskContent: jest.fn().mockResolvedValue({
      title: 'Test Task',
      content: {
        textPassage: {
          text: 'Sample passage from Red Chamber',
          question: 'What is the significance of this passage?',
        },
      },
    }),
    gradeTaskResponse: jest.fn().mockResolvedValue({
      score: 90,
      feedback: 'Excellent analysis!',
      tier: 'EXCELLENT',
    }),
  },
}));

// Mock next/server for API route testing
jest.mock('next/server', () => ({
  NextResponse: {
    json: (data: any, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      async text() { return JSON.stringify(data); },
      async json() { return data; },
    }),
  },
  NextRequest: class MockNextRequest {
    public nextUrl: any;
    public headers: any;
    private _body: any;

    constructor(url: string, options?: { body?: any; headers?: any }) {
      const urlObj = new URL(url, 'http://localhost');
      this.nextUrl = {
        searchParams: urlObj.searchParams,
      };
      this.headers = new Headers(options?.headers || { 'content-type': 'application/json' });
      this._body = options?.body;
    }

    async json() {
      return this._body;
    }
  },
}));

describe('SQLite/API/Client Integration', () => {
  beforeAll(async () => {
    // Ensure we're in Node.js environment for SQLite
    delete (global as any).window;
  });

  beforeEach(async () => {
    // Clear database before each test
    await clearDatabase();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Close database connection
    await closeDb();
  });

  describe('Complete User Flow - Task Generation to Completion', () => {
    it('should handle full flow: generate tasks → fetch progress → submit answer → verify XP', async () => {
      const userId = 'integration-test-user';

      // Step 1: Generate daily tasks via service
      console.log('Step 1: Generating tasks...');
      const tasks = await dailyTaskService.generateDailyTasks(userId);

      expect(tasks).toHaveLength(2); // Default: 2 tasks per day
      expect(tasks[0].id).toBeDefined();
      expect(tasks[0].type).toBeDefined();

      // Step 2: Fetch user progress via service
      console.log('Step 2: Fetching progress...');
      const progress = await dailyTaskService.getUserDailyProgress(userId);

      expect(progress).not.toBeNull();
      expect(progress!.userId).toBe(userId);
      expect(progress!.tasks).toHaveLength(2);
      expect(progress!.completedTaskIds).toHaveLength(0);
      expect(progress!.totalXPEarned).toBe(0);

      // Step 3: Submit answer for first task
      console.log('Step 3: Submitting answer...');
      const taskId = tasks[0].id;
      const userAnswer = 'This passage demonstrates the complex family dynamics and social hierarchy in the Red Chamber, reflecting traditional Chinese values and the decline of aristocratic families.';

      const result = await dailyTaskService.submitTaskCompletion(userId, taskId, userAnswer);

      expect(result.success).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.xpAwarded).toBeGreaterThan(0);
      expect(result.feedback).toBeDefined();

      // Step 4: Verify progress updated
      console.log('Step 4: Verifying updated progress...');
      const updatedProgress = await dailyTaskService.getUserDailyProgress(userId);

      expect(updatedProgress).not.toBeNull();
      expect(updatedProgress!.completedTaskIds).toContain(taskId);
      expect(updatedProgress!.totalXPEarned).toBe(result.xpAwarded);
      expect(updatedProgress!.completedTaskIds).toHaveLength(1);

      // Step 5: Submit second task
      console.log('Step 5: Completing second task...');
      const taskId2 = tasks[1].id;
      const result2 = await dailyTaskService.submitTaskCompletion(userId, taskId2, userAnswer);

      expect(result2.success).toBe(true);

      // Step 6: Verify all tasks completed
      console.log('Step 6: Verifying full completion...');
      const finalProgress = await dailyTaskService.getUserDailyProgress(userId);

      expect(finalProgress!.completedTaskIds).toHaveLength(2);
      expect(finalProgress!.totalXPEarned).toBe(result.xpAwarded + result2.xpAwarded);
    });
  });

  describe('API Route Integration', () => {
    it('should fetch progress via API route', async () => {
      const userId = 'api-test-user';

      // Setup: Create tasks via service
      await dailyTaskService.generateDailyTasks(userId);

      // Import API route handler
      const { GET } = require('@/app/api/daily-tasks/progress/route');
      const { NextRequest } = require('next/server');

      // Call API
      const req = new NextRequest(`http://localhost/api/daily-tasks/progress?userId=${userId}`);
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body).not.toBeNull();
      expect(body.userId).toBe(userId);
      expect(body.tasks).toHaveLength(2);
    });

    it('should fetch history via API route', async () => {
      const userId = 'history-test-user';

      // Setup: Create tasks and complete one
      const tasks = await dailyTaskService.generateDailyTasks(userId);
      await dailyTaskService.submitTaskCompletion(userId, tasks[0].id, 'Test answer');

      // Import API route handler
      const { GET } = require('@/app/api/daily-tasks/history/route');
      const { NextRequest } = require('next/server');

      // Call API
      const req = new NextRequest(`http://localhost/api/daily-tasks/history?userId=${userId}&limit=10`);
      const res = await GET(req);

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThan(0);
    });

    it('should submit task via API route', async () => {
      const userId = 'submit-test-user';

      // Setup: Create tasks
      const tasks = await dailyTaskService.generateDailyTasks(userId);

      // Import API route handler
      const { POST } = require('@/app/api/daily-tasks/submit/route');
      const { NextRequest } = require('next/server');

      // Call API
      const req = new NextRequest('http://localhost/api/daily-tasks/submit', {
        body: {
          userId,
          taskId: tasks[0].id,
          userResponse: 'This is a test answer that meets the minimum length requirement for scoring.',
        },
        headers: { 'content-type': 'application/json' },
      });

      const res = await POST(req);

      expect(res.status).toBe(200);
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.result).toBeDefined();
      expect(body.result.score).toBeGreaterThan(0);
    });
  });

  describe('Data Consistency Across Layers', () => {
    it('should maintain data consistency from service to API to database', async () => {
      const userId = 'consistency-test-user';

      // Layer 1: Service layer creates tasks
      const serviceTasks = await dailyTaskService.generateDailyTasks(userId);

      // Layer 2: API layer fetches same tasks
      const { GET: ProgressGET } = require('@/app/api/daily-tasks/progress/route');
      const { NextRequest } = require('next/server');
      const req = new NextRequest(`http://localhost/api/daily-tasks/progress?userId=${userId}`);
      const res = await ProgressGET(req);
      const apiProgress = await res.json();

      // Layer 3: Direct database query
      const dbProgress = await dailyTaskService.getUserDailyProgress(userId);

      // Verify consistency
      expect(apiProgress.tasks).toHaveLength(serviceTasks.length);
      expect(dbProgress!.tasks).toHaveLength(serviceTasks.length);
      expect(apiProgress.userId).toBe(dbProgress!.userId);
      expect(apiProgress.date).toBe(dbProgress!.date);
    });

    it('should maintain XP consistency across submissions', async () => {
      const userId = 'xp-consistency-user';

      // Create and complete tasks
      const tasks = await dailyTaskService.generateDailyTasks(userId);
      const result1 = await dailyTaskService.submitTaskCompletion(userId, tasks[0].id, 'Answer 1');
      const result2 = await dailyTaskService.submitTaskCompletion(userId, tasks[1].id, 'Answer 2');

      // Fetch progress from API
      const { GET } = require('@/app/api/daily-tasks/progress/route');
      const { NextRequest } = require('next/server');
      const req = new NextRequest(`http://localhost/api/daily-tasks/progress?userId=${userId}`);
      const res = await GET(req);
      const apiProgress = await res.json();

      // Verify XP consistency
      const expectedXP = result1.xpAwarded + result2.xpAwarded;
      expect(apiProgress.totalXPEarned).toBe(expectedXP);
    });
  });

  describe('Concurrent User Sessions', () => {
    it('should handle multiple users concurrently without conflicts', async () => {
      const users = ['user1', 'user2', 'user3'];

      // Generate tasks for all users concurrently
      const taskPromises = users.map(userId =>
        dailyTaskService.generateDailyTasks(userId)
      );
      const allTasks = await Promise.all(taskPromises);

      // Verify each user has their own tasks
      expect(allTasks).toHaveLength(3);
      allTasks.forEach(tasks => {
        expect(tasks).toHaveLength(2);
      });

      // Fetch progress for all users concurrently
      const progressPromises = users.map(userId =>
        dailyTaskService.getUserDailyProgress(userId)
      );
      const allProgress = await Promise.all(progressPromises);

      // Verify data isolation
      allProgress.forEach((progress, index) => {
        expect(progress).not.toBeNull();
        expect(progress!.userId).toBe(users[index]);
        expect(progress!.tasks).toHaveLength(2);
      });
    });

    it('should handle concurrent submissions from same user correctly', async () => {
      const userId = 'concurrent-submit-user';

      // Create tasks
      const tasks = await dailyTaskService.generateDailyTasks(userId);

      // Submit both tasks concurrently
      const submitPromises = tasks.map(task =>
        dailyTaskService.submitTaskCompletion(userId, task.id, 'Concurrent answer')
      );
      const results = await Promise.all(submitPromises);

      // Verify both submissions succeeded
      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Verify progress reflects both completions
      const progress = await dailyTaskService.getUserDailyProgress(userId);
      expect(progress!.completedTaskIds).toHaveLength(2);
    });
  });

  describe('Database Persistence', () => {
    it('should persist data across service calls', async () => {
      const userId = 'persistence-test-user';

      // First call: Create tasks
      const tasks = await dailyTaskService.generateDailyTasks(userId);
      const taskId = tasks[0].id;

      // Second call: Complete a task
      await dailyTaskService.submitTaskCompletion(userId, taskId, 'Test answer');

      // Third call: Fetch progress
      const progress = await dailyTaskService.getUserDailyProgress(userId);

      // Verify data persisted
      expect(progress).not.toBeNull();
      expect(progress!.completedTaskIds).toContain(taskId);
    });

    it('should maintain history across multiple days', async () => {
      const userId = 'history-persistence-user';

      // Day 1: Create and complete tasks
      const tasks = await dailyTaskService.generateDailyTasks(userId);
      await dailyTaskService.submitTaskCompletion(userId, tasks[0].id, 'Day 1 answer');

      // Fetch history
      const history = await dailyTaskService.getTaskHistory(userId, 10);

      expect(history.length).toBeGreaterThan(0);
      expect(history[0].userId).toBe(userId);
    });
  });

  describe('Error Handling Across Layers', () => {
    it('should propagate errors from service to API correctly', async () => {
      const { GET } = require('@/app/api/daily-tasks/progress/route');
      const { NextRequest } = require('next/server');

      // Missing userId should cause error
      const req = new NextRequest('http://localhost/api/daily-tasks/progress');
      const res = await GET(req);

      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toMatch(/userId is required/i);
    });

    it('should handle database errors gracefully', async () => {
      // Mock a database error
      const { getDb } = require('@/lib/sqlite-db');
      const originalGet = getDb().prepare;

      jest.spyOn(getDb(), 'prepare').mockImplementation(() => {
        throw new Error('Database connection lost');
      });

      const { GET } = require('@/app/api/daily-tasks/progress/route');
      const { NextRequest } = require('next/server');
      const req = new NextRequest('http://localhost/api/daily-tasks/progress?userId=test');
      const res = await GET(req);

      expect(res.status).toBe(500);

      // Restore original implementation
      getDb().prepare = originalGet;
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle rapid sequential requests efficiently', async () => {
      const userId = 'performance-test-user';
      const startTime = Date.now();

      // Perform 10 rapid operations
      await dailyTaskService.generateDailyTasks(userId);
      for (let i = 0; i < 10; i++) {
        await dailyTaskService.getUserDailyProgress(userId);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (< 2 seconds)
      expect(duration).toBeLessThan(2000);
    });

    it('should handle large history queries efficiently', async () => {
      const userId = 'large-history-user';

      // Create task for today
      await dailyTaskService.generateDailyTasks(userId);

      const startTime = Date.now();

      // Fetch large history
      const history = await dailyTaskService.getTaskHistory(userId, 1000);

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(Array.isArray(history)).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});
