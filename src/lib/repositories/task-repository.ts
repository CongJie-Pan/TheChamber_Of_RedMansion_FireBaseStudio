/**
 * @fileOverview Task Repository for SQLite Database
 *
 * This module provides CRUD operations for daily tasks using SQLite,
 * replacing Firebase Firestore task operations.
 *
 * @phase Phase 2.9 - Local SQLite Database Implementation
 */

import { getDatabase, type Client, toUnixTimestamp, fromUnixTimestamp } from '../sqlite-db';
import type { DailyTask, TaskDifficulty } from '../types/daily-task';
import { DailyTaskType } from '../types/daily-task';
import { XP_REWARD_TABLE, ATTRIBUTE_REWARD_TABLE } from '../task-generator';

/**
 * Valid DailyTaskType values for validation
 */
const VALID_TASK_TYPES = Object.values(DailyTaskType) as string[];

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
 *
 * Phase 4-T1: Enhanced to auto-generate xpReward and attributeRewards
 * from REWARD_TABLEs when not present in database content JSON.
 * This ensures backward compatibility with existing tasks that only have baseXP.
 *
 * Bug Fix (2025-12-02): Added taskType validation to prevent "未知的任務類型" UI error.
 * Now validates taskType against DailyTaskType enum before use.
 */
function rowToTask(row: TaskRow): DailyTask {
  const content = row.content ? JSON.parse(row.content) : {};

  // 🛡️ Validate taskType against enum values
  // If invalid, log warning and default to MORNING_READING for graceful fallback
  let taskType: DailyTaskType;
  if (VALID_TASK_TYPES.includes(row.taskType)) {
    taskType = row.taskType as DailyTaskType;
  } else {
    console.warn(
      `⚠️ [TaskRepository] Invalid taskType "${row.taskType}" for task ${row.id}. ` +
      `Valid types: ${VALID_TASK_TYPES.join(', ')}. Defaulting to morning_reading.`
    );
    taskType = DailyTaskType.MORNING_READING;
  }

  const difficulty = row.difficulty as TaskDifficulty;

  // Generate xpReward: Priority order
  // 1. content.xpReward (if exists)
  // 2. row.baseXP (fallback for legacy tasks)
  // 3. XP_REWARD_TABLE lookup (if type/difficulty valid)
  // 4. Default to 10 XP (safety fallback)
  const xpReward = content.xpReward
    ?? row.baseXP
    ?? XP_REWARD_TABLE[taskType]?.[difficulty]
    ?? 10;

  // Generate attributeRewards: Priority order
  // 1. content.attributeRewards (if exists)
  // 2. ATTRIBUTE_REWARD_TABLE lookup (if type valid)
  // 3. Empty object {} (safety fallback)
  const attributeRewards = content.attributeRewards
    ?? ATTRIBUTE_REWARD_TABLE[taskType]
    ?? {};

  return {
    id: row.id,
    type: taskType,
    difficulty: difficulty,
    title: row.title,
    description: row.description || '請完成此學習任務',
    xpReward,           // ✅ Auto-generated from baseXP or REWARD_TABLE
    attributeRewards,   // ✅ Auto-generated from ATTRIBUTE_REWARD_TABLE
    timeEstimate: content.timeEstimate || 10,
    sourceId: content.sourceId || row.id,
    content: content.content || {},
    gradingCriteria: content.gradingCriteria,
    createdAt: fromUnixTimestamp(row.createdAt),
    updatedAt: fromUnixTimestamp(row.createdAt),
  };
}

/**
 * Create a new daily task
 *
 * @param task - Daily task data
 * @returns Created task
 */
export async function createTask(task: DailyTask): Promise<DailyTask> {
  const db = getDatabase();
  const now = Date.now();

  // Extract fields that should be stored separately
  const {
    id,
    type, // DailyTask interface uses 'type', not 'taskType'
    difficulty,
    title,
    description,
    xpReward,
    createdAt,
    updatedAt,
    attributeRewards,
    timeEstimate,
    sourceId,
    content,
    gradingCriteria,
  } = task;

  // Field mapping: DailyTask.type -> database.taskType
  const taskType = type;

  // Store xpReward as baseXP for backward compatibility
  const baseXP = xpReward;

  // Build content JSON from task properties
  const contentFields = {
    content,
    xpReward,
    attributeRewards,
    timeEstimate,
    sourceId,
    gradingCriteria,
  };

  await db.execute({
    sql: `
    INSERT INTO daily_tasks (
      id, taskType, difficulty, title, description, baseXP,
      content, sourceChapter, sourceVerseStart, sourceVerseEnd, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    args: [
    id,
    taskType,
    difficulty,
    title,
    description || null,
    baseXP,
    JSON.stringify(contentFields),
    null, // sourceChapter - deprecated
    null, // sourceVerseStart - deprecated
    null, // sourceVerseEnd - deprecated
    createdAt ? toUnixTimestamp(createdAt) : now
  ]
  });

  console.log(`✅ [TaskRepository] Created task: ${id} (${taskType})`);
  return task;
}

/**
 * Get task by ID
 *
 * @param taskId - Task ID
 * @returns Task or null if not found
 */
export async function getTaskById(taskId: string): Promise<DailyTask | null> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM daily_tasks WHERE id = ?
  `,
    args: [taskId]
  });
  const row = result.rows[0] as unknown as TaskRow | undefined;

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
export async function getTasksByType(taskType: DailyTaskType): Promise<DailyTask[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM daily_tasks
    WHERE taskType = ?
    ORDER BY createdAt DESC
  `,
    args: [taskType]
  });
  const rows = result.rows as unknown as TaskRow[];

  return rows.map(rowToTask);
}

/**
 * Get tasks by difficulty
 *
 * @param difficulty - Task difficulty
 * @returns Array of tasks
 */
export async function getTasksByDifficulty(difficulty: TaskDifficulty): Promise<DailyTask[]> {
  const db = getDatabase();

  const result = await db.execute({
    sql: `
    SELECT * FROM daily_tasks
    WHERE difficulty = ?
    ORDER BY createdAt DESC
  `,
    args: [difficulty]
  });
  const rows = result.rows as unknown as TaskRow[];

  return rows.map(rowToTask);
}

/**
 * Get multiple tasks by IDs
 *
 * @param taskIds - Array of task IDs
 * @returns Array of tasks
 */
export async function getTasksByIds(taskIds: string[]): Promise<DailyTask[]> {
  if (taskIds.length === 0) {
    return [];
  }

  const db = getDatabase();

  const placeholders = taskIds.map(() => '?').join(',');
  const result = await db.execute({
    sql: `
    SELECT * FROM daily_tasks
    WHERE id IN (${placeholders})
  `,
    args: [...taskIds]
  });
  const rows = result.rows as unknown as TaskRow[];

  return rows.map(rowToTask);
}

/**
 * Update task
 *
 * @param taskId - Task ID
 * @param updates - Partial task updates
 * @returns Updated task
 */
export async function updateTask(
  taskId: string,
  updates: Partial<Omit<DailyTask, 'id' | 'createdAt'>>
): Promise<DailyTask> {
  const db = getDatabase();

  // Get current task
  const currentTask = await getTaskById(taskId);
  if (!currentTask) {
    throw new Error(`Task not found: ${taskId}`);
  }

  // Merge updates
  const updatedTask = { ...currentTask, ...updates };

  // Extract fields
  const {
    id,
    type, // DailyTask interface uses 'type', not 'taskType'
    difficulty,
    title,
    description,
    xpReward,
    createdAt,
    updatedAt,
    attributeRewards,
    timeEstimate,
    sourceId,
    content,
    gradingCriteria,
  } = updatedTask;

  // Store xpReward as baseXP for backward compatibility
  const baseXP = xpReward;

  // Build content JSON
  const contentFields = {
    content,
    xpReward,
    attributeRewards,
    timeEstimate,
    sourceId,
    gradingCriteria,
  };

  // Field mapping: DailyTask.type -> database.taskType
  const taskType = type;

  await db.execute({
    sql: `
    UPDATE daily_tasks
    SET taskType = ?, difficulty = ?, title = ?, description = ?,
        baseXP = ?, content = ?, sourceChapter = ?,
        sourceVerseStart = ?, sourceVerseEnd = ?
    WHERE id = ?
  `,
    args: [
    taskType,
    difficulty,
    title,
    description || null,
    baseXP,
    JSON.stringify(contentFields),
    null, // sourceChapter - deprecated
    null, // sourceVerseStart - deprecated
    null, // sourceVerseEnd - deprecated
    taskId
  ]
  });

  console.log(`✅ [TaskRepository] Updated task: ${taskId}`);

  return updatedTask;
}

/**
 * Delete task
 *
 * @param taskId - Task ID
 */
export async function deleteTask(taskId: string): Promise<void> {
  const db = getDatabase();

  await db.execute({
    sql: `DELETE FROM daily_tasks WHERE id = ?`,
    args: [taskId]
  });

  console.log(`✅ [TaskRepository] Deleted task: ${taskId}`);
}

/**
 * Batch create tasks
 *
 * @param tasks - Array of tasks to create
 * @returns Array of created tasks
 */
export async function batchCreateTasks(tasks: DailyTask[]): Promise<DailyTask[]> {
  const db = await getDatabase();

  try {
    // Start transaction
    await db.execute('BEGIN');

    const sql = `
      INSERT INTO daily_tasks (
        id, taskType, difficulty, title, description, baseXP,
        content, sourceChapter, sourceVerseStart, sourceVerseEnd, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const task of tasks) {
      const {
        id,
        type, // DailyTask interface uses 'type', not 'taskType'
        difficulty,
        title,
        description,
        xpReward,
        createdAt,
        updatedAt,
        attributeRewards,
        timeEstimate,
        sourceId,
        content,
        gradingCriteria,
      } = task;

      // Field mapping: DailyTask.type -> database.taskType
      const taskType = type;

      // Store xpReward as baseXP for backward compatibility
      const baseXP = xpReward;

      // Build content JSON
      const contentFields = {
        content,
        xpReward,
        attributeRewards,
        timeEstimate,
        sourceId,
        gradingCriteria,
      };

      const now = Date.now();

      // Enhanced: Robust null-safety with comprehensive fallback values
      const safeTitle = title || `${taskType} 任務`;
      const safeDescription = description || `請完成此 ${taskType} 類型的學習任務`;
      // Use nullish coalescing (??) to preserve 0 values, with fallback of 10 XP
      const safeBaseXP = baseXP ?? 10;

      try {
        await db.execute({
          sql,
          args: [
            id,
            taskType,
            difficulty,
            safeTitle,
            safeDescription,
            safeBaseXP,
            JSON.stringify(contentFields),
            null, // sourceChapter - deprecated
            null, // sourceVerseStart - deprecated
            null, // sourceVerseEnd - deprecated
            createdAt ? toUnixTimestamp(createdAt) : now
          ]
        });
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

    // Commit transaction
    await db.execute('COMMIT');
    console.log(`✅ [TaskRepository] Batch created ${tasks.length} tasks`);
    return tasks;
  } catch (error) {
    // 🛡️ Safe rollback: Handle case where transaction is already inactive (serverless/Turso)
    try {
      await db.execute('ROLLBACK');
    } catch (rollbackError) {
      // Ignore rollback error - transaction may already be rolled back or inactive
      console.warn(
        `⚠️ [TaskRepository] Rollback failed (transaction may already be inactive):`,
        rollbackError
      );
    }
    console.error(`❌ [TaskRepository] Batch create failed:`, error);
    throw error;
  }
}

/**
 * Get task count by type
 *
 * @param taskType - Task type (optional)
 * @returns Task count
 */
export async function getTaskCount(taskType?: DailyTaskType): Promise<number> {
  const db = await getDatabase();

  let sql: string;
  let params: any[] = [];

  if (taskType) {
    sql = `SELECT COUNT(*) as count FROM daily_tasks WHERE taskType = ?`;
    params = [taskType];
  } else {
    sql = `SELECT COUNT(*) as count FROM daily_tasks`;
  }

  const result = await db.execute({ sql, args: params });
  const row = result.rows[0] as unknown as { count: number };
  return row.count;
}
