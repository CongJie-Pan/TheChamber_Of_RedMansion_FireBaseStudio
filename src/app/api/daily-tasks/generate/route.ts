/**
 * @fileOverview API Route - Generate Daily Tasks (Server-side)
 *
 * POST /api/daily-tasks/generate
 * Body: { userId: string, date?: string }
 *
 * Runs task generation on the server to ensure OpenAI calls execute server-side
 * so GPT-5-Mini logs appear in the Node terminal.
 */

import { NextRequest, NextResponse } from 'next/server'
import { dailyTaskService } from '@/lib/daily-task-service'
import { taskGenerator } from '@/lib/task-generator'
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-options";
import { isLlmOnlyMode } from '@/lib/env'
import { isGuestAccount, logGuestAction } from '@/lib/middleware/guest-account'
import { GUEST_TASK_IDS } from '@/lib/constants/guest-account'
import questionBank from '../../../../../data/task-questions/question-bank.json'

/**
 * Build guest tasks directly from question-bank.json
 * No database seeding required - reads from static JSON file
 */
function getGuestTasksFromJSON() {
  // Find reading_001 from morning_reading.easy
  const readingQuestion = questionBank.morning_reading.easy.find(
    (q: { id: string }) => q.id === 'reading_001'
  );

  // Find culture_008 from cultural_exploration.hard
  const cultureQuestion = questionBank.cultural_exploration.hard.find(
    (q: { id: string }) => q.id === 'culture_008'
  );

  if (!readingQuestion || !cultureQuestion) {
    console.error('❌ Guest tasks not found in question-bank.json');
    return [];
  }

  // Convert to DailyTask format (must match DailyTask interface)
  // DailyTask uses 'type' not 'taskType', 'xpReward' not 'baseXP'
  const tasks = [
    {
      id: GUEST_TASK_IDS.READING_COMPREHENSION,
      type: 'morning_reading',
      difficulty: 'easy',
      title: '晨讀時光：寶玉摔玉',
      description: '閱讀第三回賈寶玉「摔玉」的經典情節，分析他的性格特徵與價值觀',
      xpReward: 30,
      attributeRewards: { literaryAppreciation: 2, analyticalThinking: 1 },
      timeEstimate: 10,
      sourceId: 'reading_001',
      content: { textPassage: readingQuestion },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: GUEST_TASK_IDS.CULTURAL_EXPLORATION,
      type: 'cultural_exploration',
      difficulty: 'hard',
      title: '文化探秘：牡丹亭與心靈覺醒',
      description: '探索《牡丹亭》戲曲如何觸動林黛玉的內心世界，理解戲曲在《紅樓夢》中的文化意涵',
      xpReward: 50,
      attributeRewards: { culturalUnderstanding: 3, literaryAppreciation: 2 },
      timeEstimate: 15,
      sourceId: 'culture_008',
      content: { culturalElement: cultureQuestion },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  return tasks;
}

export async function POST(request: NextRequest) {
  // Parse body ONCE and keep values for both main path and fallback
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { error: 'Invalid content type. Expected application/json.' },
      { status: 415 }
    )
  }

  let userId: string | undefined
  let date: string | undefined
  let verifiedUid: string | null = null
  try {
    const body = await request.json()
    userId = typeof body?.userId === 'string' ? body.userId.trim() : undefined
    date = typeof body?.date === 'string' ? body.date : undefined

    // Try verify NextAuth session (preferred)
    const session = await getServerSession(authOptions)
    verifiedUid = session?.user?.id || null

    if (!userId && !verifiedUid && !isLlmOnlyMode()) {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      )
    }

    const effectiveUserId = verifiedUid || (userId as string)

    // Phase 4-T1: Guest account always returns fixed tasks from JSON (no database required)
    // Fix (2025-12-12): Read directly from question-bank.json instead of database
    if (isGuestAccount(effectiveUserId)) {
      logGuestAction('Task generation requested - returning fixed tasks from JSON');

      // Get tasks directly from JSON file - no database seeding needed
      const tasks = getGuestTasksFromJSON();

      if (tasks.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Guest tasks not found in question-bank.json (reading_001, culture_008)'
          },
          { status: 500 }
        );
      }

      // Fetch today's progress to include completedTaskIds
      // This ensures guest users see their completed tasks after re-login
      const progress = await dailyTaskService.getUserDailyProgress(effectiveUserId);

      logGuestAction(`Returning ${tasks.length} fixed tasks from JSON`, {
        taskIds: tasks.map(t => t.id),
        hasProgress: !!progress,
        completedTaskIds: progress?.completedTaskIds || [],
      });

      return NextResponse.json({
        success: true,
        tasks,
        progress,  // Include progress with completedTaskIds
        isGuest: true
      }, { status: 200 });
    }

    // LLM-only: no Firestore interactions, always return ephemeral tasks
    if (isLlmOnlyMode()) {
      const today = new Date().toISOString().split('T')[0]
      const targetDate = date || today
      const level = typeof body?.userLevel === 'number' ? body.userLevel : 2
      const tasks = await taskGenerator.generateTasksForUser(
        String(effectiveUserId || 'guest'),
        level,
        targetDate
      )
      return NextResponse.json({ success: true, tasks, ephemeral: true }, { status: 200 })
    }

    // Phase 2-T1: Server-side duplicate protection is handled by dailyTaskService.generateDailyTasks
    // It checks for existing progress and returns cached tasks without regeneration
    const tasks = await dailyTaskService.generateDailyTasks(effectiveUserId, date)

    console.log(`✅ [API] Generate endpoint returned ${tasks.length} tasks (may be cached from existing progress)`)

    return NextResponse.json({ success: true, tasks, ephemeral: false }, { status: 200 })
  } catch (err: any) {
    // Robust fallback: never re-read request body; rely on parsed userId
    console.error('Generate daily tasks failed, falling back to ephemeral tasks:', err)
    try {
      const today = new Date().toISOString().split('T')[0]
      const fallbackLevel = 2
      const fallbackUserId = verifiedUid || userId || 'guest'
      const generatedTasks = await taskGenerator.generateTasksForUser(
        String(fallbackUserId),
        fallbackLevel,
        date || today
      )
      const tasks = generatedTasks.slice(0, 2)
      return NextResponse.json({ success: true, tasks, ephemeral: true }, { status: 200 })
    } catch (fallbackErr: any) {
      const message = typeof err?.message === 'string' ? err.message : 'Failed to generate daily tasks'
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
  }
}

export async function GET() {
  return NextResponse.json(
    {
      name: 'Generate Daily Tasks API',
      method: 'POST',
      endpoint: '/api/daily-tasks/generate',
      body: { userId: 'string', date: 'string (optional)' },
    },
    { status: 200 }
  )
}
