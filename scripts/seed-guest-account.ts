#!/usr/bin/env tsx
/**
 * Guest Account Seeding Script - Phase 4-T1
 *
 * This script creates a consistent guest test account with:
 * - Fixed user ID: 'guest-test-user-00000000'
 * - Fixed XP: 70
 * - 2 predefined daily tasks (no dynamic generation)
 * - AI grading enabled
 *
 * Purpose: Provides a stable baseline for development and testing
 * Usage: tsx scripts/seed-guest-account.ts [--reset]
 */

import { getDatabase, type Client } from '../src/lib/sqlite-db';
import {
  GUEST_USER_ID,
  GUEST_EMAIL,
  GUEST_USERNAME,
  GUEST_FIXED_XP,
  GUEST_LEVEL,
  GUEST_TASK_IDS,
} from '../src/lib/constants/guest-account';

// Re-export constants for external use
export { GUEST_USER_ID } from '../src/lib/constants/guest-account';

// Fixed task IDs for guest account
const GUEST_TASK_1_ID = GUEST_TASK_IDS.READING_COMPREHENSION;
const GUEST_TASK_2_ID = GUEST_TASK_IDS.CHARACTER_ANALYSIS;

// Guest user data
const GUEST_USER = {
  id: GUEST_USER_ID,
  username: GUEST_USERNAME,
  email: GUEST_EMAIL,
  currentLevel: GUEST_LEVEL,
  currentXP: GUEST_FIXED_XP,
  totalXP: GUEST_FIXED_XP,
  attributes: JSON.stringify({
    literaryAppreciation: 0,
    culturalUnderstanding: 0,
    analyticalThinking: 0,
    creativity: 0,
  }),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// Fixed daily tasks for guest account
const GUEST_TASKS = [
  {
    id: GUEST_TASK_1_ID,
    taskType: 'morning_reading', // Fixed: Use correct DailyTaskType enum value
    difficulty: 'medium',
    title: '閱讀理解：林黛玉進賈府',
    description: '請仔細閱讀第三回「林黛玉進賈府」的選段，並回答相關問題',
    baseXP: 50,
    content: JSON.stringify({
      question: '林黛玉初進賈府時，對賈府環境有何感受？請從文中找出相關描寫。',
      passage: '黛玉方進入房中，只見兩邊翠幕高懸，金鉤低掛，珠簾半捲，畫棟雕簷，說不盡那富麗堂皇。',
      options: [
        '感到富麗堂皇，但心中謹慎',
        '感到非常熟悉和親切',
        '感到不習慣如此奢華',
        '沒有特別的感受'
      ],
      correctAnswer: '感到富麗堂皇，但心中謹慎',
      explanation: '林黛玉雖出身書香門第，但賈府的富麗堂皇仍令她震撼。文中描寫她「步步留心，時時在意」，顯示她的謹慎態度。',
    }),
    sourceChapter: 3,
    sourceVerseStart: null,
    sourceVerseEnd: null,
    createdAt: new Date().toISOString(),
  },
  {
    id: GUEST_TASK_2_ID,
    taskType: 'character_insight', // Fixed: Use correct DailyTaskType enum value
    difficulty: 'easy',
    title: '人物分析：賈寶玉性格特點',
    description: '請分析賈寶玉的性格特點，並舉例說明',
    baseXP: 30,
    content: JSON.stringify({
      question: '賈寶玉最突出的性格特點是什麼？',
      characterName: '賈寶玉',
      hint: '思考他對待女性的態度以及他的人生觀',
      options: [
        '尊重女性，反對封建禮教',
        '嚴守禮教，循規蹈矩',
        '冷漠無情，只關心功名',
        '軟弱無能，沒有主見'
      ],
      correctAnswer: '尊重女性，反對封建禮教',
      explanation: '賈寶玉最顯著的性格特點是尊重女性，認為「女兒是水做的骨肉」。他反對科舉功名，厭惡「祿蠹」（追求功名利祿的人），體現了對封建禮教的反抗精神。',
    }),
    sourceChapter: null,
    sourceVerseStart: null,
    sourceVerseEnd: null,
    createdAt: new Date().toISOString(),
  },
];

// Guest daily progress data
const getTodayString = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Create DailyTaskAssignment objects for guest progress
 * Bug Fix (2025-12-02): tasks field must be DailyTaskAssignment[], not string[]
 * This ensures proper format matching DailyTaskProgress.tasks type definition
 */
const createGuestTaskAssignments = () => {
  const now = Date.now();
  const timestamp = {
    seconds: Math.floor(now / 1000),
    nanoseconds: (now % 1000) * 1000000,
  };

  return [
    {
      taskId: GUEST_TASK_1_ID,
      assignedAt: timestamp,
      status: 'not_started',
    },
    {
      taskId: GUEST_TASK_2_ID,
      assignedAt: timestamp,
      status: 'not_started',
    },
  ];
};

const GUEST_PROGRESS = {
  // Bug Fix (2025-12-02): Progress ID must match format: {userId}_{date}
  // This matches the format used in progress-repository.ts getProgress()
  id: `${GUEST_USER_ID}_${getTodayString()}`,
  userId: GUEST_USER_ID,
  date: getTodayString(),
  // Bug Fix (2025-12-02): Use DailyTaskAssignment[] format instead of string[]
  tasks: JSON.stringify(createGuestTaskAssignments()),
  completedTaskIds: JSON.stringify([]),
  skippedTaskIds: JSON.stringify([]),
  totalXPEarned: 0,
  totalAttributeGains: JSON.stringify({}),
  usedSourceIds: JSON.stringify([]),
  streak: 1,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Delete existing guest account data
 * Phase 4-T1: Ensures complete reset including all task submissions and progress records
 */
async function deleteGuestData(db: Client): Promise<void> {
  console.log(`\n🗑️  Deleting existing guest account data...`);

  // Delete in order of foreign key dependencies (child tables first)
  // This ensures complete reset: XP=70, Level=1, 0 completed tasks
  const deletions = [
    { table: 'task_submissions', condition: 'userId = ?', params: [GUEST_USER_ID] },
    { table: 'level_ups', condition: 'userId = ?', params: [GUEST_USER_ID] },
    { table: 'xp_transaction_locks', condition: 'userId = ?', params: [GUEST_USER_ID] },
    { table: 'xp_transactions', condition: 'userId = ?', params: [GUEST_USER_ID] },
    { table: 'daily_progress', condition: 'userId = ?', params: [GUEST_USER_ID] },
    { table: 'daily_tasks', condition: 'id IN (?, ?)', params: [GUEST_TASK_1_ID, GUEST_TASK_2_ID] },
    { table: 'users', condition: 'id = ?', params: [GUEST_USER_ID] },
  ];

  for (const { table, condition, params } of deletions) {
    try {
      const result = await db.execute({
        sql: `DELETE FROM ${table} WHERE ${condition}`,
        args: params
      });
      console.log(`   ✓ Deleted row(s) from ${table}`);
    } catch (error: any) {
      console.warn(`   ⚠️  Warning: Could not delete from ${table}: ${error.message}`);
    }
  }
}

/**
 * Insert guest user account
 */
async function insertGuestUser(db: Client): Promise<void> {
  console.log(`\n👤 Creating guest user account...`);

  await db.execute({
    sql: `INSERT INTO users (
      id, username, email, currentLevel, currentXP, totalXP,
      attributes, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      GUEST_USER.id,
      GUEST_USER.username,
      GUEST_USER.email,
      GUEST_USER.currentLevel,
      GUEST_USER.currentXP,
      GUEST_USER.totalXP,
      GUEST_USER.attributes,
      Date.now(),
      Date.now()
    ]
  });

  console.log(`   ✓ Created user: ${GUEST_USER.username} (ID: ${GUEST_USER.id})`);
  console.log(`   ✓ Set XP: ${GUEST_USER.currentXP}, Level: ${GUEST_USER.currentLevel}`);
}

/**
 * Insert guest daily tasks
 */
async function insertGuestTasks(db: Client): Promise<void> {
  console.log(`\n📝 Creating guest daily tasks...`);

  for (const task of GUEST_TASKS) {
    await db.execute({
      sql: `INSERT INTO daily_tasks (
        id, taskType, difficulty, title, description, baseXP,
        content, sourceChapter, sourceVerseStart, sourceVerseEnd, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        task.id,
        task.taskType,
        task.difficulty,
        task.title,
        task.description,
        task.baseXP,
        task.content,
        task.sourceChapter,
        task.sourceVerseStart,
        task.sourceVerseEnd,
        Date.now()
      ]
    });
    console.log(`   ✓ Created task: ${task.title} (${task.baseXP} XP)`);
  }
}

/**
 * Insert guest daily progress
 */
async function insertGuestProgress(db: Client): Promise<void> {
  console.log(`\n📊 Creating guest daily progress...`);

  await db.execute({
    sql: `INSERT INTO daily_progress (
      id, userId, date, tasks, completedTaskIds, skippedTaskIds,
      totalXPEarned, totalAttributeGains, usedSourceIds, streak,
      createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      GUEST_PROGRESS.id,
      GUEST_PROGRESS.userId,
      GUEST_PROGRESS.date,
      GUEST_PROGRESS.tasks,
      GUEST_PROGRESS.completedTaskIds,
      GUEST_PROGRESS.skippedTaskIds,
      GUEST_PROGRESS.totalXPEarned,
      GUEST_PROGRESS.totalAttributeGains,
      GUEST_PROGRESS.usedSourceIds,
      GUEST_PROGRESS.streak,
      Date.now(),
      Date.now()
    ]
  });

  console.log(`   ✓ Created progress for date: ${GUEST_PROGRESS.date}`);
  console.log(`   ✓ Tasks: 0/2 completed`);
}

/**
 * Main seeding function
 */
export async function seedGuestAccount(reset: boolean = true): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 GUEST TEST ACCOUNT SEEDING SCRIPT`);
  console.log(`${'='.repeat(60)}`);

  const db = await getDatabase();

  try {
    // Use transaction for atomicity
    await db.execute('BEGIN');

    if (reset) {
      await deleteGuestData(db);
    }

    await insertGuestUser(db);
    await insertGuestTasks(db);
    await insertGuestProgress(db);

    await db.execute('COMMIT');

    console.log(`\n${'='.repeat(60)}`);
    console.log(`✅ Guest account seeded successfully!`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\n📋 Guest Account Details:`);
    console.log(`   User ID: ${GUEST_USER_ID}`);
    console.log(`   Email: ${GUEST_EMAIL}`);
    console.log(`   Username: ${GUEST_USERNAME}`);
    console.log(`   XP: ${GUEST_FIXED_XP}`);
    console.log(`   Level: ${GUEST_LEVEL}`);
    console.log(`   Daily Tasks: 2 (fixed)`);
    console.log(`   Today's Date: ${getTodayString()}`);
    console.log(`\n💡 Tip: This account will reset on server restart in development mode.`);
    console.log(`\n`);

  } catch (error: any) {
    // 🛡️ Safe rollback: Handle case where transaction is already inactive (serverless/Turso)
    // Bug Fix (2025-12-02): Prevent "cannot rollback - no transaction is active" crash
    try {
      await db.execute('ROLLBACK');
    } catch (rollbackError: any) {
      // Log warning but don't re-throw - the original error is more important
      console.warn(`⚠️ Rollback failed (transaction may already be inactive): ${rollbackError.message}`);
    }
    console.error(`\n❌ Error seeding guest account: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  const resetFlag = process.argv.includes('--reset');
  seedGuestAccount(resetFlag);
}
