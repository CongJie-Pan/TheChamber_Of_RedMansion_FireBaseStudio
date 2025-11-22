/**
 * @fileOverview Task Repository for SQLite Database
 *
 * This module provides CRUD operations for daily tasks using SQLite,
 * replacing Firebase Firestore task operations.
 *
 * @phase Phase 2.9 - Local SQLite Database Implementation
 */

import { getDatabase, toUnixTimestamp, fromUnixTimestamp } from '../sqlite-db';
import type { DailyTask, DailyTaskType, TaskDifficulty } from '../types/daily-task';
import { XP_REWARD_TABLE, ATTRIBUTE_REWARD_TABLE } from '../task-generator';

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
 */
function rowToTask(row: TaskRow): DailyTask {
  const content = row.content ? JSON.parse(row.content) : {};

  // Extract type and difficulty for reward calculation
  const taskType = row.taskType as DailyTaskType;
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
export function createTask(task: DailyTask): DailyTask {
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
    null, // sourceChapter - deprecated
    null, // sourceVerseStart - deprecated
    null, // sourceVerseEnd - deprecated
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
export function getTasksByType(taskType: DailyTaskType): DailyTask[] {
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
    null, // sourceChapter - deprecated
    null, // sourceVerseStart - deprecated
    null, // sourceVerseEnd - deprecated
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
        stmt.run(
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
export function getTaskCount(taskType?: DailyTaskType): number {
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
