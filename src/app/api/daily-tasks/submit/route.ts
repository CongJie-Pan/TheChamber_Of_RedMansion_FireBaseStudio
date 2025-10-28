/**
 * @fileOverview API Route - Submit Daily Task Completion (Server-side)
 *
 * POST /api/daily-tasks/submit
 * Body: { userId: string, taskId: string, userResponse: string }
 *
 * Runs task submission and feedback generation on the server so
 * GPT-5-Mini logs appear in the Node terminal.
 */

import { NextRequest, NextResponse } from 'next/server'
import { dailyTaskService } from '@/lib/daily-task-service'
import { generatePersonalizedFeedback } from '@/lib/ai-feedback-generator'
import {
  DailyTaskType,
  TaskDifficulty,
  DailyTask,
  TaskCompletionResult,
} from '@/lib/types/daily-task'
import { verifyAuthHeader } from '@/lib/firebase-admin'
import { isLlmOnlyMode } from '@/lib/env'
import { simpleTierScore } from '@/lib/task-evaluator'

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json(
      { error: 'Invalid content type. Expected application/json.' },
      { status: 415 }
    )
  }

  // Parse body once and reuse for both success and fallback paths
  const body = await request.json()
  const { userId, taskId, userResponse, task } = body || {}
  const verifiedUid = await verifyAuthHeader(request.headers.get('authorization'))

  if (typeof userId !== 'string' || !userId.trim()) {
    // Allow missing userId in LLM-only mode
    if (!isLlmOnlyMode()) {
      return NextResponse.json({ error: 'Missing or invalid userId' }, { status: 400 })
    }
  }
  if (typeof taskId !== 'string' || !taskId.trim()) {
    return NextResponse.json({ error: 'Missing or invalid taskId' }, { status: 400 })
  }
  if (typeof userResponse !== 'string') {
    return NextResponse.json({ error: 'Missing or invalid userResponse' }, { status: 400 })
  }

  // LLM-only mode: no Firestore; score + feedback only
  if (isLlmOnlyMode()) {
    try {
      const effectiveUid = (await verifyAuthHeader(request.headers.get('authorization'))) || userId || 'guest'
      const text = String(userResponse || '').trim()
      const content = (task?.content || task || {}) as DailyTask['content'] | undefined
      const type: DailyTaskType = (task?.type || task?.taskType ||
        (content as any)?.poem ? DailyTaskType.POETRY :
        (content as any)?.character ? DailyTaskType.CHARACTER_INSIGHT :
        (content as any)?.culturalElement ? DailyTaskType.CULTURAL_EXPLORATION :
        (content as any)?.commentary ? DailyTaskType.COMMENTARY_DECODE :
        DailyTaskType.MORNING_READING) as DailyTaskType
      const difficulty: TaskDifficulty = (task?.difficulty || TaskDifficulty.MEDIUM) as TaskDifficulty

      const minLen = task?.gradingCriteria?.minLength || 30
      const score = simpleTierScore(text, minLen)
      let feedback = '基本達標，繼續加油！'
      try {
        feedback = await generatePersonalizedFeedback({
          taskType: type,
          userAnswer: text,
          score,
          difficulty,
          taskContent: (content || {}) as any,
          taskTitle: task?.title || '學習任務',
        })
      } catch (_) {}

      const result = {
        success: true,
        taskId: task?.id || String(taskId || 'ephemeral-task'),
        score,
        feedback,
        xpAwarded: 0,
        attributeGains: {},
        rewards: { immediately: { xp: 0, attributePoints: {} } },
        leveledUp: false,
        newLevel: 0,
        fromLevel: 0,
        newStreak: 0,
        isStreakMilestone: false,
        streakBonus: 0,
      }

      return NextResponse.json({ success: true, result, ephemeral: true, userId: effectiveUid }, { status: 200 })
    } catch (e: any) {
      const message = typeof e?.message === 'string' ? e.message : 'Failed to submit task in LLM-only mode'
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
  }

  const effectiveUserId = (verifiedUid || userId) as string

  try {
    const result = await dailyTaskService.submitTaskCompletion(effectiveUserId, taskId, userResponse)
    return NextResponse.json({ success: true, result }, { status: 200 })
  } catch (err: any) {
    console.error('Submit daily task failed, providing ephemeral feedback:', err)
    // Fallback path. Provide practice-mode evaluation without persistence.
    try {
      const text = String(userResponse || '').trim()
      const content = (task?.content || task || {}) as DailyTask['content'] | undefined
      const type: DailyTaskType = (task?.type || task?.taskType ||
        (content as any)?.poem ? DailyTaskType.POETRY :
        (content as any)?.character ? DailyTaskType.CHARACTER_INSIGHT :
        (content as any)?.culturalElement ? DailyTaskType.CULTURAL_EXPLORATION :
        (content as any)?.commentary ? DailyTaskType.COMMENTARY_DECODE :
        DailyTaskType.MORNING_READING) as DailyTaskType
      const difficulty: TaskDifficulty = (task?.difficulty || TaskDifficulty.MEDIUM) as TaskDifficulty

      let score = 0
      if (/^0+$/.test(text)) {
        score = 5
      } else if (text.length >= 600) {
        score = 95
      } else if (text.length >= 200) {
        score = 85
      } else if (text.length >= 60) {
        score = 70
      } else if (text.length >= 30) {
        score = 20
      } else {
        score = 0
      }

      let feedback = '基本達標，繼續加油！'
      try {
        feedback = await generatePersonalizedFeedback({
          taskType: type,
          userAnswer: text,
          score,
          difficulty,
          taskContent: (content || {}) as any,
          taskTitle: task?.title || '學習任務',
        })
      } catch (_) {
        // keep default feedback
      }

      const result = {
        success: true,
        taskId: taskId || 'ephemeral-task',
        score,
        feedback,
        xpAwarded: 0,
        attributeGains: {},
        rewards: { immediately: { xp: 0, attributePoints: {} } },
        leveledUp: false,
        newLevel: 0,
        fromLevel: 0,
        newStreak: 0,
        isStreakMilestone: false,
        streakBonus: 0,
      }

      return NextResponse.json({ success: true, result, ephemeral: true }, { status: 200 })
    } catch (fallbackErr: any) {
      const message = typeof err?.message === 'string' ? err.message : 'Failed to submit task completion'
      return NextResponse.json({ success: false, error: message }, { status: 500 })
    }
  }
}

export async function GET() {
  return NextResponse.json(
    {
      name: 'Submit Daily Task Completion API',
      method: 'POST',
      endpoint: '/api/daily-tasks/submit',
      body: { userId: 'string', taskId: 'string', userResponse: 'string' },
    },
    { status: 200 }
  )
}

interface AdminFallbackParams {
  userId: string
  taskId: string
  userResponse: string
  providedTask?: DailyTask
}

interface AdminAwardResult {
  success: boolean
  newTotalXP: number
  newLevel: number
  leveledUp: boolean
  fromLevel?: number
  isDuplicate?: boolean
}

function isPermissionDeniedError(error: any): boolean {
  if (!error) return false
  const code = typeof error.code === 'string' ? error.code : ''
  if (code.includes('permission-denied')) {
    return true
  }
  const message = typeof error.message === 'string' ? error.message : ''
  return /permission[-_ ]denied|insufficient permissions/i.test(message)
}

function getTodayDateString(): string {
  const now = new Date()
  const utc8Offset = 8 * 60 * 60 * 1000
  const localDate = new Date(now.getTime() + utc8Offset)
  return localDate.toISOString().split('T')[0]
}
