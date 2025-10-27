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
import { dailyTaskService, STREAK_MILESTONES, BASE_XP_REWARDS } from '@/lib/daily-task-service'
import { generatePersonalizedFeedback } from '@/lib/ai-feedback-generator'
import {
  DailyTaskType,
  TaskDifficulty,
  DailyTask,
  TaskCompletionResult,
  TaskStatus,
  DailyTaskProgress,
} from '@/lib/types/daily-task'
import { AttributePoints } from '@/lib/types/user-level'
import { verifyAuthHeader, adminDb, admin } from '@/lib/firebase-admin'
import { isLlmOnlyMode } from '@/lib/env'
import { simpleTierScore } from '@/lib/task-evaluator'
import { calculateXPProgress, getLevelConfig } from '@/lib/config/levels-config'

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
    if (isPermissionDeniedError(err) && adminDb) {
      try {
        const adminResult = await submitWithAdminFallback({
          userId: effectiveUserId,
          taskId,
          userResponse,
          providedTask: task as DailyTask | undefined,
        })
        return NextResponse.json({ success: true, result: adminResult, fallback: 'admin' }, { status: 200 })
      } catch (adminErr) {
        console.error('Admin fallback failed in submit route:', adminErr)
      }
    }

    // Fallback path (Firebase unavailable). Provide practice-mode evaluation without persistence.
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

function convertTimestampToMillis(value: any): number {
  if (!value) return Date.now()
  if (typeof value.toMillis === 'function') {
    return value.toMillis()
  }
  if (typeof value.seconds === 'number') {
    return value.seconds * 1000
  }
  if (typeof value._seconds === 'number') {
    return value._seconds * 1000
  }
  return Date.now()
}

function mergeAttributePoints(
  base: Partial<AttributePoints> = {},
  add: Partial<AttributePoints> = {}
): Partial<AttributePoints> {
  return {
    poetrySkill: (base.poetrySkill || 0) + (add.poetrySkill || 0),
    culturalKnowledge: (base.culturalKnowledge || 0) + (add.culturalKnowledge || 0),
    analyticalThinking: (base.analyticalThinking || 0) + (add.analyticalThinking || 0),
    socialInfluence: (base.socialInfluence || 0) + (add.socialInfluence || 0),
    learningPersistence: (base.learningPersistence || 0) + (add.learningPersistence || 0),
  }
}

function calculateStreakBonusFromMilestones(streak: number, baseXP: number): number {
  const milestone = [...STREAK_MILESTONES].reverse().find((m) => streak >= m.days)
  if (!milestone) {
    return 0
  }
  return Math.floor(baseXP * (milestone.bonusMultiplier - 1))
}

async function calculateStreakWithAdmin(userId: string, currentDate: string): Promise<number> {
  if (!adminDb) return 0
  try {
    const date = new Date(currentDate)
    date.setDate(date.getDate() - 1)
    const yesterday = date.toISOString().split('T')[0]
    const progressId = `${userId}_${yesterday}`
    const snapshot = await adminDb.collection('dailyTaskProgress').doc(progressId).get()
    if (!snapshot.exists) {
      return 0
    }
    const data = snapshot.data() as DailyTaskProgress
    const tasks = Array.isArray(data.tasks) ? data.tasks : []
    const yesterdayCompleted = tasks.every(
      (t: any) => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.SKIPPED
    )
    if (yesterdayCompleted) {
      return (data.streak || 0) + 1
    }
    return 0
  } catch (error) {
    console.error('Failed to calculate streak via admin fallback:', error)
    return 0
  }
}

async function recordDailyTaskHistoryWithAdmin(params: {
  userId: string
  taskId: string
  taskType: DailyTaskType
  score: number
  xpAwarded: number
  completionTime: number
  date: string
  sourceId?: string
}) {
  if (!adminDb || !admin) return
  try {
    await adminDb.collection('dailyTaskHistory').add({
      userId: params.userId,
      taskId: params.taskId,
      taskType: params.taskType,
      score: params.score,
      xpAwarded: params.xpAwarded,
      completionTime: params.completionTime,
      date: params.date,
      sourceId: params.sourceId || null,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error('Failed to record task history via admin fallback:', error)
  }
}

async function updateAttributesWithAdmin(userId: string, updates: Partial<AttributePoints>) {
  if (!adminDb || !admin || !updates || Object.keys(updates).length === 0) return
  try {
    const userRef = adminDb.collection('users').doc(userId)
    const snapshot = await userRef.get()
    if (!snapshot.exists) return
    const profile = snapshot.data() as any
    const merged = {
      ...(profile?.attributes || {}),
      ...updates,
    }
    Object.keys(merged).forEach((key) => {
      const value = merged[key]
      merged[key] = Math.max(0, Math.min(100, value))
    })
    await userRef.update({
      attributes: merged,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error('Failed to update attributes via admin fallback:', error)
  }
}

async function awardXPWithAdmin(params: {
  userId: string
  amount: number
  reason: string
  source: string
  sourceId?: string
}): Promise<AdminAwardResult> {
  if (!adminDb || !admin) {
    throw new Error('Admin Firestore unavailable')
  }
  if (!params.amount) {
    return {
      success: true,
      newTotalXP: 0,
      newLevel: 0,
      leveledUp: false,
    }
  }

  const userRef = adminDb.collection('users').doc(params.userId)
  const lockId = params.sourceId ? `${params.userId}__${params.sourceId}` : null
  const lockRef = lockId ? adminDb.collection('xpTransactionLocks').doc(lockId) : null

  const result = await adminDb.runTransaction<AdminAwardResult>(async (transaction) => {
    if (lockRef) {
      const lockSnap = await transaction.get(lockRef)
      if (lockSnap.exists) {
        const profileSnap = await transaction.get(userRef)
        const profile = profileSnap.data() as any
        return {
          success: true,
          newTotalXP: profile?.totalXP || 0,
          newLevel: profile?.currentLevel || 0,
          leveledUp: false,
          isDuplicate: true,
        }
      }
    }

    const userSnap = await transaction.get(userRef)
    if (!userSnap.exists) {
      throw new Error('User profile not found for admin fallback')
    }
    const profile = userSnap.data() as any
    const oldTotalXP = profile?.totalXP || 0
    const newTotalXP = oldTotalXP + params.amount
    const xpProgress = calculateXPProgress(newTotalXP)
    const newLevel = xpProgress.currentLevel
    const leveledUp = newLevel > (profile?.currentLevel || 0)

    transaction.update(userRef, {
      totalXP: newTotalXP,
      currentLevel: newLevel,
      currentXP: xpProgress.currentXP,
      nextLevelXP: xpProgress.nextLevelXP,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
    })

    if (lockRef) {
      transaction.set(lockRef, {
        userId: params.userId,
        sourceId: params.sourceId,
        amount: params.amount,
        reason: params.reason,
        source: params.source,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
    }

    return {
      success: true,
      newTotalXP,
      newLevel,
      leveledUp,
      fromLevel: profile?.currentLevel || 0,
    }
  })

  try {
    await adminDb.collection('xpTransactions').add({
      userId: params.userId,
      amount: params.amount,
      reason: params.reason,
      source: params.source,
      sourceId: params.sourceId || null,
      newTotalXP: result.newTotalXP,
      newLevel: result.newLevel,
      causedLevelUp: result.leveledUp,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    })
  } catch (error) {
    console.error('Failed to log XP transaction via admin fallback:', error)
  }

  if (result.leveledUp) {
    try {
      await adminDb.collection('levelUps').add({
        userId: params.userId,
        fromLevel: result.fromLevel,
        toLevel: result.newLevel,
        totalXP: result.newTotalXP,
        reason: params.reason,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      })

      const unlockedContent: string[] = []
      for (let level = (result.fromLevel ?? 0) + 1; level <= result.newLevel; level++) {
        const levelConfig = getLevelConfig(level)
        if (levelConfig) {
          unlockedContent.push(...levelConfig.exclusiveContent)
        }
      }
      if (unlockedContent.length > 0) {
        await userRef.update({
          unlockedContent: admin.firestore.FieldValue.arrayUnion(...unlockedContent),
        })
      }
    } catch (error) {
      console.error('Failed to record level-up via admin fallback:', error)
    }
  }

  return result
}

async function getTaskForAdmin(taskId: string, providedTask?: DailyTask): Promise<DailyTask> {
  if (adminDb) {
    try {
      const taskSnap = await adminDb.collection('dailyTasks').doc(taskId).get()
      if (taskSnap.exists) {
        return { id: taskId, ...(taskSnap.data() as DailyTask) }
      }
    } catch (error) {
      console.warn('Failed to fetch task via admin fallback:', error)
    }
  }

  if (providedTask) {
    return { ...providedTask, id: providedTask.id || taskId }
  }

  const recovered = (dailyTaskService as unknown as { recoverTaskFromId?: (id: string) => DailyTask | null })
    .recoverTaskFromId?.(taskId)
  if (recovered) {
    return recovered
  }

  return {
    id: taskId,
    type: DailyTaskType.MORNING_READING,
    title: 'Recovered Task',
    description: 'Recovered from submission',
    difficulty: TaskDifficulty.MEDIUM,
    timeEstimate: 5,
    xpReward: BASE_XP_REWARDS[DailyTaskType.MORNING_READING],
    attributeRewards: {},
    content: {},
    gradingCriteria: { minLength: 30, maxLength: 500 },
  }
}

async function submitWithAdminFallback(params: AdminFallbackParams): Promise<TaskCompletionResult> {
  if (!adminDb || !admin) {
    throw new Error('Admin Firestore unavailable for fallback submission')
  }

  const { userId, taskId, userResponse, providedTask } = params
  const todayDate = getTodayDateString()
  const progressId = `${userId}_${todayDate}`
  const progressRef = adminDb.collection('dailyTaskProgress').doc(progressId)
  const nowTimestamp = admin.firestore.Timestamp.now()

  const progressSnapshot = await progressRef.get()
  let progressData = progressSnapshot.exists
    ? (progressSnapshot.data() as DailyTaskProgress)
    : null

  if (!progressData) {
    progressData = {
      id: progressId,
      userId,
      date: todayDate,
      tasks: [
        {
          taskId,
          assignedAt: nowTimestamp,
          status: TaskStatus.NOT_STARTED,
        },
      ],
      completedTaskIds: [],
      skippedTaskIds: [],
      totalXPEarned: 0,
      totalAttributeGains: {},
      usedSourceIds: [],
      streak: 0,
      createdAt: nowTimestamp,
      updatedAt: nowTimestamp,
    } as unknown as DailyTaskProgress
  }

  const tasksArray = Array.isArray(progressData.tasks) ? [...progressData.tasks] : []
  let assignmentIndex = tasksArray.findIndex((t: any) => t.taskId === taskId)
  if (assignmentIndex === -1) {
    tasksArray.push({
      taskId,
      assignedAt: nowTimestamp,
      status: TaskStatus.NOT_STARTED,
    })
    assignmentIndex = tasksArray.length - 1
  }
  const assignment = tasksArray[assignmentIndex]

  const task = await getTaskForAdmin(taskId, providedTask)
  const trimmedResponse = String(userResponse || '').trim()
  const score = await dailyTaskService.evaluateTaskQuality(task, trimmedResponse)

  let feedback = '感謝您完成任務，請繼續探索紅樓夢的精彩世界！'
  try {
    feedback = await generatePersonalizedFeedback({
      taskType: task.type,
      userAnswer: trimmedResponse,
      score,
      difficulty: task.difficulty,
      taskContent: task.content,
      taskTitle: task.title,
    })
  } catch (_) {
    // keep fallback feedback
  }

  const baseXP = BASE_XP_REWARDS[task.type] ?? 0
  let taskXP = baseXP
  if (score === 20) {
    taskXP = 0
  } else if (score === 100) {
    taskXP = Math.floor(baseXP * 1.5)
  }
  const currentStreak = progressData.streak || 0
  const streakBonus = calculateStreakBonusFromMilestones(currentStreak, taskXP)
  const finalXP = taskXP + streakBonus

  const attributeGains = task.attributeRewards || {}
  const xpSourceId = task.sourceId || `daily-task-${taskId}-${todayDate}`

  const xpResult = await awardXPWithAdmin({
    userId,
    amount: finalXP,
    reason: `Completed daily task: ${task.title}`,
    source: 'task',
    sourceId: xpSourceId,
  })

  await updateAttributesWithAdmin(userId, attributeGains)

  const submissionTimeSeconds = Math.floor(
    (Date.now() - convertTimestampToMillis((assignment as any).startedAt)) / 1000
  )

  tasksArray[assignmentIndex] = {
    ...assignment,
    completedAt: nowTimestamp,
    userResponse: trimmedResponse,
    submissionTime: Math.max(0, submissionTimeSeconds),
    aiScore: score,
    xpAwarded: finalXP,
    attributeGains,
    feedback,
    status: TaskStatus.COMPLETED,
  }

  const updatedProgress: Partial<DailyTaskProgress> = {
    tasks: tasksArray,
    completedTaskIds: Array.from(new Set([...(progressData.completedTaskIds || []), taskId])),
    totalXPEarned: (progressData.totalXPEarned || 0) + finalXP,
    totalAttributeGains: mergeAttributePoints(progressData.totalAttributeGains || {}, attributeGains),
    usedSourceIds: task.sourceId
      ? Array.from(new Set([...(progressData.usedSourceIds || []), task.sourceId]))
      : progressData.usedSourceIds || [],
    lastCompletedAt: nowTimestamp,
    updatedAt: nowTimestamp,
  }

  const allCompleted = tasksArray.every(
    (t: any) => t.status === TaskStatus.COMPLETED || t.status === TaskStatus.SKIPPED
  )

  let newStreak = progressData.streak || 0
  if (allCompleted) {
    const streakBase = await calculateStreakWithAdmin(userId, todayDate)
    newStreak = streakBase + 1
    updatedProgress.streak = newStreak
  } else {
    updatedProgress.streak = progressData.streak || 0
  }

  await progressRef.set(
    {
      ...progressData,
      ...updatedProgress,
      id: progressId,
      userId,
      date: todayDate,
    },
    { merge: true }
  )

  await recordDailyTaskHistoryWithAdmin({
    userId,
    taskId,
    taskType: task.type,
    score,
    xpAwarded: finalXP,
    completionTime: Math.max(0, submissionTimeSeconds),
    date: todayDate,
    sourceId: task.sourceId,
  })

  const milestone = STREAK_MILESTONES.find((m) => m.days === newStreak)

  const completionResult: TaskCompletionResult & { xpEarned?: number } = {
    success: true,
    taskId,
    score,
    feedback,
    xpAwarded: finalXP,
    attributeGains,
    rewards: {
      immediately: {
        xp: finalXP,
        attributePoints: attributeGains,
      },
      delayed: milestone
        ? {
            socialRecognition: {
              badge: milestone.badge,
              title: milestone.title,
            },
          }
        : undefined,
    },
    leveledUp: xpResult.leveledUp,
    newLevel: xpResult.newLevel,
    fromLevel: xpResult.fromLevel,
    newStreak,
    isStreakMilestone: Boolean(milestone),
    streakBonus,
  }

  completionResult.xpEarned = finalXP as any
  return completionResult
}
