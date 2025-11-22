/**
 * @fileOverview Progress Repository for SQLite Database
 *
 * This module provides CRUD operations for daily progress and task submissions
 * using SQLite, replacing Firebase Firestore operations.
 *
 * @phase Phase 2.9 - Local SQLite Database Implementation
 */

import { getDatabase, toUnixTimestamp, fromUnixTimestamp } from '../sqlite-db';
import type { DailyTaskProgress, DailyTaskAssignment, TaskSubmission } from '../types/daily-task';

/**
 * Progress data interface for database operations
 */
interface ProgressRow {
  id: string;
  userId: string;
  date: string;
  tasks: string; // JSON
  completedTaskIds: string; // JSON
  skippedTaskIds: string; // JSON
  totalXPEarned: number;
  totalAttributeGains: string; // JSON
  usedSourceIds: string; // JSON
  streak: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Submission data interface for database operations
 */
interface SubmissionRow {
  id: string;
  userId: string;
  taskId: string;
  userAnswer: string;
  score: number;
  feedback: string | null;
  xpEarned: number;
  attributeGains: string | null; // JSON
  submittedAt: number;
}

/**
 * Convert database row to DailyTaskProgress
 */
function rowToProgress(row: ProgressRow): DailyTaskProgress {
  return {
    id: row.id,
    userId: row.userId,
    date: row.date,
    tasks: JSON.parse(row.tasks || '[]'),
    completedTaskIds: JSON.parse(row.completedTaskIds || '[]'),
    skippedTaskIds: JSON.parse(row.skippedTaskIds || '[]'),
    totalXPEarned: row.totalXPEarned,
    totalAttributeGains: JSON.parse(row.totalAttributeGains || '{}'),
    usedSourceIds: JSON.parse(row.usedSourceIds || '[]'),
    streak: row.streak,
    createdAt: fromUnixTimestamp(row.createdAt),
    updatedAt: fromUnixTimestamp(row.updatedAt),
  };
}

/**
 * Convert database row to TaskSubmission
 * Maps legacy database schema to new DailyTaskAssignment interface
 */
function rowToSubmission(row: SubmissionRow): TaskSubmission {
  return {
    taskId: row.taskId,
    assignedAt: fromUnixTimestamp(row.submittedAt), // Use submittedAt as approximate
    completedAt: fromUnixTimestamp(row.submittedAt),
    userResponse: row.userAnswer,
    aiScore: row.score,
    xpAwarded: row.xpEarned,
    attributeGains: row.attributeGains ? JSON.parse(row.attributeGains) : undefined,
    feedback: row.feedback || undefined,
    status: 'completed' as any, // Completed status since it's a submission
  };
}

/**
 * Create daily progress record
 *
 * @param progress - Daily progress data
 * @returns Created progress record
 */
export function createProgress(progress: DailyTaskProgress): DailyTaskProgress {
  const db = getDatabase();
  const now = Date.now();

  const stmt = db.prepare(`
    INSERT INTO daily_progress (
      id, userId, date, tasks, completedTaskIds, skippedTaskIds,
      totalXPEarned, totalAttributeGains, usedSourceIds,
      streak, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    progress.id,
    progress.userId,
    progress.date,
    JSON.stringify(progress.tasks || []),
    JSON.stringify(progress.completedTaskIds || []),
    JSON.stringify(progress.skippedTaskIds || []),
    progress.totalXPEarned || 0,
    JSON.stringify(progress.totalAttributeGains || {}),
    JSON.stringify(progress.usedSourceIds || []),
    progress.streak || 0,
    progress.createdAt ? toUnixTimestamp(progress.createdAt) : now,
    progress.updatedAt ? toUnixTimestamp(progress.updatedAt) : now
  );

  console.log(`✅ [ProgressRepository] Created progress: ${progress.id}`);
  return progress;
}

/**
 * Get progress by user and date
 *
 * @param userId - User ID
 * @param date - Date in YYYY-MM-DD format
 * @returns Progress record or null if not found
 */
export function getProgress(userId: string, date: string): DailyTaskProgress | null {
  const db = getDatabase();
  const progressId = `${userId}_${date}`;

  const stmt = db.prepare(`
    SELECT * FROM daily_progress WHERE id = ?
  `);

  const row = stmt.get(progressId) as ProgressRow | undefined;

  if (!row) {
    return null;
  }

  return rowToProgress(row);
}

/**
 * Update progress record
 *
 * @param progressId - Progress record ID
 * @param updates - Partial progress updates
 * @returns Updated progress record
 */
export function updateProgress(
  progressId: string,
  updates: Partial<Omit<DailyTaskProgress, 'id' | 'userId' | 'date' | 'createdAt'>>
): DailyTaskProgress {
  const db = getDatabase();
  const now = Date.now();

  // Build dynamic update query
  const updateFields: string[] = [];
  const updateValues: any[] = [];

  if (updates.tasks !== undefined) {
    updateFields.push('tasks = ?');
    updateValues.push(JSON.stringify(updates.tasks));
  }

  if (updates.completedTaskIds !== undefined) {
    updateFields.push('completedTaskIds = ?');
    updateValues.push(JSON.stringify(updates.completedTaskIds));
  }

  if (updates.skippedTaskIds !== undefined) {
    updateFields.push('skippedTaskIds = ?');
    updateValues.push(JSON.stringify(updates.skippedTaskIds));
  }

  if (updates.totalXPEarned !== undefined) {
    updateFields.push('totalXPEarned = ?');
    updateValues.push(updates.totalXPEarned);
  }

  if (updates.totalAttributeGains !== undefined) {
    updateFields.push('totalAttributeGains = ?');
    updateValues.push(JSON.stringify(updates.totalAttributeGains));
  }

  if (updates.usedSourceIds !== undefined) {
    updateFields.push('usedSourceIds = ?');
    updateValues.push(JSON.stringify(updates.usedSourceIds));
  }

  if (updates.streak !== undefined) {
    updateFields.push('streak = ?');
    updateValues.push(updates.streak);
  }

  // Always update updatedAt
  updateFields.push('updatedAt = ?');
  updateValues.push(now);

  // Add progressId for WHERE clause
  updateValues.push(progressId);

  const stmt = db.prepare(`
    UPDATE daily_progress
    SET ${updateFields.join(', ')}
    WHERE id = ?
  `);

  stmt.run(...updateValues);

  console.log(`✅ [ProgressRepository] Updated progress: ${progressId}`);

  // Extract userId and date from progressId
  // Format is userId_date where date is YYYY-MM-DD
  // Find the last occurrence of a date pattern (YYYY-MM-DD)
  const dateMatch = progressId.match(/_(\d{4}-\d{2}-\d{2})$/);
  if (!dateMatch) {
    throw new Error(`Invalid progress ID format: ${progressId}`);
  }

  const date = dateMatch[1];
  const userId = progressId.substring(0, progressId.lastIndexOf(`_${date}`));
  const updated = getProgress(userId, date);

  if (!updated) {
    throw new Error(`Failed to retrieve updated progress: ${progressId}`);
  }

  return updated;
}

/**
 * Create task submission
 *
 * @param submission - Task submission data
 * @returns Created submission
 */
export function createSubmission(submission: TaskSubmission): TaskSubmission {
  const db = getDatabase();
  const now = Date.now();

  // Generate a unique ID for this submission
  const submissionId = `sub_${submission.taskId}_${Date.now()}`;

  const stmt = db.prepare(`
    INSERT INTO task_submissions (
      id, userId, taskId, userAnswer, score, feedback,
      xpEarned, attributeGains, submittedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Map new TaskSubmission fields to legacy database schema
  stmt.run(
    submissionId,
    'unknown', // userId not in new interface, use placeholder
    submission.taskId,
    submission.userResponse || '',
    submission.aiScore || 0,
    submission.feedback || null,
    submission.xpAwarded || 0,
    submission.attributeGains ? JSON.stringify(submission.attributeGains) : null,
    submission.completedAt ? toUnixTimestamp(submission.completedAt) : now
  );

  console.log(`✅ [ProgressRepository] Created submission: ${submissionId}`);
  return submission;
}

/**
 * Get submission by ID
 *
 * @param submissionId - Submission ID
 * @returns Submission or null if not found
 */
export function getSubmissionById(submissionId: string): TaskSubmission | null {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM task_submissions WHERE id = ?
  `);

  const row = stmt.get(submissionId) as SubmissionRow | undefined;

  if (!row) {
    return null;
  }

  return rowToSubmission(row);
}

/**
 * Get user submissions for a task
 *
 * @param userId - User ID
 * @param taskId - Task ID
 * @returns Array of submissions
 */
export function getUserTaskSubmissions(
  userId: string,
  taskId: string
): TaskSubmission[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM task_submissions
    WHERE userId = ? AND taskId = ?
    ORDER BY submittedAt DESC
  `);

  const rows = stmt.all(userId, taskId) as SubmissionRow[];

  return rows.map(rowToSubmission);
}

/**
 * Get user's recent progress records
 *
 * @param userId - User ID
 * @param limit - Number of records to fetch
 * @returns Array of progress records
 */
export function getUserRecentProgress(
  userId: string,
  limit: number = 30
): DailyTaskProgress[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM daily_progress
    WHERE userId = ?
    ORDER BY date DESC
    LIMIT ?
  `);

  const rows = stmt.all(userId, limit) as ProgressRow[];

  return rows.map(rowToProgress);
}

/**
 * Get all progress records for a date range
 *
 * @param userId - User ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of progress records
 */
export function getProgressByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): DailyTaskProgress[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM daily_progress
    WHERE userId = ? AND date >= ? AND date <= ?
    ORDER BY date DESC
  `);

  const rows = stmt.all(userId, startDate, endDate) as ProgressRow[];

  return rows.map(rowToProgress);
}

/**
 * Delete progress record
 *
 * @param progressId - Progress record ID
 */
export function deleteProgress(progressId: string): void {
  const db = getDatabase();

  const stmt = db.prepare(`DELETE FROM daily_progress WHERE id = ?`);
  stmt.run(progressId);

  console.log(`✅ [ProgressRepository] Deleted progress: ${progressId}`);
}
