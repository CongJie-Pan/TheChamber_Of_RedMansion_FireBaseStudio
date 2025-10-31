/**
 * @fileOverview Task Repository for SQLite Database
 *
 * This module provides CRUD operations for daily tasks using SQLite,
 * replacing Firebase Firestore task operations.
 *
 * @phase Phase 2.9 - Local SQLite Database Implementation
 */

import { getDatabase, toUnixTimestamp, fromUnixTimestamp } from '../sqlite-db';
import type { DailyTask, TaskType, TaskDifficulty } from '../types/daily-task';

/**
 * Task data interface for database operations
 */
interface TaskRow {
  id: string;
  taskType: string;
  difficulty: string;
  title: string;
  description: string | null;
  baseXP: number;
  content: string; // JSON string
  sourceChapter: number | null;
  sourceVerseStart: number | null;
  sourceVerseEnd: number | null;
  createdAt: number;
}

/**
 * Convert database row to DailyTask
 */
function rowToTask(row: TaskRow): DailyTask {
  const content = row.content ? JSON.parse(row.content) : {};

  return {
    id: row.id,
    taskType: row.taskType as TaskType,
    difficulty: row.difficulty as TaskDifficulty,
    title: row.title,
    description: row.description || undefined,
    baseXP: row.baseXP,
    ...content,
    sourceChapter: row.sourceChapter || undefined,
    sourceVerseStart: row.sourceVerseStart || undefined,
    sourceVerseEnd: row.sourceVerseEnd || undefined,
    createdAt: fromUnixTimestamp(row.createdAt),
  };
}

/**
 * Create a new daily task
 *
 * @param task - Daily task data
 * @returns Created task
 */
export function createTask(task: DailyTask): DailyTask {
  const db = getDatabase();
  const now = Date.now();

  // Extract fields that should be stored separately
  const {
    id,
    taskType,
    difficulty,
    title,
    description,
    baseXP,
    sourceChapter,
    sourceVerseStart,
    sourceVerseEnd,
    createdAt,
    ...contentFields
  } = task;

  const stmt = db.prepare(`
    INSERT INTO daily_tasks (
      id, taskType, difficulty, title, description, baseXP,
      content, sourceChapter, sourceVerseStart, sourceVerseEnd, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    taskType,
    difficulty,
    title,
    description || null,
    baseXP,
    JSON.stringify(contentFields),
    sourceChapter || null,
    sourceVerseStart || null,
    sourceVerseEnd || null,
    createdAt ? toUnixTimestamp(createdAt) : now
  );

  console.log(`✅ [TaskRepository] Created task: ${id} (${taskType})`);
  return task;
}

/**
 * Get task by ID
 *
 * @param taskId - Task ID
 * @returns Task or null if not found
 */
export function getTaskById(taskId: string): DailyTask | null {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM daily_tasks WHERE id = ?
  `);

  const row = stmt.get(taskId) as TaskRow | undefined;

  if (!row) {
    return null;
  }

  return rowToTask(row);
}

/**
 * Get all tasks by type
 *
 * @param taskType - Task type
 * @returns Array of tasks
 */
export function getTasksByType(taskType: TaskType): DailyTask[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM daily_tasks
    WHERE taskType = ?
    ORDER BY createdAt DESC
  `);

  const rows = stmt.all(taskType) as TaskRow[];

  return rows.map(rowToTask);
}

/**
 * Get tasks by difficulty
 *
 * @param difficulty - Task difficulty
 * @returns Array of tasks
 */
export function getTasksByDifficulty(difficulty: TaskDifficulty): DailyTask[] {
  const db = getDatabase();

  const stmt = db.prepare(`
    SELECT * FROM daily_tasks
    WHERE difficulty = ?
    ORDER BY createdAt DESC
  `);

  const rows = stmt.all(difficulty) as TaskRow[];

  return rows.map(rowToTask);
}

/**
 * Get multiple tasks by IDs
 *
 * @param taskIds - Array of task IDs
 * @returns Array of tasks
 */
export function getTasksByIds(taskIds: string[]): DailyTask[] {
  if (taskIds.length === 0) {
    return [];
  }

  const db = getDatabase();

  const placeholders = taskIds.map(() => '?').join(',');
  const stmt = db.prepare(`
    SELECT * FROM daily_tasks
    WHERE id IN (${placeholders})
  `);

  const rows = stmt.all(...taskIds) as TaskRow[];

  return rows.map(rowToTask);
}

/**
 * Update task
 *
 * @param taskId - Task ID
 * @param updates - Partial task updates
 * @returns Updated task
 */
export function updateTask(
  taskId: string,
  updates: Partial<Omit<DailyTask, 'id' | 'createdAt'>>
): DailyTask {
  const db = getDatabase();

  // Get current task
  const currentTask = getTaskById(taskId);
  if (!currentTask) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // Merge updates
  const updatedTask = { ...currentTask, ...updates };

  // Extract fields
  const {
    id,
    taskType,
    difficulty,
    title,
    description,
    baseXP,
    sourceChapter,
    sourceVerseStart,
    sourceVerseEnd,
    createdAt,
    ...contentFields
  } = updatedTask;

  const stmt = db.prepare(`
    UPDATE daily_tasks
    SET taskType = ?, difficulty = ?, title = ?, description = ?,
        baseXP = ?, content = ?, sourceChapter = ?,
        sourceVerseStart = ?, sourceVerseEnd = ?
    WHERE id = ?
  `);

  stmt.run(
    taskType,
    difficulty,
    title,
    description || null,
    baseXP,
    JSON.stringify(contentFields),
    sourceChapter || null,
    sourceVerseStart || null,
    sourceVerseEnd || null,
    taskId
  );

  console.log(`✅ [TaskRepository] Updated task: ${taskId}`);

  return updatedTask;
}

/**
 * Delete task
 *
 * @param taskId - Task ID
 */
export function deleteTask(taskId: string): void {
  const db = getDatabase();

  const stmt = db.prepare(`DELETE FROM daily_tasks WHERE id = ?`);
  stmt.run(taskId);

  console.log(`✅ [TaskRepository] Deleted task: ${taskId}`);
}

/**
 * Batch create tasks
 *
 * @param tasks - Array of tasks to create
 * @returns Array of created tasks
 */
export function batchCreateTasks(tasks: DailyTask[]): DailyTask[] {
  const db = getDatabase();

  const insertMany = db.transaction((tasksToInsert: DailyTask[]) => {
    const stmt = db.prepare(`
      INSERT INTO daily_tasks (
        id, taskType, difficulty, title, description, baseXP,
        content, sourceChapter, sourceVerseStart, sourceVerseEnd, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const task of tasksToInsert) {
      const {
        id,
        taskType,
        difficulty,
        title,
        description,
        baseXP,
        sourceChapter,
        sourceVerseStart,
        sourceVerseEnd,
        createdAt,
        ...contentFields
      } = task;

      const now = Date.now();

      // Enhanced: Robust null-safety with comprehensive fallback values
      const safeTitle = title || `${taskType} 任務`;
      const safeDescription = description || `請完成此 ${taskType} 類型的學習任務`;
      // Use nullish coalescing (??) to preserve 0 values, with fallback of 10 XP
      const safeBaseXP = baseXP ?? 10;

      try {
        stmt.run(
          id,
          taskType,
          difficulty,
          safeTitle,
          safeDescription,
          safeBaseXP,
          JSON.stringify(contentFields),
          sourceChapter || null,
          sourceVerseStart || null,
          sourceVerseEnd || null,
          createdAt ? toUnixTimestamp(createdAt) : now
        );
      } catch (error) {
        // Enhanced error logging to identify problematic field
        console.error(`❌ [TaskRepository] SQLite constraint error for task ${id}:`);
        console.error(`   Task Type: ${taskType}, Difficulty: ${difficulty}`);
        console.error(`   Title: ${safeTitle}, Description: ${safeDescription}, BaseXP: ${safeBaseXP}`);
        console.error(`   Error:`, error);
        console.error(`   Full Task Data:`, JSON.stringify(task, null, 2));
        throw error;
      }
    }
  });

  insertMany(tasks);

  console.log(`✅ [TaskRepository] Batch created ${tasks.length} tasks`);
  return tasks;
}

/**
 * Get task count by type
 *
 * @param taskType - Task type (optional)
 * @returns Task count
 */
export function getTaskCount(taskType?: TaskType): number {
  const db = getDatabase();

  let stmt;
  let params: any[] = [];

  if (taskType) {
    stmt = db.prepare(`SELECT COUNT(*) as count FROM daily_tasks WHERE taskType = ?`);
    params = [taskType];
  } else {
    stmt = db.prepare(`SELECT COUNT(*) as count FROM daily_tasks`);
  }

  const result = stmt.get(...params) as { count: number };
  return result.count;
}
