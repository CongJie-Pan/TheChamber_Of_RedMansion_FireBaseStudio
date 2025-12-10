/**
 * Temporary API Endpoint: Seed Guest Account
 *
 * POST /api/admin/seed-guest?secret=YOUR_SECRET
 *
 * This endpoint seeds the guest account with fixed daily tasks.
 * DELETE THIS FILE AFTER USE!
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/sqlite-db';
import {
  GUEST_USER_ID,
  GUEST_EMAIL,
  GUEST_USERNAME,
  GUEST_FIXED_XP,
  GUEST_LEVEL,
  GUEST_TASK_IDS,
} from '@/lib/constants/guest-account';

// Simple secret to prevent unauthorized access
const SEED_SECRET = process.env.SEED_SECRET || 'redmansion2024';

export async function POST(request: NextRequest) {
  try {
    // Check secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');

    if (secret !== SEED_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDatabase();
    const results: string[] = [];

    // Task IDs
    const GUEST_TASK_1_ID = GUEST_TASK_IDS.READING_COMPREHENSION;
    const GUEST_TASK_2_ID = GUEST_TASK_IDS.CULTURAL_EXPLORATION;

    // Step 1: Delete existing data
    const deletions = [
      { table: 'daily_progress', condition: 'userId = ?', params: [GUEST_USER_ID] },
      { table: 'daily_tasks', condition: 'id IN (?, ?)', params: [GUEST_TASK_1_ID, GUEST_TASK_2_ID] },
      { table: 'users', condition: 'id = ?', params: [GUEST_USER_ID] },
    ];

    for (const { table, condition, params } of deletions) {
      try {
        await db.execute({ sql: `DELETE FROM ${table} WHERE ${condition}`, args: params });
        results.push(`Deleted from ${table}`);
      } catch (e: any) {
        results.push(`Warning: Could not delete from ${table}: ${e.message}`);
      }
    }

    // Step 2: Create guest user
    await db.execute({
      sql: `INSERT INTO users (id, username, email, currentLevel, currentXP, totalXP, attributes, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        GUEST_USER_ID,
        GUEST_USERNAME,
        GUEST_EMAIL,
        GUEST_LEVEL,
        GUEST_FIXED_XP,
        GUEST_FIXED_XP,
        JSON.stringify({ literaryAppreciation: 3, culturalUnderstanding: 3, analyticalThinking: 3, creativity: 3 }),
        Date.now(),
        Date.now()
      ]
    });
    results.push(`Created user: ${GUEST_USERNAME}`);

    // Step 3: Create fixed tasks
    // IMPORTANT: task-repository.ts rowToTask() expects: content.content for the actual content
    // So the JSON structure must be: { content: { textPassage: {...} }, ...otherFields }

    // Task 1: reading_001 - 寶玉摔玉
    await db.execute({
      sql: `INSERT INTO daily_tasks (id, taskType, difficulty, title, description, baseXP, content, sourceChapter, sourceVerseStart, sourceVerseEnd, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        GUEST_TASK_1_ID,
        'morning_reading',
        'easy',
        '晨讀時光：寶玉摔玉',
        '閱讀第三回賈寶玉「摔玉」的經典情節，分析他的性格特徵與價值觀',
        30,
        JSON.stringify({
          // This is what rowToTask() reads as content.content
          content: {
            textPassage: {
              id: 'reading_001',
              chapter: 3,
              startLine: 185,
              endLine: 198,
              text: '寶玉聽了，登時發作起癡狂病來，摘下那玉，就狠命摔去，罵道：「什麼勞什子，我砸了他！什麼罕物，連人之高低不擇，還說『通靈』不『通靈』呢！我也不要這勞什子了！」嚇的眾人一擁爭去拾玉。賈母急的摟了寶玉道：「孽障！你生氣，要打罵人容易，何苦摔那命根子！」寶玉滿面淚痕哭道：「家裡姐姐妹妹都沒有，單我有，我說沒趣，如今來了這們一個神仙似的妹妹也沒有，可知這不是個好東西。」',
              question: '在這段情節中，賈寶玉「摔玉」的行為反映了他怎樣的性格特徵與價值觀？',
              hint: '思考提示：寶玉為什麼說「連人之高低不擇」？他認為「神仙似的妹妹」沒有玉，自己有玉這件事代表了什麼？這反映了他對「世俗寶物」與「人」之間關係的看法。',
              expectedKeywords: ['叛逆', '平等', '反世俗', '重視情感', '厭惡特權', '癡狂'],
            }
          },
          sourceId: 'chapter-3-passage-185-198',
          xpReward: 30,
          timeEstimate: 5,
          gradingCriteria: { minLength: 30, maxLength: 500 }
        }),
        3,
        185,
        198,
        Date.now()
      ]
    });
    results.push(`Created task: 晨讀時光：寶玉摔玉`);

    // Task 2: culture_008 - 牡丹亭與心靈覺醒
    await db.execute({
      sql: `INSERT INTO daily_tasks (id, taskType, difficulty, title, description, baseXP, content, sourceChapter, sourceVerseStart, sourceVerseEnd, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        GUEST_TASK_2_ID,
        'cultural_exploration',
        'hard',
        '文化探秘：牡丹亭與心靈覺醒',
        '探索《牡丹亭》戲曲如何觸動林黛玉的內心世界，理解戲曲在《紅樓夢》中的文化意涵',
        50,
        JSON.stringify({
          // This is what rowToTask() reads as content.content
          content: {
            culturalElement: {
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
            }
          },
          sourceId: 'culture-culture_008',
          xpReward: 50,
          timeEstimate: 10,
          gradingCriteria: { minLength: 30, maxLength: 500 }
        }),
        23,
        null,
        null,
        Date.now()
      ]
    });
    results.push(`Created task: 文化探秘：牡丹亭與心靈覺醒`);

    // Step 4: Create daily progress
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const progressId = `${GUEST_USER_ID}_${todayStr}`;

    const now = Date.now();
    const timestamp = { seconds: Math.floor(now / 1000), nanoseconds: (now % 1000) * 1000000 };

    const tasks = JSON.stringify([
      { taskId: GUEST_TASK_1_ID, assignedAt: timestamp, status: 'not_started' },
      { taskId: GUEST_TASK_2_ID, assignedAt: timestamp, status: 'not_started' },
    ]);

    await db.execute({
      sql: `INSERT INTO daily_progress (id, userId, date, tasks, completedTaskIds, skippedTaskIds, totalXPEarned, totalAttributeGains, usedSourceIds, streak, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        progressId,
        GUEST_USER_ID,
        todayStr,
        tasks,
        JSON.stringify([]),
        JSON.stringify([]),
        0,
        JSON.stringify({}),
        JSON.stringify([]),
        0,
        now,
        now
      ]
    });
    results.push(`Created progress for: ${todayStr}`);

    return NextResponse.json({
      success: true,
      message: 'Guest account seeded successfully!',
      details: results,
      guestUserId: GUEST_USER_ID,
      tasks: [
        { id: GUEST_TASK_1_ID, title: '晨讀時光：寶玉摔玉', xp: 30 },
        { id: GUEST_TASK_2_ID, title: '文化探秘：牡丹亭與心靈覺醒', xp: 50 },
      ]
    });

  } catch (error: any) {
    console.error('Seed error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}

// Also support GET for easy browser testing
export async function GET(request: NextRequest) {
  return POST(request);
}
