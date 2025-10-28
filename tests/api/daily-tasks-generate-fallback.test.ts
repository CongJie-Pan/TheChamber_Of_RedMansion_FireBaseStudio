/**
 * @fileOverview Daily Tasks Generate API Fallback Tests
 *
 * Tests the multi-layered fallback strategy in the /api/daily-tasks/generate endpoint
 * to ensure tasks are always generated even when primary storage backends fail.
 *
 * Fallback Hierarchy:
 * 1. Client SDK (dailyTaskService with SQLite/Firebase)
 * 2. Admin SDK (Firebase Admin)
 * 3. Ephemeral tasks (no persistence)
 * 4. Error response
 *
 * Key Features Tested:
 * - Successful task generation via client SDK
 * - Admin SDK fallback on permission errors
 * - Ephemeral fallback on complete failure
 * - LLM-only mode (always ephemeral)
 * - Error handling and logging
 * - Request validation
 *
 * Prevents Regression:
 * - API crashes when dailyTaskService fails
 * - No tasks returned when SQLite unavailable
 * - Poor error messages for failures
 * - Missing fallback layers
 *
 * @phase Phase 2.9 - Daily Task System Testing
 */

import { POST, GET } from '@/app/api/daily-tasks/generate/route';
import { NextRequest, NextResponse } from 'next/server';
import type { DailyTask } from '@/lib/types/daily-task';

// Mock services
const mockGenerateDailyTasks = jest.fn();
const mockGenerateTasksForUser = jest.fn();
const mockVerifyAuthHeader = jest.fn();

jest.mock('@/lib/daily-task-service', () => ({
  dailyTaskService: {
    generateDailyTasks: () => mockGenerateDailyTasks(),
  },
}));

jest.mock('@/lib/task-generator', () => ({
  taskGenerator: {
    generateTasksForUser: (...args: any[]) => mockGenerateTasksForUser(...args),
  },
}));

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({
          exists: true,
          data: () => ({ currentLevel: 2 }),
        })),
        set: jest.fn(() => Promise.resolve()),
      })),
    })),
  },
  verifyAuthHeader: (...args: any[]) => mockVerifyAuthHeader(...args),
  admin: {
    firestore: {
      FieldValue: {
        serverTimestamp: jest.fn(() => new Date()),
      },
      Timestamp: {
        now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
      },
    },
  },
}));

jest.mock('@/lib/env', () => ({
  isLlmOnlyMode: jest.fn(() => false),
}));

describe('Daily Tasks Generate API Fallback', () => {
  const mockTasks: DailyTask[] = [
    {
      id: 'task-1',
      type: 'MORNING_READING',
      difficulty: 'MEDIUM',
      title: 'Test Task',
      description: 'Test Description',
      baseXP: 10,
      content: { textPassage: { text: 'Sample', question: 'Q?' } },
      sourceId: 'chapter-1',
      attributeRewards: { culturalKnowledge: 1 },
      timeEstimate: 5,
      gradingCriteria: { minLength: 30 },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Suppress console output
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});

    // Default mock implementations
    mockGenerateDailyTasks.mockResolvedValue(mockTasks);
    mockGenerateTasksForUser.mockResolvedValue(mockTasks);
    mockVerifyAuthHeader.mockResolvedValue('verified-user-id');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Primary Path - Client SDK Success', () => {
    test('should generate tasks via client SDK successfully', async () => {
      // Arrange
      const request = new NextRequest('http://localhost/api/daily-tasks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token',
        },
        body: JSON.stringify({ userId: 'test-user' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tasks).toEqual(mockTasks);
      expect(data.ephemeral).toBe(false);
      expect(mockGenerateDailyTasks).toHaveBeenCalled();
    });

    test('should use verified user ID from auth header', async () => {
      // Arrange
      mockVerifyAuthHeader.mockResolvedValue('verified-uid');

      const request = new NextRequest('http://localhost/api/daily-tasks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer valid-token',
        },
        body: JSON.stringify({ userId: 'client-user' }),
      });

      // Act
      await POST(request);

      // Assert
      expect(mockVerifyAuthHeader).toHaveBeenCalled();
      expect(mockGenerateDailyTasks).toHaveBeenCalledWith('verified-uid', undefined);
    });
  });

  describe('Admin SDK Fallback', () => {
    test('should fallback to Admin SDK on permission-denied error', async () => {
      // Arrange: Client SDK fails with permission-denied
      const permissionError: any = new Error('permission-denied');
      permissionError.code = 'permission-denied';
      mockGenerateDailyTasks.mockRejectedValue(permissionError);

      const request = new NextRequest('http://localhost/api/daily-tasks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token',
        },
        body: JSON.stringify({ userId: 'test-user' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.tasks).toEqual(mockTasks);
      expect(mockGenerateTasksForUser).toHaveBeenCalled();
    });

    test('should fallback to Admin SDK on insufficient permissions error', async () => {
      // Arrange
      const permissionError = new Error('insufficient permissions');
      mockGenerateDailyTasks.mockRejectedValue(permissionError);

      const request = new NextRequest('http://localhost/api/daily-tasks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token',
        },
        body: JSON.stringify({ userId: 'test-user' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockGenerateTasksForUser).toHaveBeenCalled();
    });
  });

  describe('Ephemeral Fallback', () => {
    test('should return ephemeral tasks when client SDK fails', async () => {
      // Arrange: Client SDK fails with non-permission error
      mockGenerateDailyTasks.mockRejectedValue(new Error('Database connection failed'));
      mockVerifyAuthHeader.mockResolvedValue(null); // No verified user

      const request = new NextRequest('http://localhost/api/daily-tasks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'test-user' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.ephemeral).toBe(true);
      expect(mockGenerateTasksForUser).toHaveBeenCalled();
    });

    test('should fallback to ephemeral when Admin SDK fails', async () => {
      // Arrange: Both Client SDK and Admin SDK fail
      const permissionError: any = new Error('permission-denied');
      permissionError.code = 'permission-denied';
      mockGenerateDailyTasks.mockRejectedValue(permissionError);

      // Mock admin collection to fail
      const { adminDb } = require('@/lib/firebase-admin');
      adminDb.collection = jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(() => Promise.reject(new Error('Admin DB error'))),
          set: jest.fn(() => Promise.reject(new Error('Admin DB error'))),
        })),
      }));

      const request = new NextRequest('http://localhost/api/daily-tasks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock-token',
        },
        body: JSON.stringify({ userId: 'test-user' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.ephemeral).toBe(true);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('falling back to ephemeral'),
        expect.any(Error)
      );
    });
  });

  describe('LLM-Only Mode', () => {
    test('should always return ephemeral tasks in LLM-only mode', async () => {
      // Arrange: Enable LLM-only mode
      const { isLlmOnlyMode } = require('@/lib/env');
      isLlmOnlyMode.mockReturnValue(true);

      const request = new NextRequest('http://localhost/api/daily-tasks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'test-user', userLevel: 3 }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.ephemeral).toBe(true);
      expect(mockGenerateDailyTasks).not.toHaveBeenCalled(); // Should skip service
      expect(mockGenerateTasksForUser).toHaveBeenCalledWith(
        expect.any(String),
        3, // userLevel
        expect.any(String) // date
      );
    });
  });

  describe('Request Validation', () => {
    test('should reject non-JSON requests', async () => {
      // Arrange
      const request = new NextRequest('http://localhost/api/daily-tasks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: 'not json',
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(415);
      expect(data.error).toContain('Invalid content type');
    });

    test('should reject requests without userId in non-LLM mode', async () => {
      // Arrange: No userId and no verified token
      mockVerifyAuthHeader.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/daily-tasks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toContain('Missing or invalid userId');
    });
  });

  describe('Error Handling', () => {
    test('should return 500 when all fallbacks fail', async () => {
      // Arrange: All generation paths fail
      mockGenerateDailyTasks.mockRejectedValue(new Error('Service failed'));
      mockGenerateTasksForUser.mockRejectedValue(new Error('Generator failed'));
      mockVerifyAuthHeader.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/daily-tasks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'test-user' }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    test('should log errors appropriately', async () => {
      // Arrange
      const testError = new Error('Test error');
      mockGenerateDailyTasks.mockRejectedValue(testError);
      mockVerifyAuthHeader.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/daily-tasks/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 'test-user' }),
      });

      // Act
      await POST(request);

      // Assert
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('falling back to ephemeral'),
        testError
      );
    });
  });

  describe('GET Endpoint', () => {
    test('should return API documentation', async () => {
      // Act
      const response = await GET();
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data.name).toBe('Generate Daily Tasks API');
      expect(data.method).toBe('POST');
      expect(data.endpoint).toBe('/api/daily-tasks/generate');
    });
  });
});
