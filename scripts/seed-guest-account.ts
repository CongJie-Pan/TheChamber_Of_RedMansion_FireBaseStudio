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
const GUEST_TASK_2_ID = GUEST_TASK_IDS.CULTURAL_EXPLORATION;

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
// 題目來源: data/task-questions/question-bank.json
// 選用題目: reading_001 (晨讀時光) + culture_008 (文化探秘)
const GUEST_TASKS = [
  {
    id: GUEST_TASK_1_ID,
    taskType: 'morning_reading', // reading_001
    difficulty: 'easy',
    title: '晨讀時光：寶玉摔玉',
    description: '閱讀第三回賈寶玉「摔玉」的經典情節，分析他的性格特徵與價值觀',
    baseXP: 30,
    content: JSON.stringify({
      id: 'reading_001',
      chapter: 3,
      startLine: 185,
      endLine: 198,
      text: '寶玉聽了，登時發作起癡狂病來，摘下那玉，就狠命摔去，罵道：「什麼勞什子，我砸了他！什麼罕物，連人之高低不擇，還說『通靈』不『通靈』呢！我也不要這勞什子了！」嚇的眾人一擁爭去拾玉。賈母急的摟了寶玉道：「孽障！你生氣，要打罵人容易，何苦摔那命根子！」寶玉滿面淚痕哭道：「家裡姐姐妹妹都沒有，單我有，我說沒趣，如今來了這們一個神仙似的妹妹也沒有，可知這不是個好東西。」',
      question: '在這段情節中，賈寶玉「摔玉」的行為反映了他怎樣的性格特徵與價值觀？',
      hint: '思考提示：寶玉為什麼說「連人之高低不擇」？他認為「神仙似的妹妹」沒有玉，自己有玉這件事代表了什麼？這反映了他對「世俗寶物」與「人」之間關係的看法。',
      expectedKeywords: ['叛逆', '平等', '反世俗', '重視情感', '厭惡特權', '癡狂'],
    }),
    sourceChapter: 3,
    sourceVerseStart: 185,
    sourceVerseEnd: 198,
    createdAt: new Date().toISOString(),
  },
  {
    id: GUEST_TASK_2_ID,
    taskType: 'cultural_exploration', // culture_008
    difficulty: 'hard',
    title: '文化探秘：牡丹亭與心靈覺醒',
    description: '探索《牡丹亭》戲曲如何觸動林黛玉的內心世界，理解戲曲在《紅樓夢》中的文化意涵',
    baseXP: 50,
    content: JSON.stringify({
      id: 'culture_008',
      category: '戲曲',
      title: '牡丹亭與心靈覺醒',
      description: '第二十三回，林黛玉路過梨香院，聽到小戲子們在排演《牡丹亭》。這部由明代湯顯祖創作的崑曲經典，講述了杜麗娘為情而死、死而復生的故事。當時正統禮教視此類作品為「淫詞艷曲」。黛玉聽到「原來奼紫嫣紅開遍，似這般都付與斷井頹垣」這兩句時，心靈受到極大震撼。戲文中對青春流逝、美景虛設的感嘆，與黛玉「多愁善感」、「惜春悲秋」的內心產生了強烈共鳴，引發了她對個人命運和愛情的深層思考。這是《紅樓夢》中以戲曲推動人物心理發展的經典筆法。',
      relatedChapters: [23],
      questions: [
        {
          id: 'q1',
          question: '林黛玉聽到的「良辰美景奈何天，賞心樂事誰家院」出自《牡丹亭》的哪一折？',
          type: 'multiple_choice',
          options: ['驚夢', '尋夢', '離魂', '冥判'],
          correctAnswer: '驚夢',
          explanation: '這出自《牡丹亭·驚夢》，是杜麗娘在遊園時發出的著名感嘆。'
        },
        {
          id: 'q2',
          question: '為什麼這段戲文能讓林黛玉「如醉如癡，站立不住」？',
          type: 'multiple_choice',
          options: ['因為她沒聽過崑曲', '因為戲文太長她站累了', '因為戲文觸動了她青春易逝、知音難覓的孤獨感', '因為她不喜歡這個曲調'],
          correctAnswer: '因為戲文觸動了她青春易逝、知音難覓的孤獨感',
          explanation: '黛玉聯想到自己寄人籬下、青春虛度，這段描寫花開無人賞的詞句正好擊中了她內心最柔軟的悲劇感。'
        }
      ]
    }),
    sourceChapter: 23,
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
 * Preserved learning stats from existing guest account
 * These fields are NOT reset when re-seeding
 */
interface PreservedLearningData {
  stats: string | null;
  completedChapters: string | null;
}

/**
 * Fetch existing guest learning data before deletion
 * Phase 4-T1 Enhancement: Preserve learning stats across resets
 */
async function fetchExistingLearningData(db: Client): Promise<PreservedLearningData> {
  try {
    const result = await db.execute({
      sql: `SELECT stats, completedChapters FROM users WHERE id = ?`,
      args: [GUEST_USER_ID]
    });

    if (result.rows.length > 0) {
      const row = result.rows[0] as any;
      console.log(`   📊 Found existing learning data to preserve`);
      return {
        stats: row.stats || null,
        completedChapters: row.completedChapters || null,
      };
    }
  } catch (error: any) {
    console.warn(`   ⚠️  Could not fetch existing learning data: ${error.message}`);
  }

  return { stats: null, completedChapters: null };
}

/**
 * Delete existing guest account data
 * Phase 4-T1: Ensures complete reset including all task submissions and progress records
 * Note: Learning stats (stats, completedChapters) are preserved separately
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
 * Phase 4-T1 Enhancement: Preserves learning stats (stats, completedChapters) across resets
 */
async function insertGuestUser(db: Client, preservedData: PreservedLearningData): Promise<void> {
  console.log(`\n👤 Creating guest user account...`);

  await db.execute({
    sql: `INSERT INTO users (
      id, username, email, currentLevel, currentXP, totalXP,
      attributes, stats, completedChapters, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      GUEST_USER.id,
      GUEST_USER.username,
      GUEST_USER.email,
      GUEST_USER.currentLevel,
      GUEST_USER.currentXP,
      GUEST_USER.totalXP,
      GUEST_USER.attributes,
      preservedData.stats,          // Preserved learning stats
      preservedData.completedChapters, // Preserved chapter progress
      Date.now(),
      Date.now()
    ]
  });

  console.log(`   ✓ Created user: ${GUEST_USER.username} (ID: ${GUEST_USER.id})`);
  console.log(`   ✓ Set XP: ${GUEST_USER.currentXP}, Level: ${GUEST_USER.currentLevel}`);
  if (preservedData.stats || preservedData.completedChapters) {
    console.log(`   ✓ Preserved learning stats and chapter progress`);
  }
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
 * Phase 4-T1 Enhancement: Learning stats (閱讀時間、章節進度) are preserved across resets
 */
export async function seedGuestAccount(reset: boolean = true): Promise<void> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 GUEST TEST ACCOUNT SEEDING SCRIPT`);
  console.log(`${'='.repeat(60)}`);

  const db = await getDatabase();

  try {
    // Use transaction for atomicity
    await db.execute('BEGIN');

    // Phase 4-T1 Enhancement: Fetch existing learning data BEFORE deletion
    // This preserves: totalReadingTimeMinutes, completedChapters, currentStreak
    let preservedData: PreservedLearningData = { stats: null, completedChapters: null };
    if (reset) {
      console.log(`\n📖 Checking for existing learning data to preserve...`);
      preservedData = await fetchExistingLearningData(db);
      await deleteGuestData(db);
    }

    await insertGuestUser(db, preservedData);
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
