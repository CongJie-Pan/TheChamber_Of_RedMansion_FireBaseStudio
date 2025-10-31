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
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { isLlmOnlyMode } from '@/lib/env'
import { isGuestAccount, getGuestTaskIds, logGuestAction } from '@/lib/middleware/guest-account'
import { getTasksByIds } from '@/lib/repositories/task-repository'

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

    // Phase 4-T1: Guest account always returns fixed tasks (no generation)
    if (isGuestAccount(effectiveUserId)) {
      logGuestAction('Task generation requested - returning fixed tasks');
      const guestTaskIds = getGuestTaskIds();
      const tasks = await getTasksByIds(guestTaskIds);

      if (tasks.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Guest account tasks not found. Run: tsx scripts/seed-guest-account.ts --reset'
          },
          { status: 404 }
        );
      }

      logGuestAction(`Returning ${tasks.length} fixed tasks`, { taskIds: guestTaskIds });
      return NextResponse.json({ success: true, tasks, isGuest: true }, { status: 200 });
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
