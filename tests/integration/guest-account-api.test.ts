/**
 * Integration Tests - Guest Account API (Phase 4-T1)
 *
 * Tests guest account behavior in API routes.
 * Validates that guest users receive fixed tasks without generation.
 *
 * @jest-environment node
 */

import { POST as generateTasksPost } from '@/app/api/daily-tasks/generate/route';
import { seedGuestAccount } from '../../scripts/seed-guest-account';
import { getDatabase } from '@/lib/sqlite-db';
import {
  GUEST_USER_ID,
  GUEST_TASK_IDS,
} from '@/lib/constants/guest-account';
import { NextRequest } from 'next/server';

// Mock NextAuth session
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

describe('Guest Account API Integration', () => {
  let db: ReturnType<typeof getDatabase>;

  beforeAll(() => {
    db = getDatabase();
    // Ensure guest account is seeded
    seedGuestAccount(true);
  });

  afterAll(() => {
    // Clean up guest data
    try {
      db.prepare('DELETE FROM daily_progress WHERE userId = ?').run(GUEST_USER_ID);
      db.prepare('DELETE FROM daily_tasks WHERE id IN (?, ?)').run(
        GUEST_TASK_IDS.READING_COMPREHENSION,
        GUEST_TASK_IDS.CHARACTER_ANALYSIS
      );
      db.prepare('DELETE FROM users WHERE id = ?').run(GUEST_USER_ID);
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('POST /api/daily-tasks/generate', () => {
    it('should return fixed tasks for guest account', async () => {
      const { getServerSession } = require('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: GUEST_USER_ID },
      });

      const request = new NextRequest('http://localhost:3000/api/daily-tasks/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: GUEST_USER_ID }),
      });

      const response = await generateTasksPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.isGuest).toBe(true);
      expect(data.tasks).toBeDefined();
      expect(data.tasks.length).toBe(2);

      // Verify task IDs match fixed guest tasks
      const taskIds = data.tasks.map((t: any) => t.id);
      expect(taskIds).toContain(GUEST_TASK_IDS.READING_COMPREHENSION);
      expect(taskIds).toContain(GUEST_TASK_IDS.CHARACTER_ANALYSIS);
    });

    it('should return 404 if guest tasks not found', async () => {
      const { getServerSession } = require('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: GUEST_USER_ID },
      });

      // Temporarily delete guest tasks
      db.prepare('DELETE FROM daily_tasks WHERE id IN (?, ?)').run(
        GUEST_TASK_IDS.READING_COMPREHENSION,
        GUEST_TASK_IDS.CHARACTER_ANALYSIS
      );

      const request = new NextRequest('http://localhost:3000/api/daily-tasks/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: GUEST_USER_ID }),
      });

      const response = await generateTasksPost(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Guest account tasks not found');

      // Restore guest tasks
      seedGuestAccount(true);
    });

    it('should not trigger dynamic task generation for guest', async () => {
      const { getServerSession } = require('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: GUEST_USER_ID },
      });

      const request = new NextRequest('http://localhost:3000/api/daily-tasks/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: GUEST_USER_ID }),
      });

      const response = await generateTasksPost(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.isGuest).toBe(true);
      expect(data.ephemeral).not.toBe(true); // Fixed tasks, not ephemeral

      // Verify tasks have the exact fixed IDs (not randomly generated)
      const taskIds = data.tasks.map((t: any) => t.id);
      expect(taskIds.every((id: string) =>
        Object.values(GUEST_TASK_IDS).includes(id)
      )).toBe(true);
    });
  });

  describe('Guest account task content validation', () => {
    it('should return tasks with Chinese content', async () => {
      const { getServerSession } = require('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: GUEST_USER_ID },
      });

      const request = new NextRequest('http://localhost:3000/api/daily-tasks/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: GUEST_USER_ID }),
      });

      const response = await generateTasksPost(request);
      const data = await response.json();

      const readingTask = data.tasks.find(
        (t: any) => t.id === GUEST_TASK_IDS.READING_COMPREHENSION
      );

      expect(readingTask).toBeDefined();
      expect(readingTask.title).toContain('林黛玉進賈府');
      expect(readingTask.taskType).toBe('reading_comprehension');
      expect(readingTask.difficulty).toBe('medium');
      expect(readingTask.baseXP).toBe(50);
    });

    it('should return tasks with valid JSON content', async () => {
      const { getServerSession } = require('next-auth/next');
      getServerSession.mockResolvedValue({
        user: { id: GUEST_USER_ID },
      });

      const request = new NextRequest('http://localhost:3000/api/daily-tasks/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: GUEST_USER_ID }),
      });

      const response = await generateTasksPost(request);
      const data = await response.json();

      for (const task of data.tasks) {
        expect(() => JSON.parse(task.content)).not.toThrow();

        const content = JSON.parse(task.content);
        expect(content.question).toBeDefined();
        expect(content.options).toBeDefined();
        expect(Array.isArray(content.options)).toBe(true);
        expect(content.correctAnswer).toBeDefined();
        expect(content.explanation).toBeDefined();
      }
    });
  });
});
