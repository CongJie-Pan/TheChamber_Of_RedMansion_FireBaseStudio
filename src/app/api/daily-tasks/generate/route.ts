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

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Invalid content type. Expected application/json.' },
        { status: 415 }
      )
    }

    const body = await request.json()
    const { userId, date } = body || {}

    if (typeof userId !== 'string' || userId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid userId' },
        { status: 400 }
      )
    }

    const tasks = await dailyTaskService.generateDailyTasks(userId, date)

    return NextResponse.json({ success: true, tasks, ephemeral: false }, { status: 200 })
  } catch (err: any) {
    // Fallback: Firebase unavailable/permission denied → generate tasks via AI/hardcoded without persistence
    try {
      const today = new Date().toISOString().split('T')[0]
      // Default to level 2 if we cannot fetch user profile
      const fallbackLevel = 2
      const tasks = await taskGenerator.generateTasksForUser(
        String((await (await request.json()).userId) || 'guest'),
        fallbackLevel,
        today
      )
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
