/**
 * @fileOverview Progress Repository Tests
 *
 * Unit tests for progress and submission CRUD operations with SQLite
 *
 * @phase Phase 2.9 - Local SQLite Database Implementation
 */

import Database from 'better-sqlite3';
import * as progressRepository from '@/lib/repositories/progress-repository';
import { getDatabase } from '@/lib/sqlite-db';
import type { DailyTaskProgress, TaskSubmission, DailyTaskAssignment } from '@/lib/types/daily-task';

// Mock the database module
jest.mock('@/lib/sqlite-db', () => {
  let mockDb: Database.Database;

  return {
    getDatabase: jest.fn(() => {
      if (!mockDb) {
        mockDb = new Database(':memory:');
        // Initialize schema
        mockDb.exec(`
          CREATE TABLE IF NOT EXISTS daily_progress (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            date TEXT NOT NULL,
            tasks TEXT NOT NULL,
            completedTaskIds TEXT DEFAULT '[]',
            skippedTaskIds TEXT DEFAULT '[]',
            totalXPEarned INTEGER DEFAULT 0,
            totalAttributeGains TEXT DEFAULT '{}',
            usedSourceIds TEXT DEFAULT '[]',
            streak INTEGER DEFAULT 0,
            createdAt INTEGER NOT NULL,
            updatedAt INTEGER NOT NULL
          );

          CREATE TABLE IF NOT EXISTS task_submissions (
            id TEXT PRIMARY KEY,
            userId TEXT NOT NULL,
            taskId TEXT NOT NULL,
            userAnswer TEXT NOT NULL,
            score INTEGER NOT NULL,
            feedback TEXT,
            xpEarned INTEGER DEFAULT 0,
            attributeGains TEXT,
            submittedAt INTEGER NOT NULL
          );
        `);
      }
      return mockDb;
    }),
    toUnixTimestamp: (date: Date) => date.getTime(),
    fromUnixTimestamp: (timestamp: number) => new Date(timestamp),
  };
});

describe('Progress Repository', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = getDatabase();
    // Clean up tables
    db.prepare('DELETE FROM daily_progress').run();
    db.prepare('DELETE FROM task_submissions').run();
  });

  afterAll(() => {
    if (db) {
      db.close();
    }
  });

  const createMockProgress = (userId: string, date: string): DailyTaskProgress => ({
    id: `${userId}_${date}`,
    userId,
    date,
    tasks: [],
    completedTaskIds: [],
    skippedTaskIds: [],
    totalXPEarned: 0,
    totalAttributeGains: {},
    usedSourceIds: [],
    streak: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const createMockSubmission = (userId: string, taskId: string): TaskSubmission => ({
    id: `${userId}_${taskId}_${Date.now()}`,
    userId,
    taskId,
    userAnswer: 'Test answer',
    score: 80,
    feedback: 'Good work',
    xpEarned: 40,
    attributeGains: { wisdom: 2 },
    submittedAt: new Date(),
  });

  describe('createProgress', () => {
    test('should create new progress record', () => {
      const progress = createMockProgress('user_001', '2025-10-27');

      const created = progressRepository.createProgress(progress);

      expect(created.id).toBe('user_001_2025-10-27');
      expect(created.userId).toBe('user_001');
      expect(created.date).toBe('2025-10-27');
      expect(created.tasks).toEqual([]);
      expect(created.totalXPEarned).toBe(0);
    });

    test('should create progress with tasks', () => {
      const tasks: DailyTaskAssignment[] = [
        { taskId: 'task_001', assignedAt: new Date(), status: 'pending' },
        { taskId: 'task_002', assignedAt: new Date(), status: 'pending' }
      ];

      const progress: DailyTaskProgress = {
        ...createMockProgress('user_002', '2025-10-27'),
        tasks,
      };

      const created = progressRepository.createProgress(progress);

      expect(created.tasks).toHaveLength(2);
      expect(created.tasks[0].taskId).toBe('task_001');
    });

    test('should create progress with XP and attributes', () => {
      const progress: DailyTaskProgress = {
        ...createMockProgress('user_003', '2025-10-27'),
        totalXPEarned: 150,
        totalAttributeGains: { wisdom: 10, creativity: 5 },
      };

      const created = progressRepository.createProgress(progress);

      expect(created.totalXPEarned).toBe(150);
      expect(created.totalAttributeGains).toEqual({ wisdom: 10, creativity: 5 });
    });
  });

  describe('getProgress', () => {
    test('should retrieve existing progress', () => {
      const progress = createMockProgress('user_004', '2025-10-27');
      progressRepository.createProgress(progress);

      const retrieved = progressRepository.getProgress('user_004', '2025-10-27');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.userId).toBe('user_004');
      expect(retrieved?.date).toBe('2025-10-27');
    });

    test('should return null for non-existent progress', () => {
      const progress = progressRepository.getProgress('non_existent', '2025-10-27');

      expect(progress).toBeNull();
    });

    test('should retrieve progress with correct data types', () => {
      const progress = createMockProgress('user_005', '2025-10-27');
      progressRepository.createProgress(progress);

      const retrieved = progressRepository.getProgress('user_005', '2025-10-27');

      expect(Array.isArray(retrieved?.tasks)).toBe(true);
      expect(Array.isArray(retrieved?.completedTaskIds)).toBe(true);
      expect(typeof retrieved?.totalXPEarned).toBe('number');
      expect(retrieved?.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('updateProgress', () => {
    test('should update completed task IDs', () => {
      const progress = createMockProgress('user_006', '2025-10-27');
      progressRepository.createProgress(progress);

      const updated = progressRepository.updateProgress('user_006_2025-10-27', {
        completedTaskIds: ['task_001', 'task_002']
      });

      expect(updated.completedTaskIds).toEqual(['task_001', 'task_002']);
    });

    test('should update total XP earned', () => {
      const progress = createMockProgress('user_007', '2025-10-27');
      progressRepository.createProgress(progress);

      const updated = progressRepository.updateProgress('user_007_2025-10-27', {
        totalXPEarned: 200
      });

      expect(updated.totalXPEarned).toBe(200);
    });

    test('should update attribute gains', () => {
      const progress = createMockProgress('user_008', '2025-10-27');
      progressRepository.createProgress(progress);

      const updated = progressRepository.updateProgress('user_008_2025-10-27', {
        totalAttributeGains: { wisdom: 15, creativity: 10 }
      });

      expect(updated.totalAttributeGains).toEqual({ wisdom: 15, creativity: 10 });
    });

    test('should update streak', () => {
      const progress = createMockProgress('user_009', '2025-10-27');
      progressRepository.createProgress(progress);

      const updated = progressRepository.updateProgress('user_009_2025-10-27', {
        streak: 5
      });

      expect(updated.streak).toBe(5);
    });

    test('should update multiple fields', () => {
      const progress = createMockProgress('user_010', '2025-10-27');
      progressRepository.createProgress(progress);

      const updated = progressRepository.updateProgress('user_010_2025-10-27', {
        completedTaskIds: ['task_001'],
        totalXPEarned: 50,
        streak: 3
      });

      expect(updated.completedTaskIds).toEqual(['task_001']);
      expect(updated.totalXPEarned).toBe(50);
      expect(updated.streak).toBe(3);
    });

    test('should throw error for non-existent progress', () => {
      expect(() => {
        progressRepository.updateProgress('non_existent_2025-10-27', {
          totalXPEarned: 100
        });
      }).toThrow('Failed to retrieve updated progress');
    });
  });

  describe('createSubmission', () => {
    test('should create task submission', () => {
      const submission = createMockSubmission('user_011', 'task_001');

      const created = progressRepository.createSubmission(submission);

      expect(created.userId).toBe('user_011');
      expect(created.taskId).toBe('task_001');
      expect(created.score).toBe(80);
      expect(created.xpEarned).toBe(40);
    });

    test('should create submission with feedback', () => {
      const submission = createMockSubmission('user_012', 'task_002');
      submission.feedback = 'Excellent analysis!';

      const created = progressRepository.createSubmission(submission);

      expect(created.feedback).toBe('Excellent analysis!');
    });

    test('should create submission with attribute gains', () => {
      const submission = createMockSubmission('user_013', 'task_003');
      submission.attributeGains = { wisdom: 5, creativity: 3 };

      const created = progressRepository.createSubmission(submission);

      expect(created.attributeGains).toEqual({ wisdom: 5, creativity: 3 });
    });
  });

  describe('getSubmissionById', () => {
    test('should retrieve existing submission', () => {
      const submission = createMockSubmission('user_014', 'task_004');
      progressRepository.createSubmission(submission);

      const retrieved = progressRepository.getSubmissionById(submission.id);

      expect(retrieved).not.toBeNull();
      expect(retrieved?.userId).toBe('user_014');
      expect(retrieved?.taskId).toBe('task_004');
    });

    test('should return null for non-existent submission', () => {
      const submission = progressRepository.getSubmissionById('non_existent');

      expect(submission).toBeNull();
    });
  });

  describe('getUserTaskSubmissions', () => {
    beforeEach(() => {
      progressRepository.createSubmission(createMockSubmission('user_015', 'task_005'));
      progressRepository.createSubmission(createMockSubmission('user_015', 'task_005'));
      progressRepository.createSubmission(createMockSubmission('user_015', 'task_006'));
      progressRepository.createSubmission(createMockSubmission('user_016', 'task_005'));
    });

    test('should retrieve all submissions for user and task', () => {
      const submissions = progressRepository.getUserTaskSubmissions('user_015', 'task_005');

      expect(submissions).toHaveLength(2);
      expect(submissions.every(s => s.userId === 'user_015' && s.taskId === 'task_005')).toBe(true);
    });

    test('should return empty array for no submissions', () => {
      const submissions = progressRepository.getUserTaskSubmissions('user_999', 'task_999');

      expect(submissions).toHaveLength(0);
    });

    test('should return submissions in descending order by submittedAt', () => {
      const submissions = progressRepository.getUserTaskSubmissions('user_015', 'task_005');

      for (let i = 0; i < submissions.length - 1; i++) {
        expect(submissions[i].submittedAt.getTime()).toBeGreaterThanOrEqual(
          submissions[i + 1].submittedAt.getTime()
        );
      }
    });
  });

  describe('getUserRecentProgress', () => {
    beforeEach(() => {
      progressRepository.createProgress(createMockProgress('user_017', '2025-10-25'));
      progressRepository.createProgress(createMockProgress('user_017', '2025-10-26'));
      progressRepository.createProgress(createMockProgress('user_017', '2025-10-27'));
      progressRepository.createProgress(createMockProgress('user_018', '2025-10-27'));
    });

    test('should retrieve recent progress for user', () => {
      const recent = progressRepository.getUserRecentProgress('user_017', 10);

      expect(recent).toHaveLength(3);
      expect(recent.every(p => p.userId === 'user_017')).toBe(true);
    });

    test('should limit results', () => {
      const recent = progressRepository.getUserRecentProgress('user_017', 2);

      expect(recent).toHaveLength(2);
    });

    test('should return progress in descending date order', () => {
      const recent = progressRepository.getUserRecentProgress('user_017', 10);

      expect(recent[0].date).toBe('2025-10-27');
      expect(recent[1].date).toBe('2025-10-26');
      expect(recent[2].date).toBe('2025-10-25');
    });
  });

  describe('getProgressByDateRange', () => {
    beforeEach(() => {
      progressRepository.createProgress(createMockProgress('user_019', '2025-10-20'));
      progressRepository.createProgress(createMockProgress('user_019', '2025-10-25'));
      progressRepository.createProgress(createMockProgress('user_019', '2025-10-27'));
      progressRepository.createProgress(createMockProgress('user_019', '2025-11-01'));
    });

    test('should retrieve progress within date range', () => {
      const progress = progressRepository.getProgressByDateRange('user_019', '2025-10-24', '2025-10-28');

      expect(progress).toHaveLength(2);
      expect(progress.map(p => p.date)).toContain('2025-10-25');
      expect(progress.map(p => p.date)).toContain('2025-10-27');
    });

    test('should include boundary dates', () => {
      const progress = progressRepository.getProgressByDateRange('user_019', '2025-10-20', '2025-10-27');

      expect(progress).toHaveLength(3);
      expect(progress.map(p => p.date)).toContain('2025-10-20');
      expect(progress.map(p => p.date)).toContain('2025-10-27');
    });

    test('should return empty array for range with no data', () => {
      const progress = progressRepository.getProgressByDateRange('user_019', '2025-09-01', '2025-09-30');

      expect(progress).toHaveLength(0);
    });
  });

  describe('deleteProgress', () => {
    test('should delete existing progress', () => {
      const progress = createMockProgress('user_020', '2025-10-27');
      progressRepository.createProgress(progress);

      progressRepository.deleteProgress('user_020_2025-10-27');

      const retrieved = progressRepository.getProgress('user_020', '2025-10-27');
      expect(retrieved).toBeNull();
    });

    test('should not throw error when deleting non-existent progress', () => {
      expect(() => {
        progressRepository.deleteProgress('non_existent_2025-10-27');
      }).not.toThrow();
    });
  });
});
